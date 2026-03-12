# 记忆系统调试工具使用指南

## 概述

`debug-memory.ts` 是一个综合性的调试工具，用于快速定位和解决记忆系统的问题。

## 功能列表

### 1. `debugMemorySystem()` - 完整系统诊断

运行完整的记忆系统诊断，检查所有关键组件的状态。

**检查项目：**
- ✅ Stores 初始化状态（Notebook、MemoryManager、MemorySettings）
- ✅ IndexedDB 可访问性和读写功能
- ✅ 数据库中的记忆数据
- ✅ 所有 IndexedDB 键列表
- ✅ localStorage 中的记忆设置

**使用方法：**

```typescript
import { debugMemorySystem } from '@/database/debug-memory'

// 在代码中调用
await debugMemorySystem()

// 或在浏览器控制台中
await window.debugMemory.debug()
```

**输出示例：**

```
=== 记忆系统调试开始 ===
时间: 2026-03-11 14:30:00

1️⃣ 检查 Stores 初始化状态...
✅ Stores 初始化成功
   - Notebook 已加载: true
   - 记忆条目数: 15
   - 任务数: 3
   - 记忆设置已加载: true
   - 记忆功能启用: true

2️⃣ 检查 IndexedDB 可访问性...
✅ IndexedDB 可访问且工作正常

3️⃣ 检查数据库中的记忆数据...
✅ 数据库中存在记忆数据
   - Character ID: default
   - 记忆条目数: 15
   - 任务数: 3
   - 版本号: 42
   - 最后同步: 2026-03-11 14:25:30

   最近的 3 条记忆:
   1. [focus] 用户喜欢编程和阅读
      创建时间: 2026-03-11 14:20:00
   2. [note] 用户询问了关于 TypeScript 的问题
      创建时间: 2026-03-11 14:22:15
   3. [focus] 用户的名字是张三
      创建时间: 2026-03-11 14:25:30

4️⃣ 列出所有 IndexedDB 键...
✅ 找到 2 个键:
   - notebook-default
   - sync-queue-default-1710144330000

5️⃣ 检查 localStorage 中的记忆设置...
✅ localStorage 设置存在
   - 记忆功能启用: true
   - 自动提取: true
   - 最小重要性: medium
   - 自定义关键词数: 8

=== 调试总结 ===
✅ 成功: 5/5
❌ 失败: 0/5

🎉 所有检查通过！记忆系统工作正常。
```

---

### 2. `testMemorySave()` - 测试记忆保存

使用测试数据手动触发记忆保存流程，验证整个保存链路是否正常。

**使用方法：**

```typescript
import { testMemorySave } from '@/database/debug-memory'

// 使用默认测试数据
await testMemorySave()

// 使用自定义测试数据
await testMemorySave({
  userMessage: '我叫李四，我是一名软件工程师',
  assistantMessage: '很高兴认识你，李四！'
})

// 或在浏览器控制台中
await window.debugMemory.test()
```

**输出示例：**

```
=== 测试记忆保存 ===

测试数据:
用户消息: 我叫张三，我喜欢编程和阅读。
助手消息: 很高兴认识你，张三！编程和阅读都是很好的爱好。

保存前记忆数: 10

开始处理对话...
[INFO] 开始分析对话内容...
[INFO] 检测到高优先级信息
[INFO] 匹配原因: 用户明确表达了个人信息
[SUCCESS] 保存记忆: 用户叫张三，喜欢编程和阅读...
[SUCCESS] 记忆已保存到焦点区
[INFO] 当前记忆总数: 11

等待保存完成...

保存后记忆数: 11
新增记忆数: 1

最新的记忆:
  类型: focus
  内容: 用户叫张三，喜欢编程和阅读
  标签: 个人信息, 偏好
  创建时间: 2026-03-11 14:30:00

验证数据库保存...
✅ 数据库保存成功！
   数据库中的记忆数: 11

=== 测试完成 ===
```

---

### 3. `clearAllMemories()` - 清空所有记忆

清空所有记忆数据（包括 Store 和 IndexedDB）。

**⚠️ 警告：此操作不可恢复！**

**使用方法：**

```typescript
import { clearAllMemories } from '@/database/debug-memory'

await clearAllMemories()

// 或在浏览器控制台中
await window.debugMemory.clear()
```

---

### 4. `exportMemories()` - 导出记忆数据

导出所有记忆数据为 JSON 格式，用于备份。

**使用方法：**

```typescript
import { exportMemories } from '@/database/debug-memory'

const json = await exportMemories()
console.log(json)

// 保存到文件
const blob = new Blob([json], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `memories-backup-${Date.now()}.json`
a.click()

// 或在浏览器控制台中
const json = await window.debugMemory.export()
copy(json) // 复制到剪贴板
```

---

### 5. `importMemories()` - 导入记忆数据

从 JSON 数据恢复记忆。

**⚠️ 警告：当前数据将被覆盖！**

**使用方法：**

```typescript
import { importMemories } from '@/database/debug-memory'

const jsonData = '...' // 从文件或剪贴板获取
await importMemories(jsonData)

// 或在浏览器控制台中
const jsonData = '...'
await window.debugMemory.import(jsonData)
```

---

## 在应用中集成

### 方式 1：在代码中导入

```typescript
import { debugMemorySystem, testMemorySave } from '@/database/debug-memory'

// 在需要调试的地方调用
async function troubleshoot() {
  await debugMemorySystem()
  await testMemorySave()
}
```

### 方式 2：在浏览器控制台中使用

工具会自动注册到 `window.debugMemory` 对象：

```javascript
// 运行完整诊断
await window.debugMemory.debug()

// 测试记忆保存
await window.debugMemory.test()

// 测试自定义数据
await window.debugMemory.test({
  userMessage: '我的生日是 1990 年 1 月 1 日',
  assistantMessage: '好的，我记住了！'
})

// 导出记忆
const backup = await window.debugMemory.export()
copy(backup) // 复制到剪贴板

// 清空记忆（谨慎！）
await window.debugMemory.clear()
```

### 方式 3：在应用启动时加载

在 `main.ts` 或应用入口文件中导入：

```typescript
// main.ts
import '@/database/debug-memory'

// 现在可以在控制台中使用 window.debugMemory
```

---

## 常见问题排查

### 问题 1：记忆没有保存

**排查步骤：**

1. 运行 `debugMemorySystem()` 检查系统状态
2. 检查 `memorySettings.enabled` 是否为 `true`
3. 检查 `notebookStore.isLoaded` 是否为 `true`
4. 运行 `testMemorySave()` 测试保存流程
5. 查看控制台日志，确认是否有错误

**可能原因：**
- 记忆功能被禁用
- Store 未正确初始化
- IndexedDB 访问被阻止
- 防抖延迟导致保存未完成

### 问题 2：记忆保存后刷新页面丢失

**排查步骤：**

1. 运行 `debugMemorySystem()` 检查数据库状态
2. 检查 IndexedDB 是否可访问
3. 查看 `lastSyncedAt` 时间戳
4. 检查浏览器是否启用了隐私模式（会阻止 IndexedDB）

**可能原因：**
- IndexedDB 被浏览器阻止
- 数据未正确保存到数据库
- 浏览器隐私设置问题

### 问题 3：记忆重复保存

**排查步骤：**

1. 检查 `deduplicationEnabled` 设置
2. 查看 `lastDeduplicationAt` 时间戳
3. 手动运行去重：`memoryManager.deduplicateMemories()`

**可能原因：**
- 去重功能被禁用
- 相似度阈值设置过高
- 去重间隔设置不当

### 问题 4：记忆提取不准确

**排查步骤：**

1. 检查 `customKeywords` 配置
2. 检查 `minImportance` 设置
3. 使用 `testMemorySave()` 测试不同的消息

**可能原因：**
- 关键词规则不匹配
- 重要性阈值设置过高
- 启发式规则需要调整

---

## 开发建议

### 1. 定期运行诊断

在开发过程中，定期运行 `debugMemorySystem()` 确保系统正常：

```typescript
// 在开发环境中自动运行
if (import.meta.env.DEV) {
  setTimeout(async () => {
    const { debugMemorySystem } = await import('@/database/debug-memory')
    await debugMemorySystem()
  }, 3000)
}
```

### 2. 添加错误监控

在关键位置添加错误监控：

```typescript
import { debugMemorySystem } from '@/database/debug-memory'

try {
  await memoryManager.processConversationTurn(userMsg, assistantMsg)
}
catch (error) {
  console.error('记忆保存失败，运行诊断...')
  await debugMemorySystem()
  throw error
}
```

### 3. 备份重要数据

在进行重大更改前，先导出数据：

```typescript
import { exportMemories } from '@/database/debug-memory'

const backup = await exportMemories()
localStorage.setItem('memory-backup', backup)
```

---

## API 参考

### `debugMemorySystem(): Promise<void>`

运行完整的系统诊断。

### `testMemorySave(options?: { userMessage?: string, assistantMessage?: string }): Promise<void>`

测试记忆保存功能。

**参数：**
- `options.userMessage` - 用户消息（可选）
- `options.assistantMessage` - 助手消息（可选）

### `clearAllMemories(): Promise<void>`

清空所有记忆数据。需要用户确认。

### `exportMemories(): Promise<string>`

导出记忆数据为 JSON 字符串。

**返回：** JSON 格式的记忆数据

### `importMemories(jsonData: string): Promise<void>`

从 JSON 数据导入记忆。需要用户确认。

**参数：**
- `jsonData` - JSON 格式的记忆数据

---

## 注意事项

1. **生产环境使用**：建议仅在开发环境中使用，或添加权限控制
2. **数据安全**：导出的数据可能包含敏感信息，请妥善保管
3. **性能影响**：诊断工具会执行多次数据库操作，避免频繁调用
4. **浏览器兼容性**：需要支持 IndexedDB 的现代浏览器

---

## 更新日志

### v1.0.0 (2026-03-11)
- 初始版本
- 支持完整系统诊断
- 支持记忆保存测试
- 支持数据导入导出
- 支持浏览器控制台调用
