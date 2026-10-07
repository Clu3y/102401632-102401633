/* request.js — （已停用）
 * 原版用 fetch 封装对 Spring Boot 后端（localhost:8080/api）的请求。
 * 当前不再连接任何后端：所有接口由 js/data/local-api.js 在浏览器内实现，
 * 数据经 js/data/db.js 存入 localStorage。本文件已不再被 index.html 加载，
 * 仅保留以说明网络层的去向；请勿在此恢复远程请求。
 */
window.LF = window.LF || {};

LF.request = function () {
  return Promise.reject(new Error('当前不发起远程请求，请使用 LF.api（本地数据服务）'));
};
