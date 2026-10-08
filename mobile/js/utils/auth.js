/* auth.js — 登录鉴权（对应小程序 utils/auth.js）
 * 差异说明：Web 端没有 wx.login，开发阶段后端直接把 code 当作 openid，
 * 因此浏览器首次访问时在本地生成一个稳定的匿名 code（web_xxx）完成静默登录；
 * 用户也可在登录弹窗中填写昵称，再次调用登录接口更新资料。
 */
window.LF = window.LF || {};

(function (LF) {
  var WEB_CODE_KEY = 'webCode';

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  /** 生成 / 读取本机稳定的匿名登录 code */
  function getWebCode() {
    var code = localStorage.getItem(WEB_CODE_KEY);
    if (!code) {
      code = 'web_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(WEB_CODE_KEY, code);
    }
    return code;
  }

  /** 确保已登录：有 token 直接返回，否则匿名静默登录 */
  function ensureLogin() {
    var token = getToken();
    if (token) {
      return Promise.resolve(token);
    }
    return doLogin();
  }

  /**
   * 执行登录
   * @param {Object} profile - 可选 { nickname, avatarUrl, college, grade }
   */
  function doLogin(profile) {
    return LF.api.login(getWebCode(), profile || {}).then(function (data) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify(data.user || {}));
      return data.token;
    });
  }

  /**
   * 登录弹窗的主按钮：携带昵称等资料登录 / 注册
   */
  function authorizeLogin(profile) {
    return doLogin(profile || {});
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
  }

  function getUserInfo() {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || 'null');
    } catch (e) {
      return null;
    }
  }

  function setUserInfo(userInfo) {
    localStorage.setItem('userInfo', JSON.stringify(userInfo || {}));
  }

  /** 是否已完成资料授权（存在昵称） */
  function isAuthorized() {
    var userInfo = getUserInfo();
    return !!(userInfo && userInfo.nickname);
  }

  LF.auth = {
    getToken: getToken,
    getWebCode: getWebCode,
    ensureLogin: ensureLogin,
    doLogin: doLogin,
    authorizeLogin: authorizeLogin,
    logout: logout,
    getUserInfo: getUserInfo,
    setUserInfo: setUserInfo,
    isAuthorized: isAuthorized
  };
})(window.LF);
