# 图标与演示配图来源

核对与下载日期：2026-10-07。所有实际使用素材均保存在项目本地，运行页面不请求图库或 CDN。

## 界面图标

使用 [Lucide](https://lucide.dev/) 的 43 个 SVG 子集，固定上游提交 [`1fae58d0a9c6`](https://github.com/lucide-icons/lucide/tree/1fae58d0a9c661a338036838caf3399b5507bab6)。原始 SVG 和完整许可证保存在 [icons/lucide](icons/lucide/)，包含 ISC 条款和部分源自 Feather 图标的 MIT 条款，见 [LICENSE](icons/lucide/LICENSE)。

`js/utils/icons.js` 只将这些文件的 SVG 内部路径注册到白名单，统一使用 24×24 画布、1.8 线宽、`currentColor` 和装饰性无障碍属性。不依赖运行时图标库或网络。原有 `tabbar/` PNG 保留，但页面已切换到 SVG。

## 实物参考照片

照片来自 [Unsplash License](https://unsplash.com/license) 与 [Pexels License](https://www.pexels.com/license/) 允许使用的免费素材页面；不使用 Unsplash+ 或付费素材。下载后仅等比缩小、转换 WebP，不修改照片内容。每张最长边不超过 1200px，单张小于 200KB；浏览器中的卡片裁切不改变原文件，详情可查看完整画面。

照片是演示帖的**物品类型参考**，并非真实失物现场照片，也不证明文字中的品牌、型号、贴纸、容量或磨损细节。页面以“演示配图”标记，并在详情说明这一限制。没有合适照片的物品使用下节示意图。

| 本地照片 | 作者 | 原始页面 | 许可 | 大小 |
| --- | --- | --- | --- | --- |
| [earbuds.webp](items/photos/earbuds.webp) | I’M ZION | [来源](https://unsplash.com/photos/black-wireless-earbuds-in-box-YmhgTzWGDQE) | Unsplash License | 32.3 KB |
| [backpack.webp](items/photos/backpack.webp) | Matheus Bertelli | [来源](https://www.pexels.com/photo/black-backpack-on-the-sidewalk-18999339/) | Pexels License | 40.5 KB |
| [keys.webp](items/photos/keys.webp) | Wiredsmart | [来源](https://www.pexels.com/photo/keys-on-marble-surface-3868576/) | Pexels License | 31.7 KB |
| [usb.webp](items/photos/usb.webp) | Anete Lusina | [来源](https://www.pexels.com/photo/man-holding-flash-drive-containing-digital-information-4792751/) | Pexels License | 23.7 KB |
| [pen.webp](items/photos/pen.webp) | Kindel Media | [来源](https://www.pexels.com/photo/black-pen-on-black-background-7054785/) | Pexels License | 8.9 KB |
| [white-powerbank.webp](items/photos/white-powerbank.webp) | Andrey Matveev | [来源](https://www.pexels.com/photo/modern-power-bank-and-multi-connector-cable-on-grey-surface-34338614/) | Pexels License | 190.7 KB |
| [study-book.webp](items/photos/study-book.webp) | Kaboompics（Pexels 账号：https://kaboompics.com/） | [来源](https://www.pexels.com/photo/person-studying-and-writing-notes-on-paper-6958531/) | Pexels License | 80.1 KB |
| [clear-bottle.webp](items/photos/clear-bottle.webp) | Dagmara Dombrovska | [来源](https://www.pexels.com/photo/a-transparent-reusable-water-bottle-18381807/) | Pexels License | 22.8 KB |

原图下载地址、尺寸和文件校验值见 [photos/sources.json](items/photos/sources.json)。图库作者与品牌不为本项目背书。

## 具体物品示意图

本轮在项目内以 SVG 绘制 6 张示意图，使用渐变、基础几何图形和英文示例标签，无真实姓名、学号、照片、卡号或银行标志。它们不是照片，也不是后台脱敏处理的结果。

| 演示帖 | 配图 |
| --- | --- |
| 校园卡 | [campus-card.svg](items/illustrations/campus-card.svg) |
| 蓝色保温杯 | [blue-flask.svg](items/illustrations/blue-flask.svg) |
| 学生证 | [student-card.svg](items/illustrations/student-card.svg) |
| 蓝色门禁卡套 | [access-card.svg](items/illustrations/access-card.svg) |
| 银行卡 | [bank-card.svg](items/illustrations/bank-card.svg) |
| 藏青色长柄雨伞 | [navy-umbrella.svg](items/illustrations/navy-umbrella.svg) |

其余 8 条对应照片：无线耳机→earbuds、钥匙→keys、教材→study-book、U 盘→usb、背包→backpack、水杯→clear-bottle、签字笔→pen、充电宝→white-powerbank。

## 既有素材与数据

品牌标志 `logo.svg`、首页 `hero.svg`、原有六张分类 SVG 与旧截图保持原位。分类 SVG 继续作为无实拍图和照片损坏时的降级素材；这些既有文件的来源沿用此前记录，本轮不将其重新标为 Lucide 或图库作品。

演示帖配图在读取时映射，原始种子数据和浏览器记录的图片内容不重写。用户上传图片优先；新增的同名物品不会套用演示配图。回退图片也失败时显示本地 SVG 图标和“图片暂不可用”，不会无限重试。
