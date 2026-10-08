/* app.js — 路由与启动入口（替代小程序 app.js + app.json 的页面注册） */
window.LF = window.LF || {};

(function (LF) {
  var main = document.getElementById('app-main');

  // hash 与页面、tab 的映射；detail / success 为二级页（无 tabBar）
  var ROUTES = {
    '/auth': { page: 'auth', tab: null },
    '/home': { page: 'home', tab: 'home' },
    '/search': { page: 'search', tab: 'search' },
    '/publish': { page: 'publish', tab: 'publish' },
    '/my': { page: 'myPosts', tab: 'my-posts' },
    '/detail': { page: 'detail', tab: null },
    '/success': { page: 'publishSuccess', tab: null }
  };

  function parseHash(hash) {
    var raw = (hash || location.hash || '#/home').replace(/^#/, '');
    var path = raw.split('?')[0] || '/home';
    var query = LF.query.parse(raw.indexOf('?') >= 0 ? raw.slice(raw.indexOf('?') + 1) : '');
    return { path: path, query: query };
  }

  function restricted(route) { return route.path === '/publish' || route.path === '/my'; }
  var renderedHash = null;

  function renderRoute(options) {
    options = options || {};
    var route = parseHash();
    var conf = ROUTES[route.path] || ROUTES['/home'];
    var needsLogin = restricted(route) && !LF.auth.isAuthorized();
    if (needsLogin && renderedHash && !restricted(parseHash(renderedHash)) && !options.sessionEnded) {
      var target = location.hash;
      LF.pages.auth.close();
      history.replaceState(null, '', renderedHash);
      LF.auth.requestLogin(target); return;
    }

    if (needsLogin) {
      LF.pages.publish.discardView();
      LF.pages.myPosts.reset();
    }

    if (LF.pages.auth && LF.pages.auth.leave) LF.pages.auth.leave();
    if (LF.pages.publish && LF.pages.publish.leave) LF.pages.publish.leave();
    // 清空浮层与页面容器，重置滚动位置
    document.getElementById('overlay-root').innerHTML = '';
    main.innerHTML = '';
    main.scrollTop = 0;

    LF.tabbar.render(conf.tab);
    renderedHash = location.hash;

    if (needsLogin) {
      var placeholder = document.createElement('div'); placeholder.className = 'page login-required';
      placeholder.innerHTML = '<div class="page-scroll"><section class="login-required-panel"><h1>' + (route.path === '/publish' ? '发布信息' : '我的发布') + '</h1><p>需要登录后才能' + (route.path === '/publish' ? '发布信息。' : '查看和管理自己的发布。') + '</p><button class="login-required-button" type="button">登录／注册</button></section></div>';
      main.appendChild(placeholder);
      placeholder.querySelector('button').addEventListener('click', function () { LF.auth.requestLogin(location.hash); });
      if (options.prompt !== false) LF.auth.requestLogin(location.hash);
      return;
    }

    var page = LF.pages[conf.page];
    if (page && typeof page.mount === 'function') {
      page.mount(main, route.query);
      LF.ui.enhance(main);
      main.focus({ preventScroll: true });
    }
  }

  /** 编程式导航 */
  function go(hash) {
    // 浏览器会编码中文参数；统一后再比较，避免同一地址不触发 hashchange。
    hash = new URL(hash, location.href).hash || '#/home';
    if (restricted(parseHash(hash)) && !LF.auth.isAuthorized()) {
      if (restricted(parseHash())) renderRoute({ sessionEnded: true, prompt: false });
      LF.auth.requestLogin(hash); return;
    }
    LF.pages.auth.close();
    if (location.hash === hash) {
      // 同地址重复点击时强制刷新
      renderRoute();
    } else {
      location.hash = hash;
    }
  }

  LF.router = { go: go, parseHash: parseHash, renderRoute: renderRoute };

  window.addEventListener('hashchange', function () { renderRoute(); });
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#/"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.closest('.account-switch')) return;
    event.preventDefault();
    if (link.dataset.authMode) {
      LF.auth.requestLogin(location.hash, { mode: link.dataset.authMode, onSuccess: LF.tabbar.refreshAccount });
    } else go(link.getAttribute('href'));
  });
  document.querySelector('.skip-link').addEventListener('click', function (e) { e.preventDefault(); main.focus(); });

  window.addEventListener('lf-session-ended', function (event) {
    if (LF.auth.isAuthorized()) return;
    if (LF.pages.publish && LF.pages.publish.discardView) LF.pages.publish.discardView();
    if (LF.pages.myPosts && LF.pages.myPosts.reset) LF.pages.myPosts.reset();
    var route = parseHash();
    if (restricted(route)) {
      // 导航门禁可能已隐藏私人内容并保存目标；到期事件不能覆盖续接操作。
      if (event.reason === 'expired' && main.querySelector('.login-required') && LF.pages.auth.isOpen()) LF.tabbar.refreshAccount();
      else renderRoute({ sessionEnded: true, prompt: event.reason !== 'logout' });
    }
    else {
      if (event.reason !== 'expired') LF.pages.auth.close();
      var contactClose = main.querySelector('[data-act="close-contact"]');
      if (contactClose) contactClose.click();
      Array.from(document.getElementById('overlay-root').children).forEach(function (node) {
        if (event.reason !== 'expired' || !node.classList.contains('auth-overlay')) node.remove();
      });
      LF.tabbar.refreshAccount();
      if (event.reason === 'expired') LF.auth.requestLogin(location.hash, { onSuccess: LF.tabbar.refreshAccount });
    }
  });
  // 到期检查也覆盖闲置页面和浏览器恢复；不会自动创建账号。
  setInterval(function () { LF.auth.getToken(); }, 30000);
  window.addEventListener('focus', function () { LF.auth.getToken(); });

  // 首屏渲染
  if (!location.hash) {
    location.hash = '#/home';
  } else {
    renderRoute();
  }
})(window.LF);
