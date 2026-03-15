# 关键问题修复：系统提示词未生效

**发现日期**: 2026-03-16
**严重程度**: 🔴 Critical
**状态**: ✅ 已修复

---

## 问题描述

用户反馈：AI 完全违反了 base.yaml 中的所有规则，仍然使用编号格式（01、02、03）、反问收集需求等被禁止的表达方式。

**症状**：
- AI 使用 "01 02 03 04" 编号格式
- AI 反问 "你选一个我就去搜"
- AI 使用 "A/B/C" 选项
- AI 像客服在收集需求

**用户原话**：
> "不是你的问题我需要你检测项目回答逻辑看看哪里出了问题她完全违规了不是吗很明显没按照你写的来"

---

## 根本原因分析

经过排查，发现了**两个关键问题**：

### 问题1：系统提示词版本号未更新 🔴

**位置**: `packages/stage-ui/src/stores/modules/airi-card.ts` 第214行

```typescript
const SYSTEM_PROMPT_VERSION = '1.1.1' // Increment when system prompt changes
```

**问题**：
- 当 base.yaml 被修改后，这个版本号**必须手动增加**
- 如果版本号不变，应用会认为系统提示词没有变化
- 应用会继续使用**旧的缓存版本**，而不是加载新的 base.yaml

**影响**：
- 所有对 base.yaml 的修改都不会生效
- 用户看到的是旧版本的系统提示词
- 这解释了为什么 AI 完全违反了新规则

### 问题2：i18n 包需要重新构建

**问题**：
- base.yaml 是通过 i18n 包加载的
- 修改 base.yaml 后，必须运行 `pnpm --filter @proj-airi/i18n build`
- 否则应用加载的仍然是旧的编译版本

---

## 解决方案

### 修复1：更新系统提示词版本号

**文件**: `packages/stage-ui/src/stores/modules/airi-card.ts`

**修改**：
```typescript
// 从
const SYSTEM_PROMPT_VERSION = '1.1.1'

// 改为
const SYSTEM_PROMPT_VERSION = '1.2.0' // Updated 2026-03-16: Multi-point reinforcement
```

**效果**：
- 应用启动时会检测到版本号变化
- 自动重新加载新的系统提示词
- 清除旧的缓存

### 修复2：重新构建 i18n 包

**命令**：
```bash
cd D:\Ai\airi
pnpm --filter @proj-airi/i18n build
```

**效果**：
- 将最新的 base.yaml 编译到 dist 目录
- 生成新的 `dist/locales/zh-Hans/base.mjs` (39.61 kB)

### 修复3：重启应用

**必须**：完全重启桌面应用，而不是热重载

**原因**：
- 系统提示词在应用启动时加载
- 热重载不会重新加载 i18n 内容
- 必须完全重启才能加载新版本

---

## 验证步骤

### 1. 检查版本号是否更新

```bash
grep "SYSTEM_PROMPT_VERSION" packages/stage-ui/src/stores/modules/airi-card.ts
```

**期望输出**：
```
const SYSTEM_PROMPT_VERSION = '1.2.0'
```

### 2. 检查 i18n 是否重新构建

```bash
ls -lh packages/i18n/dist/locales/zh-Hans/base.mjs
```

**期望**：文件大小约 39.61 kB，修改时间是最近的

### 3. 重启应用并测试

**测试输入**：
```
你想搜点什么？
```

**期望输出**（正确）：
- 不使用编号格式
- 不反问 "你想要哪种"
- 直接按理解去搜索

**错误输出**（如果未修复）：
- "01 XXX 02 XXX 03 XXX"
- "你选一个我就去搜"
- "A/B/C"

---

## 预防措施

### 规则：修改 base.yaml 后的必做步骤

1. **重新构建 i18n**：
   ```bash
   pnpm --filter @proj-airi/i18n build
   ```

2. **更新版本号**：
   编辑 `packages/stage-ui/src/stores/modules/airi-card.ts`
   ```typescript
   const SYSTEM_PROMPT_VERSION = '1.X.X' // 增加版本号
   ```

3. **完全重启应用**：
   - 关闭所有窗口
   - 重新运行 `pnpm dev:tamagotchi`

4. **验证加载**：
   检查控制台输出：
   ```
   [AiriCard] Updating default card to version 1.X.X
   [AiriCard] New card description length: XXXXX
   ```

### 自动化建议

**未来改进**：
1. 在 base.yaml 文件头部添加版本号
2. 构建脚本自动检测 base.yaml 变化并更新版本号
3. 开发模式下监听 base.yaml 变化并自动重新构建
4. 添加系统提示词版本不匹配的警告

---

## 技术细节

### 系统提示词加载流程

```
1. 应用启动
   ↓
2. airi-card.ts initialize()
   ↓
3. 检查 SYSTEM_PROMPT_VERSION
   ↓
4. 如果版本不匹配 → 重新加载
   ↓
5. 调用 SystemPromptV2(t('base.prompt.prefix'), t('base.prompt.suffix'))
   ↓
6. t() 从 i18n 包加载 base.yaml 内容
   ↓
7. 生成 character card 的 description 字段
   ↓
8. LLM 使用 description 作为系统提示词
```

### 为什么需要版本号

**问题**：
- Character card 存储在 localStorage
- 如果不更新版本号，应用会认为已有的 card 是最新的
- 不会重新生成 description

**解决**：
- 版本号作为"脏标记"（dirty flag）
- 版本不匹配 → 重新生成 card
- 确保系统提示词始终是最新的

---

## 相关文件

- `packages/i18n/src/locales/zh-Hans/base.yaml` - 系统提示词源文件
- `packages/stage-ui/src/stores/modules/airi-card.ts` - 版本控制
- `packages/stage-ui/src/constants/prompts/system-v2.ts` - 提示词组装
- `packages/i18n/dist/locales/zh-Hans/base.mjs` - 编译后的文件

---

## 总结

**问题**：系统提示词未生效，因为版本号未更新

**修复**：
1. ✅ 更新版本号到 1.2.0
2. ✅ 重新构建 i18n 包
3. ⏳ 需要用户重启应用

**预期效果**：
- AI 将严格遵守 base.yaml 中的所有规则
- 不再使用编号格式
- 不再反问收集需求
- 像朋友聊天而不是客服

---

**修复完成时间**: 2026-03-16
**状态**: ✅ 代码已修复，等待用户重启应用验证
