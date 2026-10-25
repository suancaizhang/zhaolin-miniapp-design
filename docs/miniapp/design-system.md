# 召麐个人作品馆 · 设计系统与实现边界

本文以当前 `miniapp/` 源码为准，记录静态首发的视觉、页面和交互；2026-10-22 的 B 方向及完整 HTML 设计仍作为历史设计保留。当前目标版本为 1.0.0，范围按 2026-10-24 的静态首发调整。文档核对不等于微信编译、真机、上传、审核或发布通过；平台最新状态未获确认，证据入口为[测试报告](test-report.md)和[发布清单](release-checklist.md)。

## 1. 当前范围与事实来源

- 观众免登录浏览包内图集，当前有 **30 幅图像、6 幅精选、4 个策展分组、4 个页面**。图像条目不等于已经作者确认的独立作品；正式名称、归并、作者说明与原图仍需确认。
- 主导航为原生 **「精选 / 图集」**，详情和系列为次级页。图片完整保比例，点击进入微信原生预览；作品入口可转发给微信朋友。
- 当前不显示未经确认的「创作中 / 已完成」状态；详情使用「画面观察」，其中线稿、设色等是画面分类，不宣称真实创作时间线。
- 目录与图片随小程序包发布。`admin/`、`server/` 保留供后续后台维护，但不连接当前小程序；后台保存不会改变已发布的静态内容。
- 不增加观众登录、收藏、下载按钮、评论、交易、教学、联系作者、朋友圈分享或自动抓取同步。

| 事实入口 | 用途 |
| --- | --- |
| [app.json](../../miniapp/app.json) | 四页注册、原生导航、精选/图集 tab、组件注册 |
| [local-catalog.ts](../../miniapp/lib/local-catalog.ts) | 图像条目、精选、分组、视角与观察记录 |
| [catalog.ts](../../miniapp/lib/catalog.ts) / [presentation.ts](../../miniapp/lib/presentation.ts) | 包内查询、卡片、阶段分组 |
| [shared/types.ts](../../shared/types.ts) | 后台共享模型；静态 `GalleryWork` 的差异见下文 |
| [app.wxss](../../miniapp/app.wxss) | 当前视觉令牌、布局、断点和返回按钮 |
| [产品决策](../../PRODUCT-DECISIONS.md) / [词汇表](../../GLOSSARY.md) / [项目规划](project-plan.md) | 长期产品背景、术语与当前交付范围 |

## 2. 页面、导航与返回

| 页面 | 当前信息与操作 | 源码 |
| --- | --- | --- |
| 精选 `pages/home/index` | 馆名和引导语、6 幅精选大卡片、4 个系列入口及图像计数、浏览图集按钮 | [首页布局](../../miniapp/pages/home/index.wxml) |
| 图集 `pages/works/index` | 全部 30 幅图像、总数、双列卡片；没有搜索和筛选控件 | [图集布局](../../miniapp/pages/works/index.wxml) |
| 系列 `pages/series/index?id=…` | 分组名称、说明、同组图像列表；一个条目可属于多个分组 | [系列布局](../../miniapp/pages/series/index.wxml) |
| 详情 `pages/work/index?id=…` | 主展示图及真实整体/局部标签、标题和画面描述、有值才显示的年份/材料/尺寸、朋友分享、画面观察 | [详情布局](../../miniapp/pages/work/index.wxml) |

图片预览是系统能力，不是第五个注册页面；HTML 分享说明层也不是生产页面。分组与卡片都按稳定 ID 导航，不复制同一图像在不同分组中的内容。

原生导航使用暖白底和黑色文字，不复制 HTML 中的状态栏或微信胶囊。`app.json` 的 `tabBar.custom=false`，普通/选中图标来自 [miniapp/assets/](../../miniapp/assets/)，不是运行时引用原型目录。tab 实际高度和安全区由平台处理，WXSS 不承诺 HTML 的 52px 栏高或 34px 底部示意高度。

系列与详情均有页内文字返回按钮；[navigation.ts](../../miniapp/lib/navigation.ts) 在页面栈有上页时调用 `wx.navigateBack`，失败或冷启动无上页时 `wx.switchTab` 到图集。页面初始化据此显示「返回上一级」或「返回图集」。底部详情返回按钮复用同一逻辑。通用状态组件仍使用「返回作品目录」文案，其实际去向也是图集，不能把这个旧措辞记成第三个 tab。

## 3. 当前视觉令牌与布局

以下数值来自当前 WXSS，不是对所有设备最终渲染的验证结论。

| 项目 | 实现值与用途 |
| --- | --- |
| 页面底色 | `--gallery-page: #f3f0ea` |
| 内容表面 | `--gallery-surface: #faf8f3` |
| 主文字 / 次文字 | `#292721` / `#6e685f` |
| 分隔线 | `#dcd7ce` |
| 品牌强调 / 浅强调 | `#8f332b` / `#f4e8e3` |
| 页面留白 | `.page` 为上 24px、左右 16px、下 32px；次级页上 8px、下 `32px + env(safe-area-inset-bottom)` |
| 章节和卡片 | 章节上间距 32px；卡片边框 1px、圆角 12px；卡片正文内边距 16px |
| 字体 | 系统字体栈；正文 15px、行高 1.6；页面标题 22px/1.35；章节标题 18px；卡片及阶段标题 17px；辅助文字 12–14px |
| 按钮 | 主题圆角 6px；TDesign medium 高度变量 44px、large 48px；页内返回最小高 44px，原生分享按钮最小高 48px |
| 列表 | flex 换行、默认双列；视口不超过 350px 时图集和系列列表改为单列 |
| 图片框 | 精选卡片 320px、普通卡片 208px、系列封面 180px、详情主图 420px、观察图 320px；图片均 `aspectFit` |

[卡片样式](../../miniapp/components/work-card/index.wxss)、[图片样式](../../miniapp/components/gallery-image/index.wxss)、[首页样式](../../miniapp/pages/home/index.wxss)、[详情样式](../../miniapp/pages/work/index.wxss)在全局令牌之上补充排版。生产代码主要使用 px；历史「375 画布下按 1px≈2rpx 换算」仅是早期设计建议，并非当前布局策略。

长标题和正文使用换行规则；按钮、章节标题行允许 flex 换行。图片固定的是展示框高度，`aspectFit` 保留图像比例，空白不代表图片被裁掉。320px、大字体、系统读屏、对比度和触控体验仍需目标设备核验；源码中有最小高度和 `aria-label`，不能据此宣称全部可访问性要求已通过。

## 4. 组件与反馈

当前主组件体系为 **TDesign MiniProgram 1.17.0**，精确依赖见 [miniapp/package.json](../../miniapp/package.json)。[构建脚本](../../scripts/build-miniapp.mjs)核对版本，生成所需组件及其依赖、内嵌图标字体并保留许可证；不应手工修改生成目录。原生组件与项目自有组件共同组成作品区，不引入第二套 UI 库。

| 组件 / 能力 | 当前实现 | 边界 |
| --- | --- | --- |
| `work-card` | 原生 `navigator`、标题、缩略图和查看入口；`large` 控制图片框高度 | 不含创作状态；卡片进入详情，不直接放大 |
| `gallery-image` | 原生 `image mode="aspectFit"`；可选覆盖按钮触发 `appreciate`；缺图与错误反馈 | 图片长按菜单关闭；错误重试通过重新挂载当前图片，不换成其它图 |
| `content-state` | loading 使用 `t-loading`，其余状态用 `t-empty`；error/notfound 提供重载，`back` 提供返回 | 空/错误/未找到区分由页面传入；没有后台权限场景入口 |
| `t-button` | 图集入口、重试、底部返回等；通过 `--td-*` 变量定色和尺寸 | 不代表所有操作都使用 TDesign；顶部返回与分享是原生 button |
| `t-tag` | 详情主图与观察记录的整体/局部视角标签 | 当前不展示创作状态标签 |
| 页面反馈 | 页面内文字和按钮；已载入的列表刷新出错时保留旧内容 | 不用短暂 Toast 作为唯一关键错误反馈 |

组件入口见 [work-card](../../miniapp/components/work-card/index.wxml)、[gallery-image](../../miniapp/components/gallery-image/index.wxml)、[content-state](../../miniapp/components/content-state/index.wxml)。`t-button`、`t-tag`、`t-loading`、`t-empty` 在 `app.json` 中全局注册，样式变量在 `app.wxss` 中设置；没有实现「库失效自动切换另一组件库」的运行时降级机制。

首页、图集和系列在 `onShow` 重新读取包内目录；四页支持下拉刷新。刷新不下载后台新内容。详情在 `onLoad` 读取路径 ID，并在重新加载前清空旧详情、预览 URL 和错误；缺失/无效 ID 进入未找到状态。加载版本号用于忽略过期结果，不构成服务端同步协议。

## 5. 图像、画面观察与数据语义

[local-catalog.ts](../../miniapp/lib/local-catalog.ts) 的 `references` 是当前展示事实：`source-01` 至 `source-30`，6 条 `featured:true`；4 个分组为「壁画人物」「手势与持物」「一笔一线」「创作现场」。`catalog.ts` 原样返回目录，未额外按 `sort` 排序；当前显示顺序由数组顺序决定，`sort` 是随条目生成的字段，不能仅改数值就声称会改变列表顺序。

每条图像生成一个 `GalleryWork`：当前只有一张 `images` 图，封面和 `overallImageId` 都引用它。**静态目录的 `overallImageId` 是兼容既有字段名的主展示图引用，可能指向局部图**；详情展示 `image.view` 的真实标签，不把局部标成整体。这与后台已确认作品要求「整体展示图必须标记整体」的验收规则不同，不能直接将静态条目视为已通过后台作品校验的数据。

`GalleryWork extends Omit<Work, 'status'>` 并增加 `shareImageUrl`。共享的后台 `Work/WorkInput` 仍有必填 `status`；这不要求为静态条目补造完成状态。当前 `description` 来自中性画面描述，不能称为作者自述；年份、材料、尺寸均为空，页面按有值才展示。`sourceRefs` 为空，来源核对保留在素材清单，不在观众页添加来源社交导流。

有 `stage` 的条目生成一条引用当前图的记录，无 `stage` 则记录为空。`presentation.ts` 按「线稿 / 设色 / 完成效果」顺序分组且移除空组；当前记录没有可靠日期，也没有组成已核实的前后创作过程。页面标题「画面观察」和独立的整体/局部标签应继续保留。不能因为阶段枚举存在，就声称已有三阶段资料或同一作品的完整演变记录。

素材来源见 [materials/xiaohongshu/sources.json](../../materials/xiaohongshu/sources.json)，43 条历史笔记索引见 [server/source-index.json](../../server/source-index.json)。清单的 `coverage` 明示主页网格采集未取得笔记ID和完整详情图组；`source-XX` / `observedGridPosition` 是采集编号/位置，不能按同号直接关联43条笔记索引。30 张当前封面与43条来源索引是不同集合，不等于完成43件作品归并。旧兄弟目录整理报告不作为接管项目的必需入口。

## 6. 图片欣赏与朋友分享

[详情逻辑](../../miniapp/pages/work/index.ts)先按主图在前构造同条目图片 URL 列表。点击图像后，使用 `wx.getImageInfo` 将包内地址解析成平台路径，再调用 `wx.previewImage({current, urls, showmenu:false})`。读图失败或预览失败时保留详情，并提供「重试图片欣赏」和「重新载入作品」。当前每条只有一图；代码支持多图列表不等于当前已经提供多角度图像。

页面图片同时设置 `show-menu-by-longpress=false`，产品不提供下载按钮。系统预览、返回、菜单及手势仍需微信验证，不承诺阻止截图或所有系统保存行为。

详情加载期间隐藏分享菜单，成功后仅开启 `shareAppMessage`；页面原生 `button open-type="share"` 与 `onShareAppMessage` 返回标题、`/pages/work/index?id=稳定ID` 和包内 `-share.jpg` 封面。未实现朋友圈分享或「分享成功」提示。

分享接收端按路径 ID 独立查询自身小程序版本的包内目录，不依赖发送端内存、127.0.0.1 或在线业务 API。稳定 ID 必须随内容维护保持可识别；旧包是否含新 ID、真实冷启动、分享封面和系统预览表现要由微信侧验证，不能由 HTML 的 fragment 演示证明。

## 7. 静态内容维护与后台边界

维护时同时处理 `local-catalog.ts`、素材清单和原始采集文件，再由 [build-gallery-images.mjs](../../scripts/build-gallery-images.mjs)生成展示、缩略和分享 JPEG。该脚本校验输入 SHA256，使用保比例缩放，分享图以暖白补边形成 5:4 画布，并回写清单中的派生图元数据。展示 JPEG 不是作者交付原图，也不是无损归档。

根 `npm run build` 调用小程序工作区的类型检查、图片构建、TDesign 生成与包静态校验；它不会代替微信开发者工具编译、上传、审核或发布，也不会从后台数据库导出目录。具体恢复命令与工具入口见 [README](../../README.md)。更新静态内容要发布新包，后台编辑不会实时生效。

保留的后台模型用于已确认作品、创作记录、系列、精选排序、来源归属和两位同权维护者。后台访问控制、字段校验及持久化验收见[接口契约](api-contract.md)与[实现方案](../../IMPLEMENTATION-PROPOSAL.md)；它们不属于本次静态小程序的运行依赖。后台测试通过也不能证明小程序静态条目已经完成正式作品归并。

## 8. 历史设计与两个 HTML 原型

2026-10-22 已确认 B「TDesign 品牌定制」方向和完整设计；当日尚处设计/环境准备阶段的陈述只解释历史，不是当前工程或平台状态。

| 历史入口 | 保留内容 | 与当前实现的区别 |
| --- | --- | --- |
| [ui-options/index.html](ui-options/index.html) | A/B/C 三套 375×812 首页比较；3 张样例、系列筛选、加载/空/错误切换、HTML 图片层 | 已选 B；比较页中的「精选 / 作品」、筛选、固定状态栏/安全区以及候选提示不定义生产 UI |
| [prototype/index.html](prototype/index.html) | B 方向手机四类页面及电脑核心编辑表单；模拟权限、选图、保存、朋友入口和场景状态 | 使用少量演示作品；创作状态、跨系列和阶段组合含模拟数据；不等于当前30图静态目录或真实 React 后台 |

完整原型由 `model.js` / `app.js` 维护同页内存：选图通过对象 URL 预览；保存只更新演示数据；分享通过 URL fragment 从默认样例重建接收者视图，临时编辑和新作品不会传给接收者。刷新恢复默认数据，没有真实登录、上传或微信消息。原型中的权限切换不是安全边界。

历史设计曾要求已确认作品整体图在先、必填创作状态、阶段创作记录、两位维护者共享内容、来源核对和表单错误定位；这解释了后台共享模型，但不能覆盖静态首发的「图像条目 / 不显示状态 / 画面观察」口径。早期关于「身份、存储、技术方案待定」的文字已被后续本地 Node/SQLite 与 React/Vite 工程决策推进；它不表示当前尚无源码。

历史原型中的 44px 状态区、44px 导航区、52px tab、34px 安全区及 375×812 画布都只是 HTML 设计标尺。生产不固定整页高度，也不照搬画布外工具栏、权限开关、分享说明层和电脑表单。HTML 键盘焦点、Escape、放大字体演示仅能说明 Web 原型行为，不能充当微信可访问性结果。

## 9. 证据与后续核验

本文对照源码、样式与历史 HTML 说明当前实现，源码核对本身不是运行证据。最新检查、测试、构建、隔离冒烟及浏览器核对结果统一见[测试报告](test-report.md)。2026-10-22 的官方文档读取和历史命令行检查保留原时点，不充当新一轮验证；版本与 API 落地以本地源码和精确依赖为准，不再依赖可变 develop 快照作为生产依据。

后续平台核验：由用户在微信开发者工具检查四页、真实包体、缺失 ID、图片失败重试、窄屏与长文案；在安卓和 iPhone 检查主图视角、原生预览、栈内/冷启动返回及朋友接收端。本地检查与构建结果不代替上述平台证据。确认上传、体验版、审核、备案和正式发布时应记录平台实际证据；这些最新状态目前未获确认，不推定尚未执行。各层级与包体数字集中记录在[测试报告](test-report.md)，不在本文件复制易过期的通过结论；涉及后台的验证继续隔离真实 `data/`。
