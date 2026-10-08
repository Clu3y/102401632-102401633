/* url.js — 图片地址处理（对应小程序 utils/url.js） */
window.LF = window.LF || {};

(function (LF) {
  /**
   * 将图片 URL 转为可访问的完整地址
   * - OSS 返回完整 https URL，直接返回
   * - 本地存储降级返回 /uploads/... 相对路径，拼接服务根地址（注意：不带 /api 前缀）
   */
  function resolveImageUrl(url) {
    if (!url) return '';
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
      return url;
    }
    if (url.charAt(0) === '/') {
      return LF.config.serverOrigin + url;
    }
    return url;
  }

  function resolveImageUrls(urls) {
    if (!urls || !urls.length) return [];
    return urls.map(resolveImageUrl);
  }

  /** 处理列表项 / 详情中的图片字段 */
  function resolveItemImages(item) {
    if (!item) return item;
    if (item.coverImageUrl) {
      item.coverImageUrl = resolveImageUrl(item.coverImageUrl);
    }
    if (item.images && item.images.length) {
      item.images = resolveImageUrls(item.images);
    }
    return item;
  }

  LF.urlUtil = {
    resolveImageUrl: resolveImageUrl,
    resolveImageUrls: resolveImageUrls,
    resolveItemImages: resolveItemImages
  };
})(window.LF);
