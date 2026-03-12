# AIRI 记忆系统集成 - 完整调试方案

## 执行摘要

已完成对 AIRI 项目记忆系统的全面调试准备工作。通过在关键路径上添加详细的日志追踪，现在可以精确定位记忆提取功能未被触发的原因。

## 已完成的工作

### 1. 识别对话流程入口

找到了两个主要的对话入口点：

#### 语音输入路径
- **文件**: `D:\Ai\airi\apps\stage-tamagotchi\src\renderer\pages\index.vue`
- **流式转录**: 第 239-269 行（实时语音转文字）
- **录音转录**: 第 282-303 行（录音完成后转文字）
- **调用**: `chatStore.ingest(text, { model, chatProvider })`

#### 文字输入路径
- **文件**: `D:\Ai\airi\apps\stage-tamagotchi\src\renderer\components\InteractiveArea.vue`
- **函数**: `handleSend()` 第 40-81 行
- **调用**: `ingest(textToSend, { model, chatProvider, providerConfig, attachments, tools })`

### 2. 添加完整的日志追踪链

#### Chat Orchestrator Store
**文件**: `D:\Ai\airi\packages\stage-ui\src\stores\chat.ts`

添加了以下关键日志点：
- `ingest()` 函数入口（第 371 行）
- `performSend()` 函数入口和参数（第 106 行）
- 早期返回检查（第 108 行）
- Generation 验证（第 125-129 行）
- Session messages 获取前检查（第 173-177 行）
- LLM stream 开始前检查（第 293-296 行）
- 消息保存逻辑和条件（第 333-341 行）
- Hook 触发前后（第 343-351 行）

#### Chat Hooks
**文件**: `D:\Ai\airi\packages\stage-ui\src\stores\chat\hooks.ts`

添加了 hook 执行追踪（第 189-196 行）：
- Hook 数量统计
- 每个 hook 的执行状态

#### Stage Component
**文件**: `D:\Ai\airi\packages\stage-ui\src\components\scenes\Stage.vue`

记忆系统集成点（第 555-584 行）：
- Hook 注册确认
- Hook 触发确认
- 消息提取日志
- Memory manager 调用追踪

### 3. 关键发现

#### 对话流程
```
用户输入（语音/文字）
  ↓
chatStore.ingest()
  ↓
sendQueue.enqueue()
  ↓
performSend()
  ↓
LLM stream
  ↓
parser.end()
  ↓
保存消息（如果 slices.length > 0）
  ↓
触发 hooks
  ↓
onChatTurnComplete
  ↓
memoryManager.processConversationTurn()
```

#### 潜在问题点

1. **performSend 可能提前返回的条件**:
   - 消息为空且无附件（第 107 行）
   - Generation 不匹配（第 125 行）
   - 多个 `shouldAbort()` 检查点

2. **消息保存条件**（第 333 行）:
   ```typescript
   if (!isStaleGeneration() && buildingMessage.slices.length > 0)
   ```
   - 如果 LLM 没有返回内容，slices 为空
   - 但 hook 仍会被触发（第 346 行）

3. **Hook 系统**:
   - Hook 注册在 Stage.vue 组件 setup 时
   - 如果组件未加载，hook 不会被注册
   - Hook 数量应该 >= 1

## 测试方法

### 快速测试（推荐）

1. 启动 AIRI 应用
2. 打开开发者工具（F12）
3. 在聊天窗口输入："你好"
4. 观察控制台日志

### 预期日志序列

```
[InteractiveArea] handleSend called
[InteractiveArea] Calling ingest with text: 你好
[Chat] ingest called with message: 你好
[Chat] performSend called with message: 你好
[Chat] performSend proceeding - generation valid
[Chat] Starting LLM stream
[Chat] Parser ended, buildingMessage slices: 1
[Chat] Saving message to session
[Chat] About to call emitChatTurnCompleteHooks
[ChatHooks] emitChatTurnCompleteHooks called, hooks count: 1
[Stage] onChatTurnComplete triggered!
[Stage] Calling memory manager...
[MemoryManager] processConversationTurn called
[MemoryManager] Calling hybridMemoryExtraction...
```

### 诊断指南

根据日志中断的位置，可以快速定位问题：

| 日志中断位置 | 可能原因 | 解决方向 |
|------------|---------|---------|
| `ingest` 未调用 | 对话入口问题 | 检查 provider/model 配置 |
| `performSend` 未调用 | sendQueue 问题 | 检查队列机制 |
| `performSend` 提前返回 | 条件检查失败 | 查看具体返回原因日志 |
| `emitChatTurnCompleteHooks` 未调用 | performSend 异常退出 | 检查 try-catch 块 |
| hooks count: 0 | Stage.vue 未加载 | 检查组件生命周期 |
| `onChatTurnComplete` 未触发 | Hook 执行失败 | 检查 hook 数组 |
| `MemoryManager` 未调用 | Hook 内部错误 | 检查 Stage.vue 的 hook 实现 |

## 文件清单

### 修改的文件
1. `D:\Ai\airi\packages\stage-ui\src\stores\chat.ts` - 添加详细日志
2. `D:\Ai\airi\packages\stage-ui\src\stores\chat\hooks.ts` - 添加 hook 执行日志
3. `D:\Ai\airi\apps\stage-tamagotchi\src\renderer\pages\index.vue` - 添加语音输入日志
4. `D:\Ai\airi\apps\stage-tamagotchi\src\renderer\components\InteractiveArea.vue` - 添加文字输入日志

### 记忆系统核心文件（已存在，未修改）
1. `D:\Ai\airi\packages\stage-ui\src\stores\chat\memory-manager.ts` - 记忆管理器
2. `D:\Ai\airi\packages\stage-ui\src\stores\chat\memory-hybrid.ts` - 混合提取策略
3. `D:\Ai\airi\packages\stage-ui\src\stores\chat\memory-heuristics.ts` - 启发式规则
4. `D:\Ai\airi\packages\stage-ui\src\stores\chat\memory-extractor.ts` - LLM 提取器
5. `D:\Ai\airi\packages\stage-ui\src\stores\character\notebook.ts` - Notebook store
6. `D:\Ai\airi\packages\stage-ui\src\database\repos\` - 数据库仓库
7. `D:\Ai\airi\packages\stage-ui\src\components\scenes\Stage.vue` - Hook 注册点（第 555-584 行）

### 新创建的文档
1. `D:\Ai\airi\MEMORY_DEBUG_GUIDE.md` - 详细调试指南
2. `D:\Ai\airi\MEMORY_INTEGRATION_SUMMARY.md` - 本文档

## 下一步行动

### 立即执行
1. **运行测试**: 启动应用并发送一条消息
2. **收集日志**: 复制完整的控制台输出
3. **定位问题**: 根据日志中断位置确定问题环节

### 根据测试结果

#### 场景 A: Hook 从未被触发
- 检查 `performSend` 是否完整执行
- 检查是否有异常抛出
- 检查 `emitChatTurnCompleteHooks` 调用

#### 场景 B: Hook 被触发但 count 为 0
- 检查 Stage.vue 是否被加载
- 检查组件生命周期
- 检查 hook 注册时机

#### 场景 C: Hook 执行但 Memory Manager 未调用
- 检查 Stage.vue 中的 hook 实现
- 检查消息提取逻辑
- 检查是否有错误被捕获

#### 场景 D: Memory Manager 被调用但没有保存
- 检查 `hybridMemoryExtraction` 返回值
- 检查重要性判断逻辑
- 检查数据库连接

## 技术细节

### Hook 系统工作原理

1. **注册阶段**（Stage.vue setup）:
   ```typescript
   chatHookCleanups.push(onChatTurnComplete(async (chat, context) => {
     // 处理逻辑
   }))
   ```

2. **触发阶段**（chat.ts performSend）:
   ```typescript
   await hooks.emitChatTurnCompleteHooks({
     output: { ...buildingMessage },
     outputText: fullText,
     toolCalls: sessionMessagesForSend.filter(msg => msg.role === 'tool')
   }, streamingMessageContext)
   ```

3. **执行阶段**（hooks.ts）:
   ```typescript
   for (const hook of onChatTurnCompleteHooks) {
     await hook(chat, context)
   }
   ```

### 记忆提取流程

1. **触发**: 对话完成后 `onChatTurnComplete` hook 被调用
2. **提取**: `memoryManager.processConversationTurn()` 调用 `hybridMemoryExtraction()`
3. **判断**: 根据重要性（high/medium/low）决定存储类型
4. **保存**: 调用 `notebookStore.addFocusEntry()` 或 `addNoteEntry()`
5. **持久化**: 通过 database repos 保存到 SQLite

### 数据库结构

- **表名**: `notebook_entries`
- **位置**: `%APPDATA%\airi-notebook\airi-notebook.db`
- **字段**: id, character_id, type, text, tags, metadata, created_at, updated_at

## 成功标准

记忆系统正常工作的标志：

1. ✅ 控制台显示完整的日志链
2. ✅ `hooks count: 1` 或更多
3. ✅ `[Stage] onChatTurnComplete triggered!`
4. ✅ `[MemoryManager] Memory extracted`
5. ✅ `[MemoryManager] Saved as FOCUS/NOTE`
6. ✅ 数据库中有新记录

## 联系信息

如果需要进一步的帮助，请提供：
1. 完整的控制台日志（从发送消息到完成）
2. 日志中断的具体位置
3. 任何错误信息或异常堆栈

---

**创建时间**: 2026-03-11
**状态**: 准备测试
**下一步**: 运行应用并收集日志
