const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEnv, loginDemo } = require('./helpers/env');

test('登录目标仅允许业务地址，并保留发布预选与搜索参数', () => {
  const { LF, sandbox } = createEnv();
  sandbox.location = { hash: '#/search?keyword=雨伞' };
  assert.equal(LF.auth.normalizeNext(), '/search?keyword=雨伞');
  assert.equal(LF.auth.normalizeNext('#/publish?type=found'), '/publish?type=found');
  for (const next of ['https://example.com', '/auth', '/publish-extra']) assert.equal(LF.auth.normalizeNext(next), '/my');
});

test('原地登录将模式与操作续接回调交给弹窗，不自行导航', () => {
  const { LF } = createEnv();
  let request;
  LF.pages = { auth: { open: (next, options) => { request = { next, options }; } } };
  const onSuccess = () => {};
  LF.auth.requestLogin('#/detail?id=14', { mode: 'register', onSuccess });
  assert.equal(request.next, '#/detail?id=14');
  assert.equal(request.options.mode, 'register');
  assert.equal(request.options.onSuccess, onSuccess);
});

test('会话事件区分主动退出和过期，均先清除身份', async () => {
  const { LF, sandbox, sessionStorage } = createEnv();
  sandbox.Event = Event;
  const ended = [];
  sandbox.dispatchEvent = event => ended.push([event.reason, LF.auth.isAuthorized()]);
  await loginDemo(LF);
  await LF.auth.logout();
  assert.deepEqual(ended, [['logout', false]]);
  await loginDemo(LF);
  const value = JSON.parse(sessionStorage.getItem('lf_session_v1'));
  value.expiresAt = Date.now() - 1;
  sessionStorage.setItem('lf_session_v1', JSON.stringify(value));
  assert.equal(LF.auth.getToken(), '');
  assert.deepEqual(ended, [['logout', false], ['expired', false]]);
});
