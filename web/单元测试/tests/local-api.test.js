/*
 * local-api.test.js — 本地“后端”核心业务单元测试
 *
 * 测试对象：js/data/local-api.js（配合 db.js / seed.js）
 * 白盒用例设计方法：
 *   - 等价类划分：类型 lost/found、登录态（已登录/匿名）、联系方式（微信/手机）
 *   - 边界值分析：分页 pageSize 钳制、名称/地点长度、“发生时间不得晚于现在+5 分钟”
 *   - 状态迁移测试：寻物 searching<->recovered、招领 pending_claim<->returned，含非法跨类型
 *   - 权限测试：发布者本人 / 他人 / 匿名三类访问者
 *   - 错误推测：空关键词、无结果、不存在的 id、首尾空格、图片超限、漏填必填项
 * 运行：npm test（或 node --test tests/）
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createEnv, loginDemo } = require('./helpers/env.js');

let LF;

// 断言 Promise 被拒绝，且错误信息匹配正则
async function expectReject(promise, messageRegex) {
  await assert.rejects(
    promise,
    (err) => messageRegex.test(err.message),
    '应抛出匹配 ' + messageRegex + ' 的错误'
  );
}

// 一条合法的寻物发布体（各用例可用参数覆盖个别字段）
function validPayload(LF, overrides) {
  return Object.assign({
    type: 'lost',
    name: '测试用黑色眼镜盒',
    categoryCode: 'clothing_bag',
    location: '图书馆三楼还书处',
    occurredAt: LF.db.formatTs(new Date(Date.now() - 3600000)),
    description: '盒面有一道划痕',
    message: null,
    imageUrls: [],
    contact: 'test_wx_0001',
    meetingPlace: null,
    agreementAccepted: true
  }, overrides || {});
}

describe('本地业务接口 local-api', () => {
  beforeEach(() => { LF = createEnv().LF; });

  /* ---------------- 登录与身份 ---------------- */
  describe('登录与身份', () => {
    it('首次注册绑定演示账号，返回凭证和旧学院资料', async () => {
      const res = await loginDemo(LF);
      assert.match(res.token, /^[0-9a-f]{64}$/);
      assert.equal(res.user.nickname, '林同学');
      assert.equal(res.user.college, '计算机学院');
      assert.equal(res.tokenType, 'Bearer');
    });
    it('同一邮箱重复登录不会创建新账号', async () => {
      const a = await loginDemo(LF, 'same');
      await LF.api.logout();
      const b = await loginDemo(LF, 'same');
      assert.equal(a.user.id, b.user.id);
    });
    it('后续账号从空发布列表开始', async () => {
      await loginDemo(LF, 'first');
      const other = await loginDemo(LF, 'second');
      assert.notEqual(other.user.id, 1001);
      assert.equal((await LF.api.getMyItems()).total, 0);
    });
    it('注册昵称生效，保留旧资料', async () => {
      const res = await LF.api.register({ email: 'lin@example.com', password: 'test_password', nickname: '小林', bindLegacy: true });
      assert.equal(res.user.nickname, '小林');
      assert.equal(res.user.college, '计算机学院');
    });
    it('游客访问受保护接口被拒绝', async () => {
      await expectReject(LF.api.getMyItems({ scope: 'all' }), /登录/);
    });
  });

  /* ---------------- 首页列表与分页（边界值） ---------------- */
  describe('首页列表与分页', () => {
    it('默认按发布时间倒序返回，最新信息排在最前', async () => {
      const res = await LF.api.getItems({ type: 'all', page: 1, pageSize: 10 });
      assert.equal(res.total, 14);
      assert.equal(res.records[0].id, 14);
      const t = res.records.map(r => r.publishedAt);
      assert.deepEqual(t, t.slice().sort().reverse(), 'publishedAt 应严格倒序');
    });

    it('分页字段正确：第一页有下一页、第二页为最后一页', async () => {
      const p1 = await LF.api.getItems({ page: 1, pageSize: 10 });
      const p2 = await LF.api.getItems({ page: 2, pageSize: 10 });
      assert.equal(p1.records.length, 10);
      assert.equal(p1.hasNext, true);
      assert.equal(p1.pages, 2);
      assert.equal(p2.records.length, 4);
      assert.equal(p2.hasNext, false);
    });

    it('类型筛选：失物、招领各 7 条', async () => {
      const lost = await LF.api.getItems({ type: 'lost', page: 1, pageSize: 20 });
      const found = await LF.api.getItems({ type: 'found', page: 1, pageSize: 20 });
      assert.equal(lost.total, 7);
      assert.equal(found.total, 7);
      assert.ok(lost.records.every(r => r.type === 'lost'));
      assert.ok(found.records.every(r => r.type === 'found'));
    });

    it('边界值：pageSize 超过 20 被钳制为 20，非法页码归一到第 1 页', async () => {
      const big = await LF.api.getItems({ page: 1, pageSize: 999 });
      assert.equal(big.pageSize, 20);
      assert.equal(big.records.length, 14);
      const zero = await LF.api.getItems({ page: 0, pageSize: 0 });
      assert.equal(zero.page, 1);
      assert.equal(zero.pageSize, 10);
    });

    it('列表项携带完整的展示文案字段', async () => {
      const r = (await LF.api.getItems({ page: 1, pageSize: 1 })).records[0];
      assert.ok(r.typeText && r.statusText && r.categoryText);
      assert.ok('coverImageUrl' in r);
    });
  });

  /* ---------------- 搜索（等价类 + 错误推测） ---------------- */
  describe('搜索', () => {
    it('按物品名称命中（校园卡）', async () => {
      const res = await LF.api.searchItems({ keyword: '校园卡', page: 1, pageSize: 10 });
      assert.ok(res.records.some(r => r.id === 1));
    });

    it('按地点命中（图书馆，跨多条记录）', async () => {
      const res = await LF.api.searchItems({ keyword: '图书馆', page: 1, pageSize: 20 });
      assert.ok(res.total >= 3);
    });

    it('按描述命中（仅出现在描述中的“校徽徽章”）', async () => {
      const res = await LF.api.searchItems({ keyword: '校徽徽章', page: 1, pageSize: 10 });
      assert.ok(res.records.some(r => r.id === 7));
    });

    it('关键词首尾空格会被 trim', async () => {
      const res = await LF.api.searchItems({ keyword: '   校园卡   ', page: 1, pageSize: 10 });
      assert.ok(res.records.some(r => r.id === 1));
    });

    it('空关键词等价于浏览全部', async () => {
      const res = await LF.api.searchItems({ keyword: '', page: 1, pageSize: 20 });
      assert.equal(res.total, 14);
    });

    it('无结果时返回空数组而不是报错', async () => {
      const res = await LF.api.searchItems({ keyword: '不存在的关键词zzz', page: 1, pageSize: 10 });
      // 被测对象产生于 vm 沙箱（独立 realm），这里用长度与 total 判定，避免跨 realm 原型差异
      assert.equal(res.records.length, 0);
      assert.equal(res.total, 0);
    });
  });

  /* ---------------- 详情与推荐 ---------------- */
  describe('详情与相关推荐', () => {
    it('发布者本人查看：isOwner=true 且浏览量不增加', async () => {
      await loginDemo(LF);
      const d = await LF.api.getItemDetail(1); // id=1 属于演示账号
      assert.equal(d.isOwner, true);
      assert.equal(d.viewCount, 3);
      assert.ok(!d.contact && d.contactValue === undefined, '详情不得泄露联系方式');
      assert.equal(d.publisher.displayName, '林同学');
    });

    it('他人每次查看详情浏览量自增（12→13→14）', async () => {
      await loginDemo(LF);
      const a = await LF.api.getItemDetail(2); // id=2 属于他人
      const b = await LF.api.getItemDetail(2);
      assert.equal(a.viewCount, 13);
      assert.equal(b.viewCount, 14);
      assert.equal(b.isOwner, false);
    });

    it('访问不存在的信息应报错', async () => {
      await loginDemo(LF);
      await expectReject(LF.api.getItemDetail(9999), /不存在|删除/);
    });

    it('相关推荐：同类型、不含自己、最多 2 条、进行中优先', async () => {
      await loginDemo(LF);
      const d = await LF.api.getItemDetail(1); // 寻物
      assert.ok(d.relatedItems.length <= 2);
      assert.ok(d.relatedItems.length > 0);
      assert.ok(!d.relatedItems.some(r => r.id === 1));
      assert.deepEqual(Array.from(d.relatedItems, r => r.status), ['searching', 'searching']);
      assert.ok(d.relatedItems.some(r => r.id === 14));
    });
  });

  /* ---------------- 联系方式（等价类：微信/手机 + 权限） ---------------- */
  describe('联系方式', () => {
    it('微信号识别并返回发布者与交接地点', async () => {
      await loginDemo(LF);
      const c = await LF.api.getItemContact(1);
      assert.equal(c.contactType, 'wechat');
      assert.equal(c.contactValue, 'lin_2024_card');
      assert.equal(c.publisherName, '林同学');
      assert.equal(c.meetingPlace, '图书馆一楼服务台');
    });

    it('11 位手机号识别为 mobile', async () => {
      await loginDemo(LF);
      const c = await LF.api.getItemContact(2);
      assert.equal(c.contactType, 'mobile');
      assert.equal(c.contactValue, '13800001111');
    });

    it('未登录不能获取联系方式', async () => {
      await expectReject(LF.api.getItemContact(1), /登录/);
    });
  });

  /* ---------------- 发布（正常路径 + 校验/边界） ---------------- */
  describe('发布信息', () => {
    beforeEach(async () => { await loginDemo(LF); });

    it('发布寻物：生成 L 前缀编号、初始状态 searching，并立即进入“我的发布”', async () => {
      const res = await LF.api.createItem(validPayload(LF));
      const ymd = new Date();
      const ymdStr = '' + ymd.getFullYear() +
        String(ymd.getMonth() + 1).padStart(2, '0') + String(ymd.getDate()).padStart(2, '0');
      assert.ok(new RegExp('^L' + ymdStr + '\\d{2}$').test(res.itemNo), res.itemNo);
      assert.equal(res.status, 'searching');
      const mine = await LF.api.getMyItems({ scope: 'all', page: 1, pageSize: 20 });
      assert.ok(mine.records.some(r => r.id === res.id));
    });

    it('发布招领：F 前缀编号、初始状态 pending_claim', async () => {
      const res = await LF.api.createItem(validPayload(LF, {
        type: 'found', name: '捡到一块手表', contact: '13712345678'
      }));
      assert.ok(/^F\d{8}\d{2}$/.test(res.itemNo));
      assert.equal(res.status, 'pending_claim');
    });

    it('同一天连续发布，编号序号递增', async () => {
      const a = await LF.api.createItem(validPayload(LF, { name: '物品甲' }));
      const b = await LF.api.createItem(validPayload(LF, { name: '物品乙' }));
      assert.equal(Number(a.itemNo.slice(-2)) + 1, Number(b.itemNo.slice(-2)));
    });

    it('边界：发生时间晚于当前时间 5 分钟以上被拒绝', async () => {
      await expectReject(
        LF.api.createItem(validPayload(LF, { occurredAt: LF.db.formatTs(new Date(Date.now() + 3600000)) })),
        /不能晚于当前时间/
      );
    });

    it('必填校验：名称为空、未勾选协议、非法类别、联系方式为空分别被拒', async () => {
      await expectReject(LF.api.createItem(validPayload(LF, { name: '   ' })), /物品名称/);
      await expectReject(LF.api.createItem(validPayload(LF, { agreementAccepted: false })), /确认信息真实/);
      await expectReject(LF.api.createItem(validPayload(LF, { categoryCode: 'not_exist' })), /物品类别/);
      await expectReject(LF.api.createItem(validPayload(LF, { contact: '' })), /联系方式/);
      await expectReject(LF.api.createItem(validPayload(LF, { location: '' })), /地点/);
    });

    it('图片超过 3 张被拒绝', async () => {
      const imgs = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'];
      await expectReject(LF.api.createItem(validPayload(LF, { imageUrls: imgs })), /3 张/);
    });
  });

  /* ---------------- 状态更新（状态迁移 + 权限） ---------------- */
  describe('状态更新', () => {
    beforeEach(async () => { await loginDemo(LF); });

    it('发布者可把寻物标记为已找回，文案正确并带更新时间', async () => {
      const created = await LF.api.createItem(validPayload(LF));
      const res = await LF.api.updateItemStatus(created.id, 'recovered');
      assert.equal(res.status, 'recovered');
      assert.equal(res.statusText, '已找回');
      assert.ok(res.updatedAt);
    });

    it('幂等：重复设置为同一状态仍然成功', async () => {
      const created = await LF.api.createItem(validPayload(LF));
      await LF.api.updateItemStatus(created.id, 'recovered');
      const again = await LF.api.updateItemStatus(created.id, 'recovered');
      assert.equal(again.status, 'recovered');
    });

    it('权限：不能修改他人发布的信息', async () => {
      await expectReject(LF.api.updateItemStatus(2, 'returned'), /本人|权限/);
    });

    it('非法状态迁移：寻物不能置为“已归还”，招领不能置为“已找回”', async () => {
      const lost = await LF.api.createItem(validPayload(LF, { type: 'lost' }));
      const found = await LF.api.createItem(validPayload(LF, { type: 'found', contact: '13712345678' }));
      await expectReject(LF.api.updateItemStatus(lost.id, 'returned'), /状态/);
      await expectReject(LF.api.updateItemStatus(found.id, 'recovered'), /状态/);
    });
  });

  /* ---------------- 我的发布统计 + 个人资料 ---------------- */
  describe('我的发布与个人资料', () => {
    beforeEach(async () => { await loginDemo(LF); });

    it('演示账号初始：共 5 条、进行中 3、已结束 2，范围筛选数量正确', async () => {
      const all = await LF.api.getMyItems({ scope: 'all', page: 1, pageSize: 20 });
      const ongoing = await LF.api.getMyItems({ scope: 'ongoing', page: 1, pageSize: 20 });
      const closed = await LF.api.getMyItems({ scope: 'closed', page: 1, pageSize: 20 });
      assert.equal(all.summary.total, 5);
      assert.equal(all.summary.ongoing, 3);
      assert.equal(all.summary.closed, 2);
      assert.equal(ongoing.records.length, 3);
      assert.equal(closed.records.length, 2);
      assert.ok(Array.from(closed.records).every(r => ['recovered', 'returned'].includes(r.status)));
    });

    it('发布并结束一条后统计联动更新（6 条→进行中 3 / 已结束 3）', async () => {
      const created = await LF.api.createItem(validPayload(LF));
      await LF.api.updateItemStatus(created.id, 'recovered');
      const all = await LF.api.getMyItems({ scope: 'all', page: 1, pageSize: 20 });
      assert.equal(all.summary.total, 6);
      assert.equal(all.summary.ongoing, 3);
      assert.equal(all.summary.closed, 3);
    });

    it('更新个人资料成功，传 null 清空学院', async () => {
      const u = await LF.api.updateCurrentUser({ nickname: '小林', avatarUrl: null, college: null, grade: '2024' });
      assert.equal(u.nickname, '小林');
      assert.equal(u.college, null);
      assert.equal(u.grade, '2024');
      const me = await LF.api.getCurrentUser();
      assert.equal(me.nickname, '小林');
    });

    it('昵称为空时拒绝更新资料', async () => {
      await expectReject(
        LF.api.updateCurrentUser({ nickname: '   ', college: null, grade: null }),
        /昵称/
      );
    });
  });

  /* ---------------- 图片上传的前置校验（DOM 相关成功路径见浏览器手测） ---------------- */
  describe('图片上传校验', () => {
    beforeEach(async () => { await loginDemo(LF); });

    it('不支持的文件类型被拒绝', async () => {
      await expectReject(LF.api.uploadImage({ type: 'image/gif', size: 100 }), /JPG|PNG|WEBP/);
    });

    it('超过 5MB 的图片被拒绝', async () => {
      await expectReject(
        LF.api.uploadImage({ type: 'image/png', size: 6 * 1024 * 1024 }),
        /5 ?MB|5 ?M|超过 5/
      );
    });
  });
});
