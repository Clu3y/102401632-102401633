/* pages/search.js — 搜索页（对应 pages/search/index） */
window.LF = window.LF || {};
LF.pages = LF.pages || {};

(function (LF) {
  var esc = LF.ui.escapeHtml;

  var state = {
    keyword: '',
    type: 'all',
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    list: [],
    searched: false,
    inited: false,
    hotKeywords: ['校园卡', '钥匙', '耳机', '水杯', '图书馆', '食堂']
  };

  function cardHtml(item) {
    return '<div class="result-card" data-id="' + item.id + '">' +
      '<div class="result-cover">' +
        (item.coverImageUrl
          ? '<img src="' + esc(item.coverImageUrl) + '" class="cover-img" alt="" />'
          : '<span class="cover-placeholder">📦</span>') +
      '</div>' +
      '<div class="result-info">' +
        '<div class="result-tags">' +
          '<span class="tag-' + esc(item.type) + '">' + esc(item.typeText) + '</span>' +
          '<span class="tag-' + esc(item.status) + '">' + esc(item.statusText) + '</span>' +
        '</div>' +
        '<div class="result-name">' + esc(item.name) + '</div>' +
        '<div class="result-location">' + esc(item.location) + '</div>' +
        '<div class="result-time">' + esc(item.occurredText) + ' · ' + esc(item.categoryText) + '</div>' +
      '</div>' +
    '</div>';
  }

  function render(root) {
    var showHot = !state.searched || (state.keyword === '' && state.list.length === 0);
    var showNoResult = state.searched && !state.loading && state.list.length === 0;

    var summaryHtml = (state.searched && state.list.length > 0)
      ? '<div class="result-summary">' +
        '<span>' + (state.keyword
          ? '关键词“' + esc(state.keyword) + '”：找到 ' + state.total + ' 条信息'
          : '共 ' + state.total + ' 条校园信息正在流转') + '</span>' +
        '<span class="sort-text">按时间倒序</span></div>'
      : '';

    var listHtml = state.list.length > 0
      ? '<div class="result-list" data-role="scroll"><div class="result-list-inner">' +
        state.list.map(cardHtml).join('') +
        (state.loading ? '<div class="load-more">加载中…</div>'
          : (!state.hasMore ? '<div class="load-more">没有更多了</div>' : '')) +
        '<div style="height:20px;"></div></div></div>'
      : (state.loading ? '<div class="result-list"><div class="load-more">加载中…</div></div>' : '');

    var noResultHtml = showNoResult
      ? '<div class="no-result">' +
        '<div class="no-result-icon">🔍</div>' +
        '<div class="no-result-title">没有找到“' + esc(state.keyword || '当前筛选') + '”相关信息</div>' +
        '<div class="no-result-desc">可以尝试更换关键词，例如只输入“校园卡”“钥匙”等物品名称，或减少筛选条件。</div>' +
        '<div class="recommend-box"><div class="recommend-title">推荐搜索</div><div class="recommend-tags">' +
        state.hotKeywords.map(function (w) {
          return '<span class="recommend-tag" data-act="quick" data-word="' + esc(w) + '">' + esc(w) + '</span>';
        }).join('') +
        '</div></div>' +
        '<div class="no-result-actions">' +
        '<div class="action-btn outline" data-act="go-home">返回首页</div>' +
        '<div class="action-btn primary" data-act="go-publish">发布信息</div>' +
        '</div></div>'
      : '';

    var hotHtml = showHot && !showNoResult
      ? '<div class="hot-section"><div class="hot-title">大家都在搜</div><div class="hot-tags">' +
        state.hotKeywords.map(function (w) {
          return '<span class="hot-tag" data-act="quick" data-word="' + esc(w) + '">' + esc(w) + '</span>';
        }).join('') + '</div></div>'
      : '';

    root.innerHTML =
      '<div class="search-page page">' +
        '<header class="header">' +
          '<div class="search-bar">' +
            '<span class="search-icon">🔍</span>' +
            '<input class="search-input" type="search" placeholder="搜索物品名称、地点或描述" value="' + esc(state.keyword) + '" />' +
            (state.keyword ? '<span class="clear-btn" data-act="clear">✕</span>' : '') +
          '</div>' +
          '<span class="search-btn" data-act="search">搜索</span>' +
        '</header>' +

        '<div class="type-filters">' +
          '<span class="type-btn' + (state.type === 'all' ? ' active' : '') + '" data-act="type" data-type="all">全部</span>' +
          '<span class="type-btn' + (state.type === 'lost' ? ' active' : '') + '" data-act="type" data-type="lost">失物</span>' +
          '<span class="type-btn' + (state.type === 'found' ? ' active' : '') + '" data-act="type" data-type="found">招领</span>' +
        '</div>' +

        summaryHtml +
        listHtml +
        noResultHtml +
        hotHtml +
      '</div>';

    bindScroll(root);
  }

  // 挂载时绑定一次：click / input / keydown 均采用事件委托
  function bindEvents(root) {
    root.addEventListener('input', function (e) {
      if (!e.target.classList.contains('search-input')) return;
      state.keyword = e.target.value;
      var bar = root.querySelector('.search-bar');
      var existed = root.querySelector('.clear-btn');
      if (e.target.value && !existed) {
        var span = document.createElement('span');
        span.className = 'clear-btn';
        span.setAttribute('data-act', 'clear');
        span.textContent = '✕';
        bar.appendChild(span);
      } else if (!e.target.value && existed) {
        existed.remove();
      }
    });

    root.addEventListener('keydown', function (e) {
      if (e.target.classList.contains('search-input') && e.key === 'Enter') {
        doSearch(root);
      }
    });

    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act],[data-id]');
      if (!el || !root.contains(el)) return;
      var act = el.getAttribute('data-act');
      if (act === 'search') {
        doSearch(root);
      } else if (act === 'clear') {
        state.keyword = '';
        doSearch(root);
      } else if (act === 'type') {
        var type = el.getAttribute('data-type');
        if (type !== state.type) {
          state.type = type;
          doSearch(root);
        }
      } else if (act === 'quick') {
        state.keyword = el.getAttribute('data-word');
        doSearch(root);
      } else if (act === 'go-home') {
        LF.router.go('#/home');
      } else if (act === 'go-publish') {
        LF.router.go('#/publish');
      } else if (el.getAttribute('data-id')) {
        LF.router.go('#/detail?id=' + el.getAttribute('data-id'));
      }
    });
  }

  function bindScroll(root) {
    var scroll = root.querySelector('[data-role="scroll"]');
    if (!scroll) return;
    scroll.addEventListener('scroll', function () {
      if (scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 80) {
        if (state.hasMore && !state.loading) fetchList(root);
      }
    });
  }

  function doSearch(root) {
    state.page = 1;
    state.list = [];
    state.searched = true;
    fetchList(root);
  }

  function fetchList(root) {
    if (state.loading) return;
    state.loading = true;
    render(root);

    LF.api.searchItems({
      keyword: state.keyword.trim(),
      type: state.type,
      page: state.page,
      pageSize: state.pageSize
    }).then(function (data) {
      var records = (data.records || []).map(function (item) {
        LF.urlUtil.resolveItemImages(item);
        item.occurredText = LF.format.formatDateTime(item.occurredAt);
        return item;
      });
      state.list = state.page === 1 ? records : state.list.concat(records);
      state.page = state.page + 1;
      state.total = data.total || 0;
      state.hasMore = data.hasNext || false;
      state.loading = false;
      render(root);
    }).catch(function (err) {
      state.loading = false;
      render(root);
      LF.ui.toast(err.message || '搜索失败', 'error');
    });
  }

  LF.pages.search = {
    mount: function (main) {
      var root = document.createElement('div');
      root.style.flex = '1';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      main.appendChild(root);
      render(root);
      bindEvents(root);
      // 对应 onLoad：进入搜索页默认展示全部
      if (!state.inited) {
        state.inited = true;
        doSearch(root);
      }
    }
  };
})(window.LF);
