/*
 * db.test.js — 本地数据库工具单元测试
 * 覆盖：联系方式类型识别、时间格式化、信息编号生成、localStorage 持久化与重置。
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createEnv, loginDemo } = require('./helpers/env.js');

let LF, localStorage;

describe('本地数据库 db', () => {
  beforeEach(() => {
    const env = createEnv();
    LF = env.LF;
    localStorage = env.localStorage;
    LF.db.load(); // 触发首次初始化（写入种子数据）
  });

  describe('联系方式类型识别 detectContactType（等价类 + 边界）', () => {
    it('1 开头的 11 位数字判定为手机号', () => {
      assert.equal(LF.db.detectContactType('13812345678'), 'mobile');
      assert.equal(LF.db.detectContactType('19900001111'), 'mobile');
    });

    it('带首尾空格的手机号仍能识别', () => {
      assert.equal(LF.db.detectContactType('  13812345678 '), 'mobile');
    });

    it('微信号、非 1 开头或位数不对的数字判定为微信号', () => {
      assert.equal(LF.db.detectContactType('lin_2024_card'), 'wechat');
      assert.equal(LF.db.detectContactType('1234567890'), 'wechat');   // 仅 10 位
      assert.equal(LF.db.detectContactType('23812345678'), 'wechat');  // 非 1 开头
    });
  });

  describe('时间格式化 formatTs', () => {
    it('输出后端约定的 yyyy-MM-ddTHH:mm:ss', () => {
      const d = new Date(2026, 8, 25, 10, 20, 5); // 月份 0 基：8 = 9 月
      assert.equal(LF.db.formatTs(d), '2026-09-25T10:20:05');
      assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(LF.db.formatTs(new Date())));
    });
  });

  describe('信息编号生成 nextItemNo（边界：前缀、日期、序号）', () => {
    it('寻物 L / 招领 F 前缀，同类型同日序号从 01 递增', () => {
      const day = new Date(2026, 7, 1); // 2026-08-01，避开种子数据日期
      assert.equal(LF.db.nextItemNo('lost', day), 'L2026080101');
      assert.equal(LF.db.nextItemNo('lost', day), 'L2026080102');
      assert.equal(LF.db.nextItemNo('found', day), 'F2026080101');
    });

    it('不同日期序号各自计数', () => {
      const d1 = new Date(2026, 7, 1);
      const d2 = new Date(2026, 7, 2);
      assert.equal(LF.db.nextItemNo('lost', d1), 'L2026080101');
      assert.equal(LF.db.nextItemNo('lost', d2), 'L2026080201');
    });
  });

  describe('持久化与重置', () => {
    it('发布后数据写入 localStorage，刷新（重新 load）仍在', async () => {
      await loginDemo(LF);
      await LF.api.createItem({
        type: 'lost', name: '持久化测试物品', categoryCode: 'digital',
        location: '测试地点', occurredAt: LF.db.formatTs(new Date(Date.now() - 600000)),
        description: null, message: null, imageUrls: [], contact: 'persist_wx',
        meetingPlace: null, agreementAccepted: true
      });
      const raw = JSON.parse(localStorage.getItem('lf_local_db_v1'));
      assert.equal(raw.items.length, 15);
      assert.ok(raw.items.some(it => it.name === '持久化测试物品'));
    });

    it('resetDemo 恢复为 14 条种子数据', async () => {
      await loginDemo(LF);
      await LF.api.createItem({
        type: 'found', name: '待重置物品', categoryCode: 'digital',
        location: '地点', occurredAt: LF.db.formatTs(new Date(Date.now() - 600000)),
        imageUrls: [], contact: '13712345678', agreementAccepted: true
      });
      assert.equal(JSON.parse(localStorage.getItem('lf_local_db_v1')).items.length, 15);
      await LF.localApi.resetDemo();
      assert.equal(JSON.parse(localStorage.getItem('lf_local_db_v1')).items.length, 14);
    });
  });
});
