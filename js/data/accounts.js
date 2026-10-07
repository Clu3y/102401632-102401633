/* 离线演示账号：凭证校验与会话共用一处，业务层不读取旧 currentUserId。 */
window.LF = window.LF || {};
(function (LF) {
  var SESSION_KEY = 'lf_session_v1';
  var busy = false, revision = 0, expiredToken = null;
  var ITERATIONS = 600000;

  function cryptoApi() {
    if (!window.crypto || !window.crypto.subtle) throw new Error('浏览器不支持安全密码校验，请使用新版 Chrome 直接打开 HTML 或通过 localhost 访问');
    return window.crypto;
  }
  function hex(bytes) { return Array.from(bytes).map(function (n) { return n.toString(16).padStart(2, '0'); }).join(''); }
  function random(size) { return hex(cryptoApi().getRandomValues(new Uint8Array(size))); }
  function passwordHash(password, salt) {
    var c = cryptoApi(), bytes = new Uint8Array(salt.match(/../g).map(function (n) { return parseInt(n, 16); }));
    return c.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) { return c.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes, iterations: ITERATIONS }, key, 256); })
      .then(function (bits) { return hex(new Uint8Array(bits)); });
  }
  function userVO(u) {
    return { id: u.id, email: u.email, nickname: u.nickname, avatarUrl: u.avatarUrl || null, college: u.college || null, grade: u.grade || null };
  }
  function endSession(reason) {
    try { sessionStorage.removeItem(SESSION_KEY); }
    catch (_) { throw new Error('无法退出登录，请允许浏览器使用会话存储后重试'); }
    revision++;
    var endedRevision = revision;
    if (window.dispatchEvent) setTimeout(function () {
      if (revision === endedRevision) {
        var event = new Event('lf-session-ended');
        event.reason = reason || 'logout';
        window.dispatchEvent(event);
      }
    }, 0);
  }
  function session() {
    var value;
    try { value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
    if (!value || value.token === expiredToken) return null;
    var u = LF.db.load().users.find(function (user) { return user.id === value.userId && user.email && user.passwordHash; });
    if (!u || typeof value.token !== 'string' || !value.token || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) {
      expiredToken = value.token;
      try { endSession('expired'); } catch (_) {}
      return null;
    }
    return { token: value.token, user: userVO(u), expiresAt: value.expiresAt };
  }
  function currentUser() {
    var s = session();
    return s ? LF.db.load().users.find(function (u) { return u.id === s.user.id; }) : null;
  }
  function requireUser() {
    var u = currentUser();
    if (!u) throw new Error('请先登录或重新登录');
    return u;
  }
  function snapshot() { var s = session(); return { token: s ? s.token : '', revision: revision }; }
  function assertSnapshot(saved) {
    var now = snapshot();
    if (!saved.token || saved.token !== now.token || saved.revision !== now.revision) throw new Error('登录状态已变化，请重新操作');
    return requireUser();
  }
  function legacyUser(st) {
    if (st.legacyBindingDone || st.users.some(function (u) { return !!u.email; })) return null;
    var code = localStorage.getItem('webCode');
    return st.users.find(function (u) { return code && u.code === code; }) ||
      st.users.find(function (u) { return u.id === st.currentUserId; }) ||
      st.users.find(function (u) { return u.id === st.demoUserId; }) || null;
  }
  function legacyInfo() {
    var st = LF.db.load(), u = legacyUser(st);
    return u ? { nickname: u.nickname, count: st.items.filter(function (it) { return it.publisherId === u.id; }).length } : null;
  }
  function inputValues(input, register) {
    input = input || {};
    var email = String(input.email || '').trim().toLowerCase(), password = String(input.password || '');
    var nickname = String(input.nickname || '').trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('请填写有效的邮箱');
    if (password.length < 8 || password.length > 64) throw new Error('密码需要 8–64 个字符');
    if (register && (!nickname || nickname.length > 30)) throw new Error('昵称需要 1–30 个字');
    return { email: email, password: password, nickname: nickname };
  }
  function run(operation) {
    if (busy) return Promise.reject(new Error('正在处理账号操作，请稍候'));
    busy = true;
    var started = revision;
    return Promise.resolve().then(function () { return operation(started); }).finally(function () { busy = false; });
  }
  function install(user, change, started) {
    if (started !== revision) throw new Error('登录操作已取消，请重试');
    var previous;
    try { previous = sessionStorage.getItem(SESSION_KEY); } catch (_) { throw new Error('无法保存登录状态，请允许浏览器使用会话存储'); }
    var s = { token: random(32), userId: null, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
    try {
      LF.db.transaction(function (st) {
        if (change) user = change(st);
        s.userId = user.id;
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
        catch (_) { throw new Error('无法保存登录状态，请允许浏览器使用会话存储'); }
      });
    } catch (error) {
      try { previous ? sessionStorage.setItem(SESSION_KEY, previous) : sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
      throw error;
    }
    revision++;
    return { token: s.token, tokenType: 'Bearer', expiresIn: 86400, user: userVO(user) };
  }
  function register(input) {
    return run(function (started) {
      var data = inputValues(input, true), st = LF.db.load();
      if (st.users.some(function (u) { return u.email === data.email; })) throw new Error('邮箱已注册，请直接登录');
      var candidate = legacyUser(st);
      if (candidate && input.bindLegacy !== true) throw new Error('请确认绑定当前浏览器的旧资料和发布记录');
      var salt = random(16);
      return passwordHash(data.password, salt).then(function (hash) {
        // 延迟后重新读取并在事务内检查，避免其他标签页刚注册过同一邮箱。
        return install(null, function (fresh) {
          if (fresh.users.some(function (u) { return u.email === data.email; })) throw new Error('邮箱已注册，请直接登录');
          var old = legacyUser(fresh);
          if ((old && old.id) !== (candidate && candidate.id)) throw new Error('旧数据归属已变化，请刷新后重新注册');
          var result = old || { id: LF.db.nextUserId(), avatarUrl: null, college: null, grade: null };
          if (!old) fresh.users.push(result);
          result.email = data.email; result.nickname = data.nickname;
          result.passwordSalt = salt; result.passwordHash = hash; result.passwordIterations = ITERATIONS;
          fresh.drafts = fresh.drafts || {};
          if (old) {
            var raw = localStorage.getItem('lf_publish_draft_v1');
            try { var draft = JSON.parse(raw || 'null'); if (draft && draft.version === 1 && draft.form) fresh.drafts[result.id] = draft; } catch (_) {}
          }
          fresh.legacyBindingDone = true;
          fresh.currentUserId = null;
          return result;
        }, started);
      });
    });
  }
  function login(input) {
    return run(function (started) {
      var data;
      try { data = inputValues(input, false); } catch (_) { throw new Error('邮箱或密码错误'); }
      var u = LF.db.load().users.find(function (user) { return user.email === data.email; });
      if (!u) throw new Error('邮箱或密码错误');
      return passwordHash(data.password, u.passwordSalt).then(function (hash) {
        if (hash !== u.passwordHash) throw new Error('邮箱或密码错误');
        return install(u, null, started);
      });
    });
  }
  LF.accounts = { register: register, login: login, logout: function () { return Promise.resolve().then(endSession); },
    cancelPending: function () { if (busy) revision++; },
    session: session, currentUser: currentUser, requireUser: requireUser, snapshot: snapshot, assertSnapshot: assertSnapshot,
    legacyInfo: legacyInfo, userVO: userVO };
})(window.LF);
