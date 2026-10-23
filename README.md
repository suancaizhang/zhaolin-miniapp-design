# 召麐个人作品馆

原生微信小程序、React电脑管理后台，以及共享的Node.js/SQLite图片服务。版本 **0.1.0-local**；本地工程已实现，微信开发者工具首次编译和界面验证待用户操作，尚未部署或发布。

产品需求、首版范围、B/TDesign方向、完整设计与本地工程提案均已确认。验证结果见[测试报告](docs/miniapp/test-report.md)，当前待办见[项目进度](docs/miniapp/progress.md)。

## 建议阅读顺序

| 顺序 | 文档 | 内容与状态 |
|---|---|---|
| 1 | [产品决策](PRODUCT-DECISIONS.md) | 已确认的产品需求、首版范围与设计 |
| 2 | [领域词汇](GLOSSARY.md) | 作品、系列、创作记录、阶段、图像视角等概念及关系 |
| 3 | [实现提案](IMPLEMENTATION-PROPOSAL.md) | 已批准的本地工程方案、内容模型、真实输入与验收场景 |

审核时，先检查产品决策是否准确反映意图，再核对领域关系，最后评估工程提案与验收场景。具体审核重点位于实现提案末尾。

## 区分三类内容

- **已逐项选择的需求**：来源为本次对话中的明确答复；最新范围包含电脑管理后台，已覆盖此前“只新建小程序”的限制。
- **已批准的本地工程方向**：原生小程序与TypeScript、TDesign、React/Vite、Node.js/SQLite、独立图片存储与当前目录分区。批准不等于业务已实现；公网平台、域名和正式部署仍待后续确认。
- **尚需真实输入的事项**：作者原图与说明、作品正式名称和归并确认。AppID已由用户在本地填写；智能体不读取私有配置，账号归属及微信编译仍待验证。

Q14编辑何时影响公开内容、Q15撤下及旧分享处理，按用户答复暂不展开；不由本文档补设复杂发布流程。

## 审核意见如何记录

直接在对应文档批注或按“文件名＋章节＋修改意见”反馈即可。需求、范围、设计及本地工程方向已确认；当前实际进度以docs/miniapp/progress.md为准。

## 本地启动

在本项目根目录的PowerShell 7终端执行。已安装项目独立Node **24.22.1**、npm **11.19.1** 和锁定依赖，未改变全局Node或PATH。依赖丢失时运行 `.\scripts\npm.ps1 ci --ignore-scripts`；不要在多个子目录分别安装。

1. 创建维护者：你与作者各运行一次，自行输入不同账号和密码；没有默认账号，同名账号不会被重置。

   ```powershell
   .\scripts\node.ps1 .\scripts\create-maintainer.mjs
   ```

   账号为3–64位英文字母、数字或`_.-`；密码12–256个字符，在交互终端用星号显示。不要将密码写进命令、聊天或文档。当前两个账号均在这台电脑上使用；异地共同维护尚未部署。

2. 构建电脑后台和真实TDesign小程序组件，然后启动服务。保持该终端运行；停止时按Ctrl+C。

   ```powershell
   .\scripts\npm.ps1 run build
   .\scripts\npm.ps1 start
   ```

3. 自行在浏览器打开 **http://127.0.0.1:8788**，用刚创建的维护者登录。先在“图片”上传作者确认的原图，再新建作品并选择封面、整体图、系列和创作记录。保存后直接供公开接口读取。

首次启动没有作品、图片或系列。来源页有 **43条待确认索引**，不会自动变成43件作品，也不会导入HTML原型配图。来源摘要是整理索引，不是作者说明；笔记发布日期不作创作日期。

如果PowerShell策略阻止脚本，可直接调用独立程序，不调整系统策略：

```powershell
.\.tools\node-v24.22.1-win-x64\node.exe .\scripts\create-maintainer.mjs
.\.tools\node-v24.22.1-win-x64\node.exe .\server\src\index.ts
```

第二条可启动已有构建。需要通过npm安装、检查或重建时，可在当前PowerShell窗口临时加入独立运行时目录，窗口关闭即失效，再直接执行npm CLI：

```powershell
$env:PATH = "$((Resolve-Path .\.tools\node-v24.22.1-win-x64).Path);$env:PATH"
.\.tools\node-v24.22.1-win-x64\node.exe .\.tools\node-v24.22.1-win-x64\node_modules\npm\bin\npm-cli.js run build
```

## 微信开发者工具首次编译（用户操作）

1. 保持本地服务运行。在开发者工具项目列表选择“导入”，目录选本项目根目录，**不要选 `miniapp/` 子目录或HTML原型目录**。AppID已本地填写，不需要发到聊天或重复填写；如工具仍要求选择AppID，只在本机确认已有账号。
2. 使用普通小程序模式，不启用云开发。公共配置的源码根是 `miniapp/`，基础库固定 **3.17.5**，已启用TypeScript编译，TDesign组件已由构建命令放入 `miniapp/miniprogram_npm/`，无需另做“构建npm”。如工具提示该基础库不可用，请保留完整提示反馈，不自行改为 `latest`。
3. 在本地设置中临时勾选“不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书”。这仅供桌面模拟器访问本机HTTP；公共项目配置没有关闭校验，正式发布必须重新配置HTTPS合法域名。
4. 点击“编译”。查看“精选 / 作品”两项导航；尚未录入作品时，空状态是预期结果。浏览器后台录入后切换小程序tab或下拉刷新，再检查内容与排序。
5. 有作者素材后检查作品详情、图片放大、系列引用、返回和重试。把首次编译结果或首条完整报错发回；截图请遮住账号标识和敏感信息。

当前API地址为 `http://127.0.0.1:8788`（避开本机已有进程占用的8787）。手机中的127.0.0.1指向手机自身，因此此阶段**不能用于手机预览、异地维护或朋友实际打开分享**；详情分享路径已按稳定作品ID实现，真实微信分享仍未验证。公网部署、免费平台、域名及HTTPS待后续评估。

## 命令与目录

| 命令 | 用途 |
| --- | --- |
| `.\scripts\npm.ps1 run check` | 后端、电脑后台和小程序TypeScript检查 |
| `.\scripts\npm.ps1 test` | 临时数据库上的HTTP超限输入回归，不创建真实账号 |
| `.\scripts\npm.ps1 run build` | 构建 `admin/dist/` 与本地TDesign组件，保留MIT许可证 |
| `.\scripts\npm.ps1 start` | 仅监听本机 `127.0.0.1:8788` |
| `.\scripts\npm.ps1 run dev:admin` | 可选后台开发服务 `127.0.0.1:5173`，同时保持后端运行 |
| `.\scripts\node.ps1 .\scripts\create-maintainer.mjs` | 人工创建一个本地维护者 |

`miniapp/` 是原生小程序，`admin/` 是电脑后台，`server/` 是HTTP/SQLite/图片服务，`shared/types.ts` 是共享数据契约。接口和输入限制见[API约定](docs/miniapp/api-contract.md)。`docs/miniapp/prototype/` 与 `ui-options/` 保留为设计材料，不参与小程序打包。

真实数据在根目录 `data/`：SQLite、维护者密码哈希、会话及私有原图；请勿公开、上传或随意删除。图片上传支持JPEG/PNG/WebP，限制12MiB/4000万像素和静态单帧，生成不放大的480px缩略图与2400px预览；原图没有公开路由。需要备份时，先停止服务并复制整个 `data/` 到私人位置，恢复后重新登录。

本机AppID位于已忽略的 `project.private.config.json`，由用户保管，智能体不读取或覆盖。当前没有默认账号、云环境或公开部署。备案未完成、认证状态未知；类目适配按用户要求跳过，保持未验证。

## 素材依据

- [43篇图文完整整理报告](../zhaolin-all-image-notes-20261022.md)：逐篇正文、图像描述、主题和代表作品。
- [43篇图文清单CSV](../zhaolin-all-image-notes-20261022.csv)：笔记ID、日期、配图数量、说明及显示互动。
- [封面索引01—15](../zhaolin-notes-cover-01.png)、[16—30](../zhaolin-notes-cover-02.png)、[31—43](../zhaolin-notes-cover-03.png)。

素材读取范围为2026-10-22时账号公开可访问的43篇图文、44张配图，不包含已删除、私密或不可访问历史内容。正式展示以作者交付和确认的内容为准。
