/* pages/search.js — 搜索页（对应 pages/search/index） */
window.LF = window.LF || {};
LF.pages = LF.pages || {};

(function (LF) {
  var esc = LF.ui.escapeHtml;

  var state = {
    keyword: '',
    type: 'all',
    categoryCode: '', location: '', status: 'all', sort: 'newest',
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
        LF.ui.coverHtml(item) +
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

  var requestVersion = 0;

  function render(root) {
    var snapshot = LF.ui.capture(root);
    var showHot = !state.searched || (state.keyword === '' && state.list.length === 0);
    var showNoResult = state.searched && !state.loading && state.list.length === 0;

    var summaryHtml = (state.searched && state.list.length > 0)
      ? '<div class="result-summary">' +
        '<span>' + (state.keyword
          ? '关键词“' + esc(state.keyword) + '”：找到 ' + state.total + ' 条信息'
          : '共 ' + state.total + ' 条校园信息正在流转') + '</span>' +
        '<span class="sort-text">' + ({newest:'最新发布',oldest:'最早发布',occurred:'最近发生'}[state.sort]) + '</span></div>'
      : '';

    var listHtml = state.list.length > 0
      ? '<div class="result-list"><div class="result-list-inner">' +
        state.list.map(cardHtml).join('') +
        (state.loading ? '<div class="load-more">加载中…</div>'
          : (!state.hasMore ? '<div class="load-more">没有更多了</div>' : '<button class="load-more-button" data-act="more">加载更多</button>')) +
        '<div style="height:20px;"></div></div></div>'
      : (state.loading ? '<div class="result-list"><div class="load-more">加载中…</div></div>' : '');

    var noResultHtml = showNoResult
      ? '<div class="no-result">' +
        '<div class="no-result-icon">' + LF.icons.render('search') + '</div>' +
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
      '<div class="search-page page"><div class="page-scroll" data-role="scroll">' +
        '<header class="header">' +
          '<div class="search-bar">' +
            '<span class="search-icon">' + LF.icons.render('search') + '</span>' +
            '<input class="search-input" type="search" placeholder="搜索物品名称、地点或描述" value="' + esc(state.keyword) + '" />' +
            (state.keyword ? '<span class="clear-btn" data-act="clear" aria-label="清空关键词">' + LF.icons.render('x') + '</span>' : '') +
          '</div>' +
          '<span class="search-btn" data-act="search">搜索</span>' +
        '</header>' +

        '<div class="type-filters">' +
          '<span class="type-btn' + (state.type === 'all' ? ' active' : '') + '" data-act="type" data-type="all">全部</span>' +
          '<span class="type-btn' + (state.type === 'lost' ? ' active' : '') + '" data-act="type" data-type="lost">失物</span>' +
          '<span class="type-btn' + (state.type === 'found' ? ' active' : '') + '" data-act="type" data-type="found">招领</span>' +
        '</div>' +

        '<form class="search-filters" data-role="filters">' +
          '<label>物品类别<select data-field="categoryCode"><option value="">全部类别</option>' +
          LF.constants.CATEGORY.map(function(c) { return '<option value="' + c.code + '"' + (state.categoryCode === c.code ? ' selected' : '') + '>' + c.name + '</option>'; }).join('') + '</select></label>' +
          '<label>地点<input data-field="location" placeholder="例如：图书馆" value="' + esc(state.location) + '" /></label>' +
          '<label>信息状态<select data-field="status">' + [['all','全部状态'],['ongoing','进行中'],['closed','已结束']].map(function(o) { return '<option value="' + o[0] + '"' + (state.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
          '<label>排序<select data-field="sort">' + [['newest','最新发布'],['oldest','最早发布'],['occurred','最近发生']].map(function(o) { return '<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
          '<button type="submit" class="filter-submit">应用筛选</button><button type="button" data-act="reset-filters" class="filter-reset">清空条件</button></form>' +
        summaryHtml +
        listHtml +
        noResultHtml +
        hotHtml +
      '</div></div>';

    LF.ui.restore(root, snapshot);
    bindScroll(root);
  }

  // 挂载时绑定一次：click / input / keydown 均采用事件委托
  function bindEvents(root) {
    root.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-field') === 'location') { state.location = e.target.value; return; }
      if (!e.target.classList.contains('search-input')) return;
      state.keyword = e.target.value;
      var bar = root.querySelector('.search-bar');
      var existed = root.querySelector('.clear-btn');
      if (e.target.value && !existed) {
        var span = document.createElement('span');
        span.className = 'clear-btn';
        span.setAttribute('data-act', 'clear');
        span.innerHTML = LF.icons.render('x');
        span.setAttribute('aria-label', '清空关键词');
        bar.appendChild(span);
      } else if (!e.target.value && existed) {
        existed.remove();
      }
    });

    root.addEventListener('submit', function (e) { e.preventDefault(); doSearch(root); });
    root.addEventListener('change', function (e) {
      var field = e.target.getAttribute('data-field');
      if (field && field !== 'location') { state[field] = e.target.value; doSearch(root); }
    });
    root.addEventListener('keydown', function (e) {
      if ((e.target.classList.contains('search-input') || e.target.getAttribute('data-field') === 'location') && e.key === 'Enter') {
        e.preventDefault(); doSearch(root);
      }
    });

    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act],[data-id]');
      if (!el || !root.contains(el)) return;
      var act = el.getAttribute('data-act');
      if (act === 'more') { fetchList(root);
      } else if (act === 'reset-filters') {
        state.keyword = ''; state.type = 'all'; state.categoryCode = ''; state.location = ''; state.status = 'all'; state.sort = 'newest'; doSearch(root);
      } else if (act === 'search') {
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
    LF.router.go('#/search?' + LF.query.stringify({ keyword: state.keyword.trim(), type: state.type,
      categoryCode: state.categoryCode, location: state.location.trim(), status: state.status, sort: state.sort }));
  }

  function fetchList(root) {
    if (state.loading || !state.hasMore) return;
    var version = ++requestVersion;
    var page = state.page;
    var params = { keyword: state.keyword.trim(), type: state.type, categoryCode: state.categoryCode,
      location: state.location.trim(), status: state.status, sort: state.sort, page: page, pageSize: state.pageSize };
    state.loading = true;
    render(root);
    LF.api.searchItems(params).then(function (data) {
      if (version !== requestVersion || !root.isConnected) return;
      var records = (data.records || []).map(function (item) {
        LF.urlUtil.resolveItemImages(item);
        item.occurredText = LF.format.formatDateTime(item.occurredAt);
        return item;
      });
      state.list = page === 1 ? records : state.list.concat(records);
      state.page = page + 1;
      state.total = data.total || 0;
      state.hasMore = !!data.hasNext;
      state.loading = false;
      render(root);
    }).catch(function (err) {
      if (version !== requestVersion || !root.isConnected) return;
      state.loading = false;
      render(root);
      LF.ui.toast(err.message || '搜索失败', 'error');
    });
  }

  LF.pages.search = {
    mount: function (main, query) {
      query = query || {};
      requestVersion++;
      state.keyword = query.keyword || ''; state.location = query.location || '';
      state.type = ['lost','found'].indexOf(query.type) >= 0 ? query.type : 'all';
      state.categoryCode = LF.constants.CATEGORY.some(function(c) { return c.code === query.categoryCode; }) ? query.categoryCode : '';
      state.status = ['ongoing','closed'].indexOf(query.status) >= 0 ? query.status : 'all';
      state.sort = ['oldest','occurred'].indexOf(query.sort) >= 0 ? query.sort : 'newest';
      state.loading = false; state.hasMore = true; state.page = 1; state.list = []; state.searched = true;
      var root = document.createElement('div');
      root.className = 'search-root';
      root.style.flex = '1';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      main.appendChild(root);
      render(root);
      bindEvents(root);
      fetchList(root);
    }
  };
})(window.LF);
