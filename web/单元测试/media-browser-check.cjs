/* Chrome 配图回归；使用独立临时浏览器，不读写用户的浏览器资料。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.LF_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const origin = process.env.LF_PREVIEW_URL || 'http://127.0.0.1:18791';
const shots = path.join(root, 'docs/screenshots');
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
  const checks = [], errors = [], external = [], matrix = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) external.push(request.url()); });
    async function route(hash, selector) {
      await page.evaluate(hash => LF.router.go(hash), hash);
      await page.waitForSelector(selector);
    }
    async function settle() {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('img')].filter(img => {
          const rect = img.getBoundingClientRect(); return rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0;
        }).map(img => img.decode().catch(() => {})));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      // Chrome 改变 viewport 后等待合成层完成，避免截图捕获上一帧纹理。
      await page.waitForTimeout(150);
    }
    async function screenshot(name) {
      await page.evaluate(() => LF.ui.hideToast());
      await settle(); await page.screenshot({ path: path.join(shots, (process.env.LF_SCREENSHOT_PREFIX || '素材验收-') + name + '.png') });
    }
    await page.goto(origin); await page.waitForSelector('.item-card');
    const stored = await page.evaluate(() => localStorage.getItem('lf_local_db_v1'));
    const list = await page.evaluate(() => LF.api.getItems({ pageSize: 20 }));
    assert.equal(list.records.filter(item => item.mediaKind === 'demo').length, 14);
    assert.equal(await page.evaluate(() => localStorage.getItem('lf_local_db_v1')), stored);
    await page.reload(); await page.waitForSelector('.item-card');
    assert.equal(await page.evaluate(() => localStorage.getItem('lf_local_db_v1')), stored);
    await screenshot('桌面首页');
    await page.setViewportSize({ width: 393, height: 852 }); await screenshot('手机首页');
    // 验证底部导航实际可点击，且 SVG 继承选中状态颜色。
    await page.locator('#tab-bar [href="#/search"]').click(); await page.waitForSelector('.search-input');
    assert.equal(await page.locator('#tab-bar [aria-current="page"]').getAttribute('href'), '#/search');
    await page.locator('.search-input').fill('雨伞'); await page.locator('[data-act="search"]').click();
    await page.waitForSelector('.result-card');
    assert.equal(await page.locator('.result-card img').getAttribute('src'), list.records.find(item => item.id === 14).coverImageUrl);
    await page.locator('[data-act="clear"]').click(); await page.waitForFunction(() => document.querySelector('.search-input').value === '');
    checks.push('旧浏览器数据无需重置、读取不写入、手机导航、选中状态、搜索图标操作');

    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const item of list.records) {
      await route('#/detail?id=' + item.id, '.hero-img'); await settle();
      const img = page.locator('.hero-img');
      assert.equal(await img.getAttribute('src'), item.coverImageUrl);
      assert.equal(await img.evaluate(el => el.naturalWidth > 0), true);
      assert.equal(await page.locator('.hero .media-caption').textContent(), '演示配图');
      await img.click(); await page.waitForSelector('.lightbox-img');
      assert.equal(await page.locator('.lightbox-img').getAttribute('src'), item.coverImageUrl);
      assert.equal(await page.locator('.lightbox .media-caption').textContent(), '演示配图');
      await page.keyboard.press('Escape'); assert.equal(await page.locator('.lightbox').count(), 0);
    }
    checks.push('14 条演示信息：列表、详情、预览一致，素材全部解码成功，配图标记和 Esc 关闭');
    await route('#/detail?id=12', '.hero-img'); await screenshot('桌面详情');
    await page.setViewportSize({ width: 393, height: 852 }); await screenshot('手机详情');
    await page.locator('.hero-img').click(); await screenshot('手机大图'); await page.locator('.lightbox-close').click();
    await route('#/search', '.result-card'); await screenshot('手机搜索');
    await registerAccount(page);
    await route('#/my', '.post-card'); await screenshot('手机我的发布');

    await route('#/publish', '.publish-page');
    await page.locator('[data-act="choose-type"][data-type="lost"]').click();
    await page.locator('[data-field="name"]').fill('配图验收：用户自己的照片');
    await page.locator('[data-act="choose-category"][data-code="digital"]').click();
    await page.locator('[data-field="location"]').fill('图书馆');
    await page.locator('[data-field="contact"]').fill('media_test_contact');
    const image = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 50; c.height = 40;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#e37d6c'; ctx.fillRect(0,0,50,40);
      return c.toDataURL('image/png').split(',')[1];
    });
    await page.locator('[data-role="file-input"]').setInputFiles(['a','b','c'].map(name => ({ name:name+'.png', mimeType:'image/png', buffer:Buffer.from(image,'base64') })));
    await page.waitForFunction(() => document.querySelectorAll('.image-item').length === 3);
    assert.equal(await page.locator('.image-add').count(), 0);
    await page.locator('.image-remove').first().click(); assert.equal(await page.locator('.image-item').count(), 2);
    await page.locator('.image-thumb').first().click(); await page.waitForSelector('.lightbox');
    await page.locator('.lightbox-next').click(); await page.locator('.lightbox-prev').click();
    await page.locator('.lightbox-close').click();
    await screenshot('手机发布');
    await page.locator('[data-field="agreement"]').check();
    await page.locator('[data-act="submit"]').click(); await page.waitForSelector('.success-title');
    const successHash = await page.evaluate(() => location.hash);
    await screenshot('手机成功');
    const userId = await page.evaluate(() => LF.db.load().items.at(-1).id);
    const userUrls = await page.evaluate(() => LF.db.load().items.at(-1).images);
    assert.equal(userUrls.length, 2); assert.ok(userUrls.every(url => url.startsWith('data:image/jpeg')));
    await route('#/detail?id=' + userId, '.hero-img'); await page.reload(); await page.waitForSelector('.hero-img');
    assert.equal(await page.locator('.hero-img').first().getAttribute('src'), userUrls[0]);
    assert.equal(await page.locator('.hero .media-caption:not([hidden])').count(), 0);
    await page.locator('.hero-img').first().click(); await page.locator('.lightbox-next').click();
    assert.equal(await page.locator('.lightbox-img').getAttribute('src'), userUrls[1]); await page.keyboard.press('Escape');
    checks.push('上传三张→删除一张→双图预览→发布→刷新保留原图；用户图片不标演示');

    const routes = [['#/home','.item-card'],['#/search','.result-card'],['#/publish','.publish-page'],['#/detail?id=12','.hero-img'],[successHash,'.success-title'],['#/my','.post-card']];
    for (const [width,height] of [[360,800],[393,852],[768,1024],[1024,768],[1440,1000]]) {
      await page.setViewportSize({width,height});
      for (const [hash,selector] of routes) {
        await route(hash,selector); await settle();
        const data = await page.evaluate(() => {
          const nav = document.querySelector('#tab-bar'); const rect = nav.getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            badIcons: [...document.querySelectorAll('.lf-icon')].filter(el => {
              const r = el.getBoundingClientRect(); return r.width && (r.width > 70 || r.height > 70 || !el.hasAttribute('aria-hidden'));
            }).length,
            broken: [...document.querySelectorAll('img[data-lf-image]')].filter(el => el.complete && !el.naturalWidth).length,
            nav: getComputedStyle(nav).display === 'none' || (rect.top >= 0 && rect.bottom <= innerHeight + 1),
            bar: (() => {const el=document.querySelector('.bottom-bar'); if(!el)return true;const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1;})()
          };
        });
        assert.deepEqual(data,{overflow:false,badIcons:0,broken:0,nav:true,bar:true},width+' '+hash);
        matrix.push({width,height,route:hash.split('?')[0]});
      }
    }
    checks.push('5 种宽度 × 6 页面：无横向溢出，图标尺寸合理，导航和操作栏在视口内');

    await page.route('**/assets/items/photos/white-powerbank.webp', route => route.abort());
    await route('#/detail?id=12', '.hero-img');
    await page.waitForFunction(() => document.querySelector('.hero img')?.getAttribute('src') === 'assets/items/digital.svg');
    assert.equal(await page.locator('.hero .media-caption').textContent(), '图片暂不可用');
    await page.locator('.hero img').evaluate(img => img.decode());
    assert.equal(await page.locator('.hero [data-act="preview"]').count(), 0);
    let attempts = 0;
    await page.route('**/assets/items/digital.svg', route => { attempts++; route.abort(); });
    // 新文档重新请求占位图，避免复用上一场景已解码的内存图片。
    await page.reload();
    await page.waitForSelector('.hero .lf-media-fallback');
    await page.waitForTimeout(300); assert.equal(attempts, 1);
    checks.push('损坏照片→类别占位；占位也失败→内联图标，仅尝试一次且禁用失效预览');

    await context.setOffline(true);
    const local = await context.newPage(); local.on('pageerror', error=>errors.push(error.message));
    await local.goto(pathToFileURL(path.join(root,'index.html')).href); await local.waitForSelector('.item-card');
    await local.evaluate(() => LF.router.go('#/detail?id=7')); await local.waitForSelector('.hero-img');
    await local.locator('.hero-img').evaluate(img=>img.decode());
    assert.ok((await local.locator('.hero-img').getAttribute('src')).endsWith('backpack.webp'));
    await local.locator('.hero-img').click(); await local.waitForSelector('.lightbox');
    await local.locator('.lightbox-img').evaluate(img=>img.decode());
    assert.equal(await local.locator('.desktop-link svg').count(),4);
    checks.push('断网时直接打开 HTML：本地图标、照片、详情和大图预览可用');
    assert.deepEqual(external,[]); assert.deepEqual(errors,[]);
    const result = { browser:await browser.version(), checks, matrix, externalRequests:external, pageErrors:errors };
    fs.writeFileSync(path.join(root,process.env.LF_BROWSER_REPORT || 'docs/图标配图浏览器验证.json'), JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
