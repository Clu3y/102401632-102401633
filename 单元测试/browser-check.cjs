/* 可选 Chrome 页面验收。应用与 Node 单元测试无需 Playwright。
 * 运行前启动静态服务；LF_PREVIEW_URL 可覆盖默认预览地址。
 * 使用全新浏览器上下文，不读取个人 Chrome 资料或已有演示数据。
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.LF_PLAYWRIGHT_PATH || 'playwright');
const origin = process.env.LF_PREVIEW_URL || 'http://127.0.0.1:18790';
const root = path.resolve(__dirname, '..');
const shots = path.join(root, 'docs/screenshots');
const screenshotPrefix = process.env.LF_SCREENSHOT_PREFIX || '优化-';

async function registerAccount(page, email = 'browser-demo@example.com') {
  await page.evaluate(() => LF.router.go('#/auth?mode=register'));
  await page.waitForSelector('.account-form');
  await page.locator('[name="nickname"]').fill('林同学');
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill('browser_demo_123');
  if (await page.locator('[name="bindLegacy"]').count()) await page.locator('[name="bindLegacy"]').check();
  await page.locator('.account-submit').click();
  await page.waitForSelector('.profile-name');
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); const errors = []; const checks = [];
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    async function route(hash, selector) {
      await page.evaluate(h => { LF.router.go(h); }, hash);
      if (selector) await page.waitForSelector(selector);
    }
    async function screenshot(name) {
      await page.evaluate(() => { LF.ui.hideToast(); const scroll = document.querySelector('[data-role="scroll"],.page-flow'); if (scroll) scroll.scrollTop = 0; });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(shots, screenshotPrefix + name + '.png') });
    }
    async function form(field, value) { await page.locator('[data-field="' + field + '"]').fill(value); }
    const past = new Date(Date.now() - 600000);
    const date = [past.getFullYear(), String(past.getMonth() + 1).padStart(2, '0'), String(past.getDate()).padStart(2, '0')].join('-');
    const time = [past.getHours(), past.getMinutes()].map(n => String(n).padStart(2, '0')).join(':');

    await page.goto(origin); await page.waitForSelector('.item-card');
    await screenshot('桌面首页');
    await page.setViewportSize({ width: 393, height: 852 }); await screenshot('手机首页');
    await registerAccount(page);
    await route('#/publish', '.publish-page');
    await page.locator('[data-act="submit"]').click(); await page.waitForSelector('.modal-dialog');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.modal-dialog').count(), 0);
    await page.locator('[data-act="choose-type"][data-type="lost"]').click();
    await form('name', '验收水杯 100%');
    await page.locator('[data-act="choose-category"][data-code="cup_bottle"]').click();
    await form('location', '图书馆二楼'); await form('description', '仅验收使用：杯盖有星星贴纸');
    await form('contact', 'demo_contact_100'); await form('meetingPlace', '图书馆服务台');
    const image = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 10; canvas.height = 10; canvas.getContext('2d').fillRect(0, 0, 10, 10); return canvas.toDataURL('image/png').split(',')[1]; });
    await page.locator('[data-role="file-input"]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
    await page.waitForSelector('.image-item'); await page.locator('[data-field="agreement"]').check();
    await page.waitForFunction(() => LF.draft.load()?.name === '验收水杯 100%');
    await page.reload(); await page.waitForSelector('.publish-page');
    assert.equal(await page.locator('[data-field="name"]').inputValue(), '验收水杯 100%');
    assert.equal(await page.locator('.image-item').count(), 0);
    assert.equal(await page.locator('[data-field="agreement"]').isChecked(), false);
    await route('#/home', '.item-card');
    await route('#/publish?type=found', '.publish-page');
    assert.equal(await page.locator('.type-card.active').getAttribute('data-type'), 'lost');
    await page.locator('[data-act="reset"]').click(); await page.waitForSelector('.modal-dialog');
    await page.locator('[data-act="cancel"]').click();
    assert.equal(await page.locator('[data-field="name"]').inputValue(), '验收水杯 100%');
    checks.push('文字草稿自动保存、刷新恢复、排除图片与协议');
    await page.locator('[data-role="file-input"]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await page.waitForFunction(() => document.querySelector('.toast')?.textContent.includes('解析失败'));
    await form('date', '2099-01-01'); await page.locator('[data-field="agreement"]').check();
    await page.locator('[data-act="submit"]').click();
    await page.waitForFunction(() => document.querySelector('.toast')?.textContent.includes('不能晚于'));
    await form('date', date); await form('time', time);
    await page.evaluate(() => {
      window.lfOriginalWrite = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (key === 'lf_local_db_v1') throw Error('quota'); return window.lfOriginalWrite.call(this, key, value); };
    });
    await page.locator('[data-act="submit"]').click();
    await page.waitForFunction(() => document.querySelector('.toast')?.textContent.includes('本地存储'));
    assert.equal(await page.evaluate(() => LF.db.load().items.length), 14);
    assert.equal(await page.locator('[data-field="name"]').inputValue(), '验收水杯 100%');
    await page.evaluate(() => { Storage.prototype.setItem = window.lfOriginalWrite; });
    await screenshot('手机发布');
    await page.locator('[data-act="submit"]').evaluate(el => { el.click(); el.click(); });
    await page.waitForSelector('.success-title');
    assert.equal(await page.evaluate(() => LF.db.load().items.length), 15);
    assert.equal(await page.evaluate(() => LF.draft.load()), null);
    assert.equal(await page.locator('.receipt-name').textContent(), '验收水杯 100%');
    const lostId = await page.evaluate(() => LF.db.load().items.at(-1).id);
    checks.push('缺失必填、图片解析失败、未来时间、保存失败、重复点击、成功后清除草稿');
    await page.setViewportSize({ width: 1440, height: 1000 }); await screenshot('桌面成功');
    await route('#/search?keyword=' + encodeURIComponent('星星贴纸') + '&type=lost&categoryCode=cup_bottle&location=' + encodeURIComponent('图书馆') + '&status=ongoing&sort=oldest', '.result-card');
    assert.equal(await page.locator('.result-card').count(), 1);
    await screenshot('桌面搜索'); await page.reload(); await page.waitForSelector('.result-card');
    assert.equal(await page.locator('[data-field="location"]').inputValue(), '图书馆');
    await route('#/detail?id=' + lostId, '.detail-title');
    await page.goBack(); await page.waitForSelector('.result-card'); assert.equal(await page.locator('.result-card').count(), 1);
    await route('#/detail?id=' + lostId, '.detail-title'); await screenshot('桌面详情');
    await page.locator('[data-act="open-contact"]').click(); await page.waitForSelector('.sheet-mask');
    for (let n = 0; n < 6; n++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.querySelector('.sheet-mask').contains(document.activeElement)), true);
    }
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.sheet-mask').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-act')), 'open-contact');
    await page.setViewportSize({ width: 393, height: 852 });
    await page.locator('[data-act="open-contact"]').click(); await page.waitForSelector('.contact-value');
    await screenshot('手机联系');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(Error('denied')) }, configurable: true });
      document.execCommand = () => false;
    });
    await page.locator('[data-act="copy-contact"]').click();
    await page.waitForFunction(() => document.querySelector('.toast')?.textContent.includes('手动复制'));
    assert.equal(await page.evaluate(() => document.activeElement.matches('.contact-value')), true);
    checks.push('组合筛选、地址刷新与后退恢复、弹窗焦点约束与恢复、复制失败降级');
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      window.lfOriginalSearch = LF.api.searchItems;
      LF.api.searchItems = params => window.lfOriginalSearch(params).then(result => new Promise(resolve => {
        setTimeout(() => { if (params.type === 'lost') window.lfSlowSearchDone = true; resolve(result); }, params.type === 'lost' ? 450 : 10);
      }));
    });
    await route('#/search?type=lost'); await page.waitForFunction(() => location.hash === '#/search?type=lost');
    await route('#/search?type=found', '.result-card');
    await page.waitForFunction(() => window.lfSlowSearchDone === true);
    assert.equal(await page.locator('.result-card .tag-lost').count(), 0);
    assert.ok(await page.locator('.result-card .tag-found').count() > 0);
    await page.evaluate(() => { LF.api.searchItems = window.lfOriginalSearch; });
    checks.push('快速切换条件，迟到旧响应不会覆盖新结果');
    async function status(id, action, expected) {
      console.log('状态验收', id, action, expected);
      await route('#/my', '[data-act="open-status"][data-id="' + id + '"]');
      await page.locator('[data-act="open-status"][data-id="' + id + '"]').click();
      await page.locator('[data-act="apply"][data-action="' + action + '"]').click();
      await page.waitForFunction(({ id, expected }) => LF.db.load().items.find(it => it.id === id).status === expected, { id, expected });
      await page.waitForFunction(() => !document.querySelector('.status-sheet'));
    }
    await status(lostId, 'end', 'recovered'); await page.reload(); await page.waitForSelector('.post-card');
    assert.equal(await page.evaluate(id => LF.db.load().items.find(it => it.id === id).status, lostId), 'recovered');
    await route('#/search?keyword=' + encodeURIComponent('验收水杯 100%') + '&status=closed', '.result-card');
    assert.equal(await page.locator('.tag-recovered').count(), 1);
    await status(lostId, 'start', 'searching');
    await route('#/publish?type=found', '.publish-page');
    assert.equal(await page.locator('.type-card.active').getAttribute('data-type'), 'found');
    await form('name', '验收招领书籍'); await page.locator('[data-act="choose-category"][data-code="book_stationery"]').click();
    await form('location', '第一教学楼'); await form('date', date); await form('time', time); await form('contact', '13800000000');
    await page.locator('[data-field="agreement"]').check(); await page.locator('[data-act="submit"]').click(); await page.waitForSelector('.success-title');
    const foundId = await page.evaluate(() => LF.db.load().items.at(-1).id); const successHash = await page.evaluate(() => location.hash);
    await status(foundId, 'end', 'returned'); await status(foundId, 'start', 'pending_claim');
    await route('#/my', '.profile-edit-btn'); await page.locator('.profile-edit-btn').click(); await page.waitForSelector('.profile-sheet');
    const avatar = { name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') };
    await page.locator('[data-role="avatar-file"]').setInputFiles(avatar);
    await page.waitForFunction(() => document.querySelector('.profile-avatar-preview img') && !document.querySelector('.profile-upload-btn').classList.contains('disabled'));
    await page.locator('[data-role="avatar-file"]').setInputFiles(avatar);
    await page.waitForFunction(() => !document.querySelector('.profile-upload-btn').classList.contains('disabled'));
    await page.locator('[data-profile-field="nickname"]').fill('界面验收同学'); await page.locator('[data-act="save-profile"]').click();
    await page.waitForFunction(() => document.querySelector('.profile-name')?.textContent === '界面验收同学');
    await screenshot('手机我的发布');
    checks.push('寻物与招领发布、本人结束和恢复、刷新持久化、搜索状态联动、个人资料修改');

    const sizes = [[360,800],[393,852],[768,1024],[1024,768],[1440,1000],[852,393]];
    const routes = [['#/home','.item-card'],['#/search','.result-card'],['#/publish','.publish-page'],['#/detail?id='+lostId,'.detail-title'],[successHash,'.success-title'],['#/my','.post-card']];
    const matrix = [];
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      for (const [hash, selector] of routes) {
        await route(hash, selector);
        const layout = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          innerOverflow: Array.from(document.querySelectorAll('.page-scroll,.page-flow,.search-filters,.publish-layout')).filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className),
          bar: (() => { const el = document.querySelector('.bottom-bar'); if (!el) return true; const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; })(),
          columns: (() => { const el = document.querySelector('.item-list,.result-list-inner,.post-list-inner'); return el ? getComputedStyle(el).gridTemplateColumns.split(' ').length : null; })()
        }));
        assert.equal(layout.overflow, false, width + ' ' + hash + ' 页面横向溢出');
        assert.deepEqual(layout.innerOverflow, [], width + ' ' + hash + ' 容器横向溢出');
        assert.equal(layout.bar, true, width + ' ' + hash + ' 底部栏遮挡');
        if (layout.columns) assert.equal(layout.columns, width < 640 ? 1 : width < 1280 ? 2 : 3);
        matrix.push({ width, height, hash: hash.split('?')[0], columns: layout.columns });
      }
    }
    await route('#/search?keyword=' + encodeURIComponent('无匹配验收xyz'), '.no-result');
    assert.equal(await page.locator('.result-card').count(), 0);
    await page.locator('[data-act="reset-filters"]').click(); await page.waitForSelector('.result-card');
    checks.push('无结果与清空条件');
    // 等效 200% 浏览器缩放：1440px 设备采用 720 CSS px 的重排布局。
    await page.setViewportSize({ width: 720, height: 500 }); await route('#/home', '.item-card');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    checks.push('720 CSS px 等效 200% 重排布局');
    await page.setViewportSize({ width: 1440, height: 1000 }); await route('#/home', '.item-card');
    await page.locator('[data-role="scroll"]').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForFunction(() => document.querySelectorAll('.item-card').length === 16);
    const top = await page.locator('[data-role="scroll"]').evaluate(el => el.scrollTop);
    assert.ok(top > 0); checks.push('分页加载保留滚动位置');
    const localContext = await browser.newContext();
    const local = await localContext.newPage(); local.on('pageerror', e => errors.push(e.message));
    local.setDefaultTimeout(15000);
    await local.goto('file://' + path.join(root, 'index.html')); await local.waitForSelector('.item-card');
    assert.equal(await local.evaluate(() => LF.db.load().items.length), 14);
    assert.equal(await page.evaluate(() => LF.db.load().items.length), 16);
    await registerAccount(local, 'file-demo@example.com');
    await local.evaluate(() => LF.router.go('#/publish?type=found')); await local.waitForSelector('.publish-page');
    await local.locator('[data-field="name"]').fill('本地 HTML 验收');
    await local.locator('[data-act="choose-category"][data-code="digital"]').click();
    await local.locator('[data-field="location"]').fill('图书馆'); await local.locator('[data-field="contact"]').fill('file_demo');
    await local.locator('[data-field="date"]').fill(date); await local.locator('[data-field="time"]').fill(time);
    await local.locator('[data-field="agreement"]').check(); await local.locator('[data-act="submit"]').click(); await local.waitForSelector('.success-title');
    await local.reload(); await local.waitForSelector('.success-title');
    assert.equal(await local.evaluate(() => LF.db.load().items.length), 15);
    assert.equal(await page.evaluate(() => LF.db.load().items.length), 16);
    checks.push('直接打开 HTML 可发布并刷新保留，HTTP 与 file 数据相互独立');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: await browser.version(), checks, matrix, pageErrors: errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
