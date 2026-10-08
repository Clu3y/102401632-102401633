/* ui.js — 交互组件，替代小程序的 wx.showToast / showModal / showLoading / previewImage */
window.LF = window.LF || {};

(function (LF) {
  function overlayRoot() {
    return document.getElementById('overlay-root');
  }

  /** HTML 转义，防止用户输入内容注入 */
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------- toast ---------------- */
  var toastTimer = null;
  function toast(title, icon, duration) {
    var root = overlayRoot();
    var el = document.createElement('div');
    el.className = 'toast' + (icon === 'success' || icon === 'error' ? ' special' : '');
    var iconHtml = '';
    if (icon === 'success') iconHtml = '<span class="toast-icon">✅</span>';
    else if (icon === 'error') iconHtml = '<span class="toast-icon">⚠️</span>';
    else if (icon === 'loading') iconHtml = '<span class="toast-icon"><span class="loading-spinner"></span></span>';
    el.innerHTML = iconHtml + '<span>' + escapeHtml(title || '') + '</span>';
    root.appendChild(el);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.remove();
      toastTimer = null;
    }, icon === 'loading' ? 10000 : (duration || 2000));
  }

  function hideToast() {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    var t = overlayRoot().querySelector('.toast');
    if (t) t.remove();
  }

  /* ---------------- loading 遮罩 ---------------- */
  var loadingEl = null;
  function showLoading(title) {
    hideLoading();
    loadingEl = document.createElement('div');
    loadingEl.className = 'loading-mask';
    loadingEl.innerHTML =
      '<div class="loading-box"><span class="loading-spinner"></span><span>' +
      escapeHtml(title || '加载中…') + '</span></div>';
    overlayRoot().appendChild(loadingEl);
  }
  function hideLoading() {
    if (loadingEl) {
      loadingEl.remove();
      loadingEl = null;
    }
  }

  /* ---------------- 模态对话框（Promise） ---------------- */
  /**
   * @returns {Promise<boolean>} 点击确认 resolve(true)，取消 resolve(false)
   */
  function modal(options) {
    options = options || {};
    return new Promise(function (resolve) {
      var mask = document.createElement('div');
      mask.className = 'modal-mask-center';
      var footer = options.showCancel === false
        ? '<div class="modal-footer"><button class="btn-confirm" data-act="confirm">' +
          escapeHtml(options.confirmText || '确定') + '</button></div>'
        : '<div class="modal-footer">' +
          '<button class="btn-cancel" data-act="cancel">' + escapeHtml(options.cancelText || '取消') + '</button>' +
          '<button class="btn-confirm" data-act="confirm">' + escapeHtml(options.confirmText || '确定') + '</button></div>';
      mask.innerHTML =
        '<div class="modal-dialog">' +
        (options.title ? '<div class="modal-title">' + escapeHtml(options.title) + '</div>' : '') +
        '<div class="modal-content">' + escapeHtml(options.content || '') + '</div>' +
        footer +
        '</div>';
      function close(result) {
        mask.remove();
        resolve(result);
      }
      mask.addEventListener('click', function (e) {
        var act = e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'confirm') close(true);
        else if (act === 'cancel') close(false);
        else if (e.target === mask && options.showCancel !== false) close(false);
      });
      overlayRoot().appendChild(mask);
    });
  }

  /* ---------------- 图片预览（wx.previewImage） ---------------- */
  function lightbox(urls, index) {
    urls = urls || [];
    if (!urls.length) return;
    var idx = index || 0;
    var mask = document.createElement('div');
    mask.className = 'lightbox';
    function render() {
      mask.innerHTML =
        '<button class="lightbox-close" type="button">✕</button>' +
        '<img src="' + escapeHtml(urls[idx]) + '" alt="预览图" />';
    }
    render();
    mask.addEventListener('click', function (e) {
      if (e.target.tagName === 'IMG') {
        idx = (idx + 1) % urls.length;
        render();
      } else {
        mask.remove();
      }
    });
    overlayRoot().appendChild(mask);
  }

  LF.ui = {
    escapeHtml: escapeHtml,
    toast: toast,
    hideToast: hideToast,
    showLoading: showLoading,
    hideLoading: hideLoading,
    modal: modal,
    lightbox: lightbox
  };
})(window.LF);
