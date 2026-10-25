# Agent 接管指南

适用范围：本仓库。当前实现核对日期：2026-10-25。先理解以下边界，再按任务读取相关源码；发布状态和验证结果分别查对应文档，不从旧对话或文件名猜测。

## 项目背景与当前目标

召麐个人作品馆，供观众在微信内欣赏单作者绘画。2026-10-22确定原生小程序、TDesign及共同维护后台；2026-10-24改为优先发布 **1.0.0 静态小程序**。`miniapp/`独立运行，`admin/`和`server/`保留但不接当前小程序。上传、审核、正式发布没有完整确认。

当前是30个图像条目、6个精选、4个分组、四页面、原生“精选 / 图集”两tab。条目来自公开主页封面，尚不能当作30件已核实作品。无观众登录、交易或云环境；不显示未确认创作状态。正式作品归并、名称、作者说明与原图仍需真实依据。

## 阅读顺序与文档职责

1. [README](README.md)：安装恢复、构建、运行及目录地图。
2. [产品决策](PRODUCT-DECISIONS.md)与[词汇表](GLOSSARY.md)：当前范围和素材真实性，区分静态条目与后台作品。
3. [进度](docs/miniapp/progress.md)、[测试报告](docs/miniapp/test-report.md)、[发布清单](docs/miniapp/release-checklist.md)：当前待办、证据时点和未确认平台结果。
4. 按任务读[设计系统](docs/miniapp/design-system.md)、[后台接口](docs/miniapp/api-contract.md)、[实现方案](IMPLEMENTATION-PROPOSAL.md)。[项目计划](docs/miniapp/project-plan.md)为全局索引，[决策记录](docs/miniapp/decisions.md)与[版本变更](docs/miniapp/version-change.md)保留沿革。

代码决定“目前实际行为”，产品决策记录“已确认需求”，运行结果支持“已经验证”。发现三者冲突时先说明差异和适用版本，不能把历史方案改写成已实现，也不能为配合旧文档擅自更改产品范围。

## 代码定位

| 任务 | 先读的源码 |
| --- | --- |
| 小程序路由、组件注册、tab、基础库、上传范围 | `miniapp/app.json`、`project.config.json` |
| 内容、精选、分组和稳定ID | `miniapp/lib/local-catalog.ts`、`miniapp/lib/catalog.ts` |
| 卡片和画面观察映射 | `miniapp/lib/presentation.ts` |
| 首页/图集 | `miniapp/pages/home/`、`miniapp/pages/works/` |
| 详情、图片欣赏、朋友分享 | `miniapp/pages/work/index.ts`及同目录WXML |
| 系列及返回行为 | `miniapp/pages/series/`、`miniapp/lib/navigation.ts` |
| 公共样式和图片加载反馈 | `miniapp/app.wxss`、`miniapp/components/` |
| 下载素材与生成图片 | `materials/xiaohongshu/sources.json`、`scripts/build-gallery-images.mjs` |
| TDesign生成/字体与包体检查 | `scripts/build-miniapp.mjs`、`scripts/check-miniapp-package.mjs` |
| 领域类型及后台校验 | `shared/types.ts`、`server/src/validation.ts`、`server/src/gallery.ts` |
| HTTP路由与认证 | `server/src/app.ts`、`server/src/accounts.ts` |
| 服务入口、数据库和上传 | `server/src/index.ts`、`server/src/database.ts`、`server/src/images.ts` |
| 维护后台界面和API客户端 | `admin/src/App.tsx`、各`*Panel.tsx`、`admin/src/api.ts`、`admin/vite.config.ts`；通用表单辅助见`admin/src/ui.tsx` |

## 必须保留的行为边界

- `catalog.ts`的`fetch*`是包内异步接口，不做HTTP请求。小程序不读取后台SQLite；没有可切换的数据源或自动回退。
- `GalleryWork`省略后台`Work.status`，额外有分享封面。静态`overallImageId`表示主展示图，可以指局部；后台校验要求整体图视角为整体。两者不能直接视作可互换契约。
- 当前每条图像只有一张来源图。画面观察与主图可重复引用，不能宣称完整创作过程照片或作者确认的创作日期。
- 30张封面清单与43条后台来源索引是两套资料，不能按顺序拼接。`sourceRefs`为空不等于完成来源归并。
- 静态列表采用数组顺序；只改`sort`不会排序。既有`source-XX`ID构成分享入口，改名称和分组不应改ID。
- 详情以路径ID独立加载；缺失/无效ID进入未找到状态。返回有页栈则`navigateBack`，冷入口或失败则切图集。
- 图片预览先解析本地路径，有错误提示、重试及卸载后过期响应保护。逻辑执行通过不证明微信原生窗口或分享发送成功。
- `docs/miniapp/prototype/`和`docs/miniapp/ui-options/`是历史HTML演示，不是生产前端或实际后台；其演示数据不进入真实数据库。

## 本地运行与验证

从根目录使用`./scripts/node.ps1`、`./scripts/npm.ps1`；Windows路径写法和缺失运行时恢复步骤见README。脚本固定`.tools/node-v24.22.1-win-x64/`，不回退到全局Node。`.tools/`、依赖、构建产物都被忽略，首次检出需要恢复后执行`ci --ignore-scripts`。

| 改动范围 | 对应检查 |
| --- | --- |
| 静态内容、页面、组件、图片或打包 | `npm.ps1 run build`；另在微信核对受影响原生行为 |
| 共享类型、后台或跨工作区 | `npm.ps1 run check` |
| 后端正文/HTTP处理 | `npm.ps1 test`；用临时数据目录运行具体变更路径 |
| React后台 | `npm.ps1 run build:admin`；实际浏览器检查受影响界面 |
| 纯文档 | 核对引用源码、链接和命令；不把旧报告当本次执行结果 |

根`build`只构建小程序。构建会重写包内图片、素材派生信息、生成的TDesign组件及`dist/miniapp-release-report.json`；不要手改生成文件。资源预算精确数字只在最新报告记录。2MiB断言与200,000字节媒体警告不同，微信实际上传体积需开发者工具确认。`dist/gallery-media.zip`是历史快照，当前构建不刷新它。

真实后台数据在被忽略的`data/`，不要读取或重置来做测试。服务入口支持`DATA_DIR`和`PORT`；但 **`create:maintainer`命令固定写根`data/`，不读取`DATA_DIR`**。隔离测试通过`createMaintainer(tempDir, ...)`初始化临时账号；不要用真实账号。Vite代理固定8788，改服务端口不会自动改代理。

私有`project.private.config.json`由用户保管，不读取、回显或覆盖；公共配置目前有`appid`字段，不能再写“AppID仅存在私有文件”。配置脚本仅处理私有文件并校验格式，账号归属和最终生效值在本机微信工具确认。

## 持续同步规则

| 实现发生变化 | 同次更新的文档 |
| --- | --- |
| 产品范围、数据源、静态/后台边界 | README、产品决策、接管指南、项目计划 |
| 页面、交互、样式或原型角色 | 设计系统；改变既有选择时补决策记录 |
| API、字段、认证、存储、环境变量 | API合同、词汇表、实现方案 |
| 命令、依赖、构建或素材处理 | README及相关脚本说明；实际运行命令后记录结果 |
| 发布进展或运行验证 | 进度、测试报告、发布清单；注明日期与环境 |
| 可持续维护的实现变更 | 版本变更记录；历史条目保持当时范围，不改成当前指令 |

只更新受影响部分，链接到事实来源，不在多文档反复硬编码体积等易变指标。证据必须标明是源码检查、命令行、宿主适配逻辑、浏览器还是微信/真机；没有本次执行或明确用户反馈的事项写“未验证/未获确认”。平台状态不由代码仓库推定。历史授权、工具限制和临时失败只描述当时上下文，新的明确用户指令优先。
