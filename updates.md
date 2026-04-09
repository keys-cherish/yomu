# Yomu 更新日志

## 本次更新 (feat/library-management-and-series)

> 基于 `master` (e6608c8) 的完整审阅、bug 修复、功能补全与 WebDAV 备份。

---

### Bug 修复

#### P0（阻塞级）

| 编号 | 问题 | 修复方式 | 文件 |
|---|---|---|---|
| P0-1 | 卷轴模式不虚拟化，100+ 页卡死 | 用 `react-virtuoso` 替换直接 `.map()` 渲染 | `src/components/reader/ReaderViews.tsx` |
| P0-2 | `warm_cache` 把 BMP/TIFF 误标为 `.webp`，缓存损坏 | `detect_ext` 返回 `Option`；未识别格式走 webp 转码 | `src-tauri/src/commands/cache.rs` |
| P0-3 | `cleanup_cache` 注册但前端从未调用，磁盘无限膨胀 | 启动时自动调用 `cleanup_cache(2GB)`；设置页加手动清理 | `src/main.tsx`、`src/routes/settings.library.tsx`、`src/routes/settings.display.tsx` |
| P0-4 | `handle_page` 每个请求 `spawn+join` 一个 OS 线程 | 改成 `std::panic::catch_unwind` 直接调用 | `src-tauri/src/protocol/handler.rs` |
| P0-5 | 文件 hash 只取前 64KB + size，碰撞致静默数据丢失 | ≤8MB 全量 SHA256；>8MB 五点采样 | `src-tauri/src/scanner/hash.rs` |

#### P1（高优先级）

| 编号 | 问题 | 修复方式 | 文件 |
|---|---|---|---|
| P1-1 | `save_progress` 更新 0 行仍返回 Ok | 返回 `usize`，命令层检查并报错 | `src-tauri/src/db/books.rs`、`src-tauri/src/commands/books.rs` |
| P1-2 | `toggleSidebar` 有 state 但无 UI 调用 | TitleBar 加折叠/展开按钮 | `src/components/layout/TitleBar.tsx` |
| P1-4 | `notify = "7"` 依赖声明但未使用 | 从 `Cargo.toml` 移除 | `src-tauri/Cargo.toml` |
| P1-6 | `last_modified` 列存在但从不写入 | 扫描时读 `metadata().modified()` 传入 `upsert_book` | `src-tauri/src/scanner/process.rs`、`src-tauri/src/scanner/types.rs`、`src-tauri/src/db/books.rs`、`src-tauri/src/commands/libraries.rs` |
| P1-7 | `scrollTop = scrollTop` 是 no-op | 改成 `scrollTo({ behavior: 'instant' })` 真正打断滚动 | `src/components/reader/useReaderControls.ts` |
| P1-8 | 无 ErrorBoundary / 404 页面 | 根路由加 `errorComponent` + `notFoundComponent` | `src/routes/__root.tsx` |
| P1-9 | bookId 切换时 `currentPage` state 不重置 | useEffect 监听 bookId + initialPage 显式重置 | `src/components/reader/useReaderControls.ts` |
| P1-10 | `handleBack` 与 unmount cleanup 重复保存进度 | 移除 `handleBack` 里的显式 save | `src/components/reader/useReaderControls.ts` |

---

### 新功能

#### 书库管理

- **`/settings/library` 页面落地**：列出所有已添加的书库目录（路径、名称、上次扫描时间），支持添加新目录、重新扫描、移除书库、手动清理缓存。
- **`remove_library` Tauri command**：事务原子性删除库及其关联书籍记录。
- **启动时自动重扫**：应用启动后台扫描所有已保存书库，发现新增/删除的漫画文件并更新数据库。

> 涉及文件：`src/routes/settings.library.tsx`、`src-tauri/src/commands/libraries.rs`、`src-tauri/src/db/libraries.rs`、`src-tauri/src/runtime.rs`

#### 系列折叠

- **后端**：`scanner/process.rs` 新增 `assign_series_names()`，扫描完成后按父目录分组，文件名以目录名为前缀且同组 ≥2 本时设置 `series_name`。
- **数据库**：`books` 表新增 `series_name TEXT` 列（含自动迁移）。
- **前端**：`LibraryPage` 按 `series_name` 折叠展示，一个系列显示为一张代表卡片（带「N 卷」徽标），点击展开显示全部卷。

> 涉及文件：`src-tauri/src/scanner/process.rs`、`src-tauri/src/scanner/types.rs`、`src-tauri/src/db/schema.rs`、`src-tauri/src/db/models.rs`、`src-tauri/src/db/books.rs`、`src-tauri/src/db/mod.rs`、`src/pages/LibraryPage.tsx`

#### 搜索页落地

- 从占位页变为可用的标题模糊搜索：加载全部书籍后前端过滤，实时显示匹配结果的封面网格。

> 涉及文件：`src/pages/SearchPage.tsx`

#### 书籍详情页落地

- 从只显示 hash 变为完整的信息页：封面大图、标题、系列名、格式、页数、进度、文件大小、入库时间、文件路径、「继续阅读」按钮。
- 书架页点击封面现在进入详情页（而非直接进 reader），详情页内再有阅读入口。

> 涉及文件：`src/pages/BookDetailPage.tsx`、`src/pages/LibraryPage.tsx`

#### 通用设置页落地

- 可配置：默认阅读模式（单页/双页/卷轴）、默认翻页方向（LTR/RTL）、默认适配模式（适高/适宽/适应）、侧边栏展开/折叠状态。所有修改实时生效并通过 Zustand persist 持久化。

> 涉及文件：`src/routes/settings.general.tsx`

#### 显示与性能设置页落地

- 缓存管理：「清理至 2GB 以内」和「清除全部缓存」两个操作按钮，实时显示清理结果。
- 主题 / 动画节奏为后续预留（说明当前已支持 `prefers-reduced-motion`）。

> 涉及文件：`src/routes/settings.display.tsx`

---

### 前端类型补全

| 文件 | 变更 |
|---|---|
| `src/components/reader/types.ts` | `BookInfo` 新增 `series_name` 字段 |
| `src/pages/LibraryPage.tsx` | `Book` 接口新增 `series_name` 字段 |

---

### 文档

| 文件 | 内容 |
|---|---|
| `README.md` | 功能亮点新增；「已实现」补齐；「计划中」更新 |
| `issues.md` | 全量问题清单，已修复项标 ✅ |
| `updates.md` | 本文件 |

---

### WebDAV 备份

- **后端**：新增 `src-tauri/src/backup/` 模块，基于 `reqwest` 实现 WebDAV PUT/GET/MKCOL 客户端
- **Tauri commands**：`test_webdav`（测试连接）、`backup_to_webdav`（备份 DB）、`restore_from_webdav`（恢复 DB）
- **备份流程**：WAL checkpoint → 复制 DB 到临时文件 → PUT 上传到 `<webdav>/yomu-backup/library.db` → 清理临时文件
- **恢复流程**：GET 下载 → 验证 SQLite 有效性 → 替换本地 DB → 重新初始化连接
- **前端**：`/settings/backup` 页面，配置 WebDAV URL/用户名/密码（持久化到 Zustand），支持测试连接/备份/恢复三个操作
- **备份内容**：仅 `library.db`（所有书籍记录、阅读进度、书库路径）— 封面和缓存可从源文件重新生成

---

### 额外修复（本次新增）

| 编号 | 问题 | 修复 | 文件 |
|---|---|---|---|
| P1-3 | SPINE_CACHE 无上限 | 手写 LRU（32 条上限） | `src-tauri/src/protocol/spine.rs` |
| P1-5 | OPF 解析不支持单引号 | `extract_attr` 双引号+单引号；spine.rs 复用 opf.rs | `scanner/epub/opf.rs`、`scanner/epub/spine.rs` |
| P2-6 | protocol 不校验 hash 格式 | 入口处 hex 格式校验 | `src-tauri/src/protocol/handler.rs` |

---

### 改动文件完整列表

```
README.md
issues.md
updates.md
src-tauri/Cargo.toml
src-tauri/Cargo.lock
src-tauri/src/backup/mod.rs (新增)
src-tauri/src/backup/webdav.rs (新增)
src-tauri/src/commands/backup.rs (新增)
src-tauri/src/commands/mod.rs
src-tauri/src/commands/books.rs
src-tauri/src/commands/cache.rs
src-tauri/src/commands/libraries.rs
src-tauri/src/db/books.rs
src-tauri/src/db/libraries.rs
src-tauri/src/db/mod.rs
src-tauri/src/db/models.rs
src-tauri/src/db/schema.rs
src-tauri/src/lib.rs
src-tauri/src/protocol/handler.rs
src-tauri/src/protocol/spine.rs
src-tauri/src/runtime.rs
src-tauri/src/scanner/hash.rs
src-tauri/src/scanner/mod.rs
src-tauri/src/scanner/process.rs
src-tauri/src/scanner/types.rs
src-tauri/src/scanner/epub/opf.rs
src-tauri/src/scanner/epub/spine.rs
src/components/layout/TitleBar.tsx
src/components/reader/ReaderViews.tsx
src/components/reader/types.ts
src/components/reader/useReaderControls.ts
src/main.tsx
src/pages/BookDetailPage.tsx
src/pages/LibraryPage.tsx
src/pages/SearchPage.tsx
src/routeTree.gen.ts
src/routes/__root.tsx
src/routes/settings.backup.tsx (新增)
src/routes/settings.display.tsx
src/routes/settings.general.tsx
src/routes/settings.library.tsx
src/routes/settings.tsx
src/stores/settings.ts
```
