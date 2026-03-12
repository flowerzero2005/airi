# AIRI 记忆系统调试指南

## 问题描述
记忆没有保存到长期记忆数据库（IndexedDB）。需要追踪从对话完成到数据库写入的完整流程。

## 已添加的调试日志

### 1. 对话入口点
- **语音输入** (`apps/stage-tamagotchi/src/renderer/pages/index.vue`)
  - 第 249-263 行：流式转录处理
  - 第 282-303 行：录音转录处理

- **文字输入** (`apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue`)
  - 第 40-81 行：handleSend 函数

### 2. Chat Store (`packages/stage-ui/src/stores/chat.ts`)
- 第 366-384 行：`ingest` 函数入口
- 第 100-108 行：`performSend` 函数入口和早期返回检查
- 第 123-129 行：generation 验证
- 第 171-177 行：session messages 获取前的检查
- 第 289-296 行：LLM stream 开始前的检查
- 第 329-341 行：消息保存逻辑和条件判断
- 第 338-351 行：Hook 触发

### 3. Chat Hooks (`packages/stage-ui/src/stores/chat/hooks.ts`)
- 第 189-196 行：`emitChatTurnCompleteHooks` 执行

### 4. Stage.vue (`packages/stage-ui/src/components/scenes/Stage.vue`)
- 第 85 行：组件 setup 日志
- 第 555-584 行：`onChatTurnComplete` hook 注册和执行

## 测试步骤

### 方法 1：使用文字输入测试
1. 启动 AIRI 应用
2. 打开开发者工具（F12）
3. 打开聊天窗口（Chat 页面）
4. 在输入框中输入一条消息，例如："你好"
5. 按 Enter 发送
6. 观察控制台输出

### 方法 2：使用语音输入测试
1. 启动 AIRI 应用
2. 打开开发者工具（F12）
3. 在主窗口启用语音输入
4. 说一句话
5. 等待 AI 回复完成
6. 观察控制台输出

## 预期的日志流程

如果一切正常，你应该看到以下日志序列：

```
[InteractiveArea] handleSend called
[InteractiveArea] Getting provider config...
[InteractiveArea] Calling ingest with text: 你好
[Chat] ingest called with message: 你好
[Chat] performSend called with message: 你好
[Chat] performSend proceeding - generation valid
[Chat] Getting session messages
[Chat] Starting LLM stream
[Chat] Parser ended, buildingMessage slices: X
[Chat] isStaleGeneration: false
[Chat] Saving message to session
[Chat] About to emit hooks
[Chat] About to call emitChatTurnCompleteHooks
[ChatHooks] emitChatTurnCompleteHooks called, hooks count: 1
[ChatHooks] Executing hook...
[Stage] onChatTurnComplete triggered!
[Stage] Messages extracted: { user: '你好', assistant: '...' }
[Stage] Calling memory manager...
[ChatHooks] All hooks executed
[Chat] emitChatTurnCompleteHooks completed
[Stage] Memory processing completed
[InteractiveArea] Ingest completed
```

## 可能的问题点

### 1. performSend 没有被调用
- 检查 `ingest` 是否被调用
- 检查 sendQueue 是否正常工作

### 2. performSend 提前返回
- 检查是否有 "early return" 或 "aborted" 日志
- 检查 generation 是否匹配
- 检查消息是否为空

### 3. buildingMessage.slices.length === 0
- 检查 LLM 是否正常返回内容
- 检查 parser 是否正常工作
- 这种情况下消息不会被保存，但 hook 仍应该被触发

### 4. Hook 没有被注册
- 检查 Stage.vue 是否被正确加载
- 检查 `onChatTurnComplete` 注册日志
- 检查 hooks count 是否 > 0

### 5. Hook 被注册但没有执行
- 检查 `emitChatTurnCompleteHooks` 是否被调用
- 检查是否有错误抛出

## 下一步行动

根据控制台日志，确定问题发生在哪个环节：

1. **如果 `ingest` 没有被调用**：
   - 检查对话入口（语音或文字输入）
   - 检查 provider 和 model 是否配置正确

2. **如果 `performSend` 提前返回**：
   - 检查返回原因（日志会显示）
   - 修复相应的条件判断

3. **如果 hook 没有被注册**：
   - 检查 Stage.vue 是否被加载
   - 检查组件生命周期

4. **如果 hook 被注册但没有执行**：
   - 检查 `emitChatTurnCompleteHooks` 调用
   - 检查是否有异常

## 记忆系统文件位置

- **Memory Manager**: `D:\Ai\airi\packages\stage-ui\src\stores\chat\memory-manager.ts`
- **Database Repos**: `D:\Ai\airi\packages\stage-ui\src\database\repos\`
- **Database Schema**: `D:\Ai\airi\packages\stage-ui\src\database\schema.ts`
- **数据库文件**: `%APPDATA%\airi-notebook\airi-notebook.db`

## 验证记忆是否保存

### 方法 1: 使用浏览器开发者工具检查 IndexedDB

1. 打开开发者工具（F12）
2. 切换到 Application 标签页
3. 展开 IndexedDB
4. 找到 `airi-notebook` 数据库
5. 查看 `notebooks` 对象存储
6. 检查 `notebook-default` 键的值

### 方法 2: 在控制台中查询

```javascript
// 查看当前记忆
const notebookStore = useCharacterNotebookStore()
console.log('当前记忆数:', notebookStore.entries.length)
console.log('isLoaded:', notebookStore.isLoaded)
console.log('isSaving:', notebookStore.isSaving)

// 手动添加记忆测试
notebookStore.addNote('测试记忆', { tags: ['测试'] })

// 强制保存
await notebookStore.saveToStorage()
```

### 方法 3: 使用诊断页面

访问记忆设置页面（Settings > Memory），可以看到：
- 当前记忆总数
- Notebook Store 加载状态
- 所有记忆条目

## 新增的详细调试日志

所有关键步骤都使用 `console.error` 输出（红色日志），确保在控制台中可见。

### 查找以下前缀的日志：

1. **[Stage]** - Stage 组件的钩子调用
2. **[MemoryManager]** - 记忆管理器的处理流程
3. **[Notebook]** - Notebook store 的操作
4. **[NotebookRepo]** - IndexedDB 的读写操作

### 完整的日志流程

正常情况下应该看到以下日志序列：

```
1. [Stage] ========== onChatTurnComplete 钩子被触发 ==========
2. [MemoryManager] ========== processConversationTurn 被调用 ==========
3. [MemoryManager] ========== 添加焦点条目 ========== 或 添加笔记条目
4. [Notebook] ========== addEntry 被调用 ==========
5. [Notebook] ========== WATCH 回调被触发 ==========
6. [Notebook] ========== debouncedSave 被调用 ==========
7. （等待 500ms）
8. [Notebook] ========== 防抖定时器触发，执行 saveToStorage ==========
9. [NotebookRepo] ========== save 被调用 ==========
10. [NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========
```

### 诊断失败点

#### 失败点 1: processConversationTurn 没有被调用
**症状：** 没有看到 `[MemoryManager] processConversationTurn 被调用`

**可能原因：**
- onChatTurnComplete 钩子没有触发
- Stage.vue 没有正确加载
- 钩子注册失败

**检查：**
- 查看是否有 `[Stage] onChatTurnComplete 钩子被触发`
- 查看 Stage.vue 是否被加载

#### 失败点 2: addEntry 没有被调用
**症状：** 看到 processConversationTurn 被调用，但没有看到 `[Notebook] addEntry 被调用`

**可能原因：**
- 记忆提取没有检测到重要信息
- 记忆被判定为重复
- notebookStore 未正确初始化

**检查：**
- 查看 `[MemoryManager]` 日志中的提取结果
- 查看是否有 "未检测到重要信息" 或 "发现重复记忆" 的日志

#### 失败点 3: watch 回调没有触发
**症状：** 看到 addEntry 被调用，但没有看到 `[Notebook] WATCH 回调被触发`

**可能原因：**
- Vue 响应式系统没有检测到变化
- entries 不是响应式的
- isLoaded 为 false

**检查：**
- 查看 addEntry 日志中的 `isLoaded` 状态
- 查看数组长度是否真的增加了

#### 失败点 4: debouncedSave 没有被调用
**症状：** 看到 watch 回调触发，但没有看到 `[Notebook] debouncedSave 被调用`

**可能原因：**
- isLoaded 为 false
- watch 回调中的条件判断失败

**检查：**
- 查看 watch 回调日志中的 `isLoaded` 状态

#### 失败点 5: saveToStorage 没有执行
**症状：** 看到 debouncedSave 被调用，但 500ms 后没有看到 saveToStorage

**可能原因：**
- 防抖定时器被清除
- 页面导航或组件卸载

**检查：**
- 查看定时器 ID
- 等待足够长的时间（至少 1 秒）

#### 失败点 6: IndexedDB 写入失败
**症状：** 看到 saveToStorage 被调用，但没有看到 "数据已成功保存"

**可能原因：**
- isSaving 为 true（正在保存中）
- isLoaded 为 false
- IndexedDB 权限问题
- 存储空间不足

**检查：**
- 查看 saveToStorage 日志中的 `isSaving` 和 `isLoaded` 状态
- 查看是否有错误日志
- 检查浏览器 IndexedDB 设置

## 手动测试脚本

在浏览器控制台中运行以下命令进行测试：

```javascript
// 1. 测试 IndexedDB 直接写入
window.testIndexedDB()

// 2. 测试添加记忆
const notebookStore = useCharacterNotebookStore()
notebookStore.addNote('手动测试记忆', { tags: ['测试'] })

// 3. 等待 1 秒后检查
setTimeout(() => {
  console.log('当前记忆数:', notebookStore.entries.length)
}, 1000)

// 4. 强制保存
await notebookStore.saveToStorage()
```
