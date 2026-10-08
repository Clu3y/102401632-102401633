/* config.js — 全局配置
 * 本版本不依赖任何后端服务：数据保存在浏览器 localStorage，图片保存在本地
 * （种子图为 assets/items 下的 SVG，用户上传图压缩为 dataURL 内嵌存储）。
 * 因此不再需要后端服务根地址；serverOrigin 保留为空字符串，仅为兼容旧的图片地址工具。
 */
window.LF = window.LF || {};

LF.config = {
  // 当前无远程服务，置空即可（不要改成 localhost:8080）
  serverOrigin: '',
  baseUrl: ''
};
