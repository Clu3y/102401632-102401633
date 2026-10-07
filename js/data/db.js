/* data/db.js — 浏览器本地“数据库”
 * 用 localStorage 模拟后端 MySQL：维护用户表、物品表、自增主键、信息编号计数器。
 * 首次访问把 seed.js 的演示数据落地；之后所有读写都经过这里并即时持久化。
 */
window.LF = window.LF || {};

(function (LF) {
  var DB_KEY = 'lf_local_db_v1';
  var state = null;
  var storedRaw = null, changing = false;

  function pad2(n) { return String(n).padStart(2, '0'); }

  /** Date → "YYYY-MM-DDTHH:mm:ss"（与后端时间格式一致） */
  function formatTs(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) +
      'T' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds());
  }

  /** Date → "YYYYMMDD" */
  function ymd(date) {
    return date.getFullYear() + pad2(date.getMonth() + 1) + pad2(date.getDate());
  }

  /** 联系方式推断：11 位数字视为手机号，其余视为微信号 */
  function detectContactType(value) {
    return /^1\d{10}$/.test(String(value || '').trim()) ? 'mobile' : 'wechat';
  }

  /** 依据种子数据构建初始库 */
  function build() {
    var now = Date.now();
    var users = LF.seed.USERS.map(function (u, i) {
      return {
        id: 1001 + i,
        code: null, // 登录 code 首次登录时回填；demo 用户绑定首个匿名 code
        nickname: u.nickname,
        avatarUrl: u.avatarUrl || null,
        college: u.college || null,
        grade: u.grade || null
      };
    });
    var keyToId = {};
    LF.seed.USERS.forEach(function (u, i) { keyToId[u.key] = 1001 + i; });

    var st = {
      version: 1,
      seq: { user: 1000 + users.length, item: 0 },
      itemNoSeq: {},
      demoUserId: keyToId.demo,
      currentUserId: null,
      users: users,
      items: []
    };

    LF.seed.ITEMS.forEach(function (raw) {
      var publishedDate = new Date(now - raw.publishedAgoMin * 60000);
      var occurredDate = new Date(now - (raw.publishedAgoMin + (raw.occurredExtraMin || 90)) * 60000);
      var id = st.seq.item + 1;
      st.seq.item = id;
      var type = raw.type;
      st.items.push({
        id: id,
        itemNo: nextItemNo(st, type, publishedDate),
        type: type,
        status: raw.status,
        name: raw.name,
        categoryCode: raw.categoryCode,
        location: raw.location,
        occurredAt: formatTs(occurredDate),
        publishedAt: formatTs(publishedDate),
        description: raw.description || null,
        message: raw.message || null,
        images: (raw.images || []).slice(0, 3),
        publisherId: keyToId[raw.publisher],
        viewCount: raw.viewCount || 0,
        contact: raw.contact,
        contactType: detectContactType(raw.contact),
        meetingPlace: raw.meetingPlace || null
      });
    });

    return st;
  }

  /** 生成信息编号：寻物 L + yyyyMMdd + 两位序号；招领 F 前缀 */
  function nextItemNo(st, type, date) {
    var prefix = type === 'lost' ? 'L' : 'F';
    var key = prefix + ymd(date);
    st.itemNoSeq[key] = (st.itemNoSeq[key] || 0) + 1;
    return key + pad2(st.itemNoSeq[key]);
  }

  function load() {
    if (changing) return state;
    var raw;
    try { raw = localStorage.getItem(DB_KEY); }
    catch (_) { throw new Error('无法读取本地存储，请允许浏览器保存数据'); }
    if (state && raw === storedRaw) return state;
    if (raw) {
      var parsed;
      try { parsed = JSON.parse(raw); } catch (_) { throw new Error('本地数据无法解析，已保留原数据，请先备份再处理'); }
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items) || !Array.isArray(parsed.users) || !parsed.seq) {
        throw new Error('本地数据版本不兼容，已保留原数据');
      }
      state = parsed; storedRaw = raw;
    } else {
      state = build(); save();
    }
    return state;
  }

  function save() {
    try {
      var raw = JSON.stringify(state);
      localStorage.setItem(DB_KEY, raw);
      storedRaw = raw;
    } catch (e) {
      // 多数是图片 dataURL 撑爆配额
      throw new Error('本地存储空间不足，请减少图片数量或改用更小的图片后重试');
    }
  }

  // 写入只在副本上进行；持久化失败时恢复旧对象、序号和资料。
  function transaction(change) {
    var previous = load();
    state = JSON.parse(JSON.stringify(previous));
    changing = true;
    try {
      var result = change(state);
      save();
      return result;
    } catch (error) {
      state = previous;
      throw error;
    } finally { changing = false; }
  }

  function reset() {
    localStorage.removeItem(DB_KEY);
    state = null; storedRaw = null;
    return load();
  }

  function nextUserId() {
    state.seq.user = (state.seq.user || 1000) + 1;
    return state.seq.user;
  }

  function nextItemId() {
    state.seq.item = (state.seq.item || 0) + 1;
    return state.seq.item;
  }

  LF.db = {
    load: load,
    save: save,
    transaction: transaction,
    reset: reset,
    nextUserId: nextUserId,
    nextItemId: nextItemId,
    nextItemNo: function (type, date) { return nextItemNo(state, type, date); },
    formatTs: formatTs,
    detectContactType: detectContactType
  };
})(window.LF);
