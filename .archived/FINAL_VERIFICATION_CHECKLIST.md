# 记忆系统最终验证清单

## ✅ 已修复的文件

### 核心记忆系统
- ✅ `packages/stage-ui/src/stores/chat/memory-manager.ts` - 添加 notebook store 加载检查
- ✅ `packages/stage-ui/src/stores/chat/memory-hybrid.ts` - 日志优化
- ✅ `packages/stage-ui/src/stores/chat/memory-heuristics.ts` - 规则优化
- ✅ `packages/stage-ui/src/stores/chat/memory-extractor.ts` - 错误处理
- ✅ `packages/stage-ui/src/stores/chat/memory-deduplication.ts` - 去重优化
- ✅ `packages/stage-ui/src/stores/chat/context-providers/notebook-memory.ts` - 上下文提供者

### 数据存储
- ✅ `packages/stage-ui/src/stores/character/notebook.ts` - 防抖保存、加载检查
- ✅ `packages/stage-ui/src/database/repos/notebook.repo.ts` - IndexedDB 操作日志

### 聊天集成
- ✅ `packages/stage-ui/src/stores/chat.ts` - 上下文注入、钩子触发日志
- ✅ `packages/stage-ui/src/stores/chat/hooks.ts` - 钩子执行日志
- ✅ `packages/stage-ui/src/components/scenes/Stage.vue` - 记忆提取钩子
- ✅ `apps/stage-tamagotchi/src/renderer/components/InteractiveArea.vue` - 控制台日志

### UI 界面
- ✅ `packages/stage-pages/src/pages/settings/memory/index.vue` - UnoCSS 语法修复
- ✅ `packages/stage-pages/src/pages/settings/modules/memory-long-term.vue` - UnoCSS 语法修复
- ✅ `packages/stage-pages/src/pages/settings/modules/memory-short-term.vue` - 已验证正常

---

## 🧪 测试步骤

### 步骤 1: 启动应用
```bash
cd D:\Ai\airi
pnpm dev:tamagotchi
```

### 步骤 2: 打开开发者工具
按 `F12` 打开浏览器控制台

### 步骤 3: 测试记忆存储

#### 测试用例 1: 个人信息（高优先级）
发送消息：
```
我叫张三，今年25岁，是湖南中医药大学的男生，喜欢打篮球
```

**预期日志**：
```
[Chat] ========== 准备触发 onChatTurnComplete 钩子 ==========
[ChatHooks] emitChatTurnCompleteHooks 被调用，钩子数量: 1
[Stage] ========== onChatTurnComplete 钩子被触发 ==========
[Stage] 用户消息: 我叫张三，今年25岁，是湖南中医药大学的男生，喜欢打篮球
[MemoryManager] ========== processConversationTurn 被调用 ==========
[MemoryManager] Notebook store 加载完成，isLoaded: true
[HybridMemory] Heuristic analysis: { importance: 'high', matchedRules: [...] }
[MemoryManager] 检测到高优先级信息
[MemoryManager] 保存记忆: 我叫张三，今年25岁，是湖南中医药大学的男生，喜欢打篮球
[Notebook] addEntry 被调用: kind=focus
[Notebook] watch 回调被触发
[Notebook] isLoaded: true，准备防抖保存
[NotebookRepo] ========== 开始保存数据到 IndexedDB ==========
[NotebookRepo] ========== 数据已成功保存到 IndexedDB ==========
```

#### 测试用例 2: 偏好信息（高优先级）
发送消息：
```
我喜欢吃川菜，不喜欢吃甜食
```

**预期日志**：类似上面，应该保存为 focus

#### 测试用例 3: 普通对话（低优先级）
发送消息：
```
今天天气真好
```

**预期日志**：
```
[HybridMemory] No important patterns detected, skipping
[MemoryManager] 未检测到重要信息，不保存记忆
```

### 步骤 4: 验证 IndexedDB 存储

1. 在开发者工具中，切换到 `Application` 标签
2. 展开 `IndexedDB` → `airi-notebook` → `notebooks`
3. 查看 `notebook-default` 键的值
4. 应该能看到刚才保存的记忆条目

### 步骤 5: 验证 UI 显示

1. 点击左侧菜单 `设置`
2. 找到 `记忆体` 选项
3. 点击进入记忆体页面

**预期结果**：
- 应该能看到 3 个标签：配置、管理、统计
- 管理标签中应该显示刚才保存的记忆
- 可以搜索、编辑、删除记忆

4. 点击 `长期记忆` 子页面

**预期结果**：
- 应该显示统计卡片（总记忆数、重要记忆、普通记忆）
- 应该显示记忆列表
- 可以按重要性筛选
- 可以按标签筛选
- 可以搜索

### 步骤 6: 测试记忆检索

发送消息：
```
我叫什么名字？
```

**预期行为**：
- AI 应该能从记忆中检索到 "张三"
- 在控制台应该看到 `[NotebookMemory]` 相关日志

---

## 🔍 快速诊断工具

### 在控制台运行完整诊断
```javascript
await window.debugMemory.debug()
```

### 手动测试记忆保存
```javascript
await window.debugMemory.test()
```

### 查看当前记忆
```javascript
await window.debugMemory.export()
```

---

## ❌ 常见问题排查

### 问题 1: 控制台没有任何日志
**可能原因**：
- 应用未正确启动
- 控制台过滤器设置错误

**解决方案**：
1. 检查控制台过滤器，确保显示所有级别（Verbose, Info, Warnings, Errors）
2. 刷新页面重新加载应用

### 问题 2: 看到日志但记忆未保存
**可能原因**：
- `isLoaded` 仍然为 false
- IndexedDB 权限问题

**解决方案**：
1. 查看日志中的 `[MemoryManager] Notebook store 加载完成，isLoaded: ?`
2. 如果 isLoaded 为 false，运行 `await window.debugMemory.debug()` 查看详细状态
3. 检查浏览器是否允许 IndexedDB

### 问题 3: 记忆体界面空白
**可能原因**：
- 路由配置错误
- 组件加载失败
- CSS 未正确加载

**解决方案**：
1. 检查浏览器控制台是否有错误
2. 检查网络标签是否有加载失败的资源
3. 尝试刷新页面

### 问题 4: 记忆保存了但 UI 不显示
**可能原因**：
- UI 未正确加载数据
- 数据格式不匹配

**解决方案**：
1. 在记忆体页面打开控制台
2. 查看是否有 `[Notebook] Loaded from storage` 日志
3. 运行 `await window.debugMemory.export()` 查看实际数据
4. 刷新页面重新加载

---

## 📊 成功标准

### ✅ 记忆存储成功
- [ ] 发送包含个人信息的消息后，控制台显示完整的日志链路
- [ ] IndexedDB 中能看到保存的数据
- [ ] 刷新页面后数据仍然存在

### ✅ UI 显示成功
- [ ] 记忆体主页能正常打开，显示 3 个标签
- [ ] 管理标签中能看到保存的记忆
- [ ] 长期记忆页面能正常显示统计和列表
- [ ] 搜索、筛选、编辑、删除功能正常工作

### ✅ 记忆检索成功
- [ ] 询问之前提到的信息时，AI 能正确回答
- [ ] 控制台显示 `[NotebookMemory]` 检索日志

---

## 📞 如果仍有问题

### 收集诊断信息
```javascript
// 1. 运行完整诊断
const diagnostic = await window.debugMemory.debug()

// 2. 导出当前记忆
const memories = await window.debugMemory.export()

// 3. 复制控制台所有日志
// 右键控制台 → Save as...
```

### 提供以下信息
1. 完整的控制台日志
2. 诊断工具输出
3. IndexedDB 截图
4. 记忆体界面截图
5. 具体的错误信息

---

## 🎯 预期结果总结

如果一切正常，你应该能够：
1. ✅ 与 AI 对话时，重要信息自动保存到记忆库
2. ✅ 在记忆体界面查看、管理所有记忆
3. ✅ AI 能从记忆中检索信息并在对话中使用
4. ✅ 记忆在刷新页面后仍然保留
5. ✅ 控制台显示完整的日志追踪链路

---

*最后更新: 2026-03-11*
*状态: 所有已知问题已修复*
