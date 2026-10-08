/* data/local-api.js — 浏览器本地“后端服务”
 * 在浏览器内提供本地演示业务接口（登录、列表、搜索、详情、
 * 联系方式、发布、状态更新、我的发布、个人资料、图片上传），数据经 db.js
 * 持久化到 localStorage。方法签名、返回结构与 js/utils/api.js 完全一致，
 * 不代表与上级 Java 后端的 HTTP 协议相同。
 *
 * 所有方法均返回 Promise，并用很短的延时模拟网络请求，保持原有 loading 体验。
 */
window.LF = window.LF || {};

(function (LF) {
  var LATENCY = 120; // 模拟网络延时（毫秒）

  var TYPE_TEXT = { lost: '失物', found: '招领' };
  var STATUS_TEXT = {
    searching: '寻找中',
    recovered: '已找回',
    pending_claim: '待认领',
    returned: '已归还'
  };
  var ONGOING_STATUS = { searching: 1, pending_claim: 1 };
  var ALLOWED_STATUS = {
    lost: ['searching', 'recovered'],
    found: ['pending_claim', 'returned']
  };

  var CATEGORY_MAP = {};
  (LF.constants.CATEGORY || []).forEach(function (c) { CATEGORY_MAP[c.code] = c.name; });

  function categoryText(code) { return CATEGORY_MAP[code] || '其他'; }

  function delay(value, ms) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try { resolve(typeof value === 'function' ? value() : value); }
        catch (e) { reject(e); }
      }, ms == null ? LATENCY : ms);
    });
  }

  function fail(message) { return Promise.reject(new Error(message)); }

  function currentState() { return LF.db.load(); }

  function currentUser() { return LF.accounts.currentUser(); }
  function requireUser() { return LF.accounts.requireUser(); }
  function protectedCall(change, ms, write) {
    var saved;
    try { requireUser(); saved = LF.accounts.snapshot(); } catch (error) { return Promise.reject(error); }
    return delay(function () {
      LF.accounts.assertSnapshot(saved);
      return write ? LF.db.transaction(change) : change();
    }, ms);
  }

  function findItem(id) {
    var numId = Number(id);
    return currentState().items.filter(function (it) { return it.id === numId; })[0] || null;
  }

  function userVO(u) {
    return {
      id: u.id,
      nickname: u.nickname,
      avatarUrl: u.avatarUrl || null,
      college: u.college || null,
      grade: u.grade || null
    };
  }

  function publisherVO(u) {
    return {
      id: u.id,
      displayName: u.nickname,
      avatarUrl: u.avatarUrl || null,
      college: u.college || null,
      grade: u.grade || null
    };
  }

  function coverOf(item) {
    return LF.media.resolve(item).coverImageUrl;
  }

  /** ItemSummaryVO —— 首页 / 搜索列表项 */
  function summaryVO(item) {
    return {
      id: item.id,
      itemNo: item.itemNo,
      type: item.type,
      typeText: TYPE_TEXT[item.type],
      status: item.status,
      statusText: STATUS_TEXT[item.status],
      name: item.name,
      categoryCode: item.categoryCode,
      categoryText: categoryText(item.categoryCode),
      coverImageUrl: coverOf(item),
      mediaKind: LF.media.resolve(item).mediaKind,
      location: item.location,
      occurredAt: item.occurredAt,
      publishedAt: item.publishedAt
    };
  }

  /** “我的发布”列表项：在精简对象上补充浏览量与结束状态 */
  function myItemVO(item) {
    var vo = summaryVO(item);
    var endStatus = item.type === 'lost' ? 'recovered' : 'returned';
    vo.viewCount = item.viewCount;
    vo.endStatus = endStatus;
    vo.endStatusText = STATUS_TEXT[endStatus];
    return vo;
  }

  /** 排序：发布时间倒序，其次 id 倒序（与后端一致） */
  function sortByPublishedDesc(list) {
    return list.slice().sort(function (a, b) {
      if (a.publishedAt === b.publishedAt) return b.id - a.id;
      return a.publishedAt < b.publishedAt ? 1 : -1;
    });
  }

  function paginate(list, params) {
    var page = Math.max(1, parseInt(params && params.page, 10) || 1);
    var pageSize = parseInt(params && params.pageSize, 10) || 10;
    pageSize = Math.min(20, Math.max(1, pageSize));
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    var start = (page - 1) * pageSize;
    return {
      records: list.slice(start, start + pageSize),
      page: page,
      pageSize: pageSize,
      total: total,
      pages: pages,
      hasNext: page < pages
    };
  }

  /* ---------------- 首页列表 ---------------- */
  function getItems(params) {
    return delay(function () {
      params = params || {};
      var list = currentState().items.filter(function (it) {
        return !params.type || params.type === 'all' || it.type === params.type;
      });
      var result = paginate(sortByPublishedDesc(list), params);
      result.records = result.records.map(summaryVO);
      return result;
    });
  }

  /* ---------------- 搜索 ---------------- */
  function searchItems(params) {
    return delay(function () {
      params = params || {};
      var keyword = String(params.keyword || '').trim().toLowerCase();
      var location = String(params.location || '').trim().toLowerCase();
      var list = currentState().items.filter(function (it) {
        if (params.type && params.type !== 'all' && it.type !== params.type) return false;
        if (params.categoryCode && it.categoryCode !== params.categoryCode) return false;
        if (location && it.location.toLowerCase().indexOf(location) < 0) return false;
        if (params.status === 'ongoing' && !ONGOING_STATUS[it.status]) return false;
        if (params.status === 'closed' && ONGOING_STATUS[it.status]) return false;
        var hay = [it.name, it.location, it.description || '', it.itemNo].join(' ').toLowerCase();
        return !keyword || hay.indexOf(keyword) > -1;
      });
      var sort = params.sort || 'newest';
      list.sort(function (a, b) {
        var field = sort === 'occurred' ? 'occurredAt' : 'publishedAt';
        var direction = sort === 'oldest' ? 1 : -1;
        return (a[field] === b[field] ? a.id - b.id : (a[field] < b[field] ? -1 : 1)) * direction;
      });
      var result = paginate(list, params);
      result.records = result.records.map(summaryVO);
      return result;
    });
  }

  /* ---------------- 详情 ---------------- */
  function getItemDetail(id) {
    return delay(function () {
      var item = findItem(id);
      if (!item) throw new Error('信息不存在或已被删除');
      var st = currentState();
      var me = currentUser();
      var publisher = st.users.filter(function (u) { return u.id === item.publisherId; })[0];

      // 浏览量 +1（发布者本人不计）
      if (!me || me.id !== item.publisherId) {
        item = LF.db.transaction(function (draft) {
          var stored = draft.items.filter(function (it) { return it.id === item.id; })[0];
          stored.viewCount = (stored.viewCount || 0) + 1;
          return stored;
        });
        st = currentState();
      }

      // 同类型推荐：进行中优先，再按发布时间倒序，最多 2 条
      var related = sortByPublishedDesc(
        st.items.filter(function (it) {
          return it.id !== item.id && it.type === item.type;
        })
      ).sort(function (a, b) {
        var ao = ONGOING_STATUS[a.status] ? 0 : 1;
        var bo = ONGOING_STATUS[b.status] ? 0 : 1;
        return ao - bo;
      }).slice(0, 2).map(function (it) {
        return {
          id: it.id,
          name: it.name,
          location: it.location,
          occurredAt: it.occurredAt,
          status: it.status,
          statusText: STATUS_TEXT[it.status],
          coverImageUrl: coverOf(it),
          mediaKind: LF.media.resolve(it).mediaKind,
          categoryCode: it.categoryCode
        };
      });

      return {
        id: item.id,
        itemNo: item.itemNo,
        type: item.type,
        typeText: TYPE_TEXT[item.type],
        status: item.status,
        statusText: STATUS_TEXT[item.status],
        name: item.name,
        categoryCode: item.categoryCode,
        categoryText: categoryText(item.categoryCode),
        location: item.location,
        occurredAt: item.occurredAt,
        description: item.description,
        message: item.message,
        images: LF.media.resolve(item).images,
        mediaKind: LF.media.resolve(item).mediaKind,
        publisher: publisher ? publisherVO(publisher) : null,
        viewCount: item.viewCount,
        publishedAt: item.publishedAt,
        isOwner: !!(me && me.id === item.publisherId),
        relatedItems: related
      };
    });
  }

  /* ---------------- 联系方式 ---------------- */
  function getItemContact(id) {
    return protectedCall(function () {
      requireUser();
      var item = findItem(id);
      if (!item) throw new Error('信息不存在或已被删除');
      var publisher = currentState().users.filter(function (u) { return u.id === item.publisherId; })[0];
      return {
        publisherName: publisher ? publisher.nickname : '匿名同学',
        contactType: item.contactType || LF.db.detectContactType(item.contact),
        contactValue: item.contact,
        meetingPlace: item.meetingPlace || null
      };
    });
  }

  /* ---------------- 发布 ---------------- */
  function createItem(data) {
    return protectedCall(function () {
      var me = requireUser();
      data = data || {};

      if (data.type !== 'lost' && data.type !== 'found') throw new Error('请选择发布类型');
      var name = (data.name || '').trim();
      if (!name) throw new Error('请填写物品名称');
      if (name.length > 50) throw new Error('物品名称不能超过 50 字');
      if (!CATEGORY_MAP[data.categoryCode]) throw new Error('请选择物品类别');
      var location = (data.location || '').trim();
      if (!location) throw new Error('请填写地点');
      if (location.length > 100) throw new Error('地点不能超过 100 字');
      if (!data.occurredAt) throw new Error('请选择发生时间');
      var occurred = new Date(String(data.occurredAt).replace(/-/g, '/').replace('T', ' '));
      if (isNaN(occurred.getTime())) throw new Error('发生时间格式不正确');
      if (occurred.getTime() > Date.now() + 5 * 60000) throw new Error('发生时间不能晚于当前时间');
      var contact = (data.contact || '').trim();
      if (!contact) throw new Error('请填写联系方式');
      if (contact.length > 64) throw new Error('联系方式不能超过 64 字');
      if (data.agreementAccepted !== true) throw new Error('请先勾选“确认信息真实”');

      var images = (data.imageUrls || []).slice(0, 3);
      if ((data.imageUrls || []).length > 3) throw new Error('最多上传 3 张图片');

      var now = new Date();
      var type = data.type;
      var status = type === 'lost' ? 'searching' : 'pending_claim';
      var st = currentState();
      var id = LF.db.nextItemId();
      var item = {
        id: id,
        itemNo: LF.db.nextItemNo(type, now),
        type: type,
        status: status,
        name: name,
        categoryCode: data.categoryCode,
        location: location,
        occurredAt: LF.db.formatTs(occurred),
        publishedAt: LF.db.formatTs(now),
        description: (data.description || '').trim() || null,
        message: (data.message || '').trim() || null,
        images: images,
        publisherId: me.id,
        viewCount: 0,
        contact: contact,
        contactType: LF.db.detectContactType(contact),
        meetingPlace: (data.meetingPlace || '').trim() || null
      };
      st.items.push(item);

      return {
        id: item.id,
        itemNo: item.itemNo,
        type: item.type,
        typeText: TYPE_TEXT[item.type],
        status: item.status,
        statusText: STATUS_TEXT[item.status],
        name: item.name,
        publishedAt: item.publishedAt
      };
    }, 260, true);
  }

  /* ---------------- 状态更新 ---------------- */
  function updateItemStatus(id, status) {
    return protectedCall(function () {
      var me = requireUser();
      var item = findItem(id);
      if (!item) throw new Error('信息不存在或已被删除');
      if (item.publisherId !== me.id) throw new Error('只能操作本人发布的信息');
      if (ALLOWED_STATUS[item.type].indexOf(status) === -1) {
        throw new Error('非法的状态变更，请刷新后重试');
      }
      item.status = status; // 幂等：重复设置同一状态也成功
      return {
        id: item.id,
        status: item.status,
        statusText: STATUS_TEXT[item.status],
        updatedAt: LF.db.formatTs(new Date())
      };
    }, undefined, true);
  }

  /* ---------------- 我的发布 ---------------- */
  function getMyItems(params) {
    return protectedCall(function () {
      var me = requireUser();
      params = params || {};
      var mine = currentState().items.filter(function (it) { return it.publisherId === me.id; });

      var summary = {
        total: mine.length,
        ongoing: mine.filter(function (it) { return !!ONGOING_STATUS[it.status]; }).length,
        closed: mine.filter(function (it) { return !ONGOING_STATUS[it.status]; }).length
      };

      var scoped = mine.filter(function (it) {
        if (params.scope === 'ongoing') return !!ONGOING_STATUS[it.status];
        if (params.scope === 'closed') return !ONGOING_STATUS[it.status];
        return true;
      });

      var result = paginate(sortByPublishedDesc(scoped), params);
      result.records = result.records.map(myItemVO);
      result.summary = summary;
      return result;
    });
  }

  /* ---------------- 当前用户资料 ---------------- */
  function getCurrentUser() {
    return protectedCall(function () { return userVO(requireUser()); });
  }

  function updateCurrentUser(data) {
    return protectedCall(function () {
      var me = requireUser();
      data = data || {};
      var nickname = (data.nickname || '').trim();
      if (!nickname) throw new Error('昵称不能为空');
      if (nickname.length > 30) throw new Error('昵称不能超过 30 个字');
      me.nickname = nickname;
      me.avatarUrl = (data.avatarUrl || '').trim() || null;
      me.college = (data.college || '').trim() || null;
      me.grade = (data.grade || '').trim() || null;
      return userVO(me);
    }, undefined, true);
  }

  /* ---------------- 图片上传（本地读取 + 压缩） ----------------
   * 不再走 multipart/后端：用 FileReader 读入，canvas 等比压缩后转成 JPEG dataURL，
   * 随物品 / 头像一起存进 localStorage。返回结构与原上传接口一致：{ url, size, contentType }。
   */
  function fileToDataUrl(file, maxEdge, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w > h && w > maxEdge) { h = Math.round(h * maxEdge / w); w = maxEdge; }
          else if (h >= w && h > maxEdge) { w = Math.round(w * maxEdge / h); h = maxEdge; }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; // 透明 PNG 转 JPEG 前铺白底
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = function () { reject(new Error('图片解析失败，请更换图片')); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error('图片读取失败')); };
      reader.readAsDataURL(file);
    });
  }

  function uploadImage(file) {
    var saved;
    try { requireUser(); saved = LF.accounts.snapshot(); } catch (error) { return Promise.reject(error); }
    if (!file) return fail('请选择要上传的图片');
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) === -1) {
      return fail('仅支持 JPG、PNG、WEBP 格式图片');
    }
    if (file.size > 5 * 1024 * 1024) {
      return fail('图片大小不能超过 5 MB');
    }
    return fileToDataUrl(file, 900, 0.85).then(function (dataUrl) {
      LF.accounts.assertSnapshot(saved);
      return { url: dataUrl, size: dataUrl.length, contentType: 'image/jpeg' };
    });
  }

  LF.localApi = {
    register: LF.accounts.register,
    login: LF.accounts.login,
    logout: LF.accounts.logout,
    getItems: getItems,
    searchItems: searchItems,
    getItemDetail: getItemDetail,
    getItemContact: getItemContact,
    createItem: createItem,
    updateItemStatus: updateItemStatus,
    getMyItems: getMyItems,
    getCurrentUser: getCurrentUser,
    updateCurrentUser: updateCurrentUser,
    uploadImage: uploadImage,
    // 便于调试 / 演示页“恢复演示数据”
    resetDemo: function () { return LF.accounts.logout().then(function () { LF.db.reset(); return true; }); }
  };
})(window.LF);
