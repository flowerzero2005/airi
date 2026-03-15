# 联网搜索加载反馈修复

## 问题描述

**用户体验问题**：
当用户发送需要联网搜索的消息时：
1. 用户发送消息 → 默认加载气泡消失
2. AI 开始联网搜索 → **用户看不到任何反馈**（黑屏状态，持续数秒）
3. 搜索完成 → AI 才开始输出文本

用户不知道：
- AI 是否接收到了消息
- AI 是否正在联网
- 需要等待多久

## 根本原因

在 `assistant-item.vue` 中：

```typescript
const hasOnlyToolCalls = computed(() => {
  return slices.length > 0 && slices.every(s => s.type === 'tool-call' || s.type === 'tool-call-result')
})
const shouldHideMessage = computed(() => hasOnlyToolCalls.value && displaySlices.value.length === 0)
```

当 AI 调用工具（如 `intelligent_web_search`）时：
- `slices` 里只有 `tool-call` 类型
- `hasOnlyToolCalls` 为 true
- `shouldHideMessage` 为 true
- **整个消息气泡被隐藏**
- 用户看不到任何反馈

## 之前尝试过但失败的方案

1. **让 AI 在联网前先输出文字**（"让我查查～"）
   - 问题：导致严重问题（可能是流式输出被打断）

2. **添加独立的加载动画**
   - 问题：也不行（具体原因未知）

## 解决方案

**核心思路**：利用现有的加载动画机制，在工具调用期间也显示加载器。

### 修改内容

**文件**：`packages/stage-ui/src/components/scenarios/chat/assistant-item.vue`

**修改前**：
```typescript
const showLoader = computed(() => props.showPlaceholder && resolvedSlices.value.length === 0)
const shouldHideMessage = computed(() => hasOnlyToolCalls.value && displaySlices.value.length === 0)
```

**修改后**：
```typescript
const showLoader = computed(() =>
  (props.showPlaceholder && resolvedSlices.value.length === 0)
  || hasOnlyToolCalls.value // 工具调用时也显示加载器
)
const shouldHideMessage = computed(() => false) // 不再隐藏消息
```

### 工作原理

1. 用户发送消息 → 默认加载气泡显示
2. AI 开始调用工具 → `hasOnlyToolCalls` 为 true
3. `showLoader` 为 true → **继续显示加载动画**（三个点的动画）
4. 工具返回结果，AI 开始输出文本 → 加载动画消失，显示文本

### 优点

1. **最小侵入性**：只修改了2行代码
2. **利用现有机制**：复用了已有的加载动画
3. **不破坏流式输出**：不需要 AI 提前输出文字
4. **用户体验好**：用户始终能看到反馈

### 缺点

1. **无法区分不同类型的工具调用**：
   - 联网搜索、记忆搜索、其他工具都显示相同的加载动画
   - 未来可以改进为显示不同的提示文字

2. **无法显示具体的工具名称**：
   - 用户不知道 AI 正在做什么（搜索？查记忆？）
   - 未来可以改进为解析 `tool-call` 的 name 字段

## 未来改进方向

### Phase 2：显示具体的工具提示

```vue
<div v-else-if="showLoader">
  <div v-if="hasOnlyToolCalls" class="flex items-center gap-2">
    <div i-eos-icons:three-dots-loading />
    <span class="text-sm opacity-60">{{ toolCallHint }}</span>
  </div>

  <div v-else i-eos-icons:three-dots-loading />
</div>
```

```typescript
const toolCallHint = computed(() => {
  const toolCall = resolvedSlices.value.find(s => s.type === 'tool-call')
  if (!toolCall)
    return '思考中...'

  const toolName = (toolCall as any).name
  switch (toolName) {
    case 'intelligent_web_search':
      return '正在联网查询...'
    case 'search_memory':
      return '正在查找记忆...'
    case 'save_memory':
      return '正在保存记忆...'
    default:
      return '思考中...'
  }
})
```

### Phase 3：显示搜索进度

对于耗时较长的工具调用（如联网搜索），可以显示更详细的进度：
- "正在分析意图..."
- "正在搜索..."
- "正在整理结果..."

这需要在工具内部发送进度事件。

## 测试建议

1. **基础测试**：
   - 发送需要联网的消息："最近有什么新闻"
   - 观察是否始终能看到加载动画

2. **多工具测试**：
   - 测试记忆搜索
   - 测试其他工具调用
   - 确保都有加载反馈

3. **边界情况**：
   - 工具调用失败时的表现
   - 多个工具连续调用时的表现
   - 工具调用超时时的表现

## 实施记录

**日期**：2026-03-16
**状态**：✅ 已完成
**修改文件**：
- `packages/stage-ui/src/components/scenarios/chat/assistant-item.vue`

**效果**：
- 用户在 AI 联网搜索期间能看到加载动画
- 不再有"黑屏"状态
- 用户体验显著改善

---

**创建时间**：2026-03-16
**维护者**：Claude (Anthropic) + @zyp
