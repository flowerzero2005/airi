# Project AIRI - AI虚拟角色容器

<picture>
  <source width="100%" srcset="./docs/content/public/banner-dark-1280x640.avif" media="(prefers-color-scheme: dark)" />
  <source width="100%" srcset="./docs/content/public/banner-light-1280x640.avif" media="(prefers-color-scheme: light), (prefers-color-scheme: no-preference)" />
  <img width="250" src="./docs/content/public/banner-light-1280x640.avif" />
</picture>

<p align="center">重新创造 Neuro-sama，一个 AI 虚拟角色的灵魂容器，将她们带入我们的世界</p>

<p align="center">
  [<a href="https://discord.gg/TgQ3Cu2F7A">加入 Discord</a>]
  [<a href="https://airi.moeru.ai">在线试用</a>]
  [<a href="https://github.com/moeru-ai/airi/blob/main/docs/README.zh-CN.md">简体中文</a>]
</p>

> [!WARNING]
> **注意：** 我们**没有**发行任何与本项目相关的加密货币或代币。请谨慎核实信息。

---

## 📖 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [快速开始](#快速开始)
  - [环境要求](#环境要求)
  - [安装步骤](#安装步骤)
  - [启动应用](#启动应用)
- [详细配置](#详细配置)
  - [桌面版配置](#桌面版配置)
  - [Web版配置](#web版配置)
  - [移动版配置](#移动版配置)
  - [集成服务配置](#集成服务配置)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)

---

## 项目简介

**Project AIRI（アイリ）** 是一个开源的 AI 虚拟角色平台，灵感来自著名的 [Neuro-sama](https://www.youtube.com/@Neurosama)。与其他 AI VTuber 项目不同，AIRI 从第一天起就基于现代 Web 技术构建，包括：

- **WebGPU** - GPU 加速计算
- **WebAudio** - 高质量音频处理
- **WebAssembly** - 原生性能
- **WebSocket** - 实时通信

这意味着 AIRI 可以在现代浏览器、桌面应用和移动设备上运行，同时保持出色的性能。

### 为什么选择 AIRI？

- ✅ **跨平台** - 浏览器、桌面、移动端全支持
- ✅ **高性能** - 桌面版支持 NVIDIA CUDA 和 Apple Metal 加速
- ✅ **可扩展** - 插件系统，轻松集成新功能
- ✅ **开源免费** - MIT 许可证，完全开放

---

## 核心特性

### 🧠 智能大脑
- ✅ 支持多种 LLM 提供商（OpenAI、Claude、Gemini、DeepSeek 等）
- ✅ 智能记忆系统（长短期记忆、语义搜索、智能价值判断）
- ✅ 多用户识别与记忆隔离
- ✅ 对话初始化与个性化开场白
- ✅ 游戏能力（Minecraft、Factorio）
- ✅ 社交平台集成（Discord、Telegram）
- 🚧 浏览器内 WebGPU 推理（开发中）

### 💬 自然对话体验
- ✅ 语义分段气泡显示
- ✅ 打字机效果（可调速度）
- ✅ 自适应气泡延迟
- ✅ 智能消息合并
- ✅ 数学公式渲染（KaTeX）

### 👂 听觉系统
- ✅ 浏览器音频输入
- ✅ Discord 语音输入
- ✅ 客户端语音识别（ASR）
- ✅ 语音活动检测（VAD）

### 👄 语音合成
- ✅ ElevenLabs TTS 支持
- ✅ 多语言支持
- ✅ 实时语音流式播放

### 🎭 虚拟形象
- ✅ VRM 模型支持
  - 自动眨眼
  - 视线跟踪
  - 空闲动画
- ✅ Live2D 模型支持
  - 自动眨眼
  - 视线跟踪
  - 空闲动画

---

## 快速开始

### 环境要求

#### 必需软件
- **Node.js** 23+ ([下载](https://nodejs.org/))
- **pnpm** (通过 corepack 安装)
- **Git** ([下载](https://git-scm.com/))

#### 可选软件（桌面版开发）
- **Rust** (桌面版需要，[安装指南](https://www.rust-lang.org/tools/install))
- **Visual Studio** (Windows 用户，需要 C++ 构建工具)

### 安装步骤

#### 1. 克隆仓库

```bash
git clone https://github.com/moeru-ai/airi.git
cd airi
```

#### 2. 启用 pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

#### 3. 安装依赖

```bash
pnpm install
```

这将自动：
- 安装所有 npm 依赖
- 构建所有 packages
- 设置 Git hooks

#### 4. （可选）安装 Rust 依赖

如果你要开发桌面版或 crates：

```bash
cargo fetch
```

### 启动应用

#### 🖥️ 桌面版（Stage Tamagotchi）

**方式一：使用启动脚本（推荐）**

Windows 用户可以直接双击运行：
- `start-desktop.bat` - 批处理脚本
- `start-desktop.ps1` - PowerShell 脚本（需要管理员权限）

**方式二：命令行启动**

```bash
pnpm dev:tamagotchi
```

这将启动 Electron 桌面应用，支持：
- 原生 CUDA/Metal 加速
- 系统托盘集成
- 本地文件访问
- 智能记忆系统
- 打字机效果对话
- 语义分段气泡显示

#### 🌐 Web 版（Stage Web）

```bash
pnpm dev
# 或
pnpm dev:web
```

访问 `http://localhost:5173` 查看应用。

#### 📱 移动版（Stage Pocket）

```bash
pnpm dev:pocket
```

然后在 Xcode 或 Android Studio 中打开项目。

#### 📚 文档站点

```bash
pnpm dev:docs
```

访问 `http://localhost:5173` 查看文档。

---

## 详细配置

### 桌面版配置

桌面版（Tamagotchi）使用 Electron 构建，配置文件位于应用内的设置界面。

#### 首次启动配置

1. 启动应用后，点击右上角的设置图标
2. 配置以下内容：

**AI 提供商配置**
- 选择你的 LLM 提供商（OpenAI、Claude、Gemini 等）
- 输入 API Key
- 选择模型（如 `gpt-4`、`claude-3-opus` 等）

**语音配置**
- TTS 提供商：ElevenLabs
- 输入 ElevenLabs API Key
- 选择语音 ID

**角色配置**
- 上传 VRM 或 Live2D 模型
- 设置角色名称和人设

**高级设置**
- 记忆隔离：多用户识别
- 语义理解：语义搜索、智能价值判断
- 自然对话：对话初始化、语义分段、打字机速度、气泡延迟
- 主动话题：AI 主动发起对话（实验性）

#### 数据存储

桌面版使用 DuckDB WASM 作为本地数据库，数据存储在：
- **Windows**: `%APPDATA%/airi/`
- **macOS**: `~/Library/Application Support/airi/`
- **Linux**: `~/.config/airi/`

### Web 版配置

Web 版配置通过浏览器 LocalStorage 存储，首次访问时会引导你完成配置。

#### 环境变量（开发）

如果你在本地开发 Web 版，可以创建 `apps/stage-web/.env.local`：

```env
# API 配置（可选，用于开发）
VITE_API_BASE_URL=http://localhost:3000
```

### 移动版配置

移动版基于 Capacitor 构建，配置方式与 Web 版类似。

#### iOS 开发

```bash
# 设置开发服务器 URL
CAPACITOR_DEV_SERVER_URL=https://<your-ip>:5273 pnpm open:ios
```

#### Android 开发

```bash
pnpm open:android
```

### 集成服务配置

#### Telegram Bot

1. 进入服务目录：
```bash
cd services/telegram-bot
```

2. 启动 PostgreSQL 数据库：
```bash
docker compose up -d
```

3. 配置环境变量：
```bash
cp .env .env.local
```

编辑 `.env.local`：
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
DATABASE_URL=postgresql://user:password@localhost:5432/airi
```

4. 迁移数据库：
```bash
pnpm -F @proj-airi/telegram-bot db:generate
pnpm -F @proj-airi/telegram-bot db:push
```

5. 启动 Bot：
```bash
pnpm -F @proj-airi/telegram-bot start
```

#### Discord Bot

1. 进入服务目录：
```bash
cd services/discord-bot
```

2. 配置环境变量：
```bash
cp .env .env.local
```

编辑 `.env.local`：
```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
```

3. 启动 Bot：
```bash
pnpm -F @proj-airi/discord-bot start
```

#### Minecraft Agent

1. 启动 Minecraft 服务器并开放端口

2. 进入服务目录：
```bash
cd services/minecraft
```

3. 配置环境变量：
```bash
cp .env .env.local
```

编辑 `.env.local`：
```env
MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=AIRI
```

4. 启动 Agent：
```bash
pnpm -F @proj-airi/minecraft-bot start
```

---

## 项目结构

```
airi/
├── apps/                          # 应用程序
│   ├── stage-web/                # Web 版（浏览器）
│   ├── stage-tamagotchi/         # 桌面版（Electron）
│   ├── stage-pocket/             # 移动版（Capacitor）
│   ├── server/                   # 服务端应用
│   └── component-calling/        # 组件调用示例
│
├── packages/                      # 共享包
│   ├── stage-ui/                 # 核心 UI 组件和业务逻辑
│   ├── stage-ui-three/           # Three.js 集成
│   ├── stage-ui-live2d/          # Live2D 集成
│   ├── stage-shared/             # Stage 共享逻辑
│   ├── stage-pages/              # 共享页面组件
│   ├── stage-layouts/            # 布局组件
│   ├── ui/                       # 基础 UI 组件（基于 reka-ui）
│   ├── i18n/                     # 国际化
│   ├── audio/                    # 音频处理
│   ├── pipelines-audio/          # 音频管道
│   ├── server-runtime/           # 服务端运行时
│   ├── server-sdk/               # 服务端 SDK
│   ├── server-shared/            # 服务端共享代码
│   ├── drizzle-duckdb-wasm/      # DuckDB WASM Drizzle 驱动
│   ├── duckdb-wasm/              # DuckDB WASM 封装
│   ├── memory-pgvector/          # PostgreSQL 向量记忆
│   └── ...                       # 其他工具包
│
├── services/                      # 集成服务
│   ├── telegram-bot/             # Telegram 机器人
│   ├── discord-bot/              # Discord 机器人
│   ├── minecraft/                # Minecraft Agent
│   ├── satori-bot/               # Satori 协议机器人
│   └── twitter-services/         # Twitter 服务
│
├── crates/                        # Rust crates（旧版 Tauri）
│   ├── tauri-plugin-mcp/         # MCP 插件
│   └── ...                       # 其他 Tauri 插件
│
├── plugins/                       # 插件系统
├── docs/                          # 文档站点
├── .github/                       # GitHub 配置
│   └── CONTRIBUTING.md           # 贡献指南
└── README.md                      # 本文件
```

### 核心目录说明

#### `apps/`
包含所有可运行的应用程序：
- **stage-web**: 浏览器版本，使用 Vue 3 + Vite
- **stage-tamagotchi**: 桌面版，使用 Electron + Vue 3
- **stage-pocket**: 移动版，使用 Capacitor + Vue 3

#### `packages/`
共享的可复用包：
- **stage-ui**: 核心业务组件、状态管理、组合式函数
- **ui**: 基础 UI 组件库（按钮、输入框等）
- **server-***: 服务端相关包，用于集成服务

#### `services/`
独立的集成服务，可以单独部署：
- 每个服务都有自己的 `package.json` 和配置
- 使用 `pnpm -F` 过滤器运行特定服务

---

## 开发指南

### 开发工作流

1. **创建分支**
```bash
git checkout -b your-username/feat/feature-name
```

2. **开发和测试**
```bash
# 运行类型检查
pnpm typecheck

# 运行 lint
pnpm lint

# 运行测试
pnpm test:run
```

3. **提交代码**
```bash
git add .
git commit -m "feat: add new feature"
```

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

4. **推送和创建 PR**
```bash
git push origin your-branch-name
```

### 常用命令

```bash
# 开发
pnpm dev                    # Web 版
pnpm dev:tamagotchi         # 桌面版
pnpm dev:pocket             # 移动版
pnpm dev:docs               # 文档站点

# 构建
pnpm build                  # 构建所有
pnpm build:web              # 构建 Web 版
pnpm build:tamagotchi       # 构建桌面版

# 测试和检查
pnpm test                   # 运行测试（watch 模式）
pnpm test:run               # 运行测试（单次）
pnpm typecheck              # 类型检查
pnpm lint                   # 代码检查
pnpm lint:fix               # 自动修复

# 依赖管理
pnpm up                     # 更新依赖
```

### 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite + Rolldown
- **状态管理**: Pinia
- **UI 组件**: Reka UI (headless)
- **样式**: UnoCSS
- **测试**: Vitest
- **Lint**: ESLint + oxlint
- **桌面**: Electron
- **移动**: Capacitor

### 代码规范

- 使用 TypeScript，避免 `any`
- 组件使用 `<script setup>` 语法
- 样式使用 UnoCSS，避免内联长字符串
- 函数式编程优先，避免类（除非扩展浏览器 API）
- 使用 `injeca` 进行依赖注入
- 使用 `@moeru/eventa` 进行 IPC/RPC

详细规范请参考 [AGENTS.md](./AGENTS.md)。

---

## 常见问题

### 1. 安装依赖失败

**问题**: `pnpm install` 报错

**解决方案**:
```bash
# 清理缓存
pnpm store prune

# 删除 node_modules 和 lockfile
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

### 2. 桌面版启动失败

**问题**: `pnpm dev:tamagotchi` 报错

**解决方案**:
- 确保已安装 Rust: `rustc --version`
- Windows 用户确保已安装 Visual Studio C++ 构建工具
- 尝试重新构建: `pnpm -F @proj-airi/stage-tamagotchi build`

### 3. 类型检查错误

**问题**: `pnpm typecheck` 报错

**解决方案**:
```bash
# 重新构建所有 packages
pnpm build:packages

# 再次运行类型检查
pnpm typecheck
```

### 4. 数据库相关问题

**问题**: 记忆系统不工作

**解决方案**:
- 桌面版使用 DuckDB WASM，数据存储在本地
- 检查应用数据目录是否有写入权限
- 尝试清除应用数据重新初始化

### 5. API Key 配置

**问题**: AI 不响应

**解决方案**:
- 检查设置中的 API Key 是否正确
- 确认 API Key 有足够的额度
- 检查网络连接
- 查看浏览器控制台或应用日志

---

## 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork 本仓库
2. 创建你的特性分支
3. 提交你的更改
4. 推送到你的 Fork
5. 创建 Pull Request

详细步骤请参考 [CONTRIBUTING.md](./.github/CONTRIBUTING.md)。

### 我们需要的帮助

- 🎨 **设计师**: UI/UX 设计、Live2D/VRM 模型
- 💻 **开发者**: 前端、后端、AI、游戏集成
- 📝 **文档**: 翻译、教程、示例
- 🧪 **测试**: Bug 报告、功能测试
- 🎮 **游戏集成**: Minecraft、Factorio 等

### 社区

- [Discord 服务器](https://discord.gg/TgQ3Cu2F7A)
- [GitHub Discussions](https://github.com/moeru-ai/airi/discussions)
- [Telegram 群组](https://t.me/+7M_ZKO3zUHFlOThh)

---

## 支持的 LLM 提供商

通过 [xsai](https://github.com/moeru-ai/xsai) 支持：

- ✅ [AIHubMix](https://aihubmix.com/?aff=OOiX) (推荐)
- ✅ [OpenRouter](https://openrouter.ai/)
- ✅ [OpenAI](https://platform.openai.com/)
- ✅ [Anthropic Claude](https://anthropic.com)
- ✅ [Google Gemini](https://developers.generativeai.google)
- ✅ [DeepSeek](https://www.deepseek.com/)
- ✅ [Qwen](https://help.aliyun.com/document_detail/2400395.html)
- ✅ [xAI](https://x.ai/)
- ✅ [Groq](https://wow.groq.com/)
- ✅ [Ollama](https://github.com/ollama/ollama) (本地)
- ✅ [vLLM](https://github.com/vllm-project/vllm) (本地)
- ✅ 更多...

---

## 子项目

从 AIRI 诞生的独立项目：

- [Awesome AI VTuber](https://github.com/proj-airi/awesome-ai-vtuber) - AI VTuber 资源列表
- [`unspeech`](https://github.com/moeru-ai/unspeech) - 通用 ASR/TTS 代理服务器
- [`xsai`](https://github.com/moeru-ai/xsai) - 轻量级 LLM SDK
- [MCP Launcher](https://github.com/moeru-ai/mcp-launcher) - MCP 服务器启动器
- [AIRI Factorio](https://github.com/moeru-ai/airi-factorio) - Factorio 游戏集成
- 更多请查看 [@proj-airi](https://github.com/proj-airi) 组织

---

## 许可证

[MIT License](./LICENSE)

---

## 致谢

- [Neuro-sama](https://www.youtube.com/@Neurosama) - 灵感来源
- [pixiv/ChatVRM](https://github.com/pixiv/ChatVRM) - VRM 实现参考
- [Reka UI](https://github.com/unovue/reka-ui) - UI 组件库
- 所有贡献者和支持者 ❤️

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=moeru-ai/airi&type=Date)](https://www.star-history.com/#moeru-ai/airi&Date)
