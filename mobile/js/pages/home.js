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
    showAuthModal: false,
    authLoading: false,
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
        (item.coverImageUrl
          ? '<img src="' + esc(item.coverImageUrl) + '" class="cover-img" alt="" />'
          : '<span class="cover-placeholder">📦</span>') +
      '</div>' +
      '<div class="item-info">' +
        '<div class="item-tags">' +
          '<span class="tag-' + esc(item.type) + '">' + esc(item.typeText) + '</span>' +
          '<span class="tag-' + esc(item.status) + '">' + esc(item.statusText) + '</span>' +
          '<span class="item-time">' + esc(item.timeText) + '</span>' +
        '</div>' +
        '<div class="item-name">' + esc(item.name) + '</div>' +
        '<div class="item-meta"><span class="meta-icon">📍</span><span class="meta-text">' + esc(item.location) + '</span></div>' +
        '<div class="item-meta"><span class="meta-icon">🕐</span><span class="meta-text">' + esc(item.occurredText) + ' 前后</span></div>' +
      '</div>' +
    '</div>';
  }

  function render(root) {
    var listHtml = state.list.map(cardHtml).join('');
    var emptyHtml = (!state.loading && state.list.length === 0)
      ? '<div class="empty-state"><div class="empty-icon">📭</div>' +
        '<div class="empty-title">该分类下暂无信息</div>' +
        '<div class="empty-desc">换个分类看看，或先发布一条信息</div></div>'
      : '';
    var moreHtml = state.loading
      ? '<div class="load-more">加载中…</div>'
      : (!state.hasMore && state.list.length > 0 ? '<div class="load-more">没有更多了</div>' : '');

    root.innerHTML =
      '<div class="home-page page">' +
        '<header class="header">' +
          '<div class="header-top">' +
            '<div>' +
              '<div class="header-title">校园失物招领</div>' +
              '<div class="header-subtitle">让丢的东西，都能回到主人手里</div>' +
            '</div>' +
          '</div>' +
          '<div class="search-entry" data-act="go-search">' +
            '<span class="search-icon">🔍</span>' +
            '<span class="search-placeholder">搜索校园卡 / 钥匙 / 水杯…</span>' +
            '<span class="search-action">搜索</span>' +
          '</div>' +
        '</header>' +

        '<div class="page-scroll" data-role="scroll">' +
          '<div class="quick-actions">' +
            '<div class="quick-item" data-act="go-publish" data-type="lost"><div class="quick-icon">📝</div><div class="quick-text">发布寻物</div></div>' +
            '<div class="quick-item" data-act="go-publish" data-type="found"><div class="quick-icon">🤝</div><div class="quick-text">发布招领</div></div>' +
            '<div class="quick-item" data-act="go-my"><div class="quick-icon">📋</div><div class="quick-text">我的发布</div></div>' +
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
            '<span class="tip-icon">🛡️</span>' +
            '<span class="tip-text">证件类物品不展示敏感号码；联系方式需主动点击“联系发布者”后才可见，请注意保护双方隐私。</span>' +
          '</div>' +
          '<div style="height:60px;"></div>' +
        '</div>' +

        '<div class="fab" data-act="go-publish"><span class="fab-icon">➕</span><span>发布信息</span></div>' +
        authModalHtml() +
      '</div>';

    // scroll 容器每次渲染都是新元素，需重新绑定（scroll 不支持事件委托）
    bindScroll(root);
  }

  function authModalHtml() {
    if (!state.showAuthModal) return '';
    return '<div class="auth-mask">' +
      '<div class="auth-modal">' +
        '<div class="auth-icon">🔐</div>' +
        '<div class="auth-title">登录校园失物招领</div>' +
        '<div class="auth-desc">登录后可发布失物 / 招领信息，查看联系方式，管理你的发布记录</div>' +
        '<div class="auth-nickname">' +
          '<input type="text" class="auth-input" maxlength="20" placeholder="昵称（选填，默认随机生成）" />' +
        '</div>' +
        '<div class="auth-features">' +
          '<div class="auth-feature"><span class="feature-icon">📝</span><span class="feature-text">发布失物招领</span></div>' +
          '<div class="auth-feature"><span class="feature-icon">💬</span><span class="feature-text">查看联系方式</span></div>' +
          '<div class="auth-feature"><span class="feature-icon">📋</span><span class="feature-text">管理我的发布</span></div>' +
        '</div>' +
        '<button class="auth-btn" data-act="authorize" ' + (state.authLoading ? 'disabled' : '') + '>' +
          (state.authLoading ? '登录中…' : '一键登录 / 注册') + '</button>' +
        '<div class="auth-cancel" data-act="close-auth">暂不登录，先看看</div>' +
      '</div>' +
    '</div>';
  }

  function bindClickEvents(root) {
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act],[data-id]');
      if (!el || !root.contains(el)) return;
      var act = el.getAttribute('data-act');
      if (act === 'go-search') {
        LF.router.go('#/search');
      } else if (act === 'go-publish') {
        var type = el.getAttribute('data-type');
        LF.router.go('#/publish' + (type ? '?type=' + type : ''));
      } else if (act === 'go-my') {
        LF.router.go('#/my');
      } else if (act === 'switch') {
        switchType(root, el.getAttribute('data-type'));
      } else if (act === 'authorize') {
        onAuthorize(root);
      } else if (act === 'close-auth') {
        state.showAuthModal = false;
        rerenderModal(root);
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

  function rerenderModal(root) {
    var old = root.querySelector('.auth-mask');
    if (old) old.remove();
    if (state.showAuthModal) {
      var wrap = document.createElement('div');
      wrap.innerHTML = authModalHtml();
      root.appendChild(wrap.firstChild);
    }
  }

  function onAuthorize(root) {
    if (state.authLoading) return;
    var input = root.querySelector('.auth-input');
    var nickname = input ? input.value.trim() : '';
    state.authLoading = true;
    rerenderModal(root);
    LF.auth.authorizeLogin(nickname ? { nickname: nickname } : {})
      .then(function () {
        state.authLoading = false;
        state.showAuthModal = false;
        rerenderModal(root);
        ui.toast('登录成功', 'success');
      })
      .catch(function (err) {
        state.authLoading = false;
        rerenderModal(root);
        ui.toast(err.message || '登录失败', 'error');
      });
  }

  function switchType(root, type) {
    if (type === state.type) return;
    state.type = type;
    state.filterHint = HINTS[type];
    loadList(root, true);
  }

  function loadList(root, reset) {
    if (state.loading) return Promise.resolve();
    var page = reset ? 1 : state.page;
    state.loading = true;
    render(root);

    return LF.api.getItems({ type: state.type, page: page, pageSize: state.pageSize })
      .then(function (data) {
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
        state.loading = false;
        render(root);
        ui.toast(err.message || '加载失败', 'error');
      });
  }

  LF.pages.home = {
    mount: function (main) {
      var root = document.createElement('div');
      root.style.flex = '1';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      main.appendChild(root);

      render(root);
      bindClickEvents(root);

      // 对应 onShow：未登录 / 未授权时展示登录弹窗
      if (!LF.auth.getToken()) {
        state.showAuthModal = true;
        rerenderModal(root);
      }
      if (!state.inited) {
        state.inited = true;
        loadList(root, true);
      } else if (state.list.length > 0) {
        // 从发布 / 详情返回时刷新
        loadList(root, true);
      }
    }
  };
})(window.LF);
