# Yomu 前后端接口文档

> Tauri Commands —— 前端通过 `invoke("command_name", { ...params })` 调用。
> 所有参数名自动从 camelCase（TS）映射为 snake_case（Rust）。
> 返回值自动从 Rust 的 snake_case 字段映射为 JS 对象。

---

## 书籍 (Books)

### `get_books`

获取所有未被标记为删除的书籍。

| 参数 | 类型 | 说明 |
|---|---|---|
| *(无)* | | |

**返回**：`Book[]`

```ts
interface Book {
  id: number;
  library_id: number | null;
  hash: string;           // SHA256 指纹，用作全局唯一 ID
  title: string;          // 文件名（不含扩展名）
  path: string;           // 文件绝对路径
  file_size: number | null;
  page_count: number | null;
  cover_path: string | null;  // 封面文件名（如 "abc123.webp"）
  format: string;         // "cbz" | "epub" | "mobi"
  read_progress: number;  // 当前阅读页码（0-based）
  is_favorite: boolean;
  added_at: number;       // Unix 时间戳（秒）
  series_name: string | null;  // 系列名（父文件夹名，若匹配则非空）
}
```

---

### `get_book_by_hash`

通过 hash 获取单本书籍。

| 参数 | 类型 | 说明 |
|---|---|---|
| `hash` | `string` | 书籍的 SHA256 指纹 |

**返回**：`Book`（同上）

**错误**：书不存在或已删除时返回字符串错误。

---

### `save_reading_progress`

保存阅读进度。

| 参数 | 类型 | 说明 |
|---|---|---|
| `hash` | `string` | 书籍 hash |
| `pageIndex` | `number` | 0-based 页码 |

**返回**：`void`

**错误**：书不存在或已删除时返回 `"Book not found or removed"`。

---

### `get_libraries`

获取所有已注册的书库。

| 参数 | 类型 | 说明 |
|---|---|---|
| *(无)* | | |

**返回**：`Library[]`

```ts
interface Library {
  id: number;
  path: string;
  name: string | null;    // 目录名
  created_at: number;     // Unix 时间戳
  last_scan: number | null;
}
```

---

## 书库管理 (Libraries)

### `add_library`

添加书库目录并立即扫描。

| 参数 | 类型 | 说明 |
|---|---|---|
| `path` | `string` | 绝对路径 |

**返回**：`Library`（新创建的库记录）

**副作用**：触发完整扫描（发现书籍、提取封面、写入 DB）。

---

### `remove_library`

删除书库及其所有关联书籍记录（事务性操作）。

| 参数 | 类型 | 说明 |
|---|---|---|
| `libraryId` | `number` | 库 ID |

**返回**：`void`

**注意**：不会删除磁盘上的实际文件。

---

### `scan_library`

重新扫描指定书库。

| 参数 | 类型 | 说明 |
|---|---|---|
| `libraryId` | `number` | 库 ID |
| `path` | `string` | 库的绝对路径 |

**返回**：`number`（扫描到的书籍数量）

---

## 缓存 (Cache)

### `warm_cache`

预热指定页面的磁盘缓存。由 `usePreloader` hook 自动调用。

| 参数 | 类型 | 说明 |
|---|---|---|
| `bookHash` | `string` | 书籍 hash |
| `pageIndices` | `number[]` | 要预热的页码列表（0-based） |

**返回**：`void`

---

### `cleanup_cache`

清理磁盘缓存（LRU 策略）。

| 参数 | 类型 | 说明 |
|---|---|---|
| `maxBytes` | `number` | 保留上限（字节）。传 0 清除全部。 |

**返回**：`number`（释放的字节数）

---

## WebDAV 备份 (Backup)

### `test_webdav`

测试 WebDAV 连接。

| 参数 | 类型 | 说明 |
|---|---|---|
| `url` | `string` | WebDAV 服务器地址 |
| `username` | `string` | 用户名 |
| `password` | `string` | 密码 |

**返回**：`string`（成功消息）

---

### `backup_to_webdav`

备份数据库到 WebDAV 服务器。

| 参数 | 类型 | 说明 |
|---|---|---|
| `url` | `string` | WebDAV 服务器地址 |
| `username` | `string` | 用户名 |
| `password` | `string` | 密码 |

**返回**：`string`（如 `"Backup complete (1.2 MB)"`）

**备份内容**：`library.db`（通过 WAL checkpoint 后的完整 SQLite 文件）
**远程路径**：`<url>/yomu-backup/library.db`

---

### `restore_from_webdav`

从 WebDAV 恢复数据库。**会覆盖本地数据库**。

| 参数 | 类型 | 说明 |
|---|---|---|
| `url` | `string` | WebDAV 服务器地址 |
| `username` | `string` | 用户名 |
| `password` | `string` | 密码 |

**返回**：`string`（如 `"Restore complete (1.2 MB)"`）

**恢复流程**：下载 → 验证 SQLite 有效性 → 替换本地 DB → 重新初始化连接。

---

## 调试 (Debug)

### `get_debug_info`

获取完整的应用调试信息。

| 参数 | 类型 | 说明 |
|---|---|---|
| *(无)* | | |

**返回**：`DebugInfo`

```ts
interface DebugInfo {
  version: string;        // 如 "0.1.0"
  build_mode: string;     // "debug" | "release"
  os: string;             // "windows" | "macos" | "linux"
  arch: string;           // "x86_64" | "aarch64"
  db_path: string;
  log_path: string;
  cache_path: string;
  covers_path: string;
  db_size_bytes: number;
  book_count: number;
  library_count: number;
}
```

---

### `get_log_path`

获取日志文件目录路径。

| 参数 | 类型 | 说明 |
|---|---|---|
| *(无)* | | |

**返回**：`string`

---

### `export_logs`

导出 Rust 后端日志为纯文本（最多 512KB）。

| 参数 | 类型 | 说明 |
|---|---|---|
| *(无)* | | |

**返回**：`string`（日志文本内容）

---

## 自定义协议 (Custom Protocol)

图片加载不走 `invoke`，走 Tauri 自定义协议。

### 封面图

```
Windows: http://comic.localhost/cover/{bookHash}
macOS:   comic://localhost/cover/{bookHash}
```

**返回**：`image/webp` 图片字节

### 页面图

```
Windows: http://comic.localhost/page/{bookHash}/{pageIndex}
macOS:   comic://localhost/page/{bookHash}/{pageIndex}
```

**返回**：图片字节（JPEG/PNG/WebP/GIF，按原始格式或转码后的格式）

**缓存行为**：
1. 先查磁盘缓存 `appData/cache/{bookHash}/page_{index}.{ext}`
2. 缓存未命中 → 从归档文件提取 → 非浏览器原生格式转码为 WebP → 写入缓存 → 返回

---

## 前端工具

### `src/lib/comic-url.ts`

```ts
getPageUrl(bookHash: string, pageIndex: number): string
getCoverUrl(bookHash: string): string
```

### `src/lib/logger.ts`

```ts
logger.debug(msg: string, data?: unknown): void
logger.info(msg: string, data?: unknown): void
logger.warn(msg: string, data?: unknown): void
logger.error(msg: string, data?: unknown): void
logger.getEntries(): readonly LogEntry[]
logger.subscribe(fn: () => void): () => void
logger.exportText(): string
```

---

## 数据存储位置

| 数据 | 路径 | 说明 |
|---|---|---|
| SQLite 数据库 | `{appData}/library.db` | 所有元数据和阅读进度 |
| 封面图 | `{appData}/covers/{hash}.webp` | 每本书一张 WebP 缩略图 |
| 页面缓存 | `{appData}/cache/{hash}/page_{n}.{ext}` | 解码后的页面图片 |
| 日志文件 | `{appLog}/yomu.log` | Rust 后端日志，2MB 轮转 |
| 前端设置 | `localStorage["yomu-settings"]` | Zustand persist 存储 |

`{appData}` 在 Windows 上通常为 `%APPDATA%/com.yomu.app/`。
