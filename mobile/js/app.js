/* app.js — 路由与启动入口（替代小程序 app.js + app.json 的页面注册） */
window.LF = window.LF || {};

(function (LF) {
  var main = document.getElementById('app-main');

  function updatePhoneStatusTime() {
    var el = document.querySelector('[data-role="phone-status-time"]');
    if (!el) return;
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    el.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  updatePhoneStatusTime();

  // hash 与页面、tab 的映射；detail / success 为二级页（无 tabBar）
  var ROUTES = {
    '/home': { page: 'home', tab: 'home' },
    '/search': { page: 'search', tab: 'search' },
    '/publish': { page: 'publish', tab: 'publish' },
    '/my': { page: 'myPosts', tab: 'my-posts' },
    '/detail': { page: 'detail', tab: null },
    '/success': { page: 'publishSuccess', tab: null }
  };

  function parseHash() {
    var raw = (location.hash || '#/home').replace(/^#/, '');
    var path = raw.split('?')[0] || '/home';
    var query = {};
    var search = raw.indexOf('?') >= 0 ? raw.slice(raw.indexOf('?') + 1) : '';
    search.split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { path: path, query: query };
  }

  function renderRoute() {
    var route = parseHash();
    var conf = ROUTES[route.path] || ROUTES['/home'];

    // 清空浮层与页面容器，重置滚动位置
    document.getElementById('overlay-root').innerHTML = '';
    main.innerHTML = '';
    main.scrollTop = 0;

    LF.tabbar.render(conf.tab);

    var page = LF.pages[conf.page];
    if (page && typeof page.mount === 'function') {
      page.mount(main, route.query);
    }
  }

  /** 编程式导航 */
  function go(hash) {
    if (location.hash === hash) {
      // 同地址重复点击时强制刷新
      renderRoute();
    } else {
      location.hash = hash;
    }
  }

  LF.router = { go: go, parseHash: parseHash, renderRoute: renderRoute };

  window.addEventListener('hashchange', renderRoute);

  // 启动：尝试匿名静默登录（失败不阻塞浏览，需要登录的操作会再次触发登录）
  LF.auth.ensureLogin().then(function () {
    // 静默登录成功
  }).catch(function (err) {
    console.warn('自动登录失败:', err && err.message ? err.message : err);
  });

  // 首屏渲染
  if (!location.hash) {
    location.hash = '#/home';
  } else {
    renderRoute();
  }
})(window.LF);
