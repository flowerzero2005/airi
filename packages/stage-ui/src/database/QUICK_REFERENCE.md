# 记忆系统测试 - 快速参考

## 🚀 快速开始

### 最简单的方式
```javascript
import { quickCheck } from '@proj-rin/stage-ui/database/test-simple'

await quickCheck()
```

### 完整测试
```javascript
import { runAllTests } from '@proj-rin/stage-ui/database/test-notebook'

await runAllTests()
```

## 📦 测试文件说明

| 文件 | 用途 | 适用场景 |
|------|------|----------|
| `test-simple.ts` | 简化测试工具 | 日常快速检查 |
| `test-notebook.ts` | 完整测试套件 | 开发调试、CI/CD |
| `test-runner.html` | 可视化测试界面 | 演示、手动测试 |
| `TEST_GUIDE.md` | 详细使用文档 | 学习、参考 |

## 🔧 常用命令

### 简化工具 (test-simple.ts)

```javascript
import * as test from '@proj-rin/stage-ui/database/test-simple'

// 快速检查
await test.quickCheck()

// 测试提取
test.testExtraction('我叫张三')

// 查看记忆
test.listMemories()

// 搜索记忆
test.searchMemories('游戏')

// 添加测试数据
await test.addTestMemory()

// 删除测试数据
await test.removeTestMemories()

// 清空所有（危险）
await test.clearAllMemories()

// 帮助
test.help()
```

### 完整测试 (test-notebook.ts)

```javascript
import {
  cleanupTestData,
  runAllTests,
  runQuickTests
} from '@proj-rin/stage-ui/database/test-notebook'

// 运行所有测试
await runAllTests()

// 保留测试数据
await runAllTests({ cleanup: false })

// 仅规则匹配测试
runQuickTests()

// 清理测试数据
await cleanupTestData()
```

### 单独测试

```javascript
import {
  testFindDuplicates,
  testFullConversationFlow,
  testHeuristicHighPriority,
  testMemoryLoad,
  testMemorySave,
  testMemorySearch,
  testSimilarityCalculation
} from '@proj-rin/stage-ui/database/test-notebook'

// 规则匹配
testHeuristicHighPriority()

// 数据库操作
await testMemorySave()
await testMemoryLoad()

// 检索和去重
await testMemorySearch()
testSimilarityCalculation()
testFindDuplicates()

// 完整流程（需要 LLM）
await testFullConversationFlow()
```

## 📊 测试覆盖范围

- ✅ 规则匹配（高/中/低优先级）
- ✅ 记忆保存（IndexedDB）
- ✅ 记忆加载（从数据库）
- ✅ 记忆检索（相关性搜索）
- ✅ 记忆去重（相似度计算）
- ✅ 完整流程（对话 → 提取 → 保存）
- ✅ UI 显示（控制台日志）

## 🔍 查看数据库

1. 按 F12 打开开发者工具
2. 切换到 "Application" 标签
3. 展开 "IndexedDB"
4. 找到 "airi-notebook" 数据库
5. 查看 "notebooks" 存储

## ⚠️ 注意事项

1. **测试 9 可能失败**: 需要配置 AI 模型
2. **数据持久化**: 测试数据会保存到 IndexedDB
3. **自动清理**: `runAllTests()` 默认会清理测试数据
4. **手动清理**: 使用 `cleanupTestData()` 或 `removeTestMemories()`

## 🐛 常见问题

### Q: 测试失败怎么办？
A: 查看控制台详细错误信息，检查：
- 是否配置了 AI 模型（测试 9）
- IndexedDB 是否可用
- 浏览器是否支持

### Q: 如何清理测试数据？
A: 三种方式：
```javascript
// 方式 1: 自动清理（推荐）
await runAllTests() // 默认清理

// 方式 2: 手动清理测试数据
await cleanupTestData()

// 方式 3: 清空所有记忆
await clearAllMemories()
```

### Q: 如何添加新的测试？
A: 参考 `test-notebook.ts` 中的测试函数结构：
```javascript
async function testNewFeature() {
  console.log('=== 测试 X: 新功能 ===')
  const result = await someFunction()
  const passed = result === expectedValue
  logTest('测试名称', passed, '消息', { details: result })
  return passed
}
```

## 📚 相关文档

- 详细文档: `TEST_GUIDE.md`
- 规则定义: `src/stores/chat/memory-heuristics.ts`
- 去重算法: `src/stores/chat/memory-deduplication.ts`
- 记忆管理: `src/stores/chat/memory-manager.ts`
- 数据库操作: `src/database/repos/notebook.repo.ts`

## 🎯 推荐工作流

### 日常开发
```javascript
import { quickCheck } from '@proj-rin/stage-ui/database/test-simple'

await quickCheck()
```

### 功能开发
```javascript
import { runAllTests } from '@proj-rin/stage-ui/database/test-notebook'

await runAllTests({ cleanup: false })
```

### 发布前
```javascript
import { runAllTests } from '@proj-rin/stage-ui/database/test-notebook'

await runAllTests() // 完整测试 + 清理
```

### 演示
打开 `test-runner.html` 使用可视化界面

---

**提示**: 将此文件保存为书签，方便快速查阅！
