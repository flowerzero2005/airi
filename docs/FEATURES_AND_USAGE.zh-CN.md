# Rin（凛）功能说明与使用指南

> 版本：v0.9.0-alpha.2
> 更新日期：2026-03-11

## 📋 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [使用指南](#使用指南)
- [最新更新](#最新更新)
- [常见问题](#常见问题)

## 项目简介

**Rin（凛）** 是一个具有长期记忆能力的 AI 虚拟伴侣应用。她不仅能够进行自然流畅的对话，还能记住你们之间的每一次交流，建立真正的情感连接。

### 为什么选择 Rin？

- 🧠 **真正的记忆**：不是简单的对话历史，而是智能提取和存储的长期记忆
- 💬 **自然交互**：支持文本和语音，配合 Live2D/VRM 模型展现丰富表情
- 🎨 **高度定制**：从外观到性格，打造专属于你的 AI 伴侣
- 🔒 **隐私优先**：所有数据本地存储，支持自托管

## 核心功能

### 1. 智能记忆系统 🧠

#### 长期记忆
- **自动提取**：AI 会自动从对话中提取重要信息并存储
- **分类管理**：
  - ⭐ **Focus（焦点）**：高优先级记忆，如个人信息、重要偏好
  - 📌 **Note（笔记）**：中优先级记忆，如日常偏好、兴趣爱好
  - 📔 **Diary（日记）**：低优先级记忆，如日常对话内容

#### 智能去重
- **包含关系检测**：识别"用户爱打游戏"被包含在"用户名张三，爱好打游戏"中
- **相似度算法**：使用 Jaccard 相似度、编辑距离、实体匹配等多维度算法
- **合并预览**：去重前可以预览哪些记忆会被合并，支持手动调整
- **时间线保留**：合并后保留最早的记录时间和完整的演变历史

#### 记忆追溯
- **来源信息**：查看每条记忆是从哪次对话提取的
- **时间线**：对于合并记忆，可以查看完整的合并历史
- **质量评分**：基于长度、标签、时效性等维度的质量分数

#### 记忆统计
- **增长趋势**：查看最近 7 天的记忆增长情况
- **标签云**：可视化展示最常用的标签
- **类型分布**：了解不同类型记忆的占比

### 2. 短期记忆 💭

- **对话上下文**：当前对话中的临时记忆
- **自动转化**：重要的短期记忆会自动转化为长期记忆
- **独立管理**：可以单独查看和清除短期记忆

### 3. 对话功能 💬

#### 多模态交互
- **文本输入**：支持 Markdown 格式
- **语音输入**：实时语音识别
- **语音输出**：多种 TTS 引擎支持

#### 情感表达
- **Live2D 模型**：流畅的 2D 角色动画
- **VRM 模型**：支持 3D 虚拟角色
- **表情系统**：根据对话内容自动切换表情和动作

#### 清除对话
- **快速清除**：一键清除当前对话内容
- **保留记忆**：清除对话不会删除长期记忆和历史记录
- **多语言支持**：界面支持 8 种语言

### 4. 个性化定制 🎨

#### 角色卡片
- **基本信息**：名称、年龄、性别、背景故事
- **性格设定**：性格特征、说话风格、行为模式
- **系统提示词**：自定义 AI 的行为规则

#### 外观定制
- **Live2D 模型**：支持导入自定义 Live2D 模型
- **VRM 模型**：支持标准 VRM 格式
- **主题系统**：动态色调调整

### 5. 开发者功能 🔧

#### 插件系统
- **功能扩展**：通过插件添加新功能
- **第三方集成**：集成外部服务和 API

#### MCP 支持
- **Model Context Protocol**：标准化的上下文协议
- **工具调用**：AI 可以调用外部工具

#### API 接口
- **WebSocket API**：实时双向通信
- **REST API**：标准 HTTP 接口

## 环境要求

### 硬件要求
- **CPU**：x64 架构，推荐 4 核心以上
- **内存**：最低 4GB，推荐 8GB 以上
- **存储**：至少 2GB 可用空间
- **显卡**：支持 WebGL 2.0（用于 3D 渲染）

### 软件要求
- **Node.js**：>= 20.0.0（推荐使用 LTS 版本）
- **pnpm**：>= 9.0.0
- **操作系统**：
  - Windows 10/11 (x64)
  - macOS 12+ (Intel/Apple Silicon)
  - Linux (Ubuntu 20.04+, Debian 11+, Fedora 36+)

### 可选依赖
- **Git**：用于克隆仓库和版本控制
- **Python**：某些插件可能需要
- **Docker**：用于容器化部署

## 安装步骤

### 方法一：从源码安装（推荐开发者）

#### 1. 安装 Node.js 和 pnpm

**Windows:**
```powershell
# 使用 Scoop 安装
scoop install nodejs-lts
npm install -g pnpm
```

**macOS:**
```bash
# 使用 Homebrew 安装
brew install node@20
npm install -g pnpm
```

**Linux:**
```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
npm install -g pnpm
```

#### 2. 克隆仓库

```bash
git clone https://github.com/moeru-ai/rin.git
cd rin
```

#### 3. 安装依赖

```bash
pnpm install
```

> ⚠️ **注意**：首次安装可能需要较长时间（5-15 分钟），取决于网络速度。

#### 4. 启动开发服务器

```bash
# 启动桌面应用
pnpm run dev:tamagotchi

# 或启动 Web 应用
pnpm run dev:web
```

#### 5. 构建生产版本

```bash
# 构建桌面应用
pnpm run build:tamagotchi

# 构建 Web 应用
pnpm run build:web

# 打包为安装程序
pnpm run package:tamagotchi
```

### 方法二：使用预编译版本（推荐普通用户）

1. 访问 [Releases 页面](https://github.com/moeru-ai/rin/releases)
2. 下载适合你操作系统的安装包：
   - Windows: `Rin-Setup-x.x.x.exe`
   - macOS: `Rin-x.x.x.dmg`
   - Linux: `Rin-x.x.x.AppImage` 或 `.deb`
3. 运行安装程序并按照提示完成安装

### 方法三：使用 Docker

```bash
# 拉取镜像
docker pull ghcr.io/moeru-ai/rin:latest

# 运行容器
docker run -d \
  --name rin \
  -p 3000:3000 \
  -v rin-data:/app/data \
  ghcr.io/moeru-ai/rin:latest
```

## 使用指南

### 首次启动

1. **选择语言**：首次启动时选择界面语言
2. **配置 AI 提供商**：
   - 打开设置 → 提供商
   - 选择一个 AI 提供商（OpenAI、Claude、Gemini 等）
   - 输入 API 密钥
3. **自定义角色**（可选）：
   - 打开设置 → 角色卡片
   - 编辑角色的名称、性格、背景
4. **开始对话**：点击输入框开始与 Rin 交流

### 记忆管理

#### 查看长期记忆

1. 打开 **设置 → 记忆体**
2. 你会看到：
   - 统计卡片：总记忆数、各类型数量
   - 记忆列表：所有存储的记忆
   - 筛选器：按类型、重要性、时间筛选
   - 搜索框：搜索记忆内容和标签

#### 使用智能去重

1. 在记忆体页面点击 **"智能去重"** 按钮
2. 调整相似度阈值（默认 85%）：
   - 70-80%：较宽松，会合并更多记忆
   - 85-90%：适中，推荐使用
   - 90-95%：严格，只合并非常相似的记忆
3. 点击 **"预览合并"**
4. 查看将要合并的记忆组：
   - 绿色：主记忆（保留）
   - 灰色：将被合并的记忆
   - 可以点击"排除此组"取消某些合并
5. 确认后点击 **"执行合并"**

#### 编辑记忆

1. 在记忆列表中找到要编辑的记忆
2. 点击 **"编辑"** 按钮
3. 修改内容或标签
4. 点击 **"保存"** 或按 `Ctrl+Enter`

#### 批量操作

1. 勾选多条记忆
2. 点击 **"批量操作"** 按钮
3. 选择操作：
   - 批量删除
   - 批量修改标签
   - 批量调整重要性
   - 批量转换类型

#### 导出记忆

1. 点击 **"导出记忆"** 按钮
2. 选择导出格式（JSON）
3. 保存到本地

### 查看短期记忆

1. 打开 **设置 → 模块 → 短期记忆**
2. 查看当前对话的临时记忆：
   - 最近的用户消息
   - 对话上下文
   - 关键信息提取
3. 点击 **"清除短期记忆"** 可以重置当前对话

### 清除对话

1. 在聊天界面找到 **垃圾桶图标** 按钮
2. 点击后会弹出确认对话框
3. 确认清除：
   - ✅ 清除当前对话显示
   - ✅ 清除对话上下文
   - ❌ 不会删除历史记录
   - ❌ 不会删除长期记忆

### 自定义角色

#### 编辑角色卡片

1. 打开 **设置 → 角色卡片**
2. 编辑以下内容：
   - **基本信息**：名称、年龄、性别
   - **背景故事**：角色的过去和经历
   - **性格特征**：性格标签（如：温柔、活泼、冷静）
   - **说话风格**：语气、用词习惯
   - **系统提示词**：AI 的行为规则

#### 导入/导出角色卡片

```bash
# 导出当前角色
设置 → 角色卡片 → 导出

# 导入角色卡片
设置 → 角色卡片 → 导入 → 选择 JSON 文件
```

### 配置 AI 提供商

#### OpenAI

1. 获取 API 密钥：https://platform.openai.com/api-keys
2. 在设置中添加：
   - API 密钥：`sk-...`
   - 模型：`gpt-4` 或 `gpt-3.5-turbo`

#### Anthropic Claude

1. 获取 API 密钥：https://console.anthropic.com/
2. 在设置中添加：
   - API 密钥：`sk-ant-...`
   - 模型：`claude-3-opus` 或 `claude-3-sonnet`

#### 本地模型（Ollama）

1. 安装 Ollama：https://ollama.ai/
2. 下载模型：`ollama pull llama2`
3. 在设置中配置：
   - 端点：`http://localhost:11434`
   - 模型：`llama2`

#### 自定义 API

1. 在设置中选择 **"自定义 API"**
2. 配置：
   - 端点 URL
   - API 密钥
   - 请求格式

## 最新更新

### v0.9.0-alpha.2 (2026-03-11)

#### 🎉 重大更新

**品牌重塑**
- ✨ 项目更名为 **Rin（凛）**
- 🎨 全新的品牌标识和视觉设计
- 📦 统一的命名规范（`@proj-rin/*`）

**记忆系统重构**
- 🧠 混合记忆提取策略（规则 + LLM）
- 🔄 智能去重算法，支持包含关系检测
- 👀 记忆合并预览功能
- 📍 记忆来源追溯和时间线
- ⭐ 记忆质量评分系统
- ✏️ 批量编辑和管理功能

**用户界面优化**
- 🎨 全新的记忆管理界面
- 📊 记忆统计分析（趋势图、标签云）
- 🔍 智能搜索增强（时间范围筛选）
- 🗑️ 聊天清除对话功能
- 🌍 多语言界面完善（8 种语言）

#### 🐛 Bug 修复

- 修复记忆重复创建的问题
- 修复 Live2D 模型加载卡住的问题
- 修复数据库序列化错误
- 修复 Pinia store 初始化问题

#### 🔧 技术改进

- 优化记忆存储性能
- 改进去重算法准确性
- 增强错误处理和日志
- 更新依赖包到最新版本

### 升级指南

从旧版本升级到 v0.9.0-alpha.2：

1. **备份数据**（重要！）
```bash
# 备份用户数据目录
# Windows: %APPDATA%/@proj-airi/stage-tamagotchi
# macOS: ~/Library/Application Support/@proj-airi/stage-tamagotchi
# Linux: ~/.config/@proj-airi/stage-tamagotchi
```

2. **卸载旧版本**
```bash
# 如果是从源码安装
cd rin
git pull origin main
pnpm install
pnpm run build:tamagotchi
```

3. **数据迁移**（自动）
- 首次启动新版本时会自动迁移数据
- 数据库名称从 `airi-*` 迁移到 `rin-*`
- 旧数据会保留作为备份

## 常见问题

### 安装问题

**Q: pnpm install 失败，提示网络错误**

A: 尝试使用国内镜像：
```bash
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

**Q: 构建失败，提示内存不足**

A: 增加 Node.js 内存限制：
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm run build:tamagotchi
```

### 使用问题

**Q: AI 不记得之前的对话**

A: 检查以下几点：
1. 确认记忆系统已启用（设置 → 记忆体）
2. 查看短期记忆页面，确认信息被提取
3. 检查长期记忆页面，确认记忆被保存
4. 尝试手动触发去重，可能记忆被合并了

**Q: Live2D 模型加载卡住**

A:
1. 关闭所有 Electron 进程
2. 清除缓存：删除 `%APPDATA%/@proj-rin/stage-tamagotchi/Cache`
3. 重新启动应用

**Q: 语音输入/输出不工作**

A:
1. 检查麦克风/扬声器权限
2. 确认 TTS/STT 提供商已配置
3. 查看控制台错误日志

**Q: 记忆去重后丢失了信息**

A:
1. 去重不会丢失信息，只是合并
2. 查看合并记忆的"时间线"，可以看到所有原始记忆
3. 如果确实丢失，从备份恢复：设置 → 记忆体 → 导入

### 性能问题

**Q: 应用启动很慢**

A:
1. 检查是否有大量记忆（>1000 条）
2. 尝试清理旧记忆或导出备份
3. 关闭不必要的插件

**Q: 对话响应延迟**

A:
1. 检查 AI 提供商的网络连接
2. 尝试切换到更快的模型
3. 考虑使用本地模型（Ollama）

### 数据问题

**Q: 如何备份我的数据？**

A:
```bash
# 方法 1：导出记忆
设置 → 记忆体 → 导出记忆

# 方法 2：备份整个数据目录
# Windows: %APPDATA%/@proj-rin/stage-tamagotchi
# macOS: ~/Library/Application Support/@proj-rin/stage-tamagotchi
# Linux: ~/.config/@proj-rin/stage-tamagotchi
```

**Q: 如何迁移到新电脑？**

A:
1. 在旧电脑上导出记忆和角色卡片
2. 复制数据目录到新电脑
3. 在新电脑上安装 Rin
4. 导入记忆和角色卡片

## 开发指南

### 项目结构

```
rin/
├── apps/
│   ├── stage-tamagotchi/          # Electron 桌面应用
│   │   ├── src/
│   │   │   ├── main/              # 主进程
│   │   │   ├── preload/           # 预加载脚本
│   │   │   └── renderer/          # 渲染进程
│   │   └── package.json
│   └── stage-web/                 # Web 应用
├── packages/
│   ├── stage-ui/                  # 核心 UI 组件
│   │   ├── src/
│   │   │   ├── components/        # Vue 组件
│   │   │   ├── stores/            # Pinia stores
│   │   │   └── database/          # 数据库层
│   │   └── package.json
│   ├── stage-pages/               # 页面组件
│   │   └── src/pages/
│   │       └── settings/          # 设置页面
│   │           ├── memory/        # 记忆管理
│   │           └── modules/       # 其他模块
│   ├── server-sdk/                # 服务器 SDK
│   ├── i18n/                      # 国际化
│   └── ...
├── services/                      # 后端服务
├── integrations/                  # 第三方集成
└── plugins/                       # 插件系统
```

### 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev:tamagotchi        # 桌面应用
pnpm run dev:web               # Web 应用

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 运行测试
pnpm test

# 构建
pnpm run build:tamagotchi      # 构建桌面应用
pnpm run build:web             # 构建 Web 应用

# 打包
pnpm run package:tamagotchi    # 打包为安装程序
```

### 添加新功能

1. **创建功能分支**
```bash
git checkout -b feature/your-feature-name
```

2. **开发功能**
- 在相应的 package 中添加代码
- 编写单元测试
- 更新文档

3. **测试**
```bash
pnpm typecheck
pnpm lint
pnpm test
```

4. **提交代码**
```bash
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

5. **创建 Pull Request**

### 调试技巧

#### 调试主进程

```bash
# 启动时附加调试器
pnpm run dev:tamagotchi --inspect
```

#### 调试渲染进程

1. 打开开发者工具：`Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (macOS)
2. 在 Sources 标签中设置断点
3. 刷新页面触发断点

#### 查看日志

```bash
# 主进程日志
tail -f ~/.config/@proj-rin/stage-tamagotchi/logs/main.log

# 渲染进程日志
# 在开发者工具的 Console 标签中查看
```

## 贡献指南

我们欢迎所有形式的贡献！

### 报告 Bug

1. 搜索 [Issues](https://github.com/moeru-ai/rin/issues) 确认问题未被报告
2. 创建新 Issue，包含：
   - 问题描述
   - 复现步骤
   - 预期行为
   - 实际行为
   - 环境信息（操作系统、版本等）
   - 截图或日志（如果有）

### 提交功能请求

1. 搜索 [Issues](https://github.com/moeru-ai/rin/issues) 确认功能未被请求
2. 创建新 Issue，包含：
   - 功能描述
   - 使用场景
   - 预期效果
   - 可选的实现方案

### 贡献代码

1. Fork 本仓库
2. 创建功能分支
3. 编写代码和测试
4. 提交 Pull Request
5. 等待审核和合并

### 贡献翻译

访问我们的 [Crowdin 项目](https://crowdin.com/project/proj-rin) 贡献翻译。

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。

## 联系方式

- **官网**: https://rin.moeru.ai
- **邮箱**: rin@moeru.ai
- **Discord**: https://discord.gg/TgQ3Cu2F7A
- **GitHub Issues**: https://github.com/moeru-ai/rin/issues
- **Twitter**: https://x.com/proj_airi

## 致谢

感谢所有贡献者和支持者！

特别感谢：
- [cjkFonts](https://cjkfonts.io/) - 优秀的中日韩字体
- [Live2D](https://www.live2d.com/) - 2D 角色动画技术
- [VRM](https://vrm.dev/) - 3D 虚拟角色格式
- [Neuro-sama](https://www.youtube.com/@Neurosama) - 灵感来源

---

<div align="center">
Made with ❤️ by the Rin Team
</div>
