# 记忆存储流程测试指南

## 已完成的修复

### 1. 添加详细日志追踪
在以下文件中添加了详细的日志输出：

- `D:\Ai\airi\packages\stage-ui\src\stores\chat.ts` - 对话流程日志
- `D:\Ai\airi\packages\stage-ui\src\stores\chat\hooks.ts` - 钩子执行日志
- `D:\Ai\airi\packages\stage-ui\src\components\scenes\Stage.vue` - Stage 组件钩子日志
- `D:\Ai\airi\packages\stage-ui\src\stores\chat\memory-manager.ts` - 记忆管理器日志
- `D:\Ai\airi\packages\stage-ui\src\stores\character\notebook.ts` - Notebook store 日志
- `D:\Ai\airi\packages\stage-ui\src\database\repos\notebook.repo.ts` - IndexedDB 操作日志

### 2. 关键修复点
- ✅ 确保 notebook store 在使用前已加载（memory-manager.ts 中已添加）
- ✅ 添加完整的日志链路追踪
- ✅ 钩子注册和触发流程已验证

## 测试步骤

### 步骤 1: 打开浏览器开发者工具
1. 启动应用
2. 按 F12 打开开发者工具
3. 切换到 Console 标签

### 步骤 2: 发送测试消息
发送一条包含个人信息的消息，例如：
```
我叫张三，今年25岁，喜欢打篮球
```

### 步骤 3: 观察控制台日志
按顺序查找以下日志标记：

#### 3.1 对话流程开始
```
[Chat] ========== 准备触发 onChatTurnComplete 钩子 ==========
[Chat] 用户消息: ...
[Chat] 助手回复: ...
[Chat] 钩子数量: 1
```

#### 3.2 钩子执行
```
[ChatHooks] emitChatTurnCompleteHooks 被调用
[ChatHooks] 钩子数量: 1
[ChatHooks] 执行钩子 1/1
```

#### 3.3 Stage 组件处理
```
[Stage] ========== onChatTurnComplete 钩子被触发 ==========
[Stage] 用户消息长度: ...
[Stage] 助手消息长度: ...
[Stage] 开始处理对话记忆...
```

#### 3.4 记忆管理器处理
```
[MemoryManager] ========== processConversationTurn 被调用 ==========
[MemoryManager] 用户消息: ...
[MemoryManager] 助手消息: ...
[MemoryManager] 开始混合策略提取...
[MemoryManager] 提取结果: { importance: 'high', ... }
[MemoryManager] 准备保存记忆到 notebook store...
```

#### 3.5 Notebook Store 操作
```
[Notebook] addEntry 被调用
[Notebook] kind: focus
[Notebook] text: ...
[Notebook] 当前条目数: 0
[Notebook] 条目已添加，新条目数: 1
[Notebook] watch 回调被触发
[Notebook] 调用 debouncedSave
[Notebook] 已设置 500ms 防抖定时器
```

#### 3.6 IndexedDB 保存（500ms 后）
```
[Notebook] 防抖定时器触发，执行 saveToStorage
[Notebook] saveToStorage 被调用
[Notebook] 开始保存到 IndexedDB...
[NotebookRepo] save 被调用
[NotebookRepo] characterId: default
[NotebookRepo] entries.length: 1
[NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========
[Notebook] 保存成功！
```

#### 3.7 完成标记
```
[Stage] 记忆处理完成
[Stage] ========== onChatTurnComplete 钩子执行完毕 ==========
[Chat] ========== onChatTurnComplete 钩子已触发 ==========
```

### 步骤 4: 验证 IndexedDB 数据
在控制台中运行：
```javascript
// 查看 IndexedDB 中的数据
const notebookStore = localforage.createInstance({
  name: 'airi-notebook',
  storeName: 'notebooks',
  driver: [localforage.INDEXEDDB]
})

notebookStore.getItem('notebook-default').then((data) => {
  console.log('IndexedDB 中的数据:', data)
  console.log('记忆条目数:', data?.entries?.length || 0)
  if (data?.entries?.length > 0) {
    console.log('最新记忆:', data.entries[data.entries.length - 1])
  }
})
```

## 常见问题排查

### 问题 1: 钩子数量为 0
**症状**: `[Chat] 钩子数量: 0`

**原因**: Stage.vue 组件未挂载或钩子未注册

**解决方案**:
1. 确认 Stage.vue 组件已渲染
2. 检查组件是否正确导入了 `useChatOrchestratorStore`
3. 查看是否有组件挂载错误

### 问题 2: notebook store 未加载
**症状**: `[MemoryManager] Notebook store 尚未加载`

**原因**: notebook store 初始化时间过长

**解决方案**:
- 已在 memory-manager.ts 中添加了等待加载的逻辑
- 如果持续出现，检查 IndexedDB 是否可用

### 问题 3: 记忆提取失败
**症状**: `[MemoryManager] 未检测到重要信息`

**原因**: 消息内容不符合提取规则

**解决方案**:
- 发送包含明确个人信息的消息
- 检查 `memory-hybrid.ts` 中的提取规则

### 问题 4: IndexedDB 保存失败
**症状**: `[NotebookRepo] Error during save`

**原因**: IndexedDB 权限或存储空间问题

**解决方案**:
1. 检查浏览器是否允许 IndexedDB
2. 清理浏览器缓存后重试
3. 检查存储空间是否充足

## 手动测试脚本

如果需要手动测试 IndexedDB 保存，可以在控制台运行：

```javascript
// 手动保存测试记忆
const notebookStore = localforage.createInstance({
  name: 'airi-notebook',
  storeName: 'notebooks',
  driver: [localforage.INDEXEDDB]
})

const testData = {
  entries: [
    {
      id: `test-${Date.now()}`,
      kind: 'note',
      text: '这是一条手动测试记忆',
      createdAt: Date.now(),
      tags: ['测试'],
      metadata: { test: true }
    }
  ],
  tasks: [],
  version: 1,
  lastSyncedAt: Date.now()
}

notebookStore.setItem('notebook-default', testData)
  .then(() => console.log('✅ 测试数据保存成功'))
  .catch(err => console.error('❌ 保存失败:', err))
```

## 预期结果

完整的记忆存储流程应该：
1. ✅ 对话完成后自动触发钩子
2. ✅ 提取对话中的重要信息
3. ✅ 保存到 notebook store
4. ✅ 500ms 后自动保存到 IndexedDB
5. ✅ 可以在 IndexedDB 中查询到数据

如果所有日志都正常输出，说明记忆存储流程已正常工作。
