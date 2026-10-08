/*
 * tests/helpers/env.js — 浏览器环境垫片（test harness）
 *
 * 被测代码是运行在浏览器里的前端脚本：它们把模块挂在全局 window.LF 上，
 * 并使用 localStorage / setTimeout。Node 环境没有这些对象，因此这里：
 *   1. 用 vm 构造一个隔离的“浏览器全局对象”；
 *   2. 提供内存版 localStorage（不落盘、不污染真实浏览器数据）；
 *   3. 把 setTimeout 替换为“立即执行”，去掉接口里模拟网络的 120ms 延时，
 *      既保留 Promise 异步语义（then/catch 仍走微任务），又让测试快速稳定；
 *   4. 按 index.html 中的真实加载顺序载入被测脚本，返回组装好的 window.LF。
 *
 * 每个用例调用 createEnv() 都得到一套全新、干净的环境与数据库，互不干扰。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 被测前端脚本目录：本文件位于 <文件夹>/tests/helpers，向上三级到项目根 lost-found，再进入 js
const JS_ROOT = path.join(__dirname, '..', '..', '..', 'js');

// 与 index.html 中的 <script> 顺序保持一致
const FILES = [
  'config.js',
  'utils/constants.js',
  'utils/format.js',
  'utils/url.js',
  'data/seed.js',
  'data/db.js',
  'data/local-api.js',
  'utils/api.js'
];

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _store: store
  };
}

function createEnv() {
  const localStorage = memoryStorage();

  const sandbox = {
    console,
    // 立即执行的定时器：消除被测代码里模拟网络延时的等待
    setTimeout: (fn) => { try { fn(); } catch (_) { /* reject 在 fn 内部处理 */ } return 0; },
    clearTimeout: () => {},
    Date,
    Math,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Object,
    Array,
    Promise,
    localStorage
  };
  sandbox.window = sandbox; // 浏览器中 window 指向全局自身
  vm.createContext(sandbox);

  FILES.forEach((rel) => {
    const code = fs.readFileSync(path.join(JS_ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  });

  return { LF: sandbox.LF, sandbox, localStorage };
}

module.exports = { createEnv, JS_ROOT };
