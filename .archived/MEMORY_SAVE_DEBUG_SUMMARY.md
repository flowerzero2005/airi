# 记忆保存调试 - 修改总结

## 问题
记忆没有保存到长期记忆数据库（IndexedDB）。

## 已完成的修改

### 1. 增强日志输出

将所有关键步骤的日志从 `console.log` 改为 `console.error`，确保在控制台中醒目显示（红色）。

#### 修改的文件：

**D:\Ai\airi\packages\stage-ui\src\stores\character\notebook.ts**
- `addEntry` 函数：添加详细的调用栈和状态信息
- `watch` 回调：添加调用栈，显示触发时机
- `debouncedSave` 函数：显示定时器 ID
- `saveToStorage` 函数：添加调用栈和详细状态

**D:\Ai\airi\packages\stage-ui\src\database\repos\notebook.repo.ts**
- `save` 函数：添加调用栈和详细的保存流程日志

**D:\Ai\airi\packages\stage-ui\src\stores\chat\memory-manager.ts**
- `addFocusEntry` 和 `addNote` 调用：添加调用栈

### 2. 创建测试工具

**D:\Ai\airi\packages\stage-ui\src\database\test-indexeddb-direct.ts**
- 直接测试 IndexedDB 读写功能
- 可在浏览器控制台调用 `window.testIndexedDB()`

**D:\Ai\airi\packages\stage-pages\src\pages\settings\memory\diagnostics.vue**
- 实时诊断页面
- 显示系统状态
- 提供测试按钮
- 显示操作日志

### 3. 更新调试指南

**D:\Ai\airi\MEMORY_DEBUG_GUIDE.md**
- 详细的调试步骤
- 6 个可能的失败点分析
- 手动测试脚本
- 预期的日志流程

## 使用方法

### 步骤 1: 启动应用并打开控制台
1. 启动 AIRI 应用
2. 按 F12 打开开发者工具
3. 切换到 Console 标签页

### 步骤 2: 进行对话测试
1. 与 AI 进行一次对话
2. 等待对话完成
3. 观察控制台中的红色日志

### 步骤 3: 分析日志
查找以下日志序列：

```
[Stage] ========== onChatTurnComplete 钩子被触发 ==========
[MemoryManager] ========== processConversationTurn 被调用 ==========
[MemoryManager] ========== 添加焦点条目 ========== 或 添加笔记条目
[Notebook] ========== addEntry 被调用 ==========
[Notebook] ========== WATCH 回调被触发 ==========
[Notebook] ========== debouncedSave 被调用 ==========
（等待 500ms）
[Notebook] ========== 防抖定时器触发，执行 saveToStorage ==========
[NotebookRepo] ========== save 被调用 ==========
[NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========
```

### 步骤 4: 确定失败点
根据日志中断的位置，确定具体在哪一步失败：

1. **processConversationTurn 没有被调用** → 钩子问题
2. **addEntry 没有被调用** → 记忆提取问题
3. **watch 回调没有触发** → Vue 响应式问题
4. **debouncedSave 没有被调用** → isLoaded 状态问题
5. **saveToStorage 没有执行** → 定时器问题
6. **IndexedDB 写入失败** → 数据库权限或状态问题

### 步骤 5: 使用诊断工具

#### 方法 A: 使用诊断页面
访问记忆设置页面，使用测试按钮：
- 测试添加记忆
- 测试对话处理
- 强制保存
- 强制加载

#### 方法 B: 使用控制台命令
```javascript
// 测试 IndexedDB
window.testIndexedDB()

// 查看当前状态
const notebookStore = useCharacterNotebookStore()
console.log('记忆数:', notebookStore.entries.length)
console.log('isLoaded:', notebookStore.isLoaded)
console.log('isSaving:', notebookStore.isSaving)

// 手动添加并保存
notebookStore.addNote('测试', { tags: ['测试'] })
await notebookStore.saveToStorage()
```

#### 方法 C: 检查 IndexedDB
1. 开发者工具 → Application 标签页
2. IndexedDB → airi-notebook → notebooks
3. 查看 notebook-default 键的值

## 下一步

1. 运行测试，收集完整的日志
2. 确定具体的失败点
3. 根据失败点进行针对性修复
4. 验证修复是否成功

## 相关文件

- 调试指南: `D:\Ai\airi\MEMORY_DEBUG_GUIDE.md`
- Notebook Store: `D:\Ai\airi\packages\stage-ui\src\stores\character\notebook.ts`
- Memory Manager: `D:\Ai\airi\packages\stage-ui\src\stores\chat\memory-manager.ts`
- Notebook Repo: `D:\Ai\airi\packages\stage-ui\src\database\repos\notebook.repo.ts`
- 诊断页面: `D:\Ai\airi\packages\stage-pages\src\pages\settings\memory\diagnostics.vue`
- 测试脚本: `D:\Ai\airi\packages\stage-ui\src\database\test-indexeddb-direct.ts`
