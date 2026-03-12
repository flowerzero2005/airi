# 记忆系统完整数据流验证

## 修复内容

### 问题诊断
发现 `notebookStore` 的 `loadFromStorage()` 是异步调用但未等待完成，导致 `isLoaded` 标志可能在第一次保存时仍为 `false`，使得 watch 回调跳过保存操作。

### 修复措施
1. 在 `memory-manager.ts` 初始化时检查并等待 notebook store 加载
2. 在 `processConversationTurn` 开始时确保 notebook store 已加载

## 完整数据流与日志点

### 1. 用户发送消息
**文件**: `InteractiveArea.vue`
**函数**: `handleSend()` (line 43)

```
[InteractiveArea] 用户点击发送
↓
调用 chatOrchestrator.ingest()
```

---

### 2. 消息进入队列
**文件**: `chat.ts` (orchestrator)
**函数**: `ingest()` (line 389)

```
[Chat] ingest 被调用
↓
创建 QueuedSend 对象
↓
sendQueue.enqueue()
```

---

### 3. 队列处理消息
**文件**: `chat.ts`
**函数**: `performSend()` (line 100)

**日志点**:
- `[Chat] performSend 开始`
- `[Chat] Injecting memory context`
- `[Chat] 准备触发 onChatTurnComplete 钩子` (line 363)
- `[Chat] 用户消息: ...`
- `[Chat] 助手回复: ...`
- `[Chat] 钩子数量: ...`

```
performSend()
↓
注入上下文
↓
发送到 LLM
↓
流式接收响应
↓
await hooks.emitChatTurnCompleteHooks() (line 368)
```

---

### 4. 触发钩子系统
**文件**: `hooks.ts`
**函数**: `emitChatTurnCompleteHooks()` (line 189)

**日志点**:
- `[ChatHooks] emitChatTurnCompleteHooks 被调用` (line 190)
- `[ChatHooks] 钩子数量: ...` (line 191)
- `[ChatHooks] 执行钩子 1/N` (line 194)
- `[ChatHooks] 钩子 1 执行成功` (line 197)
- `[ChatHooks] 所有钩子执行完毕` (line 203)

```
emitChatTurnCompleteHooks()
↓
遍历所有注册的钩子
↓
await hook(chat, context)
```

---

### 5. Stage 组件钩子
**文件**: `Stage.vue`
**函数**: `onChatTurnComplete` 回调 (line 464)

**日志点**:
- `[Stage] ========== onChatTurnComplete 钩子被触发 ==========` (line 465)
- `[Stage] 用户消息长度: ...` (line 477)
- `[Stage] 助手消息长度: ...` (line 478)
- `[Stage] 用户消息预览: ...` (line 479)
- `[Stage] 助手消息预览: ...` (line 480)
- `[Stage] 开始处理对话记忆...` (line 487)
- `[Stage] 记忆处理完成` (line 492)
- `[Stage] ========== onChatTurnComplete 钩子执行完毕 ==========` (line 501)

```
onChatTurnComplete 回调
↓
提取用户消息和助手消息
↓
调用 memoryManager.processConversationTurn()
```

---

### 6. 记忆管理器处理
**文件**: `memory-manager.ts`
**函数**: `processConversationTurn()` (line 32)

**日志点**:
- `[MemoryManager] ========== processConversationTurn 被调用 ==========` (line 36)
- `[MemoryManager] 用户消息: ...` (line 37)
- `[MemoryManager] 助手消息: ...` (line 38)
- `[MemoryManager] 等待 notebook store 加载...` (新增)
- `[MemoryManager] Notebook store 加载完成，isLoaded: true` (新增)
- `[MemoryManager] 开始混合策略提取...` (line 63)
- `[MemoryManager] 提取结果: ...` (line 68)
- `[MemoryManager] 检查重复...` (line 80)
- `[MemoryManager] 准备保存记忆到 notebook store...` (line 89)
- `[MemoryManager] 添加焦点条目...` / `[MemoryManager] 添加笔记条目...` (line 94/108)
- `[MemoryManager] 焦点条目已添加` / `[MemoryManager] 笔记条目已添加` (line 104/118)
- `[MemoryManager] 当前记忆总数: ...` (line 125)
- `[MemoryManager] ========== 处理完成 ==========` (line 135)

```
processConversationTurn()
↓
确保 notebook store 已加载 (新增)
↓
输入验证
↓
调用 hybridMemoryExtraction()
↓
检查重复
↓
调用 notebookStore.addFocusEntry() 或 addNote()
```

---

### 7. Notebook Store 添加条目
**文件**: `notebook.ts`
**函数**: `addEntry()` (line 138)

**日志点**:
- `[Notebook] addEntry 被调用` (line 139)
- `[Notebook] kind: ...` (line 140)
- `[Notebook] text: ...` (line 141)
- `[Notebook] 当前条目数: ...` (line 142)
- `[Notebook] 条目已添加，新条目数: ...` (line 154)
- `[Notebook] isLoaded: ...` (line 155)
- `[Notebook] 将触发 watch 回调进行保存` (line 156)

```
addEntry()
↓
创建 NotebookEntry 对象
↓
entries.value.push(entry)
↓
触发 Vue 响应式系统
```

---

### 8. Watch 回调触发
**文件**: `notebook.ts`
**Watch**: `watch([entries, tasks], ...)` (line 120)

**日志点**:
- `[Notebook] watch 回调被触发` (line 121)
- `[Notebook] isLoaded: ...` (line 122)
- `[Notebook] entries.length: ...` (line 123)
- `[Notebook] tasks.length: ...` (line 124)
- `[Notebook] 调用 debouncedSave` (line 127)

```
watch 回调
↓
检查 isLoaded
↓
调用 debouncedSave()
```

---

### 9. 防抖保存
**文件**: `notebook.ts`
**函数**: `debouncedSave()` (line 105)

**日志点**:
- `[Notebook] debouncedSave 被调用` (line 106)
- `[Notebook] 清除之前的定时器` (line 108)
- `[Notebook] 已设置 500ms 防抖定时器` (line 116)
- `[Notebook] 防抖定时器触发，执行 saveToStorage` (line 112)

```
debouncedSave()
↓
清除旧定时器
↓
设置 500ms 延迟
↓
setTimeout 触发后调用 saveToStorage()
```

---

### 10. 保存到存储
**文件**: `notebook.ts`
**函数**: `saveToStorage()` (line 69)

**日志点**:
- `[Notebook] saveToStorage 被调用` (line 70)
- `[Notebook] isSaving: ...` (line 71)
- `[Notebook] isLoaded: ...` (line 72)
- `[Notebook] 开始保存到 IndexedDB...` (line 81)
- `[Notebook] characterId: ...` (line 82)
- `[Notebook] entries.length: ...` (line 83)
- `[Notebook] 保存成功！` (line 91)
- `[Notebook] Saved to storage: N entries` (line 92)
- `[Notebook] isSaving 重置为 false` (line 100)

```
saveToStorage()
↓
检查 isSaving 和 isLoaded
↓
调用 notebookRepo.save()
```

---

### 11. Repository 保存
**文件**: `notebook.repo.ts`
**函数**: `save()` (line 44)

**日志点**:
- `[NotebookRepo] save 被调用` (line 45)
- `[NotebookRepo] characterId: ...` (line 46)
- `[NotebookRepo] entries.length: ...` (line 47)
- `[NotebookRepo] tasks.length: ...` (line 48)
- `[NotebookRepo] 存储键: ...` (line 61)
- `[NotebookRepo] 当前版本: ...` (line 67)
- `[NotebookRepo] 准备保存数据，新版本: ...` (line 77)
- `[NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========` (line 79)

```
notebookRepo.save()
↓
验证参数
↓
获取当前版本
↓
structuredClone 数据
↓
await notebookStore.setItem(key, saveData)
↓
IndexedDB 写入完成
```

---

## 测试步骤

1. 打开浏览器开发者工具控制台
2. 发送一条测试消息，例如："我叫张三，今年25岁"
3. 等待 AI 回复完成
4. 观察控制台日志，按照上述流程验证每个步骤

## 预期日志输出顺序

```
[Chat] 准备触发 onChatTurnComplete 钩子
[Chat] 用户消息: 我叫张三，今年25岁
[Chat] 助手回复: ...
[ChatHooks] emitChatTurnCompleteHooks 被调用
[ChatHooks] 钩子数量: 1
[ChatHooks] 执行钩子 1/1
[Stage] ========== onChatTurnComplete 钩子被触发 ==========
[Stage] 用户消息长度: 15
[Stage] 助手消息长度: ...
[Stage] 开始处理对话记忆...
[MemoryManager] ========== processConversationTurn 被调用 ==========
[MemoryManager] Notebook store 加载完成，isLoaded: true
[MemoryManager] 开始混合策略提取...
[MemoryManager] 提取结果: { summary: "...", importance: "high", ... }
[MemoryManager] 准备保存记忆到 notebook store...
[MemoryManager] 添加焦点条目...
[Notebook] addEntry 被调用
[Notebook] 条目已添加，新条目数: 1
[Notebook] watch 回调被触发
[Notebook] isLoaded: true
[Notebook] 调用 debouncedSave
[Notebook] debouncedSave 被调用
[Notebook] 已设置 500ms 防抖定时器
[MemoryManager] 焦点条目已添加
[MemoryManager] 当前记忆总数: 1
[MemoryManager] ========== 处理完成 ==========
[Stage] 记忆处理完成
[ChatHooks] 钩子 1 执行成功
[ChatHooks] 所有钩子执行完毕
[Chat] ========== onChatTurnComplete 钩子已触发 ==========

(500ms 后)
[Notebook] 防抖定时器触发，执行 saveToStorage
[Notebook] saveToStorage 被调用
[Notebook] 开始保存到 IndexedDB...
[NotebookRepo] save 被调用
[NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========
[Notebook] 保存成功！
```

## 关键修复点

### 修复前的问题
- `notebookStore.loadFromStorage()` 在 store 初始化时被调用，但是异步且未等待
- 第一次保存时 `isLoaded` 可能仍为 `false`
- watch 回调检查 `isLoaded` 并跳过保存

### 修复后的保障
1. **Memory Manager 初始化时**: 检查 `isLoaded`，如果未加载则等待
2. **processConversationTurn 开始时**: 再次确保 `isLoaded` 为 `true`
3. **双重保障**: 确保在任何记忆保存操作前，notebook store 已完全加载

## 验证成功标志

如果看到以下日志序列，说明数据流完整：
1. ✅ `[MemoryManager] processConversationTurn 被调用`
2. ✅ `[MemoryManager] Notebook store 加载完成，isLoaded: true`
3. ✅ `[Notebook] addEntry 被调用`
4. ✅ `[Notebook] watch 回调被触发`
5. ✅ `[Notebook] isLoaded: true`
6. ✅ `[Notebook] 调用 debouncedSave`
7. ✅ `[NotebookRepo] 数据已成功保存到 IndexedDB`

如果任何步骤缺失或出现错误，日志会明确指出问题所在。
