/* 发布草稿按账号保存；与旧资料的绑定在注册事务中完成。 */
window.LF = window.LF || {};
(function (LF) {
  var FIELDS = ['type', 'name', 'categoryCode', 'location', 'occurredDate',
    'occurredTime', 'description', 'contact', 'meetingPlace'];
  function pick(form) {
    var result = {};
    FIELDS.forEach(function (key) { result[key] = String(form[key] || ''); });
    return result;
  }
  function load() {
    var user = LF.accounts.currentUser();
    if (!user) return null;
    var draft = (LF.db.load().drafts || {})[user.id];
    return draft && draft.version === 1 && draft.form ? pick(draft.form) : null;
  }
  function save(form, ownerId) {
    var user = LF.accounts.requireUser();
    if (ownerId != null && user.id !== ownerId) throw new Error('账号已变化，未保存其他账号的草稿');
    var text = pick(form);
    var hasContent = ['type', 'name', 'categoryCode', 'location', 'description', 'contact', 'meetingPlace']
      .some(function (key) { return !!text[key].trim(); });
    try {
      LF.db.transaction(function (st) {
        st.drafts = st.drafts || {};
        if (hasContent) st.drafts[user.id] = { version: 1, form: text };
        else delete st.drafts[user.id];
      });
      return hasContent;
    } catch (_) { throw new Error('草稿未保存：本地存储不可用或空间不足，已填写内容仍保留在当前页面'); }
  }
  function clear(ownerId) { return save({}, ownerId); }
  LF.draft = { load: load, save: save, clear: clear };
})(window.LF);
