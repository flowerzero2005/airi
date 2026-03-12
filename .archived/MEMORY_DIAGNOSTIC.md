# 记忆系统诊断指南

## 问题分析

发现了两个组件都注册了记忆提取钩子：

1. **Stage.vue** (主页面使用) - 第 466-511 行
2. **InteractiveArea.vue** (聊天页面使用) - 第 139-169 行

根据 MEMORY_FIX_SUMMARY.md，修复应用在 InteractiveArea.vue，但 Stage.vue 早就有钩子了。

## 诊断步骤

### 1. 确认当前使用的页面

在浏览器控制台运行：

```javascript
// 检查当前路由
console.log('当前路由:', window.location.pathname)
```

- 如果是 `/` 或 `/index` → 使用 Stage.vue
- 如果是 `/chat` → 使用 InteractiveArea.vue

### 2. 检查钩子是否注册

```javascript
// 检查 chat orchestrator store
const chatStore = window.__PINIA__?.state?.value?.['chat-orchestrator']
console.log('Chat hooks:', chatStore)
```

### 3. 手动触发记忆提取

```javascript
// 获取 memory manager 实例
const memoryManager = window.__PINIA__?.state?.value?.['memory-manager']
console.log('Memory Manager:', memoryManager)

// 手动测试记忆提取
if (memoryManager) {
  await memoryManager.processConversationTurn(
    '我叫张三，今年25岁',
    '你好张三！很高兴认识你。'
  )
}
```

### 4. 检查 IndexedDB 数据

```javascript
// 使用已有的调试工具
await window.debugNotebookStorage()
```

### 5. 检查 notebook store 状态

```javascript
// 获取 notebook store
const notebookStore = window.__PINIA__?.state?.value?.['character-notebook']
console.log('Notebook entries:', notebookStore?.entries)
console.log('Is loaded:', notebookStore?.isLoaded)
```

## 可能的问题

### 问题 1: 钩子未触发
**症状**: 控制台没有 `[InteractiveArea]` 或 `[Stage]` 日志

**原因**:
- 钩子注册失败
- 组件未挂载
- 使用了错误的页面

**解决**: 确认使用正确的页面，检查组件是否正常挂载

### 问题 2: 钩子触发但不保存
**症状**: 看到 `onChatTurnComplete 钩子被触发` 但没有 `保存记忆` 日志

**原因**:
- memoryManager.processConversationTurn 未被调用
- 函数内部出错
- notebook store 未加载

**解决**: 检查 memory-manager.ts 的实现

### 问题 3: 保存但不显示
**症状**: 看到 `数据已成功保存到 IndexedDB` 但页面不显示

**原因**:
- 页面未刷新数据
- 页面结构问题
- 数据格式不匹配

**解决**: 检查 memory/index.vue 的数据加载逻辑

## 下一步

根据诊断结果：

1. 如果钩子未触发 → 检查组件挂载和路由
2. 如果钩子触发但不保存 → 检查 memory-manager 实现
3. 如果保存但不显示 → 检查页面数据加载

## 快速测试命令

在控制台运行这个完整的诊断脚本：

```javascript
(async () => {
  console.group('🔍 记忆系统诊断')

  // 1. 路由
  console.log('📍 当前路由:', window.location.pathname)

  // 2. Pinia stores
  const pinia = window.__PINIA__?.state?.value
  console.log('📦 Pinia stores:', Object.keys(pinia || {}))

  // 3. Notebook store
  const notebook = pinia?.['character-notebook']
  console.log('📓 Notebook entries:', notebook?.entries?.length || 0)
  console.log('📓 Is loaded:', notebook?.isLoaded)

  // 4. Memory manager
  const memoryMgr = pinia?.['memory-manager']
  console.log('🧠 Memory manager exists:', !!memoryMgr)

  // 5. IndexedDB
  if (window.debugNotebookStorage) {
    console.log('🗄️ Running IndexedDB diagnostic...')
    await window.debugNotebookStorage()
  }

  console.groupEnd()
})()
```
