const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEnv, loginDemo } = require('./helpers/env');

function payload(LF) {
  return { type: 'lost', name: '回滚测试水杯', categoryCode: 'cup_bottle', location: '图书馆',
    occurredAt: LF.db.formatTs(new Date(Date.now() - 600000)), contact: 'demo_wx', agreementAccepted: true };
}
test('所有搜索条件取交集，地点部分匹配、关键词去空格', async () => {
  const { LF } = createEnv();
  const item = LF.db.load().items.find(it => it.status === 'searching');
  const result = await LF.api.searchItems({ keyword: ' ' + item.name + ' ', type: item.type,
    categoryCode: item.categoryCode, location: item.location.slice(0, 2), status: 'ongoing' });
  assert.ok(result.records.some(it => it.id === item.id));
  assert.ok(result.records.every(it => it.type === item.type && it.categoryCode === item.categoryCode));
  assert.equal((await LF.api.searchItems({ keyword: item.name, status: 'closed' })).total, 0);
});
test('状态分组涵盖两种类型，旧搜索参数仍有效', async () => {
  const { LF } = createEnv();
  const open = await LF.api.searchItems({ status: 'ongoing', pageSize: 20 });
  const closed = await LF.api.searchItems({ status: 'closed', pageSize: 20 });
  assert.equal(open.total + closed.total, 14);
  assert.ok(open.records.every(it => ['searching', 'pending_claim'].includes(it.status)));
  assert.ok(closed.records.every(it => ['recovered', 'returned'].includes(it.status)));
  assert.equal((await LF.api.searchItems({ keyword: '', type: 'all' })).total, 14);
});
test('编号关键词匹配且地点不匹配时返回空结果', async () => {
  const { LF } = createEnv(); const item = LF.db.load().items[0];
  assert.equal((await LF.api.searchItems({ keyword: item.itemNo })).records[0].id, item.id);
  assert.equal((await LF.api.searchItems({ keyword: item.itemNo, location: '不可能的地点' })).total, 0);
});
test('三种排序正确，排序不污染数据库顺序，分页不重复', async () => {
  const { LF } = createEnv(); const before = JSON.stringify(LF.db.load().items);
  for (const sort of ['newest', 'oldest', 'occurred']) {
    const all = await LF.api.searchItems({ sort, pageSize: 20 });
    const field = sort === 'occurred' ? 'occurredAt' : 'publishedAt';
    const times = Array.from(all.records, it => it[field]);
    const expected = times.slice().sort();
    if (sort !== 'oldest') expected.reverse();
    assert.deepEqual(times, expected);
    const first = await LF.api.searchItems({ sort, page: 1, pageSize: 4 });
    const second = await LF.api.searchItems({ sort, page: 2, pageSize: 4 });
    assert.deepEqual(Array.from(first.records.concat(second.records), it => it.id), Array.from(all.records.slice(0, 8), it => it.id));
  }
  assert.equal(JSON.stringify(LF.db.load().items), before);
});
test('相同发布时间使用编号确定顺序', async () => {
  const { LF } = createEnv();
  LF.db.transaction(st => { st.items.forEach(it => { it.publishedAt = '2026-01-01T10:00:00'; }); });
  const newest = await LF.api.searchItems({ sort: 'newest', pageSize: 20 });
  const oldest = await LF.api.searchItems({ sort: 'oldest', pageSize: 20 });
  assert.equal(newest.records[0].id, 14); assert.equal(oldest.records[0].id, 1);
});
test('草稿刷新恢复文字，排除图片、协议和提交状态', async () => {
  const env = createEnv(); await loginDemo(env.LF);
  env.LF.draft.save({ type: 'found', name: '蓝色杯子', contact: 'demo', occurredDate: '2026-10-01',
    imageUrls: ['data:image/jpeg;base64,abc'], agreementAccepted: true, submitting: true });
  const restored = createEnv({ localStorage: env.localStorage, sessionStorage: env.sessionStorage }).LF.draft.load();
  assert.equal(restored.name, '蓝色杯子'); assert.equal(restored.type, 'found');
  assert.equal(restored.imageUrls, undefined); assert.equal(restored.agreementAccepted, undefined);
  assert.equal(restored.submitting, undefined);
});
test('清除草稿和空表单不会修改发布记录', async () => {
  const { LF } = createEnv(); await loginDemo(LF);
  const before = JSON.stringify(LF.db.load().items);
  LF.draft.save({ name: '测试' }); LF.draft.clear(); assert.equal(LF.draft.load(), null);
  LF.draft.save({ occurredDate: '2026-10-07' }); assert.equal(LF.draft.load(), null);
  assert.equal(JSON.stringify(LF.db.load().items), before);
});
test('非法旧草稿内容安全降级，保存失败保留原草稿', async () => {
  const { LF, localStorage } = createEnv(); await loginDemo(LF);
  localStorage.setItem('lf_publish_draft_v1', '{broken'); assert.equal(LF.draft.load(), null);
  LF.draft.save({ name: '原草稿' }); const previous = JSON.stringify(LF.draft.load());
  localStorage.setItem = () => { throw Error('quota'); };
  assert.throws(() => LF.draft.save({ name: '新草稿' }), /草稿未保存/);
  assert.equal(JSON.stringify(LF.draft.load()), previous);
});
for (const action of ['create', 'status', 'profile', 'login', 'view']) {
  test('存储失败回滚：' + action, async () => {
    const { LF, localStorage } = createEnv(); await loginDemo(LF);
    const before = JSON.stringify(LF.db.load());
    const stored = localStorage.getItem('lf_local_db_v1');
    localStorage.setItem = () => { throw Error('quota'); };
    const calls = {
      create: () => LF.api.createItem(payload(LF)), status: () => LF.api.updateItemStatus(1, 'recovered'),
      profile: () => LF.api.updateCurrentUser({ nickname: '不应保存' }),
      login: () => LF.api.login({ email: 'web_demo@example.com', password: 'demo_pass_123' }), view: () => LF.api.getItemDetail(2)
    };
    await assert.rejects(calls[action](), /存储/);
    assert.equal(JSON.stringify(LF.db.load()), before);
    assert.equal(localStorage.getItem('lf_local_db_v1'), stored);
  });
}
test('发布失败后重试只生成一条记录且不跳过序号', async () => {
  const { LF, localStorage } = createEnv(); await loginDemo(LF);
  const seq = LF.db.load().seq.item; const write = localStorage.setItem;
  localStorage.setItem = () => { throw Error('quota'); };
  await assert.rejects(LF.api.createItem(payload(LF)));
  localStorage.setItem = write;
  const result = await LF.api.createItem(payload(LF));
  assert.equal(result.id, seq + 1); assert.equal(LF.db.load().items.length, 15);
});
test('地址栏条件保留中文、等号、百分号，非法编码不崩溃', () => {
  const { LF } = createEnv(); const source = { keyword: '杯子=100%+', location: '图书馆 二楼', status: 'closed' };
  assert.equal(JSON.stringify(LF.query.parse(LF.query.stringify(source))), JSON.stringify(source));
  assert.equal(LF.query.parse('keyword=%E0%A4%A').keyword, '%E0%A4%A');
  assert.equal(Object.prototype.hasOwnProperty.call(LF.query.parse('__proto__=x&constructor=y'), 'constructor'), false);
});
