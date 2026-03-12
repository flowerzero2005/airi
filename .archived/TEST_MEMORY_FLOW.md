# 记忆系统测试指南

## 快速测试步骤

### 1. 启动应用
```bash
npm run dev
# 或
pnpm dev
```

### 2. 打开浏览器控制台
- 按 F12 打开开发者工具
- 切换到 Console 标签页
- 清空现有日志（可选）

### 3. 发送测试消息

#### 测试用例 1: 个人信息
**输入**: "我叫李明，今年28岁，是一名软件工程师"
**预期**: 应该提取为高优先级记忆（focus）

#### 测试用例 2: 偏好信息
**输入**: "我喜欢喝咖啡，不喜欢茶"
**预期**: 应该提取为中优先级记忆（note）

#### 测试用例 3: 普通对话
**输入**: "今天天气怎么样？"
**预期**: 不应该保存记忆

### 4. 观察日志输出

#### 成功的日志序列
```
[Chat] 准备触发 onChatTurnComplete 钩子
[ChatHooks] emitChatTurnCompleteHooks 被调用
[Stage] ========== onChatTurnComplete 钩子被触发 ==========
[MemoryManager] ========== processConversationTurn 被调用 ==========
[MemoryManager] Notebook store 加载完成，isLoaded: true  ← 关键！
[MemoryManager] 开始混合策略提取...
[MemoryManager] 提取结果: {...}
[MemoryManager] 准备保存记忆到 notebook store...
[Notebook] addEntry 被调用
[Notebook] 条目已添加，新条目数: 1
[Notebook] watch 回调被触发
[Notebook] isLoaded: true  ← 关键！
[Notebook] 调用 debouncedSave
[Notebook] 已设置 500ms 防抖定时器

(等待 500ms)

[Notebook] 防抖定时器触发，执行 saveToStorage
[Notebook] saveToStorage 被调用
[Notebook] 开始保存到 IndexedDB...
[NotebookRepo] save 被调用
[NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========  ← 成功！
[Notebook] 保存成功！
```

### 5. 验证 IndexedDB

#### 方法 1: 使用开发者工具
1. 在开发者工具中切换到 "Application" 或 "存储" 标签
2. 展开 "IndexedDB"
3. 找到 "airi-notebook" 数据库
4. 展开 "notebooks" 对象存储
5. 查看 "notebook-default" 键
6. 验证 entries 数组中有新添加的记忆

#### 方法 2: 使用控制台命令
在浏览器控制台中执行：
```javascript
// 查看所有记忆
const db = await window.indexedDB.open('airi-notebook')
// 或者直接查看 store
const { useCharacterNotebookStore } = await import('@proj-airi/stage-ui/stores/character/notebook')
const store = useCharacterNotebookStore()
console.log('记忆总数:', store.entries.length)
console.log('所有记忆:', store.entries)
```

### 6. 检查点清单

- [ ] 控制台显示 `[MemoryManager] Notebook store 加载完成，isLoaded: true`
- [ ] 控制台显示 `[Notebook] watch 回调被触发`
- [ ] 控制台显示 `[Notebook] isLoaded: true`
- [ ] 控制台显示 `[NotebookRepo] 数据已成功保存到 IndexedDB`
- [ ] IndexedDB 中可以看到保存的记忆数据
- [ ] 刷新页面后记忆仍然存在

## 常见问题排查

### 问题 1: 看到 "跳过保存（未加载）"
**原因**: notebook store 尚未加载完成
**修复**: 已在代码中添加等待逻辑，应该不会再出现

### 问题 2: 看到 "未检测到重要信息"
**原因**: 消息内容不符合记忆提取规则
**解决**: 使用上述测试用例 1 或 2

### 问题 3: 没有看到任何 [MemoryManager] 日志
**原因**: onChatTurnComplete 钩子未触发
**检查**:
1. 确认 Stage.vue 组件已挂载
2. 确认消息发送成功并收到回复
3. 查看是否有 JavaScript 错误

### 问题 4: IndexedDB 中没有数据
**原因**: 可能是防抖延迟或保存失败
**检查**:
1. 等待至少 500ms
2. 查看是否有 [NotebookRepo] 错误日志
3. 检查浏览器是否支持 IndexedDB

## 性能验证

### 测试连续发送多条消息
1. 快速发送 3-5 条包含个人信息的消息
2. 观察防抖机制是否正常工作
3. 验证最终所有记忆都被保存

### 预期行为
- 每次 addEntry 都会触发 watch
- 防抖会合并 500ms 内的多次保存请求
- 最终只执行一次 IndexedDB 写入

## 成功标准

✅ **测试通过条件**:
1. 所有关键日志都按顺序出现
2. IndexedDB 中可以看到保存的数据
3. 刷新页面后数据仍然存在
4. 没有任何错误日志

❌ **测试失败条件**:
1. 缺少关键日志步骤
2. 出现 "跳过保存" 日志
3. IndexedDB 中没有数据
4. 有错误日志输出
