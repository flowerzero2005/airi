# 记忆系统测试验证方案

完整的 AIRI 记忆系统测试工具集，涵盖记忆提取、存储、检索、去重的全流程测试。

## 🚀 快速开始

### 最简单的方式（推荐）

```javascript
import { quickCheck } from '@proj-rin/stage-ui/database/test-simple'

await quickCheck()
```

### 完整测试

```javascript
import { runAllTests } from '@proj-rin/stage-ui/database/test-notebook'

await runAllTests()
```

### 可视化界面

在浏览器中打开 `test-runner.html`

## 📦 文件说明

| 文件 | 说明 |
|------|------|
| `test-simple.ts` | 简化测试工具，日常使用 |
| `test-notebook.ts` | 完整测试套件，深度测试 |
| `test-runner.html` | 可视化测试界面 |
| `TEST_GUIDE.md` | 详细使用文档 |
| `QUICK_REFERENCE.md` | 快速参考卡片 |
| `PROJECT_SUMMARY.md` | 项目总结 |

## 📚 文档导航

- **新手入门**: 阅读 `TEST_GUIDE.md`
- **快速查阅**: 查看 `QUICK_REFERENCE.md`
- **项目了解**: 阅读 `PROJECT_SUMMARY.md`

## ✨ 主要功能

- ✅ 规则匹配测试（高/中/低优先级）
- ✅ 记忆保存测试（IndexedDB）
- ✅ 记忆加载测试
- ✅ 记忆检索测试（相关性搜索）
- ✅ 记忆去重测试（相似度计算）
- ✅ 完整流程测试
- ✅ 可视化测试界面
- ✅ 自动清理测试数据

## 🎯 使用场景

| 场景 | 工具 | 用时 |
|------|------|------|
| 日常检查 | `quickCheck()` | 2-3秒 |
| 功能调试 | `test-simple.ts` | 即时 |
| 完整测试 | `runAllTests()` | 5-10秒 |
| 演示展示 | `test-runner.html` | 可视化 |

## 💡 常用命令

```javascript
// 完整测试
import { runAllTests } from '@proj-rin/stage-ui/database/test-notebook'
// 快速检查
import { quickCheck } from '@proj-rin/stage-ui/database/test-simple'
// 测试提取
import { testExtraction } from '@proj-rin/stage-ui/database/test-simple'
// 查看记忆
import { listMemories } from '@proj-rin/stage-ui/database/test-simple'
// 搜索记忆
import { searchMemories } from '@proj-rin/stage-ui/database/test-simple'

await quickCheck()
testExtraction('我叫张三，喜欢打游戏')
listMemories()
searchMemories('游戏')
await runAllTests()
```

## 🔍 查看数据库

1. 按 F12 打开开发者工具
2. 切换到 "Application" 标签
3. 展开 "IndexedDB" → "airi-notebook"

## ⚠️ 注意事项

- 测试数据会保存到 IndexedDB
- `runAllTests()` 默认会清理测试数据
- 完整流程测试需要配置 AI 模型

## 📖 更多信息

详细文档请查看 `TEST_GUIDE.md`

---

**版本**: 1.0.0
**创建日期**: 2026-03-11
**状态**: ✅ 可用
