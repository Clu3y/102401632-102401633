/* 邮箱密码登录 / 注册，与其他页面使用同一本地账号服务。 */
window.LF = window.LF || {};
LF.pages = LF.pages || {};
(function (LF) {
  var modal = null, standalone = null;

  // 独立地址与弹窗共用同一表单；销毁时使未完成的账号请求失效。
  function mountForm(root, options) {
    var disposed = false, generation = 0;
    function render(mode, email) {
      var register = mode === 'register', legacy = register ? LF.accounts.legacyInfo() : null;
      var version = ++generation, esc = LF.ui.escapeHtml;
      LF.accounts.cancelPending();
      root.innerHTML = '<img class="account-logo" src="assets/logo.svg" alt="" />' +
        '<h1 class="auth-title">' + (register ? '加入校园互助' : '欢迎回来') + '</h1>' +
        '<p class="account-subtitle">' + (register ? '用一个账号，留住你的每一份线索。' : '登录后继续管理你的发布。') + '</p>' +
        '<form class="account-form" novalidate>' +
        (register ? '<label>昵称<input name="nickname" maxlength="30" autocomplete="nickname" required placeholder="怎么称呼你" /></label>' : '') +
        '<label>邮箱<input name="email" type="email" maxlength="254" autocomplete="username" required placeholder="you@example.com" value="' + esc(email || '') + '" /></label>' +
        '<label>密码<input name="password" type="password" minlength="8" maxlength="64" autocomplete="' + (register ? 'new-password' : 'current-password') + '" required placeholder="' + (register ? '8–64 个字符' : '输入你的密码') + '" /></label>' +
        (legacy ? '<label class="legacy-confirm"><input type="checkbox" name="bindLegacy" /><span>将当前浏览器中“' + esc(legacy.nickname) + '”的旧资料和 ' + legacy.count + ' 条发布记录绑定到此账号。旧文字草稿也会保留。</span></label>' : '') +
        '<div class="account-error" role="alert" aria-live="polite"></div>' +
        '<button class="account-submit" type="submit">' + (register ? '注册并登录' : '登录') + '</button></form>' +
        '<p class="account-switch">' + (register ? '已有账号？' : '还没有账号？') + ' <a href="' + esc(LF.auth.loginUrl(options.next, register ? 'login' : 'register')) + '">' + (register ? '去登录' : '注册一个账号') + '</a></p>' +
        '<p class="account-note">离线演示账号仅在当前浏览器和访问地址下有效，不提供邮箱验证或密码找回。请使用演示密码。</p>';
      var dialog = root.closest('.auth-overlay');
      if (dialog) dialog.setAttribute('aria-label', root.querySelector('.auth-title').textContent);
      var form = root.querySelector('form'), busy = false;
      root.querySelector('.account-switch a').addEventListener('click', function (event) {
        event.preventDefault();
        render(register ? 'login' : 'register', form.elements.email.value);
        root.querySelector('[name="email"]').focus({ preventScroll: true });
      });
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (busy) return;
        var data = { email: form.elements.email.value, password: form.elements.password.value };
        if (register) { data.nickname = form.elements.nickname.value; data.bindLegacy = !!(form.elements.bindLegacy && form.elements.bindLegacy.checked); }
        busy = true;
        var button = form.querySelector('button'), error = root.querySelector('.account-error');
        button.disabled = true; button.textContent = register ? '注册中…' : '登录中…'; error.textContent = '';
        (register ? LF.auth.register(data) : LF.auth.doLogin(data)).then(function () {
          if (disposed || version !== generation || !root.isConnected) return;
          form.elements.password.value = '';
          options.onSuccess();
          LF.ui.toast(register ? '注册成功，欢迎加入' : '登录成功', 'success');
        }).catch(function (err) {
          if (!disposed && version === generation && root.isConnected) error.textContent = err.message || '操作失败，请重试';
        }).finally(function () {
          busy = false; button.disabled = false; button.textContent = register ? '注册并登录' : '登录';
        });
      });
    }
    render(options.mode, '');
    return function () {
      disposed = true; generation++; LF.accounts.cancelPending();
      var password = root.querySelector('[name="password"]');
      if (password) password.value = '';
    };
  }

  function close() {
    if (!modal) return;
    var current = modal; modal = null;
    current.dispose(); current.mask.remove();
    current.background.forEach(function (entry) { entry.node.inert = entry.inert; });
  }

  function open(next, options) {
    options = options || {};
    if (modal) { modal.mask.querySelector('input').focus({ preventScroll: true }); return; }
    var target = LF.auth.normalizeNext(next || '/my'), source = location.hash;
    var mask = document.createElement('div'); mask.className = 'auth-mask auth-overlay';
    mask.lfReturnFocus = document.activeElement;
    mask.innerHTML = '<section class="account-panel"><button type="button" class="account-close" aria-label="关闭登录弹窗">×</button><div class="account-content"></div></section>';
    var background = Array.from(document.querySelectorAll('#app-main,#desktop-nav,#mobile-account,.tablet-brand,#tab-bar,.skip-link')).map(function (node) {
      return { node: node, inert: node.inert };
    });
    document.getElementById('overlay-root').appendChild(mask);
    var current = { mask: mask, background: background, dispose: function () {} }; modal = current;
    current.dispose = mountForm(mask.querySelector('.account-content'), {
      mode: options.mode || 'login', next: target,
      onSuccess: function () {
        if (modal !== current || location.hash !== source) return;
        close(); LF.tabbar.refreshAccount();
        if (options.onSuccess) options.onSuccess();
        else LF.router.go('#' + target);
      }
    });
    background.forEach(function (entry) { entry.node.inert = true; });
    mask.lfClose = close;
    mask.querySelector('.account-close').addEventListener('click', close);
    mask.addEventListener('click', function (event) { if (event.target === mask) close(); });
  }

  LF.pages.auth = {
    open: open, close: close, isOpen: function () { return !!modal; },
    leave: function () { close(); if (standalone) { standalone(); standalone = null; } },
    mount: function (main, query) {
      var next = LF.auth.normalizeNext(query.next || '/my');
      var root = document.createElement('div'); root.className = 'auth-root page';
      root.innerHTML = '<div class="page-scroll"><section class="account-panel"><a class="account-back" href="#/home">← 返回首页</a><div class="account-content"></div></section></div>';
      main.appendChild(root);
      standalone = mountForm(root.querySelector('.account-content'), {
        mode: query.mode || 'login', next: next,
        onSuccess: function () { LF.router.go('#' + next); }
      });
    }
  };
})(window.LF);
