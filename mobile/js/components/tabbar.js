/* tabbar.js — 底部导航（对应 app.json 中的 tabBar，图标复用小程序 assets/tabbar） */
window.LF = window.LF || {};

(function (LF) {
  var ITEMS = [
    { key: 'home', label: '首页', icon: 'assets/tabbar/home.png', activeIcon: 'assets/tabbar/home_active.png', hash: '#/home' },
    { key: 'search', label: '搜索', icon: 'assets/tabbar/search.png', activeIcon: 'assets/tabbar/search_active.png', hash: '#/search' },
    { key: 'publish', label: '发布', icon: 'assets/tabbar/publish.png', activeIcon: 'assets/tabbar/publish_active.png', hash: '#/publish' },
    { key: 'my-posts', label: '我的', icon: 'assets/tabbar/mine.png', activeIcon: 'assets/tabbar/mine_active.png', hash: '#/my' }
  ];

  /**
   * 渲染底部导航
   * @param {string|null} activeKey 当前 tab；传 null 时隐藏导航（详情 / 成功页）
   */
  function render(activeKey) {
    var bar = document.getElementById('tab-bar');
    if (!activeKey) {
      bar.classList.remove('visible');
      bar.innerHTML = '';
      return;
    }
    bar.classList.add('visible');
    var html = '<div class="tab-bar-inner">';
    ITEMS.forEach(function (item) {
      var active = item.key === activeKey;
      var icon = active ? item.activeIcon : item.icon;
      html += '<a class="tab-item' + (active ? ' active' : '') + '" href="' + item.hash + '">' +
        '<img src="' + icon + '" alt="" />' +
        '<span>' + item.label + '</span></a>';
    });
    html += '</div>';
    bar.innerHTML = html;
  }

  LF.tabbar = { render: render, ITEMS: ITEMS };
})(window.LF);
