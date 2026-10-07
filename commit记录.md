# 历史任务拆分草案（未核实）

下表保留原草稿的模块拆分和建议提交信息，不是从 Git 提取的实际提交记录。A／B 的真实身份、实际执行情况和耗时均待双方确认；其中“58 项”属于原草稿版本，当前本地实际测试结果为 100 项通过。

真实提交历史以 Git 为准，已核对的历史提交见 [作业随笔](作业随笔.md#八github-签入记录)和 [GitHub 提交历史](https://github.com/5-bin/102401632-102401633/commits/main/)。课程要求的真实签入截图仍待补，不能用此表替代。

| #    | 建议负责人（待确认） | Commit message                                               | 建议涉及文件                                                 |
| ---- | ---- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 1    | A    | `chore: 初始化项目骨架（全局样式、hash 路由、通用工具与导航图标）` | `index.html`、`css/global.css`、`js/app.js`、`js/config.js`、`js/components/tabbar.js`、`assets/tabbar/`、`js/utils/constants.js`、`js/utils/format.js`、`js/utils/url.js`、`js/utils/auth.js`、`js/utils/ui.js`、`js/utils/api.js`、`js/utils/request.js` |
| 2    | B    | `chore: 添加零依赖静态服务器 server.js 与路由回退`           | `server.js`                                                  |
| 3    | B    | `feat: 新增 6 张分类占位 SVG 图`                             | `assets/items/`                                              |
| 4    | A    | `feat: 内置演示数据 seed（14 条信息、4 位用户，时间相对当前生成）` | `js/data/seed.js`                                            |
| 5    | A    | `feat: 实现 localStorage 数据层 db（自增主键、L/F 编号、持久化）` | `js/data/db.js`                                              |
| 6    | A    | `feat: 实现本地业务接口 local-api（登录/分页/搜索/详情/状态流转/图片压缩）` | `js/data/local-api.js`                                       |
| 7    | A    | `refactor: api 转发本地实现，config 去除后端地址并停用 request` | `js/utils/api.js`、`js/config.js`、`js/utils/request.js`、`index.html` |
| 8    | B    | `feat: 发布页表单与必填、时间合法性校验`                     | `js/pages/publish.js`、`css/publish.css`                     |
| 9    | B    | `feat: 发布成功回执页（信息编号、操作引导、跳转入口）`       | `js/pages/publish-success.js`、`css/publish-success.css`     |
| 10   | A    | `feat: 首页失物/招领分类切换与触底分页加载`                  | `js/pages/home.js`、`css/home.css`                           |
| 11   | A    | `feat: 搜索关键词多字段匹配、热门词与空结果引导`             | `js/pages/search.js`、`css/search.css`                       |
| 12   | A    | `feat: 详情页图片轮播、浏览量统计与同类型相关推荐`           | `js/pages/detail.js`、`css/detail.css`                       |
| 13   | B    | `feat: 联系发布者弹层，微信号一键复制、手机号一键拨打`       | `js/pages/detail.js`、`css/detail.css`                       |
| 14   | B    | `feat: 我的发布统计筛选、状态机流转与个人资料、头像编辑`     | `js/pages/my-posts.js`、`css/my-posts.css`                   |
| 15   | A    | `test: 搭建 node:test 环境与 vm 沙箱（内存 localStorage）`   | `单元测试/package.json`、`单元测试/tests/helpers/env.js`     |
| 16   | B    | `test: 补充登录/分页/搜索/状态迁移/权限/图片边界用例`        | `单元测试/tests/local-api.test.js`                           |
| 17   | A    | `test: 补充数据层与工具函数用例，58 个断言全部通过`          | `单元测试/tests/db.test.js`、`单元测试/tests/utils.test.js`  |
| 18   | B    | `fix: 修复发布成功页说明文字与回执卡片重叠（hero 样式冲突）` | `css/publish-success.css`                                    |
| 19   | B    | `fix: 修复联系发布者弹层重复弹出（弹层重建导致入场动画两次）` | `js/pages/detail.js`                                         |
| 20   | B    | `fix: 修复添加图片后发布页重绘导致滚动位置回到顶部`          | `js/pages/publish.js`                                        |
| 21   | B    | `fix: 联调加固空结果、越权操作与非法状态的异常提示`          | `js/data/local-api.js`                                       |
| 22   | B    | `docs: 归档作业要求与 6 张功能成果截图`                      | `docs/作业要求.md`、`docs/screenshots/home.png`、`docs/screenshots/detail.png`、`docs/screenshots/publish.png`、`docs/screenshots/contact.png`、`docs/screenshots/success.png`、`docs/screenshots/my-posts.png` |
| 23   | A    | `docs: 撰写结对作业随笔（PSP、流程图、状态机与踩坑记录）`    | `作业随笔.md`                                                |
| 24   | A    | `docs: 编写美化版 README 与 MIT LICENSE`                     | `README.md`、`LICENSE`                                       |