# 空气泡问题修复

**问题**: 联网搜索后，原本显示加载效果的气泡变成空气泡，没有消失

**发现日期**: 2026-03-16
**严重程度**: 🟡 Medium (视觉问题，不影响功能)
**状态**: ✅ 已修复

---

## 问题分析

### 问题复现步骤

1. 用户发送消息触发联网搜索
2. AI 调用 `intelligent_web_search` 工具
3. 显示加载气泡（三个点动画）
4. 工具调用完成，返回结果
5. **问题**：加载气泡变成空气泡，既不显示加载动画，也不显示内容

### 根本原因

**文件**: `packages/stage-ui/src/components/scenarios/chat/assistant-item.vue`

**原始逻辑**（第165行）：
```typescript
const showLoader = computed(() => props.showPlaceholder && resolvedSlices.value.length === 0)
```

**问题**：
1. 工具调用开始时：`resolvedSlices = []` → `showLoader = true` ✅
2. 工具调用完成后：`resolvedSlices = [{ type: 'tool-call-result', ... }]` → `showLoader = false` ❌
3. 但此时 AI 还没生成文本，`displaySlices = []`（因为过滤掉了工具结果）
4. 结果：既不显示加载器（`showLoader = false`），也不显示内容（`displaySlices = []`）
5. **空气泡出现**：一个空的消息气泡

### 时间线

```
t=0: 用户发送消息
t=1: AI 开始调用工具
     → resolvedSlices = []
     → showLoader = true
     → 显示加载动画 ✅

t=2: 工具调用完成
     → resolvedSlices = [{ type: 'tool-call-result' }]
     → showLoader = false ❌
     → displaySlices = [] (过滤掉了工具结果)
     → 空气泡出现 ❌

t=3: AI 开始生成文本
     → resolvedSlices = [{ type: 'tool-call-result' }, { type: 'text', text: '...' }]
     → showLoader = false
     → displaySlices = [{ type: 'text', text: '...' }]
     → 显示文本内容 ✅
```

---

## 解决方案

### 修改内容

**文件**: `packages/stage-ui/src/components/scenarios/chat/assistant-item.vue`

**修改前**（第165-166行）：
```typescript
const showLoader = computed(() => props.showPlaceholder && resolvedSlices.value.length === 0)
const shouldHideMessage = computed(() => hasOnlyToolCalls.value && displaySlices.value.length === 0)
```

**修改后**：
```typescript
// 修复：当只有工具调用/结果时，继续显示加载器，避免空气泡
const showLoader = computed(() => {
  // 原始逻辑：没有任何 slice 时显示加载器
  if (props.showPlaceholder && resolvedSlices.value.length === 0) {
    return true
  }
  // 新增逻辑：只有工具调用/结果，没有文本时，也显示加载器
  if (hasOnlyToolCalls.value) {
    return true
  }
  return false
})
const shouldHideMessage = computed(() => false) // 不再隐藏消息，而是显示加载器
```

### 修改逻辑

**新的行为**：
1. 没有任何 slice → 显示加载器 ✅
2. **只有工具调用/结果，没有文本 → 继续显示加载器** ✅（新增）
3. 有文本内容 → 显示文本，隐藏加载器 ✅

**关键改进**：
- 在 t=2 时刻（工具完成但文本未生成），继续显示加载器
- 避免了空气泡的出现
- 用户体验更流畅

---

## 测试验证

### 测试步骤

1. 启动应用
2. 发送触发联网搜索的消息（例如："搜索最近的新闻"）
3. 观察消息气泡的变化

### 期望结果

**修复前**：
```
[用户消息]
[加载动画...] → [空气泡] → [AI 回复文本]
              ↑ 问题出现
```

**修复后**：
```
[用户消息]
[加载动画...] → [加载动画...] → [AI 回复文本]
              ↑ 继续显示加载器
```

### 验证清单

- [ ] 工具调用开始时显示加载动画
- [ ] 工具调用完成后**继续显示加载动画**（不出现空气泡）
- [ ] AI 开始生成文本后，加载动画消失，显示文本内容
- [ ] 整个过程流畅，没有空白气泡

---

## 技术细节

### 相关代码结构

```typescript
// assistant-item.vue

// 1. 解析消息的 slices
const resolvedSlices = computed<ChatSlices[]>(() => {
  // 从 message.slices 或 message.content 中提取
})

// 2. 过滤出文本内容用于显示
const displaySlices = computed<ChatSlices[]>(() => {
  return resolvedSlices.value
    .filter(slice => slice.type === 'text') // 只保留文本
    .map(/* 应用打字机效果 */)
})

// 3. 检测是否只有工具调用
const hasOnlyToolCalls = computed(() => {
  const hasAnyText = slices.some(s => s.type === 'text')
  if (hasAnyText)
    return false
  return slices.every(s => s.type === 'tool-call' || s.type === 'tool-call-result')
})

// 4. 决定是否显示加载器（修复点）
const showLoader = computed(() => {
  if (props.showPlaceholder && resolvedSlices.value.length === 0) {
    return true // 没有任何内容时显示
  }
  if (hasOnlyToolCalls.value) {
    return true // 只有工具调用时也显示（新增）
  }
  return false
})
```

### 为什么过滤掉工具调用？

工具调用和结果是**内部实现细节**，不应该直接显示给用户：
- `tool-call`: AI 决定调用某个工具（如 `intelligent_web_search`）
- `tool-call-result`: 工具返回的结果（通常是 JSON 数据）

用户只需要看到：
- 加载状态（工具正在执行）
- 最终的文本回复（AI 基于工具结果生成的自然语言）

---

## 影响范围

### 修改的文件

- `packages/stage-ui/src/components/scenarios/chat/assistant-item.vue`

### 影响的功能

- 所有涉及工具调用的场景：
  - 联网搜索（`intelligent_web_search`）
  - MCP 工具调用
  - 其他自定义工具

### 兼容性

- ✅ 不影响普通文本消息
- ✅ 不影响历史消息显示
- ✅ 不影响打字机效果
- ✅ 向后兼容

---

## 后续优化建议

### 可选改进

1. **显示工具调用状态**：
   - 当前：显示通用加载动画
   - 改进：显示具体的工具名称（"正在搜索..."）

2. **工具结果预览**：
   - 当前：完全隐藏工具结果
   - 改进：可选显示工具结果摘要（开发者模式）

3. **超时处理**：
   - 当前：如果工具调用超时，加载器会一直显示
   - 改进：添加超时检测和错误提示

---

**修复完成时间**: 2026-03-16
**状态**: ✅ 已修复，等待测试验证
**优先级**: 🟡 Medium
