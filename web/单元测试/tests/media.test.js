const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createEnv, JS_ROOT, loginDemo } = require('./helpers/env');

test('全部 14 条旧演示记录映射到独立、存在的本地素材', () => {
  const { LF } = createEnv();
  const items = LF.db.load().items;
  const urls = items.map(item => {
    const result = LF.media.resolve(item);
    assert.equal(result.mediaKind, 'demo');
    assert.equal(result.images.length, 1);
    assert.ok(fs.existsSync(path.join(JS_ROOT, '..', result.images[0])));
    return result.coverImageUrl;
  });
  assert.equal(new Set(urls).size, 14);
  assert.match(urls[13], /navy-umbrella/);
  assert.match(urls[11], /white-powerbank/);
});

test('旧浏览器数据无需迁移，解析和列表读取不改写内存或存储', async () => {
  const old = createEnv(); old.LF.db.load();
  const stored = old.localStorage.getItem('lf_local_db_v1');
  const { LF, localStorage } = createEnv({ localStorage: old.localStorage });
  const before = JSON.stringify(LF.db.load());
  LF.db.load().items.forEach(item => LF.media.resolve(item));
  const list = await LF.localApi.getItems({ pageSize: 20 });
  assert.equal(list.records.filter(item => item.mediaKind === 'demo').length, 14);
  assert.equal(JSON.stringify(LF.db.load()), before);
  assert.equal(localStorage.getItem('lf_local_db_v1'), stored);
});

test('演示记录一旦带有用户图片，保留全部用户图片且返回独立数组', () => {
  const { LF } = createEnv();
  const item = LF.db.load().items[0];
  item.images = ['data:image/png;base64,USER', 'https://example.test/user.webp'];
  const result = LF.media.resolve(item);
  assert.equal(result.mediaKind, 'upload');
  assert.equal(JSON.stringify(result.images), JSON.stringify(item.images));
  result.images.pop();
  assert.equal(item.images.length, 2);
});

test('编号、名称、类别、类型和完整旧图片列表任一不符都不冒充演示帖', () => {
  const { LF } = createEnv();
  const original = LF.db.load().items[0];
  const cases = [{ id: 15 }, { name: '新的校园卡' }, { categoryCode: 'digital' },
    { type: 'found' }, { images: [] }, { images: [...original.images, 'data:image/png;base64,USER'] }];
  for (const changed of cases) assert.notEqual(LF.media.resolve({ ...original, ...changed }).mediaKind, 'demo');
});

test('真实发布的同名同类别新记录保留无图状态', async () => {
  const { LF } = createEnv();
  await loginDemo(LF, 'media-test');
  const original = LF.db.load().items[0];
  const created = await LF.localApi.createItem({ type: original.type, name: original.name,
    categoryCode: original.categoryCode, location: original.location, occurredAt: original.occurredAt,
    contact: 'media_test', agreementAccepted: true });
  const detail = await LF.localApi.getItemDetail(created.id);
  assert.equal(detail.mediaKind, 'placeholder');
  assert.equal(detail.images.length, 0);
});

test('首页、搜索、我的发布与详情使用相同配图，状态改变不影响映射', async () => {
  const { LF } = createEnv();
  await loginDemo(LF, 'media-test');
  await LF.localApi.updateItemStatus(14, 'recovered');
  const list = await LF.localApi.getItems({ pageSize: 20 });
  const search = await LF.localApi.searchItems({ keyword: '雨伞' });
  const mine = await LF.localApi.getMyItems({ pageSize: 20 });
  const detail = await LF.localApi.getItemDetail(14);
  for (const result of [list, search, mine]) {
    const item = result.records.find(item => item.id === 14);
    assert.equal(item.coverImageUrl, detail.images[0]);
    assert.equal(item.mediaKind, 'demo');
  }
});

test('类别回退与图标名称使用白名单，拒绝路径和 SVG 注入', () => {
  const { LF } = createEnv();
  assert.equal(LF.media.fallback('../../secret'), '');
  assert.equal(LF.media.fallback('toString'), '');
  const svg = LF.icons.render('"><script>alert(1)</script>');
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('aria-hidden="true"'));
  assert.ok(!svg.includes('<script>'));
  assert.equal(LF.icons.render('constructor'), LF.icons.render('package'));
});
