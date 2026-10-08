/* api.js — 接口集合
 * 原版通过 fetch 调用 Spring Boot 后端（localhost:8080）；当前改为直接调用
 * 浏览器内的本地数据服务 LF.localApi（见 js/data/local-api.js，数据存 localStorage）。
 * 方法名、参数、返回的 Promise 数据结构与后端接口完全一致，页面脚本无需改动。
 */
window.LF = window.LF || {};

(function (LF) {
  var api = LF.localApi;
  // 本地数据服务的方法签名与原后端接口一一对应，直接转发即可。
  LF.api = {
    login: api.login,
    getItems: api.getItems,
    searchItems: api.searchItems,
    getItemDetail: api.getItemDetail,
    getItemContact: api.getItemContact,
    createItem: api.createItem,
    updateItemStatus: api.updateItemStatus,
    getMyItems: api.getMyItems,
    getCurrentUser: api.getCurrentUser,
    updateCurrentUser: api.updateCurrentUser,
    uploadImage: api.uploadImage
  };
})(window.LF);
