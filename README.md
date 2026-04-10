# Yomu

> 本地优先的桌面漫画/电子书阅读器（Tauri v2 + React + Rust）

Yomu 是一个面向个人书库管理与沉浸式阅读的桌面应用。它支持扫描本地目录、建立索引、生成封面，并提供多种阅读模式与阅读进度续读能力。

**当前状态：Preview / 开发中（v0.1.0）**

---

## 功能亮点

- 本地书库扫描与索引（SQLite）
- 书架展示与快速进入阅读
- 多阅读模式：单页 / 双页 / 卷轴（虚拟化渲染）
- 多阅读方向：左到右 / 右到左
- 多适配策略：适高 / 适宽 / 适应
- 阅读进度保存与续读
- 自定义资源协议按页加载（封面/页图）
- 书库管理（添加 / 重扫 / 删除 / 启动时自动重扫）
- 系列折叠（同目录下同名前缀漫画自动归组）
- 标题搜索
- 书籍详情页（封面 / 元数据 / 继续阅读入口）
- 设置页功能落地（阅读默认值 / 缓存管理 / 侧边栏折叠）
- WebDAV 备份与恢复（坚果云 / Nextcloud / 自建 NAS）
- 全局错误边界与 404 页面

---

## 支持格式

- `cbz` / `zip`（ZIP 压缩漫画）
- `cbr` / `rar`（RAR 压缩漫画）
- `cb7` / `7z`（7-Zip 压缩漫画）
- `epub`
- `mobi`

---

## 截图

> 下列路径为截图占位，发布前可替换为真实截图。

- `docs/screenshots/library.png`（书架页）
- `docs/screenshots/reader-single.png`（单页模式）
- `docs/screenshots/reader-scroll.png`（卷轴模式）
- `docs/screenshots/settings.png`（设置页）

---

## 安装

目前建议使用源码运行。

### 方式一：从 Releases 安装（待发布）

当发布桌面安装包后，可直接下载对应平台产物安装。

### 方式二：源码运行

#### 1) 环境准备

- Node.js（建议 LTS）
- pnpm（项目使用 `pnpm@10.32.1`）
- Rust（建议 stable，满足 `1.77.2+`）
- Tauri v2 所需系统依赖

#### 2) 安装依赖

```bash
pnpm install
```

#### 3) 启动开发环境

```bash
pnpm tauri dev
```

---

## 使用说明

### 1. 导入书库

进入书架页后，点击“添加书库”，选择本地漫画/电子书目录。

### 2. 浏览与打开

导入完成后会显示封面列表，点击任意书籍进入阅读器。

### 3. 阅读控制

在阅读器中可切换：

- 阅读模式：单页 / 双页 / 卷轴
- 阅读方向：LTR / RTL
- 适配模式：适高 / 适宽 / 适应

阅读进度会写回本地数据库，用于后续继续阅读。

---

## 项目结构

```text
.
├─ src/                     # 前端（React + TypeScript）
│  ├─ components/           # UI 与阅读器组件
│  ├─ pages/                # 页面组件
│  ├─ routes/               # TanStack 文件路由
│  ├─ stores/               # Zustand 状态管理
│  └─ lib/                  # 工具函数（含协议 URL 构造）
├─ src-tauri/               # Rust / Tauri 后端
│  ├─ src/commands/         # Tauri command
│  ├─ src/db/               # SQLite 模型与查询
│  ├─ src/scanner/          # 扫描与封面提取
│  ├─ src/protocol/         # comic 协议处理
│  └─ tauri.conf.json       # 应用配置
├─ package.json
└─ pnpm-lock.yaml
```

---

## 开发命令

```bash
pnpm dev          # 启动前端开发服务（Vite）
pnpm tauri dev    # 启动桌面开发模式（推荐）
pnpm build        # 构建前端
pnpm tauri build  # 构建桌面应用安装产物
```

---

## 技术栈

### 前端

- React 19
- TypeScript
- Vite
- TanStack Router
- Zustand
- Tailwind CSS v4

### 后端 / 桌面

- Tauri v2
- Rust 2021
- SQLite（rusqlite）
- tokio
- zip / image / webp

---

## 已实现 / 计划中

### 已实现

- 本地目录扫描与入库
- 书架展示与阅读入口
- 核心阅读交互
- 阅读进度保存
- 标题搜索能力
- 书籍详情数据完善
- 设置页功能落地（通用 / 书库管理 / 显示与缓存）
- 系列折叠（同名漫画按文件夹自动归组）
- 书库管理（添加 / 重扫 / 删除）
- 全局错误边界与 404

### 计划中

- 全文搜索（FTS）与标签过滤
- 更完整的自动化测试
- 文件系统监听（新增文件自动入库）
- 多主题支持

---

## 常见问题（FAQ）

### 为什么使用 `pnpm tauri dev` 启动？

该命令会统一协调前端开发服务与桌面容器，适合本项目双端联调。

### 导入后看不到书籍怎么办？

请确认目录中包含受支持格式（cbz/zip/epub/mobi），并检查控制台是否有扫描失败日志。

### 阅读页图片加载失败怎么办？

通常与源文件路径变化、书籍记录失效或缓存异常有关。可重新扫描书库后再试。

---

## 贡献

欢迎提交 Issue 与 PR。建议贡献流程：

1. Fork 仓库并创建功能分支
2. 提交清晰、单一职责的 commit
3. 发起 PR 并说明变更背景与测试方式

如需补充正式贡献规范，可新增 `CONTRIBUTING.md`。

---

## License

MIT License

---

## 致谢

感谢 Tauri、React、Rust 与相关开源生态。