# Yomu 已知问题清单

> 本文件汇总全项目审阅中发现的问题，按严重程度排序。
> 标记含义：
> - ✅ **已修复** — 本次 PR 已处理
> - 🔴 **P0** — 阻塞性问题
> - 🟠 **P1** — 高优先级
> - 🟡 **P2** — 次要 / 可改进

---

## ✅ P0-1 卷轴模式未虚拟化，大书卡死

- **状态**：已修复 — 用 `react-virtuoso` 替换了直接 map 渲染
- **位置**：`src/components/reader/ReaderViews.tsx`

---

## ✅ P0-2 warm_cache 对非 JPEG/PNG/WebP/GIF 格式生成损坏缓存

- **状态**：已修复 — `detect_ext` 返回 `Option`；未识别格式走 webp 转码
- **位置**：`src-tauri/src/commands/cache.rs`

---

## ✅ P0-3 cleanup_cache 已注册但前端从未调用，磁盘无限膨胀

- **状态**：已修复 — 启动时自动调用 `cleanup_cache(2GB)`；设置页加手动清理按钮
- **位置**：`src/main.tsx`、`src/routes/settings.library.tsx`

---

## ✅ P0-4 handle_page 每次图片请求都 spawn + join 一个 OS 线程

- **状态**：已修复 — 改成 `std::panic::catch_unwind` 直接调用
- **位置**：`src-tauri/src/protocol/handler.rs`

---

## ✅ P0-5 文件指纹碰撞风险（只 hash 前 64KB + size）

- **状态**：已修复 — 小文件（≤8MB）全量 SHA256；大文件 5 点采样
- **位置**：`src-tauri/src/scanner/hash.rs`

---

## ✅ P1-1 save_progress 更新不存在的书时静默成功

- **状态**：已修复 — 返回 `usize` 受影响行数，命令层检查为 0 时报错
- **位置**：`src-tauri/src/db/books.rs`、`src-tauri/src/commands/books.rs`

---

## ✅ P1-2 toggleSidebar 是死代码

- **状态**：已修复 — TitleBar 加了折叠/展开按钮
- **位置**：`src/components/layout/TitleBar.tsx`

---

## ✅ P1-3 SPINE_CACHE 全局静态无上限、无过期

- **状态**：已修复 — 用手写 LRU（上限 32 条）替换无限 HashMap
- **位置**：`src-tauri/src/protocol/spine.rs`

---

## ✅ P1-4 Cargo.toml 声明 `notify = "7"` 但源码从未使用

- **状态**：已修复 — 从 Cargo.toml 移除
- **位置**：`src-tauri/Cargo.toml`

---

## ✅ P1-5 OPF 用 str::find 做 XML 解析

- **状态**：已修复 — extract_attr 同时支持双引号和单引号；spine.rs 复用 opf.rs 的实现消除重复
- **位置**：`src-tauri/src/scanner/epub/opf.rs`、`src-tauri/src/scanner/epub/spine.rs`

---

## ✅ P1-6 books 表有 last_modified 列但从不写入

- **状态**：已修复 — 扫描时读 `metadata().modified()` 写入 `upsert_book`
- **位置**：`src-tauri/src/scanner/process.rs`、`src-tauri/src/db/books.rs`

---

## ✅ P1-7 useReaderControls 的 isExternalNavRef 有一行 no-op

- **状态**：已修复 — 改成 `scrollTo({ behavior: 'instant' })` 真正打断平滑滚动
- **位置**：`src/components/reader/useReaderControls.ts`

---

## ✅ P1-8 没有 ErrorBoundary / notFoundComponent

- **状态**：已修复 — 根路由加了 `errorComponent` + `notFoundComponent`
- **位置**：`src/routes/__root.tsx`

---

## ✅ P1-9 useReaderControls 在 bookId 切换时 state 不重置

- **状态**：已修复 — useEffect 监听 bookId + initialPage 显式重置
- **位置**：`src/components/reader/useReaderControls.ts`

---

## ✅ P1-10 handleBack 与 unmount cleanup 重复保存进度

- **状态**：已修复 — 移除 handleBack 里的显式 save
- **位置**：`src/components/reader/useReaderControls.ts`

---

## 🟡 P2-1 ReaderPage 的 Book 接口与后端 Rust 结构体不一致

- **位置**：`src/components/reader/types.ts::BookInfo` 与 `src-tauri/src/db/models.rs::Book`
- **建议修复**：在前端定义一个完整 `Book` 类型，所有页面共享。

---

## 🟡 P2-2 LibraryPage 直接内联 Book 接口定义

- **位置**：`src/pages/LibraryPage.tsx`
- **建议修复**：抽到共享类型文件。

---

## 🟡 P2-3 usePreloader 的 preloadedSet 无上限

- **位置**：`src/hooks/usePreloader.ts:25`
- **建议修复**：用 LRU 或定期按 currentPage 窗口裁剪。

---

## 🟡 P2-4 detect_ext / detect_mime 两处实现基本重复

- **位置**：`src-tauri/src/commands/cache.rs`、`src-tauri/src/protocol/extract.rs`
- **建议修复**：抽出到公共模块统一维护。

---

## 🟡 P2-5 main.tsx 的 adjustWindowSize 会产生启动闪烁

- **位置**：`src/main.tsx`
- **建议修复**：初始窗口设为隐藏，调整完再 show()。

---

## ✅ P2-6 protocol 路径缺失鲁棒性验证

- **状态**：已修复 — 入口处做 hex 格式校验，不合法直接 400
- **位置**：`src-tauri/src/protocol/handler.rs`

---

## 🟡 P2-7 ReaderToolbar 与 TitleBar 功能重复

- **位置**：`src/components/reader/ReaderToolbar.tsx`、`src/components/layout/TitleBar.tsx`
- **建议修复**：抽出 `<WindowControls>` 共用。

---

## 🟡 P2-8 阅读器图片数组用 `sr-only` 做预渲染

- **位置**：`src/components/reader/ReaderViews.tsx`
- **建议修复**：改成 `new Image()` 或 `<link rel="preload">`。

---

## 本次 PR 新增功能

- **FEAT-A** `/settings/library` 书库管理 UI（列表 / 添加 / 重扫 / 删除 / 清理缓存）
- **FEAT-B** 系列折叠（scanner 按父文件夹名检测，前端按系列分组展示）
- **FEAT-C** `remove_library` Tauri command（事务原子性）
- **FEAT-D** 启动时自动重扫已保存书库
- **FEAT-E** 搜索页落地（标题模糊匹配）
- **FEAT-F** 书籍详情页落地（封面 / 元数据 / 阅读入口）
- **FEAT-G** 通用设置页（侧边栏折叠 / 阅读默认值持久化）
- **FEAT-H** 显示设置页（缓存上限配置）

---

## 剩余待处理（未修复）

| 编号 | 优先级 | 概要 |
|---|---|---|
| P2-1 ~ P2-5, P2-7, P2-8 | 🟡 | 类型共享、代码重复、启动闪烁等 |
