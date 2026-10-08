/* pages/detail.js — 详情页（对应 pages/detail/index） */
window.LF = window.LF || {};
LF.pages = LF.pages || {};

(function (LF) {
  var ui = LF.ui, esc = LF.ui.escapeHtml;

  LF.pages.detail = {
    mount: function (main, query) {
      var id = query && query.id;
      var root = document.createElement('div');
      root.className = 'page';
      main.appendChild(root);

      if (!id) {
        ui.toast('参数错误', 'error');
        return;
      }

      var state = {
        id: id,
        loading: true,
        detail: null,
        contactVisible: false,
        contact: null,
        contactLoading: false
      };

      function heroHtml(detail) {
        if (detail.images && detail.images.length > 0) {
          var slides = detail.images.map(function (url) {
            return '<div class="hero-slide"><img src="' + esc(url) + '" class="hero-img" data-act="preview" data-url="' + esc(url) + '" alt="" /></div>';
          }).join('');
          var dots = detail.images.length > 1
            ? '<div class="hero-dots">' + detail.images.map(function (_, i) {
                return '<span class="hero-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></span>';
              }).join('') + '</div>'
            : '';
          return '<div class="hero"><div class="hero-swiper" data-role="swiper">' + slides + '</div>' + dots + '</div>';
        }
        return '<div class="hero hero-placeholder"><span class="hero-placeholder-icon">📦</span></div>';
      }

      function infoRow(icon, label, value) {
        return '<div class="info-row"><div class="info-icon">' + icon + '</div>' +
          '<div class="info-content"><div class="info-label">' + label + '</div>' +
          '<div class="info-value">' + value + '</div></div></div>';
      }

      function contactBodyHtml() {
        var c = state.contact;
        if (state.contactLoading) return '<div class="contact-loading">加载中…</div>';
        if (!c) return '<div class="contact-loading">暂未获取到联系方式</div>';

        var parts = [];
        if (c.contactType === 'wechat') {
          parts.push('<div class="contact-item"><div class="contact-icon">💬</div><div class="contact-info">' +
            '<div class="contact-label">微信号</div><div class="contact-value">' + esc(c.contactValue) + '</div></div>' +
            '<div class="contact-action" data-act="copy-contact">复制</div></div>');
        }
        if (c.contactType === 'mobile') {
          parts.push('<div class="contact-item"><div class="contact-icon">📞</div><div class="contact-info">' +
            '<div class="contact-label">手机号</div><div class="contact-value">' + esc(c.contactValue) + '</div></div>' +
            '<div class="contact-action" data-act="call-phone">拨打</div></div>');
        }
        if (c.meetingPlace) {
          parts.push('<div class="contact-item"><div class="contact-icon">📍</div><div class="contact-info">' +
            '<div class="contact-label">方便交接的位置</div><div class="contact-value">' + esc(c.meetingPlace) + '</div></div></div>');
        }
        if (c.publisherName) {
          parts.push('<div class="contact-publisher">发布者：' + esc(c.publisherName) + '</div>');
        }
        return parts.join('');
      }

      function contactSheetHtml() {
        return '<div class="sheet-mask" data-act="close-contact"><div class="sheet-content">' +
          '<div class="modal-header"><div>' +
          '<div class="modal-title">联系发布者</div>' +
          '<div class="modal-subtitle">以下信息由发布者主动提供，请文明沟通</div></div>' +
          '<div class="modal-close" data-act="close-contact">✕</div></div>' +
          '<div data-role="sheet-body">' + contactBodyHtml() + '</div>' +
          '<div class="modal-btn" data-act="sheet-confirm">我知道了</div>' +
          '</div></div>';
      }

      function render() {
        if (state.loading) {
          root.innerHTML = '<div class="page-flow"><div class="detail-page"><div class="loading">加载中…</div></div></div>';
          return;
        }
        var d = state.detail;
        if (!d) {
          root.innerHTML = '<div class="page-flow"><div class="detail-page"><div class="loading">加载失败</div></div></div>';
          return;
        }

        var relatedHtml = (d.relatedItems && d.relatedItems.length > 0)
          ? '<div class="section card"><div class="section-header">' +
            '<span class="section-title">相关' + (d.type === 'lost' ? '失物' : '招领') + '信息</span>' +
            '<span class="section-link" data-act="go-search">搜索更多</span></div><div class="related-list">' +
            d.relatedItems.map(function (r) {
              return '<div class="related-item" data-act="related" data-id="' + r.id + '">' +
                '<div class="related-icon">📌</div>' +
                '<div class="related-info"><div class="related-name">' + esc(r.name) + '</div>' +
                '<div class="related-meta">' + esc(r.location) + ' · ' + esc(r.occurredText) + '</div></div>' +
                '<span class="tag-' + esc(r.status) + ' related-status">' + esc(r.statusText) + '</span></div>';
            }).join('') + '</div></div>'
          : '';

        root.innerHTML =
          '<div class="page-flow"><div class="detail-page">' +
            heroHtml(d) +

            '<div class="section card">' +
              '<div class="badge-row">' +
                '<span class="tag-' + esc(d.type) + '">' + esc(d.typeText) + '</span>' +
                '<span class="tag-' + esc(d.status) + '">' + esc(d.statusText) + '</span>' +
                '<span class="item-no">编号 ' + esc(d.itemNo) + '</span>' +
              '</div>' +
              '<div class="detail-title">' + esc(d.name) + '</div>' +
              (d.categoryCode === 'id_card'
                ? '<div class="privacy-note">为保护隐私，证件类物品不展示完整姓名与学号，请核对照片与特征后联系。</div>' : '') +
              '<div class="info-list">' +
                infoRow('📍', d.type === 'lost' ? '丢失地点' : '拾取地点', esc(d.location)) +
                infoRow('🕐', d.type === 'lost' ? '丢失时间' : '拾取时间', esc(d.occurredText) + ' 前后') +
                infoRow('🏷️', '物品类别', esc(d.categoryText)) +
                infoRow('👤', '发布者', esc(d.publisherText)) +
                infoRow('📅', '发布时间', esc(d.publishedText)) +
                infoRow('👁️', '浏览次数', esc(d.viewCount) + ' 次') +
              '</div>' +
            '</div>' +

            ((d.description || d.message)
              ? '<div class="section card">' +
                (d.description ? '<div class="section-title">物品描述</div><div class="desc-text">' + esc(d.description) + '</div>' : '') +
                (d.message ? '<div class="section-title" style="margin-top:14px;">给' + (d.type === 'lost' ? '拾到者' : '失主') + '的留言</div><div class="desc-text">' + esc(d.message) + '</div>' : '') +
                '</div>'
              : '') +

            relatedHtml +

            '<div class="safety-tip"><span class="tip-icon">⚠️</span>' +
            '<span class="tip-text">请勿在沟通中提供银行卡号、验证码或转账；见面交接建议选择图书馆、宿舍楼下等校园公共区域。</span></div>' +
            '<div style="height:20px;"></div>' +
          '</div></div>' +

          '<div class="bottom-bar bottom-bar-row">' +
            '<div class="bar-btn outline" data-act="go-home">返回首页</div>' +
            '<div class="bar-btn primary" data-act="open-contact"><span>📞</span><span>联系发布者</span></div>' +
          '</div>';

        bindSwiper();
      }

      // swiper 为详情加载后新建的元素，绑定一次指示点联动（scroll 不支持委托）
      function bindSwiper() {
        var swiper = root.querySelector('[data-role="swiper"]');
        if (!swiper) return;
        var dots = root.querySelectorAll('.hero-dot');
        swiper.addEventListener('scroll', function () {
          var index = Math.round(swiper.scrollLeft / swiper.clientWidth);
          dots.forEach(function (dot, i) {
            dot.classList.toggle('active', i === index);
          });
        });
      }

      var contactLoadingTimer = null;
      function removeSheet() {
        if (contactLoadingTimer) {
          clearTimeout(contactLoadingTimer);
          contactLoadingTimer = null;
        }
        state.contactVisible = false;
        var sheet = root.querySelector('.sheet-mask');
        if (sheet) sheet.remove();
      }

      function copyContact() {
        var value = state.contact && state.contact.contactValue;
        if (!value) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(function () {
            ui.toast('已复制', 'success');
          }).catch(function () { fallbackCopy(value); });
        } else {
          fallbackCopy(value);
        }
      }

      function fallbackCopy(text) {
        var input = document.createElement('textarea');
        input.value = text;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        try {
          document.execCommand('copy');
          ui.toast('已复制', 'success');
        } catch (e) {
          ui.toast('复制失败，请手动复制', 'error');
        }
        input.remove();
      }

      function openContact() {
        LF.auth.ensureLogin().then(function () {
          state.contactVisible = true;
          state.contact = null;
          state.contactLoading = true;
          // 请求很快返回时不展示“加载中”，避免弹层先以加载态上滑、再以内容上滑（看起来弹两下）
          contactLoadingTimer = setTimeout(function () {
            if (state.contactVisible && state.contactLoading) showSheet();
          }, 260);
          return LF.api.getItemContact(state.id);
        }).then(function (data) {
          if (contactLoadingTimer) {
            clearTimeout(contactLoadingTimer);
            contactLoadingTimer = null;
          }
          if (!state.contactVisible) return;
          state.contact = data;
          state.contactLoading = false;
          showSheet();
        }).catch(function (err) {
          state.contactVisible = false;
          removeSheet();
          ui.toast(err.message || '获取联系方式失败', 'error');
        });
      }

      function showSheet() {
        var existing = root.querySelector('.sheet-mask');
        if (!existing) {
          // 首次挂载：创建外壳并播放一次上滑入场动画
          var wrap = document.createElement('div');
          wrap.innerHTML = contactSheetHtml();
          var sheet = wrap.firstChild;
          // 点击遮罩空白处关闭
          sheet.addEventListener('click', function (e) {
            if (e.target === sheet) removeSheet();
          });
          root.appendChild(sheet);
        } else {
          // 弹层已存在（加载态）：只刷新正文，保留 .sheet-content 节点，避免重播入场动画
          var bodyEl = existing.querySelector('[data-role="sheet-body"]');
          if (bodyEl) bodyEl.innerHTML = contactBodyHtml();
        }
      }

      // 整个页面（含联系方式弹层）只绑定一次 click 委托
      root.addEventListener('click', function (e) {
        var el = e.target.closest('[data-act]');
        if (!el || !root.contains(el)) return;
        var act = el.getAttribute('data-act');
        if (act === 'preview') {
          ui.lightbox(state.detail.images, state.detail.images.indexOf(el.getAttribute('data-url')));
        } else if (act === 'go-home') {
          LF.router.go('#/home');
        } else if (act === 'go-search') {
          LF.router.go('#/search');
        } else if (act === 'related') {
          LF.router.go('#/detail?id=' + el.getAttribute('data-id'));
        } else if (act === 'open-contact') {
          openContact();
        } else if (act === 'close-contact' || act === 'sheet-confirm') {
          state.contactVisible = false;
          removeSheet();
        } else if (act === 'copy-contact') {
          copyContact();
        } else if (act === 'call-phone') {
          var value = state.contact && state.contact.contactValue;
          if (value) window.location.href = 'tel:' + value;
        }
      });

      render();

      // 加载详情
      LF.api.getItemDetail(id).then(function (data) {
        LF.urlUtil.resolveItemImages(data);
        var relatedItems = (data.relatedItems || []).map(function (r) {
          LF.urlUtil.resolveItemImages(r);
          r.occurredText = LF.format.formatDateTime(r.occurredAt);
          return r;
        });
        data.relatedItems = relatedItems;
        data.occurredText = LF.format.formatDateTimeFull(data.occurredAt);
        data.publishedText = LF.format.formatDateTimeFull(data.publishedAt);
        data.publisherText = data.publisher
          ? (data.publisher.displayName +
            (data.publisher.college
              ? ' · ' + data.publisher.college + (data.publisher.grade ? ' ' + data.publisher.grade + '级' : '')
              : ''))
          : '匿名同学';
        state.detail = data;
        state.loading = false;
        render();
      }).catch(function (err) {
        state.loading = false;
        state.detail = null;
        render();
        ui.toast(err.message || '加载失败', 'error');
      });
    }
  };
})(window.LF);
