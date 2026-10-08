/*
 * utils.test.js — 纯工具函数单元测试
 * 覆盖：时间展示格式 / 相对时间边界（format.js）、图片地址解析（url.js）。
 */
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createEnv } = require('./helpers/env.js');

let LF;

describe('工具函数', () => {
  beforeEach(() => { LF = createEnv().LF; });

  describe('时间格式化 format', () => {
    const ts = '2026-09-25T10:20:00';

    it('formatDateTime → MM月DD日 HH:mm', () => {
      assert.equal(LF.format.formatDateTime(ts), '09月25日 10:20');
    });

    it('formatDateTimeFull → YYYY年MM月DD日 HH:mm', () => {
      assert.equal(LF.format.formatDateTimeFull(ts), '2026年09月25日 10:20');
    });

    it('formatDateTimeShort → MM-DD HH:mm', () => {
      assert.equal(LF.format.formatDateTimeShort(ts), '09-25 10:20');
    });

    it('parseDate 对空值 / 非法值返回 null', () => {
      assert.equal(LF.format.parseDate(''), null);
      assert.equal(LF.format.parseDate('not-a-date'), null);
    });

    it('相对时间边界：刚刚 / 分钟 / 小时 / 天 / 超 7 天回退日期', () => {
      const mk = (ms) => LF.db.formatTs(new Date(Date.now() - ms));
      assert.equal(LF.format.formatRelative(mk(10 * 1000)), '刚刚');
      assert.equal(LF.format.formatRelative(mk(30 * 60000)), '30分钟前');
      assert.equal(LF.format.formatRelative(mk(3 * 3600000)), '3小时前');
      assert.equal(LF.format.formatRelative(mk(3 * 86400000)), '3天前');
      const old = mk(10 * 86400000);
      assert.equal(LF.format.formatRelative(old), LF.format.formatDateTime(old));
    });
  });

  describe('图片地址解析 urlUtil', () => {
    it('http/https 完整地址原样返回', () => {
      assert.equal(LF.urlUtil.resolveImageUrl('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
      assert.equal(LF.urlUtil.resolveImageUrl('http://localhost:8080/x.png'), 'http://localhost:8080/x.png');
    });

    it('dataURL（本地上传图）原样返回', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      assert.equal(LF.urlUtil.resolveImageUrl(dataUrl), dataUrl);
    });

    it('相对路径（内置 SVG）原样返回', () => {
      assert.equal(LF.urlUtil.resolveImageUrl('assets/items/id_card.svg'), 'assets/items/id_card.svg');
    });

    it('serverOrigin 为空时，根相对地址不会被拼到 localhost', () => {
      assert.equal(LF.urlUtil.resolveImageUrl('/uploads/x.jpg'), '/uploads/x.jpg');
    });

    it('空值返回空字符串', () => {
      assert.equal(LF.urlUtil.resolveImageUrl(''), '');
      assert.equal(LF.urlUtil.resolveImageUrl(null), '');
    });

    it('resolveItemImages 同时处理封面与多图', () => {
      const item = LF.urlUtil.resolveItemImages({
        coverImageUrl: 'assets/items/digital.svg',
        images: ['assets/items/digital.svg', '/uploads/b.jpg']
      });
      assert.equal(item.coverImageUrl, 'assets/items/digital.svg');
      assert.deepEqual(Array.from(item.images), ['assets/items/digital.svg', '/uploads/b.jpg']);
    });
  });
});
