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
    hideToast();
    var root = overlayRoot();
    var el = document.createElement('div');
    el.className = 'toast' + (icon === 'success' || icon === 'error' ? ' special' : '');
    var iconHtml = '';
    if (icon === 'success') iconHtml = '<span class="toast-icon">' + LF.icons.render('circle-check') + '</span>';
    else if (icon === 'error') iconHtml = '<span class="toast-icon">' + LF.icons.render('triangle-alert') + '</span>';
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
      mask.lfClose = function () { close(false); };
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
  function lightbox(urls, index, item) {
    urls = urls || [];
    if (!urls.length) return;
    var idx = index || 0;
    var mask = document.createElement('div');
    mask.className = 'lightbox';
    mask.lfClose = function () { mask.remove(); };
    function render() {
      mask.innerHTML =
        '<button class="lightbox-close" type="button" aria-label="关闭图片预览">' + LF.icons.render('x') + '</button>' +
        (urls.length > 1 ? '<button class="lightbox-prev" type="button" aria-label="上一张">' + LF.icons.render('chevron-left') + '</button><button class="lightbox-next" type="button" aria-label="下一张">' + LF.icons.render('chevron-right') + '</button>' : '') +
        imageHtml(urls[idx], item || { name: '上传图片', mediaKind: 'upload' }, 'lightbox-img', false, false);
    }
    render();
    mask.addEventListener('click', function (e) {
      if (e.target.tagName === 'IMG') {
        idx = (idx + 1) % urls.length;
        render();
      } else if (e.target.closest('.lightbox-prev, .lightbox-next')) {
        idx = (idx + (e.target.closest('.lightbox-prev') ? -1 : 1) + urls.length) % urls.length;
        render();
      } else {
        mask.remove();
      }
    });
    overlayRoot().appendChild(mask);
  }

  function capture(root) {
    var scroll = root.querySelector('[data-role="scroll"], .page-flow');
    var active = document.activeElement;
    return { top: scroll ? scroll.scrollTop : 0,
      field: active && root.contains(active) ? active.getAttribute('data-field') : null };
  }
  function restore(root, snapshot) {
    var scroll = root.querySelector('[data-role="scroll"], .page-flow');
    if (scroll) scroll.scrollTop = snapshot.top;
    if (snapshot.field) {
      var input = root.querySelector('[data-field="' + snapshot.field + '"]');
      if (input) input.focus({ preventScroll: true });
    }
    enhance(root);
  }
  function enhance(root) {
    root.querySelectorAll('[data-act], .item-card[data-id], .result-card[data-id]').forEach(function (el) {
      if (el.matches('.sheet-mask, .auth-mask') || el.matches('button, a, input')) return;
      el.setAttribute('role', el.hasAttribute('data-id') && !el.hasAttribute('data-act') ? 'link' : 'button');
      el.setAttribute('tabindex', el.classList.contains('disabled') ? '-1' : '0');
      if (el.classList.contains('modal-close') || el.classList.contains('image-remove')) el.setAttribute('aria-label', el.classList.contains('image-remove') ? '移除图片' : '关闭');
      if (el.matches('.hero-img, .image-thumb')) el.setAttribute('aria-label', '查看大图');
      if (el.matches('.type-card, .category-tag, .type-btn, .tab-btn, .scope-btn, .status-option')) el.setAttribute('aria-pressed', String(el.classList.contains('active')));
    });
    root.querySelectorAll('input:not([type="file"]), textarea, select').forEach(function (el) {
      if (!el.hasAttribute('aria-label') && !el.closest('label')) {
        var labels = { name: '物品名称', location: '地点', date: '发生日期', time: '发生时间', description: '物品描述', contact: '联系方式', meetingPlace: '方便交接的位置' };
        el.setAttribute('aria-label', labels[el.getAttribute('data-field')] || el.placeholder || '输入内容');
      }
    });
    root.querySelectorAll('.header-title, .detail-title, .success-title').forEach(function (el) {
      if (el.tagName === 'H1') return;
      el.setAttribute('role', 'heading'); el.setAttribute('aria-level', '1');
    });
  }
  function dialogs() { return Array.from(document.querySelectorAll('[data-lf-dialog]')); }
  function coverUrl(item) {
    if (item.coverImageUrl) return item.coverImageUrl;
    return LF.media.fallback(item.categoryCode);
  }
  function imageHtml(src, item, className, preview, lazy) {
    var kind = item.mediaKind || 'upload';
    var caption = kind === 'demo' ? '演示配图' : (kind === 'placeholder' ? '暂无实拍图' : '');
    var alt = (item.name || '物品') + (caption ? ' · ' + caption : ' · 上传图片');
    return '<span class="lf-media" data-media-kind="' + escapeHtml(kind) + '">' +
      (src ? '<img src="' + escapeHtml(src) + '" class="' + escapeHtml(className) + '" alt="' + escapeHtml(alt) +
        '" data-lf-image data-category="' + escapeHtml(item.categoryCode || '') + '"' +
        (preview ? ' data-act="preview" data-url="' + escapeHtml(src) + '"' : '') +
        (lazy ? ' loading="lazy"' : '') + ' decoding="async" />' :
        '<span class="lf-media-fallback">' + LF.icons.render(LF.media.categoryIcon(item.categoryCode)) + '</span>') +
      '<span class="media-caption"' + (caption ? '' : ' hidden') + '>' + caption + '</span></span>';
  }
  function coverHtml(item) {
    return imageHtml(coverUrl(item), item, 'cover-img', false, true);
  }
  // error 不冒泡，使用捕获监听；每张图片最多再尝试一次类别占位图。
  document.addEventListener('error', function (event) {
    var img = event.target;
    if (!img.matches || !img.matches('img[data-lf-image]')) return;
    var wrap = img.closest('.lf-media');
    var fallback = LF.media.fallback(img.getAttribute('data-category'));
    var caption = wrap.querySelector('.media-caption');
    caption.hidden = false; caption.textContent = '图片暂不可用';
    wrap.classList.add('media-unavailable');
    ['data-act', 'data-url', 'tabindex', 'role', 'aria-label'].forEach(function (key) { img.removeAttribute(key); });
    img.alt = '图片暂不可用，显示类别示意图';
    if (!img.hasAttribute('data-fallback-tried') && fallback && img.getAttribute('src') !== fallback) {
      img.setAttribute('data-fallback-tried', ''); img.src = fallback;
    } else {
      var icon = document.createElement('span'); icon.className = 'lf-media-fallback';
      icon.innerHTML = LF.icons.render('image-off'); img.replaceWith(icon);
    }
  }, true);
  function closeDialog(mask) {
    if (mask.lfClose) { mask.lfClose(); return; }
    var button = mask.querySelector('[data-act="close-contact"], [data-act="close-sheet"], [data-act="close-profile"], [data-act="close-auth"], [data-act="cancel"]');
    if (button) button.click(); else mask.remove();
  }
  document.addEventListener('keydown', function (e) {
    var list = dialogs(), mask = list[list.length - 1];
    if (mask && e.key === 'Escape') { e.preventDefault(); closeDialog(mask); return; }
    if (mask && e.key === 'Tab') {
      var focusable = Array.from(mask.querySelectorAll('button, a[href], input:not([type="file"]), textarea, select, [tabindex="0"]'))
        .filter(function (el) { return !el.disabled && !el.classList.contains('disabled') && el.getClientRects().length; });
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) { e.preventDefault(); mask.focus(); }
      else if (e.shiftKey && (document.activeElement === first || !mask.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !mask.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
    var el = e.target.closest('[role="button"], [role="link"]');
    if (el && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (!el.classList.contains('disabled')) el.click();
    }
  });
  new MutationObserver(function (changes) {
    enhance(document.body);
    document.querySelectorAll('.sheet-mask, .modal-mask-center, .auth-mask, .lightbox').forEach(function (mask) {
      if (mask.hasAttribute('data-lf-dialog')) return;
      mask.setAttribute('data-lf-dialog', '');
      mask.setAttribute('role', 'dialog');
      mask.setAttribute('aria-modal', 'true');
      mask.setAttribute('aria-label', (mask.querySelector('.modal-title, .auth-title') || {}).textContent || (mask.classList.contains('lightbox') ? '图片预览' : '确认操作'));
      mask.tabIndex = -1;
      mask.lfReturnFocus = mask.lfReturnFocus || document.activeElement;
      mask.lfHash = location.hash;
      var target = mask.querySelector('input:not([type="file"]), button, [tabindex="0"]');
      (target || mask).focus({ preventScroll: true });
    });
    changes.forEach(function (change) {
      change.removedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        var removed = node.matches('[data-lf-dialog]') ? [node] : Array.from(node.querySelectorAll('[data-lf-dialog]'));
        removed.forEach(function (mask) {
          if (mask.isConnected || mask.lfHash !== location.hash) return;
          var target = mask.lfReturnFocus;
          if (target && !target.isConnected && target.hasAttribute('data-act')) {
            var old = target;
            target = Array.from(document.querySelectorAll('[data-act]')).find(function (el) {
              return el.getAttribute('data-act') === old.getAttribute('data-act') &&
                el.getAttribute('data-id') === old.getAttribute('data-id');
            });
          }
          if (target && target.isConnected) target.focus({ preventScroll: true });
        });
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  LF.ui = {
    escapeHtml: escapeHtml,
    toast: toast,
    hideToast: hideToast,
    showLoading: showLoading,
    hideLoading: hideLoading,
    modal: modal,
    lightbox: lightbox,
    capture: capture, restore: restore, enhance: enhance, coverUrl: coverUrl,
    coverHtml: coverHtml, imageHtml: imageHtml
  };
})(window.LF);
