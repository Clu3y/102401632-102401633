/* pages/home.js — 首页（对应 pages/home/index） */
window.LF = window.LF || {};
LF.pages = LF.pages || {};

(function (LF) {
  var ui = LF.ui, esc = LF.ui.escapeHtml;

  // 模块级状态：tab 切换回来时保留（与小程序页面实例一致）
  var state = {
    type: 'all',
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    list: [],
    filterHint: '正在展示全部失物与招领信息',
    inited: false
  };

  var HINTS = {
    all: '正在展示全部失物与招领信息',
    lost: '正在展示同学发布的失物信息（寻找中 / 已找回）',
    found: '正在展示同学发布的招领信息（待认领 / 已归还）'
  };

  function cardHtml(item) {
    return '<div class="item-card" data-id="' + item.id + '">' +
      '<div class="item-cover">' +
        LF.ui.coverHtml(item) +
      '</div>' +
      '<div class="item-info">' +
        '<div class="item-tags">' +
          '<span class="tag-' + esc(item.type) + '">' + esc(item.typeText) + '</span>' +
          '<span class="tag-' + esc(item.status) + '">' + esc(item.statusText) + '</span>' +
          '<span class="item-time">' + esc(item.timeText) + '</span>' +
        '</div>' +
        '<div class="item-name">' + esc(item.name) + '</div>' +
        '<div class="item-meta"><span class="meta-icon">' + LF.icons.render('map-pin') + '</span><span class="meta-text">' + esc(item.location) + '</span></div>' +
        '<div class="item-meta"><span class="meta-icon">' + LF.icons.render('clock') + '</span><span class="meta-text">' + esc(item.occurredText) + ' 前后</span></div>' +
      '</div>' +
    '</div>';
  }

  var requestVersion = 0;
  function render(root) {
    var snapshot = ui.capture(root);
    var listHtml = state.list.map(cardHtml).join('');
    var emptyHtml = (!state.loading && state.list.length === 0)
      ? '<div class="empty-state"><div class="empty-icon">' + LF.icons.render('package-search') + '</div>' +
        '<div class="empty-title">该分类下暂无信息</div>' +
        '<div class="empty-desc">换个分类看看，或先发布一条信息</div></div>'
      : '';
    var moreHtml = state.loading
      ? '<div class="load-more">加载中…</div>'
      : (!state.hasMore && state.list.length > 0 ? '<div class="load-more">没有更多了</div>' : (state.hasMore ? '<button class="load-more-button" data-act="more">加载更多</button>' : ''));

    root.innerHTML =
      '<div class="home-page page"><div class="page-scroll" data-role="scroll">' +
        '<header class="header"><div class="home-hero"><div>' +
          '<div class="header-top">' +
            '<div>' +
              '<div class="eyebrow">校园互助 · 失物招领</div><h1 class="header-title">让每一份遗失，<br />都有回来的路。</h1>' +
              '<div class="header-subtitle">让丢的东西，都能回到主人手里</div>' +
            '</div>' +
          '</div>' +
          '</div><img class="hero-art" src="assets/hero.svg" alt="校园卡、水杯与钥匙插画" /></div>' +
          '<div class="search-entry" data-act="go-search">' +
            '<span class="search-icon">' + LF.icons.render('search') + '</span>' +
            '<span class="search-placeholder">搜索校园卡 / 钥匙 / 水杯…</span>' +
            '<span class="search-action">搜索</span>' +
          '</div>' +
        '</header>' +


          '<div class="quick-actions">' +
            '<div class="quick-item" data-act="go-publish" data-type="lost"><div class="quick-icon">' + LF.icons.render('square-pen') + '</div><div class="quick-text">发布寻物</div></div>' +
            '<div class="quick-item" data-act="go-publish" data-type="found"><div class="quick-icon">' + LF.icons.render('hand-heart') + '</div><div class="quick-text">发布招领</div></div>' +
            '<div class="quick-item" data-act="go-my"><div class="quick-icon">' + LF.icons.render('clipboard-list') + '</div><div class="quick-text">我的发布</div></div>' +
          '</div>' +

          '<div class="section">' +
            '<div class="section-header">' +
              '<span class="section-title">近期信息</span>' +
              '<span class="section-count">共 ' + state.total + ' 条</span>' +
            '</div>' +
            '<div class="tab-bar-inline">' +
              '<div class="tab-btn' + (state.type === 'all' ? ' active' : '') + '" data-act="switch" data-type="all">全部</div>' +
              '<div class="tab-btn' + (state.type === 'lost' ? ' active' : '') + '" data-act="switch" data-type="lost">失物信息</div>' +
              '<div class="tab-btn' + (state.type === 'found' ? ' active' : '') + '" data-act="switch" data-type="found">招领信息</div>' +
            '</div>' +
            '<div class="filter-hint">' + esc(state.filterHint) + '</div>' +
          '</div>' +

          '<div class="item-list">' + listHtml + emptyHtml + moreHtml + '</div>' +

          '<div class="privacy-tip">' +
            '<span class="tip-icon">' + LF.icons.render('shield-check') + '</span>' +
            '<span class="tip-text">上传证件照片前请遮挡姓名、学号与完整号码。联系方式点击后展示，本地演示不提供真实隐私鉴权。</span>' +
          '</div>' +
          '<div style="height:60px;"></div>' +
        '</div>' +

        '<div class="fab" data-act="go-publish"><span class="fab-icon">' + LF.icons.render('plus') + '</span><span>发布信息</span></div>' +
      '</div>';

    // scroll 容器每次渲染都是新元素，需重新绑定（scroll 不支持事件委托）
    ui.restore(root, snapshot);
    bindScroll(root);
  }

  function bindClickEvents(root) {
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act],[data-id]');
      if (!el || !root.contains(el)) return;
      var act = el.getAttribute('data-act');
      if (act === 'more') { loadList(root, false);
      } else if (act === 'go-search') {
        LF.router.go('#/search');
      } else if (act === 'go-publish') {
        var type = el.getAttribute('data-type');
        LF.router.go('#/publish' + (type ? '?type=' + type : ''));
      } else if (act === 'go-my') {
        LF.router.go('#/my');
      } else if (act === 'switch') {
        switchType(root, el.getAttribute('data-type'));
      } else if (el.getAttribute('data-id')) {
        LF.router.go('#/detail?id=' + el.getAttribute('data-id'));
      }
    });
  }

  function bindScroll(root) {
    // 触底加载（对应 onReachBottom）
    var scroll = root.querySelector('[data-role="scroll"]');
    if (!scroll) return;
    scroll.addEventListener('scroll', function () {
      if (scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 80) {
        if (state.hasMore && !state.loading) loadList(root, false);
      }
    });
  }

  function switchType(root, type) {
    if (type === state.type) return;
    state.type = type;
    state.filterHint = HINTS[type];
    loadList(root, true);
  }

  function loadList(root, reset) {
    if (!reset && (state.loading || !state.hasMore)) return Promise.resolve();
    var version = ++requestVersion;
    var page = reset ? 1 : state.page;
    state.loading = true;
    render(root);

    return LF.api.getItems({ type: state.type, page: page, pageSize: state.pageSize })
      .then(function (data) {
        if (version !== requestVersion || !root.isConnected) return;
        var records = (data.records || []).map(function (item) {
          LF.urlUtil.resolveItemImages(item);
          item.timeText = LF.format.formatRelative(item.publishedAt);
          item.occurredText = LF.format.formatDateTime(item.occurredAt);
          return item;
        });
        state.list = reset ? records : state.list.concat(records);
        state.page = page + 1;
        state.total = data.total || 0;
        state.hasMore = data.hasNext || false;
        state.loading = false;
        render(root);
      })
      .catch(function (err) {
        if (version !== requestVersion || !root.isConnected) return;
        state.loading = false;
        render(root);
        ui.toast(err.message || '加载失败', 'error');
      });
  }

  LF.pages.home = {
    mount: function (main) {
      requestVersion++; state.loading = false;
      var root = document.createElement('div');
      root.className = 'home-root';
      root.style.flex = '1';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      main.appendChild(root);

      render(root);
      bindClickEvents(root);

      loadList(root, true);
    }
  };
})(window.LF);
