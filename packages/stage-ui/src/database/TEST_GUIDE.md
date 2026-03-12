# 记忆系统测试验证方案使用指南

## 概述

这是一个完整的记忆系统测试方案，涵盖从记忆提取到存储、检索、去重的全流程测试。

## 测试范围

1. **记忆提取（规则匹配）**
   - 高优先级规则（姓名、偏好、明确要求等）
   - 中优先级规则（地理位置、职业、计划等）
   - 低优先级/不记住的内容

2. **记忆保存（IndexedDB）**
   - 保存到本地数据库
   - 自动保存机制
   - 数据持久化

3. **记忆加载**
   - 从数据库加载
   - Store 初始化

4. **记忆检索**
   - 关键词搜索
   - 相关性排序
   - 重要性加权

5. **记忆去重**
   - 相似度计算
   - 重复检测
   - 自动合并

6. **UI 显示**
   - 日志输出
   - 测试报告

## 使用方法

### 方法 1: 使用测试运行器（最简单）

1. 在浏览器中打开 `test-runner.html`
2. 点击按钮运行测试
3. 查看可视化的测试结果

### 方法 2: 快速检查（推荐日常使用）

在浏览器控制台中运行：

```javascript
// 导入简化测试工具
import { quickCheck } from '@proj-rin/stage-ui/database/test-simple'

// 快速检查系统是否正常
await quickCheck()
```

更多简化工具：

```javascript
import * as test from '@proj-rin/stage-ui/database/test-simple'

// 测试消息提取
test.testExtraction('我叫张三，喜欢打游戏')

// 查看所有记忆
test.listMemories()

// 搜索记忆
test.searchMemories('游戏')

// 添加测试数据
await test.addTestMemory()

// 删除测试数据
await test.removeTestMemories()

// 查看帮助
test.help()
```

### 方法 3: 完整测试（推荐开发调试）

在浏览器控制台中运行：

```javascript
// 导入测试函数
import { runAllTests } from '@proj-rin/stage-ui/database/test-notebook'

// 运行所有测试（包括清理测试数据）
await runAllTests()

// 或者保留测试数据
await runAllTests({ cleanup: false })
```

### 方法 4: 快速测试（仅规则匹配）

如果只想测试规则匹配功能，不涉及数据库操作：

```javascript
import { runQuickTests } from '@proj-rin/stage-ui/database/test-notebook'

// 运行快速测试
runQuickTests()
```

### 方法 5: 单独测试某个功能

```javascript
import {
  testHeuristicHighPriority,
  testMemorySave,
  testMemorySearch,
  testSimilarityCalculation
} from '@proj-rin/stage-ui/database/test-notebook'

// 测试规则匹配
testHeuristicHighPriority()

// 测试记忆保存
await testMemorySave()

// 测试记忆检索
await testMemorySearch()

// 测试相似度计算
testSimilarityCalculation()
```

## 测试输出说明

### 控制台输出格式

```
✅ [Test 1] 规则匹配: "我叫张三"
   正确识别为 high 优先级
   详情: { tags: ['个人信息', '姓名'], matchedRules: ['用户告知姓名'] }

❌ [Test 2] 记忆保存
   保存失败，期望 5，实际 3
   详情: { initialCount: 3, newCount: 3 }
```

- ✅ 表示测试通过
- ❌ 表示测试失败
- 每个测试都会显示详细信息

### 测试报告

测试完成后会显示汇总报告：

```
╔════════════════════════════════════════════════════════════╗
║                      测试报告                              ║
╚════════════════════════════════════════════════════════════╝

总测试数: 10
通过: 9
失败: 1
通过率: 90.0%

⚠️  部分测试失败，请检查详情

失败的测试:
1. 完整对话流程: 处理失败: No active model or provider configured
```

## 查看数据库

测试会在 IndexedDB 中创建数据，可以通过以下方式查看：

1. 打开浏览器开发者工具（F12）
2. 切换到 "Application" 或 "存储" 标签
3. 展开 "IndexedDB"
4. 找到 "airi-notebook" 数据库
5. 查看 "notebooks" 存储

## 测试数据清理

### 自动清理

默认情况下，`runAllTests()` 会在测试结束后自动清理测试数据（标记为 `test: true` 的记忆）。

### 手动清理

如果需要手动清理：

```javascript
import { cleanupTestData } from '@proj-rin/stage-ui/database/test-notebook'

await cleanupTestData()
```

### 完全清空数据库

如果需要清空所有记忆数据：

```javascript
import { useCharacterNotebookStore } from '@proj-rin/stage-ui/stores/character/notebook'

const notebookStore = useCharacterNotebookStore()

// 删除所有记忆
notebookStore.entries.forEach((entry) => {
  notebookStore.removeEntry(entry.id)
})
```

## 常见问题

### Q1: 测试 9 "完整对话流程" 失败

**原因**: 该测试需要调用 LLM 进行记忆提取，如果没有配置模型会失败。

**解决方案**:
- 确保已配置 AI 模型和 Provider
- 或者忽略该测试，其他测试不依赖 LLM

### Q2: 数据库中看不到数据

**原因**: 可能是自动保存还没完成。

**解决方案**:
- 等待 1-2 秒后刷新 IndexedDB 视图
- 检查控制台是否有保存错误

### Q3: 测试数据没有被清理

**原因**: 可能是清理函数执行失败。

**解决方案**:
```javascript
// 手动清理
import { cleanupTestData } from '@proj-rin/stage-ui/database/test-notebook'

await cleanupTestData()
```

## 测试用例详情

### 测试 1-3: 规则匹配

测试启发式规则能否正确识别不同优先级的信息：

- **高优先级**: 姓名、偏好、明确要求
- **中优先级**: 地理位置、职业、计划
- **不记住**: 闲聊、天气等

### 测试 4-5: 数据持久化

测试记忆能否正确保存到 IndexedDB 并重新加载。

### 测试 6-7: 去重功能

测试相似度计算和重复检测算法：

- 文本相似度（Jaccard、Levenshtein）
- 实体重叠度
- 标签匹配

### 测试 8: 检索功能

测试能否根据关键词找到相关记忆，并按相关性排序。

### 测试 9: 完整流程

测试从对话输入到记忆保存的完整流程（需要 LLM）。

### 测试 10: 清理

清理测试过程中产生的数据。

## 性能基准

在正常情况下，测试应该在 5-10 秒内完成（不包括 LLM 调用）。

- 规则匹配: < 10ms
- 相似度计算: < 5ms
- 数据库操作: < 500ms
- 完整流程（含 LLM）: 2-5 秒

## 扩展测试

如果需要添加新的测试用例，可以参考现有测试函数的结构：

```javascript
async function testNewFeature() {
  console.log('=== 测试 X: 新功能 ===')

  // 执行测试逻辑
  const result = await someFunction()

  // 验证结果
  const passed = result === expectedValue

  // 记录测试结果
  logTest(
    '测试名称',
    passed,
    passed ? '成功信息' : '失败信息',
    { details: result }
  )

  return passed
}
```

然后在 `runAllTests()` 中调用新的测试函数。

## 技术支持

如果遇到问题，请检查：

1. 浏览器控制台的错误信息
2. IndexedDB 中的数据状态
3. 网络请求（如果涉及 LLM 调用）
4. Store 的初始化状态

相关文件：
- 测试脚本: `src/database/test-notebook.ts`
- 规则定义: `src/stores/chat/memory-heuristics.ts`
- 去重算法: `src/stores/chat/memory-deduplication.ts`
- 记忆管理: `src/stores/chat/memory-manager.ts`
- 数据库操作: `src/database/repos/notebook.repo.ts`
