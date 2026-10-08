const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEnv, loginDemo } = require('./helpers/env');
const input = (extra = {}) => ({ email: 'lin@example.com', password: '  demo-password  ', nickname: '小林', bindLegacy: true, ...extra });

test('注册规范化邮箱，密码保留空格，仅存独立随机盐和校验值', async () => {
  const { LF, localStorage, sessionStorage } = createEnv();
  const result = await LF.api.register(input({ email: ' LIN@Example.COM ' }));
  assert.equal(result.user.email, 'lin@example.com'); assert.equal(result.user.id, 1001);
  const user = LF.db.load().users.find(u => u.id === 1001);
  assert.match(user.passwordSalt, /^[0-9a-f]{32}$/); assert.match(user.passwordHash, /^[0-9a-f]{64}$/);
  assert.equal(user.passwordIterations, 600000);
  assert.ok(!localStorage.getItem('lf_local_db_v1').includes('demo-password'));
  assert.ok(!sessionStorage.getItem('lf_session_v1').includes('demo-password'));
  assert.equal(result.user.passwordHash, undefined);
  await LF.api.logout();
  await assert.rejects(LF.api.login(input({ password: 'demo-password' })), /邮箱或密码错误/);
  await LF.api.login(input());
  const other = await LF.api.register(input({ email: 'other@example.com' }));
  assert.notEqual(other.user.id, 1001);
  const second = LF.db.load().users.find(u => u.id === other.user.id);
  assert.notEqual(user.passwordSalt, second.passwordSalt); assert.notEqual(user.passwordHash, second.passwordHash);
});
test('首次绑定必须确认，重复邮箱不能覆盖旧资料或会话', async () => {
  const { LF } = createEnv();
  await assert.rejects(LF.api.register(input({ bindLegacy: false })), /确认绑定/);
  assert.equal(LF.db.load().users.some(u => u.email), false);
  await LF.api.register(input());
  const before = JSON.stringify(LF.db.load()), token = LF.auth.getToken();
  await assert.rejects(LF.api.register(input({ email: 'LIN@EXAMPLE.COM', nickname: '覆盖' })), /已注册/);
  assert.equal(JSON.stringify(LF.db.load()), before); assert.equal(LF.auth.getToken(), token);
});
test('注册字段边界校验', async () => {
  const { LF } = createEnv();
  for (const bad of [{ email: 'invalid' }, { email: 'a'.repeat(250) + '@a.com' }, { password: '1234567' }, { password: 'x'.repeat(65) }, { nickname: '   ' }, { nickname: '林'.repeat(31) }]) {
    await assert.rejects(LF.api.register(input(bad)));
  }
  await LF.api.register(input({ password: '12345678', nickname: '林'.repeat(30) }));
  await LF.api.register(input({ email: 'max@example.com', password: 'x'.repeat(64), nickname: '林' }));
});
test('不存在的邮箱与错误密码统一报错，错误登录不更换已有身份', async () => {
  const { LF } = createEnv(); await LF.api.register(input());
  const token = LF.auth.getToken();
  for (const value of [input({ email: 'unknown@example.com' }), input({ password: 'wrong-password' }), input({ password: 'x' }), input({ email: 'bad' })]) {
    await assert.rejects(LF.api.login(value), /邮箱或密码错误/);
    assert.equal(LF.auth.getToken(), token);
  }
});
test('刷新恢复会话；新标签页无会话；退出不删除账号和发布记录', async () => {
  const env = createEnv(); await loginDemo(env.LF);
  const refreshed = createEnv({ localStorage: env.localStorage, sessionStorage: env.sessionStorage });
  assert.equal(refreshed.LF.auth.getUserInfo().id, 1001);
  assert.equal((await refreshed.LF.api.getMyItems()).total, 5);
  const newTab = createEnv({ localStorage: env.localStorage });
  assert.equal(newTab.LF.auth.getToken(), '');
  await assert.rejects(newTab.LF.api.getMyItems(), /登录/);
  await refreshed.LF.api.logout();
  assert.equal(env.LF.auth.getToken(), ''); assert.equal(env.LF.db.load().items.length, 14);
  await assert.rejects(env.LF.api.getCurrentUser(), /登录/);
});
test('24 小时过期和损坏会话均不接受旧 currentUserId 或旧 token', async () => {
  const { LF, localStorage, sessionStorage } = createEnv(); await loginDemo(LF);
  const s = JSON.parse(sessionStorage.getItem('lf_session_v1'));
  assert.ok(s.expiresAt - Date.now() > 86390000 && s.expiresAt - Date.now() <= 86400000);
  LF.db.transaction(st => { st.currentUserId = 1001; });
  localStorage.setItem('token', 'old-anonymous-token'); localStorage.setItem('userInfo', '{"id":1001}');
  sessionStorage.setItem('lf_session_v1', JSON.stringify({ ...s, expiresAt: Date.now() - 1 }));
  assert.equal(LF.auth.getToken(), ''); assert.equal(sessionStorage.getItem('lf_session_v1'), null);
  for (const corrupt of ['{broken', JSON.stringify({ ...s, expiresAt: 'forever' }), JSON.stringify({ ...s, userId: 999 })]) {
    sessionStorage.setItem('lf_session_v1', corrupt);
    await assert.rejects(LF.api.getMyItems(), /登录/);
  }
});
test('旧匿名用户及图片完整保留，首次绑定导入文字草稿且后续账号不共享', async () => {
  const { LF, localStorage } = createEnv();
  LF.db.transaction(st => {
    st.currentUserId = 1003; st.users.find(u => u.id === 1003).code = 'legacy-code';
    st.items[0].publisherId = 1003; st.items[0].images = ['data:image/jpeg;base64,old-user-image'];
  });
  localStorage.setItem('webCode', 'legacy-code');
  localStorage.setItem('lf_publish_draft_v1', JSON.stringify({ version: 1, form: { name: '旧草稿', contact: 'private', imageUrls: ['not-restored'], agreementAccepted: true } }));
  const before = JSON.stringify(LF.db.load().items), college = LF.db.load().users.find(u => u.id === 1003).college;
  const result = await LF.api.register(input());
  assert.equal(result.user.id, 1003); assert.equal(result.user.college, college);
  assert.equal(JSON.stringify(LF.db.load().items), before);
  assert.equal(LF.draft.load().name, '旧草稿'); assert.equal(LF.draft.load().imageUrls, undefined);
  LF.draft.save({ name: '账号 A 草稿' });
  await LF.api.register(input({ email: 'second@example.com' }));
  assert.equal(LF.draft.load(), null); assert.equal((await LF.api.getMyItems()).total, 0);
  await assert.rejects(LF.api.updateItemStatus(1, 'recovered'), /本人/);
  LF.draft.save({ name: '账号 B 草稿' });
  await LF.api.login(input());
  assert.equal(LF.draft.load().name, '账号 A 草稿');
});
test('游客可以浏览和搜索，受限读写操作全部拒绝', async () => {
  const { LF } = createEnv();
  assert.equal((await LF.api.getItems()).total, 14); assert.equal((await LF.api.searchItems({})).total, 14);
  assert.equal((await LF.api.getItemDetail(1)).isOwner, false);
  for (const call of [() => LF.api.getItemContact(1), () => LF.api.createItem({}), () => LF.api.updateItemStatus(1, 'recovered'), () => LF.api.getCurrentUser(), () => LF.api.updateCurrentUser({ nickname: '游客' }), () => LF.api.uploadImage({})]) await assert.rejects(call(), /登录/);
});
for (const store of ['localStorage', 'sessionStorage']) {
  test(store + ' 保存失败：注册绑定回滚，旧资料和会话保留，重试成功', async () => {
    const env = createEnv(), { LF } = env; LF.db.load();
    env.localStorage.setItem('lf_publish_draft_v1', JSON.stringify({ version: 1, form: { name: '旧草稿' } }));
    const before = JSON.stringify(LF.db.load()), write = env[store].setItem;
    env[store].setItem = () => { throw new Error('quota'); };
    await assert.rejects(LF.api.register(input()), /存储/);
    assert.equal(JSON.stringify(LF.db.load()), before); assert.equal(LF.auth.getToken(), '');
    assert.ok(env.localStorage.getItem('lf_publish_draft_v1').includes('旧草稿'));
    env[store].setItem = write;
    assert.equal((await LF.api.register(input())).user.id, 1001); assert.equal(LF.draft.load().name, '旧草稿');
  });
}
test('不支持 Web Crypto 时不注册账号、不存储明文', async () => {
  const { LF } = createEnv({ crypto: {} });
  await assert.rejects(LF.api.register(input()), /不支持安全密码校验/);
  assert.equal(LF.db.load().users.some(u => u.email), false);
});
test('数据库损坏或版本不兼容时保留原存储，不重建演示库', () => {
  for (const raw of ['{broken', '{"version":999,"items":[],"users":[],"seq":{}}']) {
    const env = createEnv(); env.localStorage.setItem('lf_local_db_v1', raw);
    assert.throws(() => env.LF.db.load(), /保留原数据/);
    assert.equal(env.localStorage.getItem('lf_local_db_v1'), raw);
  }
});
test('正在派生密码时退出会取消迟到的注册，不恢复身份', async () => {
  const { LF } = createEnv();
  const pending = LF.api.register(input());
  await Promise.resolve(); await LF.api.logout();
  await assert.rejects(pending, /取消/); assert.equal(LF.auth.getToken(), '');
  assert.equal(LF.db.load().users.some(u => u.email), false);
});
test('重复注册操作不会创建两个账号', async () => {
  const { LF } = createEnv(); const pending = LF.api.register(input());
  await assert.rejects(LF.api.register(input()), /正在处理/); await pending;
  assert.equal(LF.db.load().users.filter(u => u.email).length, 1);
});
test('离开登录页时取消正在处理的账号操作，不在新页面自动恢复登录', async () => {
  const { LF } = createEnv(); const pending = LF.api.register(input());
  await Promise.resolve(); LF.accounts.cancelPending();
  await assert.rejects(pending, /取消/); assert.equal(LF.auth.getToken(), '');
  assert.equal(LF.db.load().users.some(u => u.email), false);
});
test('无法清除会话时退出报错，不能虚报退出成功', async () => {
  const { LF, sessionStorage } = createEnv(); await loginDemo(LF);
  const token = LF.auth.getToken(); sessionStorage.removeItem = () => { throw new Error('denied'); };
  await assert.rejects(LF.api.logout(), /无法退出/); assert.equal(LF.auth.getToken(), token);
});
test('退出后的迟到读写请求不能使用下一个账号，旧响应不返回私有内容', async () => {
  const jobs = [], env = createEnv({ setTimeout: fn => { jobs.push(fn); return jobs.length; } });
  await loginDemo(env.LF);
  const oldRead = env.LF.api.getItemContact(1), oldWrite = env.LF.api.updateCurrentUser({ nickname: '迟到修改' });
  const readCheck = assert.rejects(oldRead, /登录状态已变化/), writeCheck = assert.rejects(oldWrite, /登录状态已变化/);
  await env.LF.api.logout(); await loginDemo(env.LF, 'second');
  jobs.splice(0).forEach(fn => fn()); await Promise.all([readCheck, writeCheck]);
  assert.equal(env.LF.auth.getUserInfo().nickname, '林同学');
  assert.equal(env.LF.db.load().users.find(u => u.id === 1001).nickname, '林同学');
});
