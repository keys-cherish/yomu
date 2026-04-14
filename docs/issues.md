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

## ✅ P2-1 ReaderPage 的 Book 接口与后端 Rust 结构体不一致

- **状态**：已修复 — 创建 `src/lib/types.ts` 统一 Book/Library 类型
- **位置**：`src/lib/types.ts`

---

## ✅ P2-2 LibraryPage 直接内联 Book 接口定义

- **状态**：已修复 — 所有页面改用 `import type { Book } from "@/lib/types"`
- **位置**：`src/pages/LibraryPage.tsx`、`BookDetailPage.tsx`、`SearchPage.tsx`

---

## 🟡 P2-3 usePreloader 的 preloadedSet 无上限

- **位置**：`src/hooks/usePreloader.ts:25`
- **建议修复**：用 LRU 或定期按 currentPage 窗口裁剪。

---

## 🟡 P2-4 detect_ext / detect_mime 两处实现基本重复

- **位置**：`src-tauri/src/commands/cache.rs`、`src-tauri/src/protocol/extract.rs`
- **建议修复**：抽出到公共模块统一维护。

---

## ✅ P2-5 main.tsx 的 adjustWindowSize 会产生启动闪烁

- **状态**：已修复 — `tauri.conf.json` 设 `visible: false`，调整完尺寸后调 `win.show()`
- **位置**：`src-tauri/tauri.conf.json`、`src/main.tsx`

---

## ✅ P2-6 protocol 路径缺失鲁棒性验证

- **状态**：已修复 — 入口处做 hex 格式校验，不合法直接 400
- **位置**：`src-tauri/src/protocol/handler.rs`

---

## ✅ P2-7 ReaderToolbar 与 TitleBar 功能重复

- **状态**：已修复 — 抽出 `<WindowControls>` 组件，两处共用
- **位置**：`src/components/layout/WindowControls.tsx`

---

## 🟡 P2-8 阅读器图片数组用 `sr-only` 做预渲染

- **位置**：`src/components/reader/ReaderViews.tsx`
- **建议修复**：改成 `new Image()` 或 `<link rel="preload">`。

---

## ✅ P1-11 浅色主题下侧边栏背景仍为黑色

- **状态**：已修复 — `bg-[#0b0b0b]` 改为主题变量 `bg-bg-surface-2`
- **位置**：`src/components/layout/Sidebar.tsx`

---

## ✅ P1-12 浅色主题下顶部标题栏背景仍为黑色

- **状态**：已修复 — `bg-[#0a0a0a]/92` 改为主题变量 `bg-bg-surface/92`
- **位置**：`src/components/layout/TitleBar.tsx`

---

## ✅ P1-13 全屏模式左侧存在缝隙

- **状态**：已修复 — 从手动计算位置+大小改为原生 `setFullscreen` API
- **位置**：`src/components/reader/useReaderControls.ts`

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

- **FEAT-I** 图像增强阅读选项（锐化/色彩增强/文字增强，CSS filter 实现）

---

## 剩余待处理（未修复）

| 编号 | 优先级 | 概要 |
|---|---|---|
| P2-3, P2-4, P2-8 | 🟡 | preloadedSet 无上限、detect_ext 重复、sr-only 预渲染 |

---

## 计划中功能

| 功能 | 说明 | 状态 |
|---|---|---|
| 文件夹导入模式 | 导入父文件夹自动识别子文件夹中的漫画并归纳为系列 | 待开发 |
| 漫画加载优化 | 图片列表缓存、内存 LRU、自动磁盘清理策略 | 方案设计中 |
| 仿真翻页动画 | 模拟真实书页翻转效果 + 进度位置优化 | 待开发 |
| 首页动态背景 | 书库封面+主色渐变背景（低透明度） | 待开发 |
| Everything 搜索集成 | 接入 Everything SDK 搜索本地漫画文件 | 待开发 |
| 收藏文件夹 | 监控指定文件夹，自动导入新增漫画 | 待开发 |
| github action cd集成 发布release|
|白边裁剪 | 修剪图像边缘的空白区域，以便于图片更易阅读。|
|自动载入下一个文件（如果存在） 默认开启|
|自定义阅读器背景颜色,通过调色盘或吸管获取颜色|

### 发现bug
1. 加载漫画速度过慢
2. webdav ui样式不一致
3. 锐化,色彩增强,文字增强全部不生效
4. uiux页面统一,删除不必要的卡片圆角