/* pages/my-posts.js — 我的发布（对应 pages/my-posts/index） */
window.LF = window.LF || {};
LF.pages = LF.pages || {};

(function (LF) {
  var ui = LF.ui, esc = LF.ui.escapeHtml;

  var state = {
    scope: 'all',
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loading: false,
    list: [],
    summary: { total: 0, ongoing: 0, closed: 0 },
    statusModalVisible: false,
    currentItem: null,
    user: LF.auth.getUserInfo() || {},
    profileForm: null,
    profileSaving: false,
    profileAvatarUploading: false,
    inited: false
  };

  function avatarInnerHtml(user) {
    if (user && user.avatarUrl) {
      return '<img class="profile-avatar-img" src="' + esc(user.avatarUrl) + '" alt="头像" />';
    }
    var nickname = user && user.nickname ? user.nickname.trim() : '';
    return '<span class="profile-avatar-text">' + esc(nickname ? nickname.charAt(0) : '同') + '</span>';
  }

  function profileCardHtml() {
    var user = state.user || {};
    var meta = [user.college, user.grade].filter(Boolean).join(' · ') || '暂未填写学院和年级';
    return '<div class="profile-card">' +
      '<div class="profile-avatar">' + avatarInnerHtml(user) + '</div>' +
      '<div class="profile-main">' +
        '<div class="profile-title-row">' +
          '<div class="profile-name">' + esc(user.nickname || '待完善昵称') + '</div>' +
          '<div class="profile-edit-btn" data-act="edit-profile">修改</div>' +
        '</div>' +
        '<div class="profile-meta">' + esc(meta) + '</div>' +
        '<div class="profile-hint">完善个人信息，让同学更容易认出你</div>' +
      '</div>' +
    '</div>';
  }

  function profileSheetHtml() {
    var form = state.profileForm || {};
    return '<div class="sheet-mask profile-sheet-mask">' +
      '<div class="sheet-content profile-sheet">' +
        '<div class="modal-header"><div>' +
          '<div class="modal-title">修改个人信息</div>' +
          '<div class="modal-subtitle">这些信息会展示在发布者名片中</div>' +
        '</div>' +
        '<div class="modal-close" data-act="close-profile">✕</div></div>' +
        '<div class="profile-form">' +
          '<label class="profile-field">' +
            '<span class="profile-field-label">昵称 <span class="required">*</span></span>' +
            '<input class="form-input profile-input" data-profile-field="nickname" maxlength="50" placeholder="请输入昵称" value="' + esc(form.nickname || '') + '" />' +
          '</label>' +
          '<div class="profile-field">' +
            '<span class="profile-field-label">头像</span>' +
            '<div class="profile-avatar-upload">' +
              '<div class="profile-avatar-preview" data-role="avatar-preview">' + avatarInnerHtml(form) + '</div>' +
              '<div class="profile-avatar-upload-main">' +
                '<div class="profile-upload-btn" data-act="choose-avatar">' + (form.avatarUrl ? '重新上传' : '上传头像') + '</div>' +
                '<div class="profile-upload-hint">支持 JPG、PNG、WEBP，单张不超过 5 MB</div>' +
              '</div>' +
              '<input type="file" data-role="avatar-file" accept="image/png,image/jpeg,image/webp" style="display:none;" />' +
            '</div>' +
          '</div>' +
          '<label class="profile-field">' +
            '<span class="profile-field-label">学院</span>' +
            '<input class="form-input profile-input" data-profile-field="college" maxlength="100" placeholder="例如：计算机学院" value="' + esc(form.college || '') + '" />' +
          '</label>' +
          '<label class="profile-field">' +
            '<span class="profile-field-label">年级</span>' +
            '<input class="form-input profile-input" data-profile-field="grade" maxlength="20" placeholder="例如：2024" value="' + esc(form.grade || '') + '" />' +
          '</label>' +
        '</div>' +
        '<div class="profile-form-actions">' +
          '<div class="profile-form-btn secondary" data-act="close-profile">取消</div>' +
          '<div class="profile-form-btn primary" data-act="save-profile">保存修改</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function cardHtml(item) {
    return '<div class="post-card">' +
      '<div class="post-body">' +
        '<div class="post-cover">' +
          (item.coverImageUrl
            ? '<img src="' + esc(item.coverImageUrl) + '" class="cover-img" alt="" />'
            : '<span class="cover-placeholder">📦</span>') +
        '</div>' +
        '<div class="post-info">' +
          '<div class="post-tags">' +
            '<span class="tag-' + esc(item.type) + '">' + esc(item.typeText) + '</span>' +
            '<span class="tag-' + esc(item.status) + '">' + esc(item.statusText) + '</span>' +
            '<span class="post-time">' + esc(item.timeText) + '</span>' +
          '</div>' +
          '<div class="post-name">' + esc(item.name) + '</div>' +
          '<div class="post-location">' + esc(item.location) + '</div>' +
          (item.isClosed
            ? '<div class="post-closed">已结束 · 信息已显著标注</div>'
            : '<div class="post-views">已有 ' + esc(item.viewCount) + ' 人查看</div>') +
        '</div>' +
      '</div>' +
      '<div class="post-actions">' +
        '<div class="action-btn outline" data-act="detail" data-id="' + item.id + '">查看详情</div>' +
        '<div class="action-btn ' + (item.isClosed ? 'muted' : 'primary') +
          '" data-act="open-status" data-id="' + item.id + '">更新状态</div>' +
      '</div>' +
    '</div>';
  }

  function statusSheetHtml() {
    var item = state.currentItem;
    if (!item) return '';
    var isClosed = item.status === 'recovered' || item.status === 'returned';
    var closedClass = item.status === 'recovered' ? 'recovered' : 'returned';
    return '<div class="sheet-mask status-sheet"><div class="sheet-content" data-stop>' +
      '<div class="modal-header"><div>' +
      '<div class="modal-title">更新信息状态</div>' +
      '<div class="modal-subtitle">' + esc(item.name) + '</div></div>' +
      '<div class="modal-close" data-act="close-sheet">✕</div></div>' +
      '<div class="status-options">' +
        '<div class="status-option' + (!isClosed ? ' active ongoing' : '') + '" data-act="apply" data-action="start">' +
          '<div class="status-option-icon amber">⏳</div>' +
          '<div class="status-option-info">' +
          '<div class="status-option-label">' + (item.type === 'lost' ? '保持寻找中' : '保持待认领') + '</div>' +
          '<div class="status-option-desc">信息仍会出现在首页列表中</div></div></div>' +
        '<div class="status-option' + (isClosed ? ' active ' + closedClass : '') + '" data-act="apply" data-action="end">' +
          '<div class="status-option-icon coral">✅</div>' +
          '<div class="status-option-info">' +
          '<div class="status-option-label">' + (item.type === 'lost' ? '标记为已找回' : '标记为已归还') + '</div>' +
          '<div class="status-option-desc">信息将显著标注，避免继续被打扰</div></div></div>' +
      '</div>' +
      '<div class="modal-note">只有发布者本人可以修改状态</div>' +
      '</div></div>';
  }

  function render(root) {
    // 全量重绘会重建滚动容器，先记录滚动位置，重绘后还原，避免更新状态/筛选后回到顶部
    var scrollElBefore = root.querySelector('[data-role="scroll"]');
    var savedScrollTop = scrollElBefore ? scrollElBefore.scrollTop : 0;
    // 已打开的弹层先摘出并保留同一节点，重绘后原样插回：
    // 既不会被 innerHTML 销毁，也不会因重建而重播上滑动画 / 丢失焦点（背景“弹一下”）
    var keptProfile = root.querySelector('.profile-sheet-mask');
    var keptStatus = root.querySelector('.status-sheet');
    if (keptProfile) root.removeChild(keptProfile);
    if (keptStatus) root.removeChild(keptStatus);
    var listHtml = state.list.length > 0
      ? '<div class="post-list" data-role="scroll"><div class="post-list-inner">' +
        state.list.map(cardHtml).join('') +
        (state.loading ? '<div class="load-more">加载中…</div>'
          : (!state.hasMore ? '<div class="load-more">没有更多了</div>' : '')) +
        '<div class="rule-tip"><span class="tip-icon">ℹ️</span>' +
        '<span class="tip-text">状态说明：寻物信息的结束状态为“已找回”，招领信息的结束状态为“已归还”。结束后的信息仍可查看，但会显著标注。</span></div>' +
        '<div style="height:20px;"></div></div></div>'
      : (!state.loading
        ? '<div class="empty-state"><div class="empty-icon">📋</div>' +
          '<div class="empty-title">这个分类下还没有信息</div>' +
          '<div class="empty-desc">切换到“全部”查看，或者发布一条新的失物 / 招领信息。</div>' +
          '<div class="empty-btn" data-act="go-publish">去发布</div></div>'
        : '<div class="post-list"><div class="load-more">加载中…</div></div>');

    root.innerHTML =
      '<div class="my-posts-page page">' +
        '<header class="header">' +
          profileCardHtml() +
          '<div class="header-row my-posts-title-row">' +
            '<div><div class="header-title">我的发布</div>' +
            '<div class="header-sub">仅本人可修改自己信息的状态</div></div>' +
            '<div class="publish-btn" data-act="go-publish">发布新信息</div>' +
          '</div>' +
          '<div class="stats">' +
            '<div class="stat-item"><div class="stat-num coral">' + state.summary.total + '</div><div class="stat-label">共发布</div></div>' +
            '<div class="stat-item"><div class="stat-num amber">' + state.summary.ongoing + '</div><div class="stat-label">进行中</div></div>' +
            '<div class="stat-item"><div class="stat-num emerald">' + state.summary.closed + '</div><div class="stat-label">已结束</div></div>' +
          '</div>' +
          '<div class="scope-filters">' +
            '<span class="scope-btn' + (state.scope === 'all' ? ' active' : '') + '" data-act="scope" data-scope="all">全部</span>' +
            '<span class="scope-btn' + (state.scope === 'ongoing' ? ' active' : '') + '" data-act="scope" data-scope="ongoing">进行中</span>' +
            '<span class="scope-btn' + (state.scope === 'closed' ? ' active' : '') + '" data-act="scope" data-scope="closed">已结束</span>' +
          '</div>' +
        '</header>' +
        listHtml +
      '</div>';

    var scrollElAfter = root.querySelector('[data-role="scroll"]');
    if (scrollElAfter) scrollElAfter.scrollTop = savedScrollTop;
    bindScroll(root);

    // 把摘出的弹层原节点插回（保持打开状态、不重播动画）
    if (keptProfile) root.appendChild(keptProfile);
    if (keptStatus) root.appendChild(keptStatus);
  }

  // 挂载时绑定一次 click 委托（状态弹层是 root 的子元素，同样由它处理）
  function bindClickEvents(root) {
    root.addEventListener('input', function (e) {
      var field = e.target.getAttribute && e.target.getAttribute('data-profile-field');
      if (!field || !state.profileForm) return;
      state.profileForm[field] = e.target.value;
    });

    root.addEventListener('change', function (e) {
      if (!e.target.getAttribute || e.target.getAttribute('data-role') !== 'avatar-file') return;
      var file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) uploadProfileAvatar(file, root);
    });

    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (!el || !root.contains(el)) return;
      var act = el.getAttribute('data-act');
      if (act === 'go-publish') {
        LF.router.go('#/publish');
      } else if (act === 'detail') {
        LF.router.go('#/detail?id=' + el.getAttribute('data-id'));
      } else if (act === 'scope') {
        var scope = el.getAttribute('data-scope');
        if (scope !== state.scope) {
          state.scope = scope;
          loadList(root, true);
        }
      } else if (act === 'open-status') {
        var id = Number(el.getAttribute('data-id'));
        state.currentItem = state.list.find(function (i) { return i.id === id; });
        openSheet(root);
      } else if (act === 'close-sheet') {
        closeSheet(root);
      } else if (act === 'apply') {
        applyStatus(root, el.getAttribute('data-action'));
      } else if (act === 'edit-profile') {
        openProfileSheet(root);
      } else if (act === 'choose-avatar') {
        var fileInput = root.querySelector('[data-role="avatar-file"]');
        if (fileInput) fileInput.click();
      } else if (act === 'close-profile') {
        closeProfileSheet(root);
      } else if (act === 'save-profile') {
        saveProfile(root);
      }
    });
  }

  function bindScroll(root) {
    var scroll = root.querySelector('[data-role="scroll"]');
    if (!scroll) return;
    scroll.addEventListener('scroll', function () {
      if (scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 80) {
        if (state.hasMore && !state.loading) loadList(root, false);
      }
    });
  }

  function mountStatusSheet(root) {
    var wrap = document.createElement('div');
    wrap.innerHTML = statusSheetHtml();
    // 点击遮罩空白处关闭（内容区按钮由 root 上的委托统一处理）
    var sheet = wrap.firstChild;
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) closeSheet(root);
    });
    root.appendChild(sheet);
  }

  function openSheet(root) {
    var item = state.currentItem;
    closeSheet(root);
    if (!item) return;

    state.currentItem = item;
    mountStatusSheet(root);
  }

  function closeSheet(root) {
    var sheet = root.querySelector('.status-sheet');
    if (sheet) sheet.remove();
    state.statusModalVisible = false;
    state.currentItem = null;
  }

  function mountProfileSheet(root) {
    var wrap = document.createElement('div');
    wrap.innerHTML = profileSheetHtml();
    var mask = wrap.firstChild;
    mask.addEventListener('click', function (e) {
      if (e.target === mask) closeProfileSheet(root);
    });
    root.appendChild(mask);
    // 不在打开时自动 focus 输入框：移动端会立刻唤起键盘并在弹层上滑动画期间触发
    // 滚动对齐，把背景页面“顶一下”；需要输入时用户点击对应输入框即可。
  }

  function openProfileSheet(root) {
    closeProfileSheet(root);
    var user = state.user || {};
    state.profileForm = {
      nickname: user.nickname || '',
      avatarUrl: user.avatarUrl || '',
      college: user.college || '',
      grade: user.grade || ''
    };
    mountProfileSheet(root);
  }

  function closeProfileSheet(root) {
    var mask = root.querySelector('.profile-sheet-mask');
    if (mask) mask.remove();
    state.profileForm = null;
    state.profileSaving = false;
    state.profileAvatarUploading = false;
  }

  function updateAvatarPreview(root, avatarUrl) {
    var preview = root.querySelector('[data-role="avatar-preview"]');
    if (!preview) return;
    preview.innerHTML = avatarInnerHtml({ avatarUrl: avatarUrl || '' });
    var uploadBtn = root.querySelector('[data-act="choose-avatar"]');
    if (uploadBtn) uploadBtn.textContent = avatarUrl ? '重新上传' : '上传头像';
  }

  function uploadProfileAvatar(file, root) {
    if (!state.profileForm || state.profileAvatarUploading) return;
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) < 0) {
      ui.toast('仅支持 JPG、PNG、WEBP 图片', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      ui.toast('头像不能超过 5 MB', 'error');
      return;
    }

    var form = state.profileForm;
    state.profileAvatarUploading = true;
    var uploadBtn = root.querySelector('[data-act="choose-avatar"]');
    if (uploadBtn) {
      uploadBtn.classList.add('disabled');
      uploadBtn.textContent = '上传中…';
    }
    ui.showLoading('头像上传中…');

    LF.api.uploadImage(file).then(function (result) {
      ui.hideLoading();
      state.profileAvatarUploading = false;
      if (state.profileForm !== form) return;
      if (!result || !result.url) throw new Error('上传结果缺少图片地址');
      state.profileForm.avatarUrl = result.url;
      updateAvatarPreview(root, result.url);
    }).catch(function (err) {
      ui.hideLoading();
      state.profileAvatarUploading = false;
      if (state.profileForm === form) updateAvatarPreview(root, form.avatarUrl);
      ui.toast(err.message || '头像上传失败', 'error');
    });
  }

  function saveProfile(root) {
    if (state.profileAvatarUploading) {
      ui.toast('头像上传中，请稍候', 'error');
      return;
    }
    if (state.profileSaving || !state.profileForm) return;
    var form = state.profileForm;
    var nickname = (form.nickname || '').trim();
    if (!nickname) {
      ui.toast('请输入昵称', 'error');
      var nicknameInput = root.querySelector('[data-profile-field="nickname"]');
      if (nicknameInput) nicknameInput.focus();
      return;
    }

    var payload = {
      nickname: nickname,
      avatarUrl: (form.avatarUrl || '').trim() || null,
      college: (form.college || '').trim() || null,
      grade: (form.grade || '').trim() || null
    };

    state.profileSaving = true;
    var saveBtn = root.querySelector('[data-act="save-profile"]');
    if (saveBtn) {
      saveBtn.classList.add('disabled');
      saveBtn.textContent = '保存中…';
    }

    LF.api.updateCurrentUser(payload).then(function (user) {
      state.profileSaving = false;
      state.user = user || payload;
      LF.auth.setUserInfo(state.user);
      closeProfileSheet(root);
      render(root);
      ui.toast('个人信息已更新', 'success', 500);
    }).catch(function (err) {
      state.profileSaving = false;
      if (saveBtn) {
        saveBtn.classList.remove('disabled');
        saveBtn.textContent = '保存修改';
      }
      ui.toast(err.message || '保存失败', 'error');
    });
  }

  function loadProfile(root) {
    return LF.api.getCurrentUser().then(function (user) {
      if (!user) return;
      state.user = user;
      LF.auth.setUserInfo(user);
      render(root);
    }).catch(function (err) {
      // 个人资料读取失败时继续展示本地缓存，不阻塞“我的发布”列表
      console.warn('获取个人信息失败:', err && err.message ? err.message : err);
    });
  }

  function applyStatus(root, action) {
    var item = state.currentItem;
    if (!item) return;
    var isLost = item.type === 'lost';
    var targetStatus;
    if (action === 'end') {
      targetStatus = isLost ? 'recovered' : 'returned';
    } else {
      targetStatus = isLost ? 'searching' : 'pending_claim';
    }
    if (item.status === targetStatus) {
      closeSheet(root);
      return;
    }
    LF.api.updateItemStatus(item.id, targetStatus).then(function () {
      ui.toast('状态已更新', 'success', 500);
      closeSheet(root);
      loadList(root, true);
    }).catch(function (err) {
      ui.toast(err.message || '更新失败', 'error');
    });
  }

  function loadList(root, reset) {
    if (state.loading) return Promise.resolve();
    var page = reset ? 1 : state.page;
    state.loading = true;
    render(root);

    return LF.api.getMyItems({ scope: state.scope, page: page, pageSize: state.pageSize })
      .then(function (data) {
        var records = (data.records || []).map(function (item) {
          LF.urlUtil.resolveItemImages(item);
          item.timeText = LF.format.formatDateTimeShort(item.publishedAt);
          item.isClosed = item.status === 'recovered' || item.status === 'returned';
          return item;
        });
        state.list = reset ? records : state.list.concat(records);
        state.page = page + 1;
        state.total = data.total || 0;
        state.hasMore = data.hasNext || false;
        state.summary = data.summary || { total: 0, ongoing: 0, closed: 0 };
        state.loading = false;
        render(root);
      })
      .catch(function (err) {
        state.loading = false;
        render(root);
        // token 失效时重新登录后重试（对应小程序对“未登录”的处理）
        if (err.message && err.message.indexOf('未登录') > -1) {
          LF.auth.doLogin().then(function () { loadList(root, true); }).catch(function () {});
        } else {
          ui.toast(err.message || '加载失败', 'error');
        }
      });
  }

  LF.pages.myPosts = {
    mount: function (main) {
      var root = document.createElement('div');
      root.style.flex = '1';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      main.appendChild(root);
      render(root);
      bindClickEvents(root);

      if (!state.inited) {
        state.inited = true;
        LF.auth.ensureLogin().then(function () {
          return loadProfile(root);
        }).then(function () {
          loadList(root, true);
        }).catch(function () {
          ui.toast('请先登录', 'error');
        });
      } else {
        // 从发布成功页等入口再次进入时，强制重新查询，确保列表和统计立即更新
        loadProfile(root);
        loadList(root, true);
      }
    }
  };
})(window.LF);
