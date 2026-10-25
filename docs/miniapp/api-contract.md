# 本地作品馆接口与运行边界

本文对应保留的 `server/`、`admin/` 与 `shared/` 实现，服务包版本为 `0.1.0-local`。当前 `1.0.0` 静态小程序不调用这些接口，后台保存不会更新小程序包；当前发布方式见 [README](../../README.md)。以下为代码合同，不代表本次已运行服务或通过微信、公网验收。

## 运行入口与存储

- 根 `npm start` 执行 `server/src/index.ts`，默认监听 `127.0.0.1:8788`。`PORT` 只接受 1–65535 的十进制整数；`DATA_DIR` 相对项目根目录解析，也可给绝对路径，默认 `data`。没有远程监听配置。
- `npm run build:admin` 生成 `admin/dist`，服务从这里提供后台静态文件；根 `npm run build` 只构建小程序。`npm run dev:admin` 的 Vite 固定监听 `127.0.0.1:5173`，`/api`、`/media` 固定代理到 `http://127.0.0.1:8788`；单独改变服务 `PORT` 不会同步代理。
- `createApplication({ dataDir, adminDir?, sourceIndexPath?, allowedOrigins? })` 是程序化入口。额外允许来源仅支持精确的回环 HTTP origin，没有命令行或环境变量入口。程序化实例可监听随机本机端口，用于隔离验证。
- 数据目录保存 `gallery.sqlite` 和 `images/<图片UUID>/`。SQLite 使用 WAL、外键、5 秒 busy timeout；作品及关联更新用事务。数据库含维护者、会话、图片元数据、系列、作品及其图像/系列关联、创作记录、来源映射。没有数据库迁移版本、备份恢复命令或文件回收任务。
- 上传目录含 `original.jpg|png|webp`、`preview.webp`、`thumb.webp`；原图字节保留但无下载路由。返回的宽高是旋转、缩放后的欣赏图尺寸，不是原图尺寸；没有单独保存原文件名、EXIF、原图尺寸或作者交付证明字段。初始 `alt` 使用清洗后的文件名，后续可编辑。
- 全新库的作品、系列、图片及维护者为空。每次创建应用都读取 [source-index.json](../../server/source-index.json)，要求恰好 43 条、ID 唯一，按 ID 只插入缺失来源，已有行不会被索引覆写或清理。新来源默认待确认原因“待作者确认作品归属与正式素材”；不会导入笔记图、原型截图或小程序的 30 个静态图像条目。

## HTTP、认证与错误

JSON 成功响应为 `{ "data": ... }`；退出登录和 OPTIONS 成功为 204 无正文；媒体和后台文件直接返回文件。JSON 路由不支持 HEAD，文件路由支持 GET/HEAD。没有分页、筛选参数、PATCH、删除内容、幂等键或编辑版本号。未实现的方法/路径通常返回 404；管理路径会先校验会话及必要的 CSRF。

JSON 写入要求 `Content-Type: application/json`（允许附加参数），正文上限 256 KiB；既检查声明长度，也累计实际读取字节。对象类型和字段不符为 422，JSON 语法错误为 400。未知额外字段没有统一拒绝机制，按各输入函数读取已定义字段；额外 `source` 等字段不会因此成为受支持合同。

错误格式为 `{ "error": { "code": "...", "message": "...", "fields": { "字段": "说明" } } }`，`fields` 可省略。校验通常返回首个字段错误，不回显密码、令牌或内部堆栈。

| HTTP | 实现中的 code 与条件 |
| --- | --- |
| 400 | `INVALID_JSON`、`INVALID_URL` |
| 401 | `INVALID_CREDENTIALS` 登录失败；`UNAUTHORIZED` 缺少有效维护会话 |
| 403 | `FORBIDDEN_HOST`、`FORBIDDEN_ORIGIN`、`INVALID_CSRF` |
| 404 | `NOT_FOUND` 路由、实体或文件不存在 |
| 413 | `BODY_TOO_LARGE` JSON 或上传字节超限 |
| 422 | `VALIDATION_ERROR` 字段、引用或图片内容不满足约束 |
| 429 | `AUTH_RATE_LIMIT` 登录受限，带 `Retry-After` 秒数；`UPLOAD_BUSY` 已有两个上传处理中 |
| 500 | `INTERNAL_ERROR` 未处理内部错误；`INVALID_STORAGE` 图片目录无效 |

请求限制还包括 16 KiB 请求头、10 秒 headers timeout、30 秒 request timeout、5 秒 keep-alive 和每 socket 最多 1000 个请求。HTTP 解析器层面的拒绝不保证使用上述 JSON 错误格式。

### 维护者与会话

- `npm run create:maintainer` 是本机交互命令，要求 stdin/stdout 均为 TTY，交互输入并再次确认密码，不接受账号密码参数或管道。用户名为 3–64 位 ASCII 字母、数字、点、下划线或短横线，密码 12–256 字符；同名账号报错，不会重置密码。该脚本固定写项目根 `data/`，**不读取 `DATA_DIR`**，不能用于隔离临时库初始化。
- 密码用随机盐和 scrypt 派生值保存；所有维护者权限相同，系统没有“两人”数量上限，也没有角色、注册、重置密码或注销接口。
- 登录体为 `{ "username": "...", "password": "..." }`。登录接口限制用户名最多 64、密码最多 256 字符；按 socket 来源地址累计 15 分钟窗口内尝试，累计到 10 次后再请求返回 429，成功清零，计数仅在进程内保存。没有按用户名的独立限流。
- 登录成功返回 `SessionInfo` 并设置 `gallery_session` Cookie：`HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`，本机 HTTP 不设置 Secure。服务端只存会话 token 的 SHA-256 摘要，CSRF 值另存数据库。会话固定 8 小时，不随读取续期；重新登录撤销当前有效 Cookie 对应会话，不撤销此用户其他会话。
- `GET /api/session` 始终可读，未登录返回 `{ "user": null, "csrfToken": null }`，并非 `data: null`。登录后为 `{ "user": { "username": "..." }, "csrfToken": "..." }`。
- `/api/admin/` 路径全部要求会话，管理非 GET/HEAD 请求及退出还须 `X-CSRF-Token`。登录不要求 CSRF。退出删除当前会话并清空 Cookie，失效会话退出返回 401。

### 本机访问边界

服务同时检查 socket 为回环地址、Host 为 `127.0.0.1` / `localhost` / `[::1]`，以及存在时的 Origin。默认允许 `http://127.0.0.1:8788`、`http://127.0.0.1:5173` 和实例实际绑定端口的 `http://127.0.0.1:<port>`；额外来源须显式传入程序化参数。无 Origin 的本机请求可通过，浏览器带 Origin 时不能任意替换为 localhost。

允许来源会得到精确回显的 CORS origin、credentials 与 `Vary: Origin`；OPTIONS 在来源检查后直接返回 204，声明 GET/POST/PUT/DELETE/OPTIONS 及 Content-Type、X-CSRF-Token、X-File-Name，缓存 600 秒。后台请求使用相对路径和 `credentials: same-origin`，开发时靠 Vite 代理。

默认 API/错误响应 `Cache-Control: no-store`；后台文件 `no-cache`；UUID 媒体文件缓存一年且 immutable。服务设置 CSP、nosniff、禁止 iframe 等响应头；静态文件限制在 `adminDir` 实际路径内，媒体只开放指定的两个衍生图文件。不开放项目根目录、数据库、私有配置或原图。以上是本机方案，不能只改监听地址就视作公网部署就绪。

## 路由与响应

表中响应内容均指 JSON 包装的 `data`，文件和 204 除外。

| 方法与路径 | 请求 / 响应 | 权限 |
| --- | --- | --- |
| GET `/api/health` | `{ status: "ok" }` | 本机公开 |
| GET `/api/catalog` | `{ works: Work[], series: GallerySeries[] }`，无图片总库和来源表 | 本机公开 |
| GET `/api/works/:id` | `Work` | 本机公开 |
| GET `/api/series/:id` | `{ series: GallerySeries, works: Work[] }`，按系列归属筛选 | 本机公开 |
| GET `/api/session` | `SessionInfo` | 本机公开 |
| POST `/api/session` | 账号密码 → `SessionInfo`，200 | 本机公开 |
| DELETE `/api/session` | 无请求体 → 204 | 会话 + CSRF |
| GET `/api/admin/catalog` | `{ works, series, images: GalleryImage[], sources: SourceNote[] }` | 会话 |
| POST `/api/admin/images` | 原始图像字节 → `GalleryImage`，201；不是 multipart | 会话 + CSRF |
| PUT `/api/admin/images/:id` | `{ alt, view }` → `GalleryImage`，200 | 会话 + CSRF |
| POST `/api/admin/works` | `WorkInput` → `Work`，201 | 会话 + CSRF |
| PUT `/api/admin/works/:id` | 完整 `WorkInput` → `Work`，200 | 会话 + CSRF |
| POST `/api/admin/series` | `SeriesInput` → `GallerySeries`，201 | 会话 + CSRF |
| PUT `/api/admin/series/:id` | 完整 `SeriesInput` → `GallerySeries`，200 | 会话 + CSRF |
| PUT `/api/admin/sources/:id` | `{ workId, recordId, reason }` → `SourceNote`，200 | 会话 + CSRF |
| GET/HEAD `/media/:id/preview.webp` | 欣赏图文件 | 本机公开 |
| GET/HEAD `/media/:id/thumb.webp` | 缩略图文件 | 本机公开 |
| GET/HEAD `/`、后台文件路径 | `admin/dist/index.html` 或实际存在的静态文件；没有 SPA 路由兜底 | 本机公开 |

作品、系列、图片 ID 由服务器生成 UUID，PUT 不变更 ID；记录 ID 由客户端提供，后台用 `crypto.randomUUID()`。API 路径 ID 接受字母数字、下划线和短横线；媒体路径要求 UUID 形状。不存在的实体不由 PUT 自动创建。

## 内容字段与约束

字段类型见 [shared/types.ts](../../shared/types.ts)，实际校验见 [validation.ts](../../server/src/validation.ts) 与 [gallery.ts](../../server/src/gallery.ts)。文字会 trim，限制按 JavaScript 字符串长度计算，并拒绝部分控制字符。除明确说明可省略的字段，完整表示需提交各字段；可空文字使用 `""`，不是 null。

### 作品与记录

| `WorkInput` 字段 | 约束 |
| --- | --- |
| `title`、`description` | 必填非空，最多 120 / 4000 字符 |
| `status` | 只能 `创作中` / `已完成`；后台模型无 `未确认`、草稿或公开状态 |
| `year`、`material`、`dimensions` | 可省略并默认空串，最多 100 / 400 / 200；年份是文字，无年份格式验证 |
| `featured`、`sort` | 必须布尔值 / 非负安全整数 |
| `seriesIds`、`imageIds`、`sourceRefs` | 各最多 1000 个非空、去重 ID，每个最多 100 字符；图片、系列和来源须已存在 |
| `coverImageId`、`overallImageId` | 必填且都在本作品 `imageIds` 中；整体展示图的图片 `view` 必须为 `整体`，封面无此要求 |
| `records` | 最多 1000 条，按数组顺序保存；可为空 |

读取 `Work` 增加 `id`，将 `imageIds` 展开为按关联顺序的 `images: GalleryImage[]`，其他字段保留。**公开目录、公开作品和系列响应中的每件作品 `sourceRefs` 均为空数组**；仅管理目录及作品保存响应带真实来源 ID。公开读取没有按创作状态过滤，`创作中` 和 `已完成` 都可读；`featured` 是标记，不令目录自动只返回精选。

每条 `CreationRecord` 为 `{ id, stage, view, caption, date, imageId }`：一条记录仅关联一张图片，不是多图记录。`id` 在同一作品内唯一，1–100 位字母数字/下划线/短横线；`stage` 仅线稿/设色/完成效果，`view` 仅整体/局部，说明最多 4000 字符，`date` 为空或真实的 `YYYY-MM-DD`，`imageId` 必须属于本作品。记录视角和图片视角分别保存，代码没有强制二者相等；维护者需核对。日期不是笔记发布日期。

作品、系列列表按 `sort,id` 排序，记录、作品图像与系列归属按输入数组位置保存。作品 PUT 事务替换这些关联；没有乐观锁，后保存者可能覆盖先保存者的编辑。没有独立记录增删接口；完整 PUT 可移除记录，但仍由保留来源引用的记录不可直接移除。

### 图片与系列

`GalleryImage` 为 `{ id, alt, view, width, height, url, thumbUrl }`。图片 PUT 只读 `alt`（可空，最多 400 字符）和整体/局部 `view`；后台表单另要求说明非空。被作品用作整体图时，不能将其改为局部。图片本体不能替换；重新上传会产生新 ID，无去重接口。

上传要求 JPEG/PNG/WebP Content-Type 及 `X-File-Name: encodeURIComponent(文件名)`，清洗路径与控制字符后文件名须非空且不超过 400 字符。上限 12 MiB、4000 万像素、单帧静态图；核对签名和声明类型，再由 sharp 解码。按方向旋转，最长边 2400px 欣赏图、480px 缩略图，输出 WebP，不裁切、不放大小图。每应用同时最多处理两个上传，失败会清理该请求新建的 UUID 目录。

`SeriesInput` 为 `{ name, description, coverImageId, sort }`：名称必填最多 120 字符，说明可空最多 4000，封面可空否则必须为已上传图片，排序为非负安全整数。读取增加 `id`。系列封面不强制来自该系列某件作品。系列没有 `workIds` 字段；归属在作品 `seriesIds` 中维护，同一作品可属于多个系列。

### 来源映射

`SourceNote` 仅有 `{ id, index, publishedAt, summary, workId, recordId, reason }`。`id/index/publishedAt/summary` 来自仓库索引，`summary` 是整理标签；没有 source URL、作者原文、封面路径、抓取时间或认证状态字段，也没有新增来源 API。43 条来源索引不等于 43 件作品，也不等于静态版 30 张封面。

来源 PUT 只维护 `workId/recordId/reason`：未归属用 `workId: null, recordId: null`，且原因必填；有作品时记录可 null，否则必须属于所选作品。`reason` 始终为字符串，最多 4000 字符。不能用空串或省略 ID 代替 null。

作品页 `sourceRefs` 是从来源表推导的关联列表：勾选未归属来源会关联本作品并清空原待确认原因；不能抢占已属于其他作品的来源，转移须到来源页。继续选中的来源会保留原记录引用及核对说明；若记录被删除则拒绝保存。取消勾选会清空来源的作品/记录并恢复统一待确认原因，因此同次 PUT 也能移除已取消来源所引用的记录。来源页直接取消归属则须明确填写原因。

## 后台表单与状态行为

- 启动先恢复会话，已登录再读管理目录；登录成功、保存后和手动“刷新共享目录”触发读取。没有返回页面自动刷新、轮询或实时推送。
- 四个栏目用隐藏方式保留挂载，切换栏目不丢未保存编辑。作品/系列的脏表单不被目录刷新覆盖，切换编辑对象或重新载入需确认；干净表单可跟随刷新。来源/图片各自保留正在编辑的局部输入。
- 新作品状态为空，必须人为选择；新记录阶段和视角为空，必须选择。上传图片默认视角为整体，需要核对。后台可取消本次新增记录，但不提供移除已保存记录的按钮，尽管完整作品 API 允许满足引用约束的移除。
- 请求失败不自动重试。写入成功但刷新失败时保留已保存 ID 和成功结果，目录可能仍是旧快照；先重试读取核对，不能重复创建。字段错误或普通网络错误保留输入。
- 管理读取 401 或写入 401/403 显示重新登录并保留页面内存中的编辑；重新登录不会自动重发失败写入。确认退出并成功后清空目录和表单。刷新/关闭页面丢失未保存输入，没有 localStorage 表单副本；会话凭证由 HttpOnly Cookie 管理，CSRF 只放页面状态。登录表单允许浏览器密码管理器填充，不能承诺浏览器从不记住密码。

## 重新接入与隔离验证

若恢复共享内容版本，需要设计接收者可访问的服务部署、HTTPS/域名、认证 Cookie/Origin 边界、数据及图片备份，并重新实现小程序 API 客户端、生命周期刷新、错误/空态、远程图片与分享冷启动；当前代码没有接入开关。静态条目和后台 UUID、单图记录及状态枚举也需确认映射。不能由本机接口通过推定微信备案、类目、隐私或真机分享验收完成。

运行证据集中记录在[测试报告](test-report.md)。隔离验证参考 [现有 body 限制测试](../../server/test/body-limits.test.mjs)：`mkdtemp` 建系统临时目录，调用 `createMaintainer(tempDir, ...)` 建随机测试账号，`createApplication({ dataDir: tempDir })` 后监听 `127.0.0.1:0`，在 finally 关闭应用并只删除自建临时目录。不要调用固定写真实 `data/` 的账号脚本，也不要读取真实库验证文档。

建议隔离冒烟覆盖空库与 43 条待确认来源、登录/CSRF/退出、真实生成的测试图上传及衍生图、作品与系列全量保存/稳定 ID/排序、来源转移和记录引用、非法内容不落库、公共响应不含来源映射、原图及越界路径不可访问、带长度和分块传输超限返回。表单保留行为需另外在隔离服务的后台页面验证；旧测试报告不能代替此次实际结果。
