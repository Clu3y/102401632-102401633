# web/ —— 校园失物招领 · Web 端

响应式网页版本：桌面端为侧边导航布局，平板 / 手机端自适应为单栏 + 底部 Tab。
零后端、零安装，数据保存在浏览器 localStorage，用 Chrome 打开即可看到完整效果。

> 仓库总说明（含 Web 端与 Android App 端的整体介绍）见上级目录的 [../README.md](../README.md)。

## 运行

需要一个现代浏览器，开发与测试统一使用 **Google Chrome**。

**方式一：零依赖静态服务器（推荐）**

```bash
cd web
node server.js        # 默认 8090 端口；自定义端口：node server.js 3000
```

浏览器打开 <http://localhost:8090>。需要 Node.js 18+，无需 `npm install`。

**方式二：直接打开**

双击 `web/index.html`，用 Chrome 打开即可。若浏览器对 `file://` 的本地存储有限制，请改用方式一。

## 目录速览

```
web/
├─ index.html        # 单页应用入口（按序加载脚本）
├─ server.js         # 零依赖 Node 静态服务器（可选）
├─ LICENSE           # MIT
├─ assets/           # tabbar 图标、6 类分类图、lucide 图标、实物配图与插画
├─ css/              # global + 各页面样式 + responsive.css / media.css 响应式
├─ js/
│  ├─ config.js  app.js            # 全局配置 / hash 路由与启动
│  ├─ data/                        # seed 演示数据、db(localStorage)、accounts 账号、local-api 业务层
│  ├─ utils/                       # api 适配层、auth 鉴权、ui、icons、media、draft、query 等
│  ├─ components/tabbar.js         # 底部导航
│  └─ pages/                       # auth 登录注册 / home / search / publish / detail / success / my-posts
├─ docs/             # 开发与提交流程的验证记录、回归截图（过程材料，不影响运行）
└─ 单元测试/          # node:test 自动化测试（零第三方依赖）
```

## 单元测试

```bash
cd web/单元测试
npm test            # 等价于 node --test tests/*.test.js
npm run test:detail # spec 风格详细输出
```

当前结果：**7 个测试文件，100 个用例全部通过（# pass 100 / # fail 0）**。
`tests/` 之外的 `*.cjs` 是需要在浏览器中配合手工走查的回归脚本，不属于自动化用例。

## 演示数据

首次打开自动写入 14 条演示数据（localStorage 键 `lf_local_db_v1`）。恢复初始数据可在控制台执行：

```js
LF.localApi.resetDemo().then(() => location.reload());
```
