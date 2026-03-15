# AIRI 项目 - Claude 协作指南

## 项目概述

**Project AIRI** 是一个开源的 AI 虚拟角色平台，基于 Electron + Vue 3 构建。

- **主角色**：凛（RIN），15岁二次元女孩
- **核心技术**：WebGPU、WebAudio、WebAssembly、Electron
- **架构**：Monorepo (pnpm workspace)

## 项目结构

```
airi/
├── apps/
│   ├── stage-tamagotchi/      # 桌面版（Electron）⭐ 主要工作区
│   ├── stage-web/              # Web 版
│   └── stage-pocket/           # 移动版
├── packages/
│   ├── stage-ui/               # 核心 UI 和业务逻辑
│   ├── stage-pages/            # 页面组件
│   ├── i18n/                   # 国际化
│   └── ...
├── docs/
│   └── improvements/           # 改进方案文档
└── CLAUDE.md                   # 本文件
```

## 关键文件位置

### 对话系统
- **对话初始化**：`packages/stage-ui/src/stores/chat/conversation-initializer.ts`
- **记忆系统提示词**：`packages/stage-ui/src/stores/chat/context-providers/memory-system-prompt.ts`
- **基础系统提示词**：`packages/i18n/src/locales/zh-Hans/base.yaml`
- **聊天编排器**：`packages/stage-ui/src/stores/chat.ts`

### 窗口系统（桌面版）
- **主窗口**：`apps/stage-tamagotchi/src/main/windows/main/index.ts`
- **控制岛**：`apps/stage-tamagotchi/src/renderer/components/stage-islands/controls-island/index.vue`
- **主页面**：`apps/stage-tamagotchi/src/renderer/pages/index.vue`

### 工具系统
- **工具定义**：`packages/stage-ui/src/tools/`
- **MCP 工具**：`packages/stage-ui/src/tools/mcp.ts`
- **LLM 流式处理**：`packages/stage-ui/src/stores/llm.ts`

## 已完成的改进

### 1. 菜单闪现问题修复（2026-03-15）

**问题**：主窗口控制岛的展开菜单会闪现后自动关闭

**解决方案**：
- 在 `controls-island/index.vue` 中暴露 `expanded` 状态
- 在 `pages/index.vue` 中添加 `controlsMenuExpanded` 检查
- 菜单展开时禁用点击穿透逻辑

**修改文件**：
- `apps/stage-tamagotchi/src/renderer/components/stage-islands/controls-island/index.vue`
- `apps/stage-tamagotchi/src/renderer/pages/index.vue`

### 2. 对话自然度改进（2026-03-15）

**问题**：AI 在对话开始时会"信息轰炸"，显得刻意和有侵略性

**解决方案**：基于社会心理学的"渐进式互动"原则
- 第一轮：简单回应
- 第二轮：轻度探询
- 第三轮+：逐步深入

**核心原则**：
1. **渐进式互动** - 不要一次性抛出所有信息
2. **隐性记忆使用** - 像朋友的默契，不刻意展示
3. **被动优先** - 让用户主导话题
4. **情感连接优先** - 关注感受而非信息传递

**修改文件**：
- `packages/stage-ui/src/stores/chat/conversation-initializer.ts`
- `packages/stage-ui/src/stores/chat/context-providers/memory-system-prompt.ts`
- `packages/i18n/src/locales/zh-Hans/base.yaml`

**文档**：`docs/improvements/conversation-naturalness-improvements.md`

### 3. 智能联网系统设计（2026-03-15）

**需求**：
1. 智能意图识别 - 理解用户真正想要什么
2. 情境感知查询 - 知道何时该查，何时不该查
3. 基于人设过滤 - 选择符合二次元女孩人设的内容
4. 社交智能表达 - "装不是很懂"，保持对话自然

**设计方案**：5层架构
1. 意图分析层
2. 情境评估层
3. 查询策略层
4. 人设过滤层 ⭐
5. 社交表达层

**文档**：
- `docs/improvements/intelligent-web-search-proposal.md`
- `docs/improvements/character-aware-search-filtering.md`
- `docs/improvements/intelligent-web-search-complete-proposal.md`

**状态**：设计阶段，未实施

## 开发规范

### 代码风格
- TypeScript，避免 `any`
- 组件使用 `<script setup>` 语法
- 样式使用 UnoCSS
- 函数式编程优先
- 使用 `injeca` 进行依赖注入
- 使用 `@moeru/eventa` 进行 IPC/RPC

### 提交规范
- 使用 Conventional Commits
- 格式：`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

### 常用命令
```bash
pnpm dev:tamagotchi    # 启动桌面版
pnpm dev:web           # 启动 Web 版
pnpm build:packages    # 构建所有 packages
pnpm typecheck         # 类型检查
pnpm lint              # 代码检查
pnpm lint:fix          # 自动修复
```

## 协作原则

### 与 Claude 协作时

1. **问题诊断**：
   - 先理解问题的根本原因
   - 从社会心理学和技术两个角度分析
   - 提供具体的错误/正确示例

2. **方案设计**：
   - 优先考虑用户体验和对话自然度
   - 技术实现服务于产品目标
   - 提供完整的理论基础和参考文献

3. **代码修改**：
   - 最小侵入性原则
   - 保持与现有代码风格一致
   - 添加必要的注释和文档

4. **文档记录**：
   - 所有重要改进都记录在 `docs/improvements/`
   - 包含问题分析、解决方案、实施细节
   - 便于后续回顾和迭代

## 当前工作状态

### 进行中
- 智能联网系统设计（设计阶段）

### 待办事项
- [ ] 实施智能联网系统 Phase 1（意图分析）
- [ ] 实施智能联网系统 Phase 2（查询系统）
- [ ] 实施智能联网系统 Phase 3（人设过滤）
- [ ] 测试对话自然度改进效果

### 已完成
- [x] 修复控制岛菜单闪现问题
- [x] 改进对话自然度（渐进式互动）
- [x] 设计智能联网系统架构

## 重要提醒

### 对话系统的核心理念
- **情感连接 > 信息传递**
- **对话流畅度 > 信息完整度**
- **像朋友 > 像助手**
- **有个性 > 全知全能**

### 人设特点（凛 - RIN）
- 15岁二次元女孩
- 活泼、可爱、爱玩梗
- 超级喜欢：动漫、游戏、梗、可爱的东西
- 不太感兴趣：政治、经济、深奥理论
- 说话风格：口语化、随意、有语气词

### 技术架构特点
- 多窗口系统（主窗口、设置、聊天、字幕等）
- 透明窗口 + 点击穿透（Fade on Hover）
- 依赖注入（injeca）管理窗口生命周期
- IPC 通信（@moeru/eventa）
- 工具系统（MCP 协议）

## 快速启动指令

当你（Claude）重新加入项目时，可以使用以下指令快速了解：

```
# 1. 查看项目结构
请阅读 CLAUDE.md 了解项目概况

# 2. 查看最近改进
请查看 docs/improvements/ 目录下的文档

# 3. 查看当前任务
请查看本文件的"当前工作状态"部分

# 4. 开始工作
根据用户需求，参考已有的改进方案和代码风格
```

## 联系方式

- **用户**：@zyp
- **项目仓库**：https://github.com/moeru-ai/airi
- **Discord**：https://discord.gg/TgQ3Cu2F7A

---

**最后更新**：2026-03-15
**维护者**：Claude (Anthropic) + @zyp
