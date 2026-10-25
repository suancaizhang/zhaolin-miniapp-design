# 召麐个人作品馆

当前代码目标为 **1.0.0 静态微信小程序**：原生小程序、TypeScript、TDesign。目录、说明、图片和图标字体随代码包提供；浏览不依赖 `server/`、`admin/`、数据库或业务域名。保留的 React/Node/SQLite 后台是另一套可运行的本地维护工程，**其修改不会更新当前小程序**。

接管先读 [AGENTS.md](AGENTS.md)，再按任务查看下表。当前实现核对日期为 **2026-10-25**；微信上传、审核及正式发布没有新增确认，不能从代码版本推断线上状态。

| 文档 | 用途 |
| --- | --- |
| [产品决策](PRODUCT-DECISIONS.md) / [领域词汇](GLOSSARY.md) | 当前范围、素材真实性和领域边界 |
| [项目计划](docs/miniapp/project-plan.md) / [进度](docs/miniapp/progress.md) | 当前阶段、下一步与历史上下文 |
| [设计系统](docs/miniapp/design-system.md) / [决策记录](docs/miniapp/decisions.md) | 当前界面实现、设计选择与原型差异 |
| [实现方案](IMPLEMENTATION-PROPOSAL.md) / [后台接口](docs/miniapp/api-contract.md) | 两套数据路径、后台运行与精确接口约束 |
| [测试报告](docs/miniapp/test-report.md) / [发布清单](docs/miniapp/release-checklist.md) | 本次证据、历史证据及未完成验证 |
| [版本变更](docs/miniapp/version-change.md) | 按日期记录的变更；不是当前操作指南或发布凭证 |

## 当前可见内容

- “精选 / 图集”两个 tab，首页、图集、系列、详情四个页面。
- 30 个图像条目、6 个精选、4 个策展分组：壁画人物、手势与持物、一笔一线、创作现场。
- 详情包含画面、描述、整体/局部视角、画面观察、图片欣赏和朋友分享。每个当前条目只有一张来源图；观察记录引用同一图，不是新增过程照片。
- 不显示未经确认的创作状态；年份、材料、尺寸、记录日期为空。描述性标题和画面观察不冒充作者确认的作品名称、说明或创作时间线。
- 观众无需登录；源码未接入微信身份、头像昵称、手机号、位置、交易、收藏或朋友圈分享。

`miniapp/lib/catalog.ts` 只读取 `local-catalog.ts`。虽然函数名为 `fetch*` 且返回 Promise，它没有 HTTP 请求或 API 切换。朋友分享使用稳定条目 ID；图片欣赏先通过 `wx.getImageInfo` 获取本地路径，再调用 `wx.previewImage`。微信原生显示、预览窗口和实际分享接收端需单独验证。

## 环境恢复与构建

在项目根目录使用 Windows PowerShell 5.1 或 PowerShell 7。根 `package.json` 要求 Node `>=24.22.1 <25`，固定 npm `11.19.1`；包装脚本指定 `.tools/node-v24.22.1-win-x64/`。

`.tools/`、`node_modules/`、`dist/` 和 `miniapp/miniprogram_npm/` 都被忽略，新检出不会自动具备这些目录。运行时缺失时，从 [Node.js 官方发布目录](https://nodejs.org/dist/v24.22.1/)取得对应 Windows x64 ZIP，按官方 SHA256 校验后解压到上述 `.tools/` 路径；仓库没有自动下载安装脚本，包装脚本也不会回退到全局 Node。

```powershell
.\scripts\node.ps1 --version
.\scripts\npm.ps1 --version
.\scripts\npm.ps1 ci --ignore-scripts
.\scripts\npm.ps1 run build
```

安装遵循根工作区和单一 `package-lock.json`。`.npmrc` 禁用依赖安装脚本并精确保存依赖版本；无需各子目录重复安装。`npm.ps1` 仅在命令进程中临时调整 PATH，并在结束时恢复。

默认构建依次执行：

1. 小程序 TypeScript 检查。
2. 校验下载素材 SHA-256，生成展示图、缩略图和分享封面，更新 `materials/xiaohongshu/sources.json` 中的派生图片信息。
3. 从锁定的 TDesign 1.17.0 复制 44 个运行依赖文件，内嵌已校验的图标字体并保留 MIT 许可证。
4. 检查页面/组件定义、图片引用、JPEG 尺寸和分享封面比例，生成 `dist/miniapp-release-report.json`。

| 命令 | 用途和边界 |
| --- | --- |
| `.\scripts\npm.ps1 run build` | 仅构建小程序；不启动服务、不构建后台，也不是微信编译 |
| `.\scripts\npm.ps1 run check` | 三个工作区的 TypeScript 检查 |
| `.\scripts\npm.ps1 test` | 当前仅运行 `server/test/body-limits.test.mjs` 的隔离 HTTP 回归 |
| `.\scripts\npm.ps1 run check --workspace miniapp` | 仅小程序类型检查 |
| `.\scripts\node.ps1 scripts/check-miniapp-package.mjs` | 校验已有产物；不生成缺失图片或组件 |
| `.\scripts\npm.ps1 run build:admin` | 构建 React 后台至 `admin/dist/`；仅后续维护后台需要 |

若终端策略阻止包装脚本，可仅为这次命令使用以下入口，仍执行完整构建链，不修改系统持久执行策略：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\npm.ps1 run build
```

构建报告区分两个预算：`sourceBytes <= 2 MiB` 是源码与静态资源的本地断言，超限会失败；`imageAudioBytes <= 200,000` 是项目的保守媒体优化预算，超限仅警告并令 `withinMediaBudget` 为 `false`。二者均不代表微信最终上传包或工具质量扫描结果。最新实测数字只记在[测试报告](docs/miniapp/test-report.md)，平时以新生成的 JSON 为准。

## 在微信开发者工具浏览与发布

1. 导入**项目根目录**，不要选择 `miniapp/`、`docs/miniapp/prototype/` 或 `docs/miniapp/ui-options/`。公共配置的源码根为 `miniapp/`、基础库为 **3.17.5**，使用 TypeScript 编译插件和普通小程序模式。
2. 沿用用户本机的 AppID。当前公共 `project.config.json` 已有 `appid` 字段；私有配置也可能覆盖工具设置，最终值需在本机工具界面确认。智能体不读取、回显或覆盖 `project.private.config.json`。新环境配置方式见[实现方案](IMPLEMENTATION-PROPOSAL.md)。
3. 先完成上述构建，再点击“编译”。TDesign 运行依赖由脚本生成，无需在开发者工具再次“构建 npm”；基础库不可用时保留工具提示，不擅自换为 `latest`。
4. 浏览四页面，点击“预览”，扫码核对图片、放大、返回、字体及朋友分享。无需启动后台或关闭合法域名校验；手机不访问电脑的回环地址。
5. 在工具上传目标版本 **1.0.0**，到[微信公众平台](https://mp.weixin.qq.com/)“版本管理”确认结果，设置体验版并完成真机检查。版本说明可用：`静态作品馆首版：图集、主题分组、图片欣赏及朋友分享，无需登录。`
6. 按平台实际提示完善类目、备案及隐私资料，再提交审核；审核通过后在平台点击“发布”，并用普通用户验证正式入口。上传和体验版不等于正式发布。

本地修改需重新“编译 → 预览”；已上传体验版必须重新上传并设为体验版才会更新。历史记录中自动化曾因服务端口关闭或授权超时而失败，这不是当前工具状态检查结果。人工界面流程不依赖自动化服务端口。

最新用户截图的历史记录只证明部分详情及图片可见；返回按钮最新样式、全流程和真机分享仍无完整确认。平台信息以实际反馈为准，当前待核对项见[发布清单](docs/miniapp/release-checklist.md)。官方流程参考[代码审核与发布](https://developers.weixin.qq.com/miniprogram/introduction/#三、代码审核与发布)。

## 更新图像与目录

| 要修改的内容 | 事实来源 |
| --- | --- |
| 描述、分组、精选、条目顺序、稳定 ID、图片尺寸 | `miniapp/lib/local-catalog.ts` |
| 下载素材、来源信息和派生图片清单 | `materials/xiaohongshu/`、`materials/xiaohongshu/sources.json` |
| 图片生成规格 | `scripts/build-gallery-images.mjs` |
| 字体来源、版本与校验值 | `materials/tdesign-icons/source.json`；构建中另有固定校验值 |
| 公共组件选择与生成规则 | `scripts/build-miniapp.mjs`；不要直接编辑生成的 `miniprogram_npm/` |

目前下载素材来自[作者小红书公开主页](https://www.xiaohongshu.com/user/profile/5ef02170000000000101ddeb)，30 张、宽 640px。清单明确没有笔记 ID、完整详情图集或与 `server/source-index.json` 中 43 条索引的确认映射，不能据封面顺序归并作品，也不能标作作者交付原图。

构建生成宽高上限 **480×960** 的展示图、**240×320** 的缩略图（均保持比例且不放大），以及 **320×256** 的 5:4 分享封面（保持比例、暖白补边）。添加素材时同时维护来源清单与目录中的图片尺寸；不要改已有分享 ID。静态列表按数组顺序呈现，仅改 `sort` 数字不会重新排序。更新内容后重新构建、预览、上传并审核发布。

`dist/gallery-media.zip` 和 `dist/gallery-media-manifest.json` 是此前静态托管评估留下的本地快照，被忽略且**不会由当前 `build` 生成或刷新**，不能作为持续更新的发布来源。当前仍使用包内图片；远程托管是尚未实施的方案，需要实际 HTTPS 图片地址、相应[微信下载合法域名](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network)和新的运行验证。

## 目录和后台边界

| 目录 | 职责 |
| --- | --- |
| `miniapp/` | 唯一微信上传源码根；四页面、展示组件、静态目录及包内资源 |
| `shared/` | 共享领域类型；小程序仅类型导入，不引入后端运行代码 |
| `admin/` | React/Vite 本地维护界面，调用后台 API |
| `server/` | Node HTTP、SQLite、图片处理、维护者账号与 43 条历史来源索引 |
| `materials/` | 下载素材及字体来源；不进入微信上传根 |
| `scripts/` | 本地运行时入口、构建、包检查与交互配置工具 |
| `docs/miniapp/prototype/`、`docs/miniapp/ui-options/` | 历史 HTML 设计演示；不是生产小程序或真实管理后台 |
| `data/` | 被忽略的本机后台数据库及上传文件；不进入上传根 |

后台启动、维护者初始化、端口与环境变量见[实现方案](IMPLEMENTATION-PROPOSAL.md)和[接口合同](docs/miniapp/api-contract.md)。默认服务只监听本机回环地址，不能直接供手机或异地共同维护使用。不要把新数据库的空目录结论用于既有 `data/`；备份前停止服务并将整个目录复制到私人位置。日常验证用独立临时目录，避免触碰真实数据。
