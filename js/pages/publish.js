/* pages/publish.js — 发布页（对应 pages/publish/index） */
window.LF = window.LF || {};
LF.pages = LF.pages || {};

(function (LF) {
  var ui = LF.ui, esc = LF.ui.escapeHtml;

  function defaultDate() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function defaultTime() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function initialState() {
    return {
      type: '',
      name: '',
      categoryCode: '',
      categories: LF.constants.CATEGORY,
      location: '',
      occurredDate: defaultDate(),
      occurredTime: defaultTime(),
      description: '',
      imageUrls: [],
      contact: '',
      meetingPlace: '',
      agreementAccepted: false,
      submitting: false,
      placeLabel: '丢失地点',
      timeLabel: '丢失时间',
      quickPlaces: ['图书馆', '第二食堂', '第一教学楼', '体育馆']
    };
  }

  // 模块级状态：tab 切换回来时保留已填内容
  var state = initialState();
  var activeRoot = null;
  var draftTimer = null;
  var publishing = false;
  var draftOwnerId = null;
  function saveDraft() {
    clearTimeout(draftTimer); draftTimer = null;
    if (!activeRoot || publishing) return;
    try { state.draftStatus = LF.draft.save(state, draftOwnerId) ? '文字草稿已保存；图片需重新选择，恢复后请重新确认协议。' : '填写后自动保存文字草稿。'; }
    catch (error) { state.draftStatus = error.message; }
    var hint = activeRoot.querySelector('[data-role="draft-status"]');
    if (hint) hint.textContent = state.draftStatus;
  }
  function scheduleDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 500); }
  window.addEventListener('pagehide', saveDraft);

  function render(root) {
    // 重绘会整体重建 DOM，先记录滚动容器位置，重绘后还原，
    // 避免添加/删除图片、选择类别等操作后页面跳回顶部
    var scrollEl = root.querySelector('[data-role="scroll"]');
    var savedScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    var imagesHtml = state.imageUrls.map(function (url, index) {
      return '<div class="image-item">' +
        ui.imageHtml(url, { name: '待发布物品', mediaKind: 'upload', categoryCode: state.categoryCode }, 'image-thumb', true, false) +
        '<span class="image-remove" data-act="remove-image" data-index="' + index + '">' + LF.icons.render('x') + '</span></div>';
    }).join('');
    var addHtml = state.imageUrls.length < 3
      ? '<div class="image-add" data-act="choose-image"><span class="add-icon">' + LF.icons.render('image-plus') + '</span><span class="add-text">添加图片</span></div>'
      : '';

    root.innerHTML =
      '<div class="publish-page page">' +
        '<div class="page-scroll" data-role="scroll">' +
          '<div class="draft-status" data-role="draft-status" role="status">' + esc(state.draftStatus || '填写后自动保存文字草稿。') + '</div>' +
          '<div class="publish-layout">' +
          '<div class="tip-bar"><span class="tip-icon">' + LF.icons.render('lightbulb') + '</span>' +
          '<span class="tip-text">信息越具体，越容易被同学找到。建议写清颜色、特征、挂件等细节，方便对方快速辨认。</span></div>' +

          '<div class="form-section">' +
            '<div class="form-title">选择发布类型 <span class="required">*</span></div>' +
            '<div class="type-cards">' +
              '<div class="type-card' + (state.type === 'lost' ? ' active' : '') + '" data-act="choose-type" data-type="lost">' +
                '<div class="type-card-header"><span class="type-card-icon">' + LF.icons.render('square-pen') + '</span><span class="type-card-label">发布寻物</span></div>' +
                '<div class="type-card-sub">我丢了东西，希望大家帮忙留意</div></div>' +
              '<div class="type-card' + (state.type === 'found' ? ' active' : '') + '" data-act="choose-type" data-type="found">' +
                '<div class="type-card-header"><span class="type-card-icon">' + LF.icons.render('hand-heart') + '</span><span class="type-card-label">发布招领</span></div>' +
                '<div class="type-card-sub">我捡到了东西，等待失主认领</div></div>' +
            '</div>' +
          '</div>' +

          '<div class="form-section card">' +
            '<div class="form-title">物品名称 <span class="required">*</span></div>' +
            '<input class="form-input" data-field="name" maxlength="50" placeholder="例如：校园卡 / 一串钥匙 / 蓝色保温杯" value="' + esc(state.name) + '" />' +
            '<div class="form-title form-title-gap">物品类别 <span class="required">*</span></div>' +
            '<div class="category-list">' +
              state.categories.map(function (c) {
                return '<span class="category-tag' + (state.categoryCode === c.code ? ' active' : '') +
                  '" data-act="choose-category" data-code="' + c.code + '">' + esc(c.name) + '</span>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="form-section card">' +
            '<div class="form-title">' + esc(state.placeLabel) + ' <span class="required">*</span></div>' +
            '<div class="input-with-icon"><span class="input-icon">' + LF.icons.render('map-pin') + '</span>' +
            '<input class="form-input flex-input" data-field="location" maxlength="100" placeholder="例如：图书馆二楼自习区 / 第三教学楼 302" value="' + esc(state.location) + '" /></div>' +
            '<div class="quick-places">' +
              state.quickPlaces.map(function (p) {
                return '<span class="quick-place" data-act="fill-place" data-place="' + esc(p) + '">' + esc(p) + '</span>';
              }).join('') +
            '</div>' +
            '<div class="form-title form-title-gap">' + esc(state.timeLabel) + ' <span class="required">*</span></div>' +
            '<div class="datetime-row">' +
              '<input type="date" class="datetime-box" data-field="date" value="' + esc(state.occurredDate) + '" />' +
              '<input type="time" class="datetime-box" data-field="time" value="' + esc(state.occurredTime) + '" />' +
            '</div>' +
            '<div class="form-hint">不确定具体时间时，可以填写大致时段</div>' +
          '</div>' +

          '<div class="form-section card">' +
            '<div class="form-title">物品描述</div>' +
            '<textarea class="form-textarea" data-field="description" maxlength="500" placeholder="补充颜色、品牌、贴纸、挂件等细节，或写下想对拾到者/失主说的话">' + esc(state.description) + '</textarea>' +
            '<div class="form-hint">建议 20–100 字，描述越细越容易被认出</div>' +
          '</div>' +

          '<div class="form-section card">' +
            '<div class="form-row"><div class="form-title">物品图片</div><div class="form-optional">选填 · 最多 3 张</div></div>' +
            '<div class="image-list">' + imagesHtml + addHtml + '</div>' +
            '<input type="file" data-role="file-input" accept="image/png,image/jpeg,image/webp" multiple style="display:none;" />' +
          '</div>' +

          '<div class="form-section card">' +
            '<div class="form-row"><div class="form-title">联系方式 <span class="required">*</span></div><div class="contact-badge">仅点击后可见</div></div>' +
            '<div class="input-with-icon"><span class="input-icon">' + LF.icons.render('message-circle') + '</span>' +
            '<input class="form-input flex-input" data-field="contact" maxlength="64" placeholder="微信号或手机号，例如：lin_2024_card" value="' + esc(state.contact) + '" /></div>' +
            '<div class="form-title form-title-gap">方便交接的位置</div>' +
            '<input class="form-input" data-field="meetingPlace" maxlength="100" placeholder="例如：图书馆一楼服务台 / 宿舍 6 号楼门口" value="' + esc(state.meetingPlace) + '" />' +
            '<label class="agreement-label">' +
              '<input type="checkbox" data-field="agreement" ' + (state.agreementAccepted ? 'checked' : '') + ' />' +
              '<span class="agreement-text">我确认信息真实，并同意在平台展示该内容；如物品已找回或已归还，我会及时更新状态。</span>' +
            '</label>' +
          '</div>' +

          '</div><div style="height:20px;"></div>' +
        '</div>' +

        '<div class="bottom-bar">' +
          '<div class="bar-btn outline" data-act="reset">清空重填</div>' +
          '<div class="bar-btn primary' + (state.submitting ? ' disabled' : '') + '" data-act="submit">' +
          (state.submitting ? '发布中…' : '发布') + '</div>' +
        '</div>' +
      '</div>';

    var scrollElAfter = root.querySelector('[data-role="scroll"]');
    if (scrollElAfter) scrollElAfter.scrollTop = savedScrollTop;
    LF.ui.enhance(root);
    if (publishing) root.querySelectorAll('input, textarea, [data-act]').forEach(function (el) {
      if (el.matches('input, textarea')) el.disabled = true;
      else { el.classList.add('disabled'); el.setAttribute('tabindex', '-1'); }
    });
  }

  // 挂载时绑定一次（事件委托）；文本输入只同步 state 不重绘，避免输入失焦
  function bindEvents(root) {
    root.addEventListener('input', function (e) {
      var field = e.target.getAttribute && e.target.getAttribute('data-field');
      if (!field) return;
      if (field === 'name') state.name = e.target.value;
      else if (field === 'location') state.location = e.target.value;
      else if (field === 'description') state.description = e.target.value;
      else if (field === 'contact') state.contact = e.target.value;
      else if (field === 'meetingPlace') state.meetingPlace = e.target.value;
      scheduleDraft();
    });

    root.addEventListener('change', function (e) {
      var field = e.target.getAttribute && e.target.getAttribute('data-field');
      if (field === 'date') state.occurredDate = e.target.value;
      else if (field === 'time') state.occurredTime = e.target.value;
      else if (field === 'agreement') state.agreementAccepted = e.target.checked;
      if (field) scheduleDraft();

      // 选择图片后逐张上传
      if (e.target.getAttribute && e.target.getAttribute('data-role') === 'file-input') {
        var files = Array.prototype.slice.call(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        var remain = 3 - state.imageUrls.length;
        if (remain <= 0) {
          ui.toast('最多 3 张图片', 'error');
          return;
        }
        files = files.slice(0, remain);
        uploadImages(files, root);
      }
    });

    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (!el || !root.contains(el)) return;
      if (publishing) return;
      var act = el.getAttribute('data-act');
      if (act === 'choose-type') {
        chooseType(el.getAttribute('data-type')); scheduleDraft();
        render(root);
      } else if (act === 'choose-category') {
        state.categoryCode = el.getAttribute('data-code'); scheduleDraft();
        render(root);
      } else if (act === 'fill-place') {
        state.location = el.getAttribute('data-place'); scheduleDraft();
        render(root);
        var input = root.querySelector('[data-field="location"]');
        if (input) input.focus();
      } else if (act === 'choose-image') {
        root.querySelector('[data-role="file-input"]').click();
      } else if (act === 'remove-image') {
        state.imageUrls.splice(Number(el.getAttribute('data-index')), 1);
        render(root);
      } else if (act === 'preview') {
        ui.lightbox(state.imageUrls, state.imageUrls.indexOf(el.getAttribute('data-url')));
      } else if (act === 'reset') {
        resetForm(root);
      } else if (act === 'submit') {
        submitForm(root);
      }
    });
  }

  function chooseType(type) {
    var isFound = type === 'found';
    state.type = type;
    state.placeLabel = isFound ? '拾取地点' : '丢失地点';
    state.timeLabel = isFound ? '拾取时间' : '丢失时间';
  }

  function uploadImages(files, root) {
    var form = state;
    ui.showLoading('上传中…');
    Promise.all(files.map(function (f) { return LF.api.uploadImage(f); }))
      .then(function (results) {
        ui.hideLoading();
        if (form !== state || !root.isConnected) return;
        var urls = results.map(function (r) { return r.url; }).filter(Boolean);
        state.imageUrls = state.imageUrls.concat(urls).slice(0, 3);
        ui.toast('上传成功', 'success');
        render(root);
      })
      .catch(function (err) {
        ui.hideLoading();
        if (form !== state || !root.isConnected) return;
        ui.toast(err.message || '上传失败', 'error');
      });
  }

  function resetForm(root) {
    ui.modal({
      title: '确认清空',
      content: '确定要清空所有已填写的内容吗？',
      confirmText: '清空',
      cancelText: '取消'
    }).then(function (ok) {
      if (ok) {
        try { LF.draft.clear(); } catch (error) { ui.toast(error.message, 'error'); return; }
        clearTimeout(draftTimer); draftTimer = null;
        state = initialState();
        render(root);
      }
    });
  }

  function submitForm(root) {
    if (publishing) return;

    var missing = [];
    if (!state.type) missing.push('发布类型');
    if (!state.name.trim()) missing.push('物品名称');
    if (!state.categoryCode) missing.push('物品类别');
    if (!state.location.trim()) missing.push(state.placeLabel);
    if (!state.occurredDate || !state.occurredTime) missing.push(state.timeLabel);
    if (!state.contact.trim()) missing.push('联系方式');

    if (missing.length) {
      ui.modal({
        title: '还需要补充信息',
        content: '请先补充：' + missing.join('、') + '。',
        showCancel: false,
        confirmText: '返回填写'
      });
      return;
    }

    if (!state.agreementAccepted) {
      ui.modal({
        title: '请确认',
        content: '请勾选“确认信息真实”后再发布。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    saveDraft();
    var submitted = state, submittedOwner = draftOwnerId, sessionStamp = LF.accounts.snapshot();
    publishing = true;
    state.submitting = true;
    render(root);

    LF.auth.ensureLogin().then(function () {
      LF.accounts.assertSnapshot(sessionStamp);
      return LF.api.createItem({
        type: submitted.type,
        name: submitted.name.trim(),
        categoryCode: submitted.categoryCode,
        location: submitted.location.trim(),
        occurredAt: submitted.occurredDate + 'T' + submitted.occurredTime + ':00',
        description: submitted.description.trim() || null,
        message: null,
        imageUrls: submitted.imageUrls.length > 0 ? submitted.imageUrls : null,
        contact: submitted.contact.trim(),
        meetingPlace: submitted.meetingPlace.trim() || null,
        agreementAccepted: true
      });
    }).then(function (data) {
      publishing = false;
      if (!LF.auth.getUserInfo() || LF.auth.getUserInfo().id !== submittedOwner) return;
      clearTimeout(draftTimer); draftTimer = null;
      var warning = '';
      try { LF.draft.clear(submittedOwner); } catch (error) { warning = error.message; }
      state.submitting = false;
      // 发布成功后重置表单
      state = initialState();
      if (warning) ui.toast('发布已成功，' + warning, 'error');
      if (!root.isConnected) { ui.toast('信息已发布，可在我的发布查看', 'success'); return; }
      LF.router.go('#/success?id=' + data.id + '&itemNo=' + encodeURIComponent(data.itemNo) +
        '&type=' + data.type + '&name=' + encodeURIComponent(data.name));
    }).catch(function (err) {
      publishing = false;
      if (submitted !== state || !root.isConnected) return;
      state.submitting = false;
      if (activeRoot && activeRoot.isConnected) render(activeRoot);
      ui.toast(err.message || '发布失败', 'error');
    });
  }

  LF.pages.publish = {
    leave: function () { if (activeRoot) saveDraft(); activeRoot = null; clearTimeout(draftTimer); draftTimer = null; },
    discardView: function () { clearTimeout(draftTimer); draftTimer = null; activeRoot = null; draftOwnerId = null; state = initialState(); },
    mount: function (main, query) {
      var root = document.createElement('div');
      root.className = 'publish-root';
      root.style.flex = '1';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      main.appendChild(root);

      activeRoot = root; draftOwnerId = LF.accounts.requireUser().id;
      var draft = LF.draft.load();
      state = Object.assign(initialState(), draft || {});
      state.submitting = publishing;
      if (draft) {
        chooseType(state.type);
        state.draftStatus = '已恢复文字草稿；请重新选择图片并确认协议。';
      }
      // 首页快捷入口携带的预设类型（对应 globalData.publishType）
      if (!draft && (query.type === 'lost' || query.type === 'found')) {
        chooseType(query.type);
      }
      render(root);
      bindEvents(root);
      scheduleDraft();

      // 确保已登录
      LF.auth.ensureLogin().catch(function () {
        ui.toast('登录失败，请重试', 'error');
      });
    }
  };
})(window.LF);
