/* api.js — 接口集合
 * 原版通过 fetch 调用 Spring Boot 后端（localhost:8080）；当前改为直接调用
 * 浏览器内的本地数据服务 LF.localApi（见 js/data/local-api.js，数据存 localStorage）。
 * LF.api 保持本地版方法和 Promise 返回结构；新增搜索条件可选。
 * 现有 Java 后端使用不同的账号、枚举、分页和上传协议，接入需另做适配。
 */
window.LF = window.LF || {};

(function (LF) {
  var api = LF.localApi;
  // 统一转发本地业务服务，页面不直接读写数据库。
  LF.api = {
    register: api.register,
    login: api.login,
    logout: api.logout,
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
