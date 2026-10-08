# mobile/ —— 校园失物招领 · 移动端（Android App）

本目录是项目最初的移动端实现：移动端风格的单页应用，在桌面浏览器中以「手机外壳」居中模拟，
在手机上全屏显示；随后用一个极薄的 **Android WebView 壳工程**把本目录前端源码原样打包成可安装的 APK。

> 仓库总说明见上级目录的 [../README.md](../README.md)；响应式网页版本在 [../web/](../web/)。

## 三种使用方式

### 1. 直接安装 Android App（作业 APP 交付物）

安装包：[`apk/app.apk`](apk/app.apk)

- 应用信息：应用名「校园失物招领」，包名 `com.example.lostfound`，版本 1.0；
- 将 `app.apk` 传到安卓手机，点击安装（首次需在系统设置中允许「安装未知来源应用」）；
- 安装后桌面出现图标，**离线即可运行**：页面与数据都打包 / 保存在本机，不依赖任何服务器；
- 数据保存在应用 WebView 的 localStorage 中，卸载应用会一并清除。

### 2. 在浏览器中预览手机界面

```bash
cd mobile
node server.js 8091   # 建议用 8091，避免与 web 端默认的 8090 冲突
```

浏览器打开 <http://localhost:8091>（桌面浏览器会显示居中的手机外壳）。也可以直接双击 `index.html`。

### 3. 重新打包 APK（供参考）

APK 是原生 WebView 壳：启动页 `MainActivity` 加载本地资源 `file:///android_asset/www/index.html`，
前端文件放在壳工程的 `app/src/main/assets/www/` 下。仓库中**只保留打包产物 `apk/app.apk`，不含 Android 壳工程源码**。
重新打包步骤：

1. 新建 Android 工程（Gradle + Android Gradle Plugin，本包由 AGP 8.7.2 构建），`MainActivity` 用全屏 `WebView` 加载 `file:///android_asset/www/index.html`，并开启 DOM storage（`domStorageEnabled = true`）；
2. 把本目录下的 `index.html`、`assets/`、`css/`、`js/` 复制到 `app/src/main/assets/www/`（**不复制** `apk/`、`server.js`、`单元测试/`）；
3. 配置应用图标、应用名后执行 `./gradlew assembleDebug`，产物即 `app-debug.apk`。

> 已逐文件校验：当前 `apk/app.apk` 内 `assets/www/` 与本目录源码内容完全一致（哈希相同）。

## 目录速览

```
mobile/
├─ index.html        # 单页应用入口（含桌面端手机状态栏外壳）
├─ server.js         # 零依赖 Node 静态服务器（可选，浏览器预览用）
├─ LICENSE           # MIT
├─ apk/
│  └─ app.apk        # Android 安装包（WebView 壳 + assets/www）
├─ assets/           # tabbar 图标、6 类分类图
├─ css/              # global（含手机外壳）+ 各页面样式
├─ js/
│  ├─ config.js  app.js          # 全局配置 / hash 路由与启动
│  ├─ data/                      # seed 演示数据、db(localStorage)、local-api 业务层
│  ├─ utils/                    # api 适配层、auth 匿名静默登录、ui、format、url 等
│  ├─ components/tabbar.js      # 底部导航
│  └─ pages/                    # home / search / publish / detail / success / my-posts
└─ 单元测试/         # node:test 自动化测试（零第三方依赖）
```

## 单元测试

```bash
cd mobile/单元测试
npm test
npm run test:detail
```

当前结果：**3 个测试文件，58 个用例全部通过（# pass 58 / # fail 0）**。

## 演示数据

首次打开自动写入 14 条演示数据（localStorage 键 `lf_local_db_v1`）。恢复初始数据可在控制台执行：

```js
LF.localApi.resetDemo().then(() => location.reload());
```

## 与 web 端的差异

- 移动端为固定手机形态（桌面浏览器显示手机外壳），Web 端为桌面 / 平板 / 手机响应式布局；
- 移动端首次访问匿名静默登录、在弹窗中补昵称；Web 端有独立的登录 / 注册页、会话过期与路由门禁；
- 两端业务核心一致：同一套 `LF.api` 接口契约、状态机、localStorage 数据层与 14 条演示数据。
