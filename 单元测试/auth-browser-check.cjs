/* 一次性浏览器验收：临时静态服务 + 独立 Chrome 上下文，结束后关闭。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.LF_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const shots = path.join(root, 'docs/screenshots');
// 每次运行拥有独立输出，不覆盖历史验收。
const runId = process.env.LF_AUTH_RUN_ID || ('弹窗-' + Date.now());
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200, { 'Content-Type': (mime[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8' }); res.end(error ? 'Not Found' : data); });
});
async function childCheck(script, origin, prefix, report) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, script)], {
      env: { ...process.env, LF_PREVIEW_URL: origin, LF_SCREENSHOT_PREFIX: prefix, LF_BROWSER_REPORT: report || '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject); child.on('exit', code => {
      if (code) reject(new Error(script + '\n' + output));
      else { fs.writeFileSync(path.join(root, 'docs', runId + '-' + script.replace('.cjs', '.log')), output); resolve(); }
    });
  });
}
(async () => {
  let browser;
  const checks = [], errors = [], requests = [], matrix = [];
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', err => errors.push(err.message));
    page.on('request', req => { if (/^https?:/.test(req.url()) && !req.url().startsWith(origin)) requests.push(req.url()); });
    async function route(hash, selector) {
      const willRender = await page.evaluate(hash => {
        window.previousRouteRoot = document.querySelector('#app-main > div');
        return !['/publish', '/my'].includes(LF.router.parseHash(hash).path) || LF.auth.isAuthorized();
      }, hash);
      await page.evaluate(hash => LF.router.go(hash), hash);
      if (willRender) await page.waitForFunction(() => window.previousRouteRoot !== document.querySelector('#app-main > div'));
      if (selector) await page.waitForSelector(selector);
    }
    async function shot(name) {
      await page.evaluate(() => LF.ui.hideToast());
      // 等待入场与 viewport 重排完成，截图应呈现最终布局。
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(shots, runId + '-' + name + '.png'), animations: 'disabled' });
    }
    async function register(email, nickname = '登录验收同学') {
      await page.waitForSelector('.account-form');
      await page.locator('[name="nickname"]').fill(nickname); await page.locator('[name="email"]').fill(email);
      await page.locator('[name="password"]').fill('offline_demo_123');
      if (await page.locator('[name="bindLegacy"]').count()) await page.locator('[name="bindLegacy"]').check();
      await page.locator('.account-submit').evaluate(el => { el.click(); el.click(); });
    }
    async function login(email, next = '/my') {
      await route('#/auth?next=' + encodeURIComponent(next), '.account-form');
      await page.locator('[name="email"]').fill(email); await page.locator('[name="password"]').fill('offline_demo_123');
      await page.locator('.account-submit').click();
      await page.waitForFunction(() => !location.hash.startsWith('#/auth'));
    }
    async function logout(selector = '.desktop-account .account-logout') {
      await page.locator(selector).click(); await page.waitForFunction(() => !LF.auth.isAuthorized());
      await page.waitForSelector('.login-required');
      assert.equal(await page.locator('.auth-overlay').count(), 0);
      await page.locator('.login-required button').click();
      await page.waitForSelector('.account-form');
    }
    await page.goto(origin); await page.waitForSelector('.item-card');
    assert.equal(await page.evaluate(() => LF.auth.getToken()), '');
    assert.equal((await page.locator('.desktop-link[href="#/my"]').textContent()).trim(), '我的发布');
    assert.equal(await page.getByText('我的的发布', { exact: true }).count(), 0);
    await shot('桌面游客首页');
    // 捕获节点身份与所有滚动容器，确保弹窗不会重新挂载背景页面。
    async function snapshot() {
      return page.evaluate(() => {
        window.sourcePage = document.querySelector('#app-main > div');
        const scroll = document.querySelector('#app-main .page-scroll, #app-main .page-flow');
        if (scroll) scroll.scrollTop = 240;
        return { hash: location.hash, top: scroll?.scrollTop || 0,
          active: document.querySelector('.desktop-link.active')?.getAttribute('href'),
          keyword: document.querySelector('.search-input')?.value || '' };
      });
    }
    async function unchanged(before) {
      assert.deepEqual(await page.evaluate(() => ({ hash: location.hash,
        top: document.querySelector('#app-main .page-scroll, #app-main .page-flow')?.scrollTop || 0,
        active: document.querySelector('.desktop-link.active')?.getAttribute('href'),
        keyword: document.querySelector('.search-input')?.value || '' })), before);
      assert.equal(await page.evaluate(() => window.sourcePage === document.querySelector('#app-main > div')), true);
    }
    for (const destination of ['#/publish', '#/my']) {
      const before = await snapshot();
      const trigger = page.locator('.desktop-link[href="' + destination + '"]');
      await trigger.click(); await page.waitForSelector('.auth-overlay');
      await unchanged(before);
      assert.equal(await page.evaluate(() => document.getElementById('app-main').inert), true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('.auth-overlay')), true);
      await page.keyboard.press('Escape'); await page.waitForSelector('.auth-overlay', { state: 'detached' });
      await unchanged(before); assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    }
    await route('#/search?keyword=' + encodeURIComponent('雨伞'), '.result-card');
    const searchBefore = await snapshot();
    await route('#/publish?type=found', '.auth-overlay'); await unchanged(searchBefore);
    await shot('搜索原地登录');
    await page.locator('.account-close').click(); await unchanged(searchBefore);
    await page.locator('.desktop-account [data-auth-mode="register"]').click();
    await page.locator('[name="email"]').fill('keep@example.com');
    await page.locator('[name="password"]').fill('should_be_cleared');
    await page.locator('.account-switch a').click();
    assert.equal(await page.locator('[name="email"]').inputValue(), 'keep@example.com');
    assert.equal(await page.locator('[name="password"]').inputValue(), '');
    await page.locator('.auth-overlay').click({ position: { x: 2, y: 2 } });
    await page.waitForSelector('.auth-overlay', { state: 'detached' }); await unchanged(searchBefore);
    // 外部 hash 和浏览器历史也经过同一门禁。
    await page.evaluate(() => { location.hash = '#/my'; }); await page.waitForSelector('.auth-overlay');
    await unchanged(searchBefore); await page.keyboard.press('Escape');
    await route('#/detail?id=14', '.detail-title'); await page.goBack(); await page.waitForSelector('.search-input');
    assert.equal(await page.evaluate(() => LF.router.parseHash().path), '/search');
    const cold = await context.newPage();
    await cold.goto(origin + '/index.html#/publish?type=found'); await cold.waitForSelector('.auth-overlay');
    assert.equal(await cold.locator('.publish-page').count(), 0);
    assert.equal(await cold.locator('.desktop-link.active').getAttribute('href'), '#/publish');
    await cold.keyboard.press('Escape'); await cold.waitForSelector('.auth-overlay', { state: 'detached' });
    assert.equal(await cold.locator('.login-required').count(), 1);
    assert.equal(await cold.evaluate(() => location.hash), '#/publish?type=found'); await cold.close();
    checks.push('首页和筛选搜索原地拦截、DOM/地址/滚动/导航保留、三种关闭方式、焦点恢复、背景禁用、模式切换清除密码、外部地址与浏览器后退、直接受限地址占位');
    await route('#/detail?id=14', '.detail-title');
    const detailBefore = await snapshot();
    await page.locator('[data-act="open-contact"]').click(); await page.waitForSelector('.auth-overlay');
    await unchanged(detailBefore); await page.keyboard.press('Escape'); await unchanged(detailBefore);
    await page.locator('[data-act="open-contact"]').click(); await page.waitForSelector('.account-form');
    assert.equal(await page.evaluate(() => location.hash), '#/detail?id=14');
    await page.locator('.account-switch a').click(); await page.waitForSelector('[name="nickname"]');
    await shot('桌面注册');
    await register('a@example.com'); await page.waitForSelector('.auth-overlay', { state: 'detached' });
    await unchanged(detailBefore);
    assert.equal(await page.evaluate(() => LF.db.load().users.filter(u => u.email).length), 1);
    await page.waitForSelector('.contact-value');
    await page.keyboard.press('Escape');
    checks.push('游客浏览搜索详情、联系方式登录拦截、注册绑定提示、重复提交保护、返回原详情');
    await route('#/my', '.post-card');
    assert.equal(await page.locator('.post-card').count(), 5);
    assert.equal(await page.locator('.profile-name').textContent(), '登录验收同学');
    await page.reload(); await page.waitForSelector('.post-card');
    await shot('桌面我的发布');
    await page.setViewportSize({ width: 393, height: 852 }); await shot('手机我的发布');
    await logout('#mobile-account .account-logout');
    await page.locator('[name="email"]').fill('a@example.com'); await page.locator('[name="password"]').fill('bad_password');
    await page.locator('.account-submit').click(); await page.waitForFunction(() => document.querySelector('.account-error').textContent === '邮箱或密码错误');
    await shot('手机登录报错');
    await page.locator('[name="password"]').fill('offline_demo_123'); await page.locator('.account-submit').click(); await page.waitForSelector('.post-card');
    checks.push('刷新保留账号、桌面及手机账号入口、退出清除个人页、表单内错误提示');
    await route('#/publish?type=lost', '.publish-page');
    await page.locator('[data-field="name"]').fill('账号 A 的私有草稿');
    await page.waitForFunction(() => LF.draft.load()?.name === '账号 A 的私有草稿');
    await logout('#mobile-account .account-logout');
    assert.equal(await page.locator('.publish-page').count(), 0);
    assert.equal(await page.evaluate(() => location.hash), '#/publish?type=lost');
    await page.locator('.account-switch a').click(); await page.waitForSelector('[name="nickname"]');
    assert.equal(await page.locator('[name="bindLegacy"]').count(), 0);
    await register('b@example.com', '账号 B'); await page.waitForSelector('.publish-page');
    assert.equal(await page.locator('[data-field="name"]').inputValue(), '');
    assert.equal(await page.evaluate(() => LF.draft.load()?.contact || ''), '');
    const noPermission = await page.evaluate(async () => { try { await LF.api.updateItemStatus(14, 'recovered'); return ''; } catch (e) { return e.message; } });
    assert.match(noPermission, /本人/);
    await route('#/my', '.empty-title'); assert.equal(await page.locator('.post-card').count(), 0);
    await logout('#mobile-account .account-logout');
    await login('a@example.com', '/publish?type=lost'); await page.waitForSelector('.publish-page');
    assert.equal(await page.locator('[data-field="name"]').inputValue(), '账号 A 的私有草稿');
    checks.push('账号 B 空列表、不能修改账号 A 的记录、账号间草稿隔离、登录返回发布并恢复原草稿');
    // 旧异步个人资料响应结束时，账号已经退出并切换，不能重新显示旧昵称。
    await page.evaluate(() => {
      const original = LF.api.getCurrentUser;
      LF.api.getCurrentUser = () => original().then(value => new Promise(resolve => setTimeout(() => { window.oldProfileDone = true; resolve(value); }, 400)));
    });
    await route('#/my', '.profile-name'); await logout('#mobile-account .account-logout');
    await login('b@example.com'); await page.waitForSelector('.profile-name');
    await page.waitForFunction(() => window.oldProfileDone);
    assert.equal(await page.locator('.profile-name').textContent(), '账号 B');
    await page.reload(); await page.waitForSelector('.profile-name');
    await page.evaluate(() => {
      const key = 'lf_session_v1', s = JSON.parse(sessionStorage.getItem(key)); s.expiresAt = Date.now() - 1;
      sessionStorage.setItem(key, JSON.stringify(s)); window.dispatchEvent(new Event('focus'));
    });
    await page.waitForSelector('.account-form'); assert.equal(await page.locator('.profile-card').count(), 0);
    assert.equal(await page.evaluate(() => location.hash), '#/my');
    checks.push('迟到个人资料响应不会串账号、闲置页面会话过期后清除私人视图');
    const freshTab = await context.newPage(); await freshTab.goto(origin + '/index.html#/my'); await freshTab.waitForSelector('.account-form');
    assert.equal(await freshTab.evaluate(() => LF.auth.getToken()), ''); await freshTab.close();
    await page.setViewportSize({ width: 1440, height: 1000 }); await shot('桌面登录');
    for (const [width, height] of [[360,800],[393,852],[768,1024],[1024,768],[1440,1000]]) {
      await page.setViewportSize({ width, height });
      for (const mode of ['login', 'register']) {
        await route('#/search?keyword=雨伞', '.search-input');
        await page.evaluate(mode => LF.auth.requestLogin(location.hash, { mode, onSuccess: LF.tabbar.refreshAccount }), mode);
        await page.waitForSelector('.auth-overlay');
        const data = await page.evaluate(() => ({ pageOverflow: document.documentElement.scrollWidth > innerWidth,
          panelOverflow: document.querySelector('.account-panel').scrollWidth > document.querySelector('.account-panel').clientWidth,
          inputs: [...document.querySelectorAll('.account-form input')].every(el => el.getBoundingClientRect().right <= innerWidth) }));
        assert.deepEqual(data, { pageOverflow: false, panelOverflow: false, inputs: true }); matrix.push({ width, height, mode });
        assert.equal(await page.locator('.auth-overlay .account-panel').evaluate(el => el.getBoundingClientRect().top >= 0 && el.getBoundingClientRect().bottom <= innerHeight), true);
        await shot(width + '-' + mode + '-弹窗');
        await page.keyboard.press('Escape');
      }
    }
    checks.push('新标签页需重新登录、5 种屏幕宽度 × 登录注册页面无横向溢出');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => LF.auth.requestLogin(location.hash));
    assert.equal(await page.locator('.auth-overlay').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.keyboard.press('Escape'); await page.emulateMedia({ reducedMotion: 'no-preference' });
    checks.push('减少动态效果设置下关闭动画；弹窗垂直边界适配视口');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await route('#/search?keyword=雨伞', '.search-input');
    const accountBefore = await snapshot();
    await page.locator('.desktop-account [data-auth-mode="login"]').click();
    await page.evaluate(() => {
      window.originalDeriveBits = crypto.subtle.deriveBits.bind(crypto.subtle);
      crypto.subtle.deriveBits = (...args) => { window.deriving = true; return window.originalDeriveBits(...args).then(bits => new Promise(resolve => setTimeout(() => resolve(bits), 400))); };
      LF.auth.requestLogin('#/my');
    });
    assert.equal(await page.locator('.auth-overlay').count(), 1);
    await page.locator('[name="email"]').fill('b@example.com'); await page.locator('[name="password"]').fill('offline_demo_123');
    await page.locator('.account-submit').click(); await page.waitForFunction(() => window.deriving);
    await page.locator('.account-close').click();
    await page.waitForTimeout(600); assert.equal(await page.evaluate(() => LF.auth.isAuthorized()), false);
    await unchanged(accountBefore);
    await page.locator('.desktop-account [data-auth-mode="login"]').click();
    await page.locator('[name="email"]').fill('b@example.com'); await page.locator('[name="password"]').fill('offline_demo_123');
    await page.evaluate(() => { window.deriving = false; });
    await page.locator('.account-submit').click(); await page.waitForFunction(() => window.deriving);
    await route('#/home', '.item-card'); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => LF.auth.isAuthorized()), false);
    assert.equal(await page.evaluate(() => location.hash), '#/home');
    await route('#/search?keyword=雨伞', '.search-input');
    await snapshot(); // 恢复相同滚动位置，以下检查继续复用原搜索条件。
    await page.evaluate(() => { crypto.subtle.deriveBits = window.originalDeriveBits; });
    await page.locator('.desktop-account [data-auth-mode="login"]').click();
    await page.locator('[name="email"]').fill('b@example.com'); await page.locator('[name="password"]').fill('offline_demo_123');
    await page.locator('.account-submit').click(); await page.waitForSelector('.desktop-account .account-name');
    await unchanged(accountBefore);
    // 既有规则是草稿类型优先；只清理本测试账号草稿，再验证无草稿的预选续接。
    await page.evaluate(() => LF.draft.clear());
    await page.locator('.desktop-account .account-logout').click(); await page.waitForSelector('.desktop-account [data-auth-mode="login"]');
    await unchanged(accountBefore);
    await route('#/publish?type=found', '.auth-overlay');
    await page.locator('[name="email"]').fill('b@example.com'); await page.locator('[name="password"]').fill('offline_demo_123');
    await page.locator('.account-submit').click(); await page.waitForSelector('.publish-page');
    assert.equal(await page.evaluate(() => location.hash), '#/publish?type=found');
    assert.equal(await page.locator('.type-card.active').getAttribute('data-type'), 'found');
    async function submitB() {
      await page.waitForSelector('.auth-overlay');
      await page.locator('[name="email"]').fill('b@example.com'); await page.locator('[name="password"]').fill('offline_demo_123');
      await page.locator('.account-submit').click(); await page.waitForSelector('.auth-overlay', { state: 'detached' });
    }
    await route('#/search?keyword=雨伞', '.search-input');
    await page.evaluate(() => {
      const session = JSON.parse(sessionStorage.getItem('lf_session_v1')); session.expiresAt = Date.now() - 1;
      sessionStorage.setItem('lf_session_v1', JSON.stringify(session)); LF.router.go('#/my');
    });
    await submitB(); await page.waitForSelector('.profile-name');
    assert.equal(await page.evaluate(() => location.hash), '#/my');
    await route('#/detail?id=14', '.detail-title');
    await page.evaluate(() => {
      const session = JSON.parse(sessionStorage.getItem('lf_session_v1')); session.expiresAt = Date.now() - 1;
      sessionStorage.setItem('lf_session_v1', JSON.stringify(session)); document.querySelector('[data-act="open-contact"]').click();
    });
    await submitB(); await page.waitForSelector('.contact-value');
    assert.equal(await page.evaluate(() => location.hash), '#/detail?id=14'); await page.keyboard.press('Escape');
    checks.push('点击受限导航或联系方式时恰好过期，到期事件保留原目标与成功回调');
    checks.push('弹窗单实例、关闭或切换页面中的密码派生响应不恢复身份、不导航；账号入口登录及退出原地更新；登录续接保留招领预选');
    await page.setViewportSize({ width: 393, height: 852 });
    await page.evaluate(() => LF.auth.requestLogin(location.hash, { mode: 'register', onSuccess: LF.tabbar.refreshAccount }));
    await shot('手机注册'); await page.keyboard.press('Escape');
    await context.setOffline(true);
    const localContext = await browser.newContext({ offline: true, viewport: { width: 393, height: 852 } });
    const local = await localContext.newPage(); local.on('pageerror', err => errors.push(err.message));
    await local.goto(pathToFileURL(path.join(root, 'index.html')).href); await local.waitForSelector('.item-card');
    assert.equal(await local.evaluate(() => window.isSecureContext && !!crypto.subtle), true);
    await local.locator('#tab-bar [href="#/publish"]').click(); await local.waitForSelector('.account-form');
    await local.locator('.account-switch a').click(); await local.waitForSelector('[name="nickname"]');
    await local.locator('[name="nickname"]').fill('离线同学'); await local.locator('[name="email"]').fill('file@example.com');
    await local.locator('[name="password"]').fill('offline_demo_123'); await local.locator('[name="bindLegacy"]').check();
    await local.locator('.account-submit').click(); await local.waitForSelector('.publish-page');
    await local.reload(); await local.waitForSelector('.publish-page');
    assert.equal(await local.evaluate(() => LF.auth.getUserInfo().nickname), '离线同学');
    await local.evaluate(() => LF.router.go('#/my')); await local.waitForSelector('.post-card');
    await local.locator('#mobile-account .account-logout').click(); await local.waitForSelector('.login-required');
    await local.locator('.login-required button').click(); await local.waitForSelector('.account-form');
    await local.locator('[name="email"]').fill('file@example.com'); await local.locator('[name="password"]').fill('offline_demo_123');
    await local.locator('.account-submit').click(); await local.waitForSelector('.post-card');
    await local.screenshot({ path: path.join(shots, runId + '-断网直接打开HTML.png') });
    checks.push('断网 file:// 注册、登录、退出、刷新和发布拦截正常，Web Crypto 可用');
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    await browser.close(); browser = null;
    // 已有完整交互和配图回归使用新前缀，保留原验收截图和报告。
    await childCheck('browser-check.cjs', origin, runId + '-页面回归-');
    checks.push('已有完整页面回归通过：发布、图片、状态恢复、搜索、草稿、个人资料及 36 个布局场景');
    await childCheck('media-browser-check.cjs', origin, runId + '-配图回归-', 'docs/' + runId + '-配图验证.json');
    checks.push('已有配图回归通过：14 条素材、上传预览、30 个布局场景、图片失效降级和断网使用');
    const report = { date: '2026-10-07', checks, matrix, pageErrors: errors, externalRequests: requests };
    fs.writeFileSync(path.join(root, 'docs/' + runId + '-浏览器验证.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
