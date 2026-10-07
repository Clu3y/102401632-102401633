/* tabbar.js — 响应式导航，图标来自本地 Lucide 子集 */
window.LF = window.LF || {};

(function (LF) {
  var ITEMS = [
    { key: 'home', label: '首页', icon: 'house', hash: '#/home' },
    { key: 'search', label: '搜索', icon: 'search', hash: '#/search' },
    { key: 'publish', label: '发布', icon: 'square-pen', hash: '#/publish' },
    { key: 'my-posts', label: '我的', desktopLabel: '我的发布', icon: 'user-round', hash: '#/my' }
  ];

  /**
   * 渲染底部导航
   * @param {string|null} activeKey 当前 tab；传 null 时隐藏导航（详情 / 成功页）
   */
  function render(activeKey) {
    var desktop = document.getElementById('desktop-nav');
    var route = (location.hash || '').split('?')[0];
    var context = activeKey || (route === '#/success' ? 'publish' : route === '#/auth' ? null : 'home');
    desktop.innerHTML = '<a class="brand" href="#/home"><img src="assets/logo.svg" alt="" /><span>校园失物招领<small>让线索找到彼此</small></span></a>' +
      '<p class="nav-caption">校园里的小事，也值得被看见</p><nav>' + ITEMS.map(function (item) {
        return '<a class="desktop-link' + (item.key === context ? ' active' : '') + '" href="' + item.hash + '"' + (item.key === context ? ' aria-current="page"' : '') + '>' + LF.icons.render(item.icon) + (item.desktopLabel || item.label) + '</a>';
      }).join('') + '</nav><div class="desktop-account" aria-label="账号"></div><div class="sidebar-note"><strong>一次留意，一份安心。</strong><p>核对物品特征，选择公共场所交接。找回后，记得更新状态。</p></div>';
    refreshAccount();
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
      html += '<a class="tab-item' + (active ? ' active' : '') + '" href="' + item.hash + '"' + (active ? ' aria-current="page"' : '') + '>' +
        LF.icons.render(item.icon) +
        '<span>' + item.label + '</span></a>';
    });
    html += '</div>';
    bar.innerHTML = html;
  }

  function refreshAccount() {
    var user = LF.auth.getUserInfo(), esc = LF.ui.escapeHtml;
    var content = '<div class="account-actions">' + (user
      ? '<span class="account-name">你好，' + esc(user.nickname) + '</span><button type="button" class="account-logout">退出</button>'
      : '<a class="account-link" data-auth-mode="login" href="' + esc(LF.auth.loginUrl()) + '">登录</a><a class="account-link primary" data-auth-mode="register" href="' + esc(LF.auth.loginUrl(null, 'register')) + '">注册</a>') + '</div>';
    [document.querySelector('.desktop-account'), document.getElementById('mobile-account')].forEach(function (box) {
      if (!box) return;
      box.innerHTML = content;
      var button = box.querySelector('.account-logout');
      if (button) button.addEventListener('click', function () {
        if (LF.pages.publish && LF.pages.publish.leave) LF.pages.publish.leave();
        LF.auth.logout().then(function () { LF.ui.toast('已退出登录', 'success'); }).catch(function (error) { LF.ui.toast(error.message, 'error'); });
      });
    });
  }
  LF.tabbar = { render: render, refreshAccount: refreshAccount, ITEMS: ITEMS };
})(window.LF);
