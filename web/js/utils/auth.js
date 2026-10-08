/* 页面只通过本地账号模块读取当前身份，不执行匿名登录。 */
window.LF = window.LF || {};
(function (LF) {
  function getUserInfo() { var s = LF.accounts.session(); return s ? s.user : null; }
  function getToken() { var s = LF.accounts.session(); return s ? s.token : ''; }
  function ensureLogin() {
    var token = getToken();
    return token ? Promise.resolve(token) : Promise.reject(new Error('请先登录或重新登录'));
  }
  function normalizeNext(next) {
    var value = String(next || location.hash || '#/my').replace(/^#/, '');
    if (!/^\/(home|search|publish|my|detail|success)(\?|$)/.test(value)) value = '/my';
    return value;
  }
  function loginUrl(next, mode) {
    return '#/auth?' + LF.query.stringify({ mode: mode || 'login', next: normalizeNext(next) });
  }
  LF.auth = { getToken: getToken, getUserInfo: getUserInfo, ensureLogin: ensureLogin,
    doLogin: LF.api.login, register: LF.api.register, logout: LF.api.logout,
    isAuthorized: function () { return !!getToken(); },
    setUserInfo: function () { if (LF.tabbar) LF.tabbar.refreshAccount(); },
    normalizeNext: normalizeNext, loginUrl: loginUrl,
    requestLogin: function (next, options) { return LF.pages.auth.open(next, options || {}); } };
})(window.LF);
