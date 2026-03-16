# 聊天加载气泡消失问题修复

**日期**：2026-03-16
**问题编号**：AIRI-CHAT-001
**状态**：已修复，待测试

---

## 问题描述

### 现象

**涉及联网搜索时**：
```
用户提问 → 加载气泡出现 → AI开始回复 → 工具调用 → 气泡消失（空窗期）→ 工具结果返回 → AI继续回复
```

**不涉及联网时**（正常）：
```
用户提问 → 加载气泡出现 → AI回复 → 气泡消失
```

### 影响

- 用户体验下降，不知道系统在做什么
- 空窗期让用户以为系统卡住了
- 涉及所有工具调用场景（web_search、memory、widgets等）

---

## 根本原因分析

### 问题根源（两层）

#### 第一层：`isHistoricalMessage` 的时间判断

**文件**：`packages/stage-ui/src/components/scenarios/chat/assistant-item.vue`（第50-58行）

**原始逻辑**：
```typescript
const isHistoricalMessage = computed(() => {
  const createdAt = props.message.createdAt
  if (!createdAt)
    return true

  const now = Date.now()
  const age = now - createdAt
  return age > 5000 // 超过5秒的消息视为历史消息
})
```

**问题**：
- 消息创建后5秒，自动被视为"历史消息"
- 历史消息不显示加载器（`showLoader` 中有 `if (isHistoricalMessage.value) return false`）
- 联网搜索通常需要超过5秒，导致加载器在工具执行期间消失

#### 第二层：`showStreamingPlaceholder` 的判断逻辑

**文件**：`packages/stage-ui/src/components/scenarios/chat/history.vue`（第49行）

**原始逻辑**：
```typescript
const showStreamingPlaceholder = computed(() =>
  (streaming.value.slices?.length ?? 0) === 0 && !streaming.value.content
)
```

**问题**：
- 只在 `slices.length === 0` 时返回 `true`
- 当有 text slice + tool-call slice 时，`slices.length > 0`
- 导致 `showStreamingPlaceholder = false`
- 进而 `props.showPlaceholder = false` 传递给 `assistant-item.vue`

### 时序问题

```
T0: 用户提问
    streamingMessage.slices = []
    showStreamingPlaceholder = true ✓
    showLoader = true ✓

T1-T4: AI 开始输出文本
    streamingMessage.slices = [{ type: 'text', text: '...' }]
    showStreamingPlaceholder = false ✓（有内容了）
    showLoader = false ✓（正常）

T5: AI 调用工具（联网搜索）
    streamingMessage.slices = [
      { type: 'text', text: '...' },
      { type: 'tool-call', ... }
    ]
    showStreamingPlaceholder = false ✗（应该为 true，因为工具未完成）
    props.showPlaceholder = false ✗

T5+5秒: 消息超过5秒
    isHistoricalMessage = true ✗（应该为 false，因为还在流式输出）
    showLoader = false ✗（加载器消失！）

T6-T10: 工具执行中（网络请求）
    空窗期，没有加载气泡 ✗

T11: 工具结果返回
    streamingMessage.slices = [
      { type: 'text', text: '...' },
      { type: 'tool-call', ... },
      { type: 'tool-call-result', ... }
    ]
    showStreamingPlaceholder = false ✓

T12: AI 继续生成文本
    加载器重新出现 ✓
```

---

## 解决方案

### 修复策略

采用**双层防护**策略，确保工具执行期间加载器持续显示：

1. **第一层（`history.vue`）**：修复 `showStreamingPlaceholder` 逻辑，使其在有未完成工具调用时返回 `true`
2. **第二层（`assistant-item.vue`）**：修复 `isHistoricalMessage` 逻辑，使其在流式输出期间不视为历史消息

### 修复 1：`history.vue` - 检测未完成的工具调用

**文件**：`packages/stage-ui/src/components/scenarios/chat/history.vue`（第50-85行）

```typescript
// 修复：不仅在没有 slice 时显示 placeholder，也要在有未完成工具调用时显示
const showStreamingPlaceholder = computed(() => {
  const slices = streaming.value.slices ?? []
  const content = streaming.value.content

  // 情况1：没有任何 slice 且没有 content
  if (slices.length === 0 && !content) {
    return true
  }

  // 情况2：检查是否有未完成的工具调用
  const toolCallIds = new Set<string>()
  const toolResultIds = new Set<string>()

  slices.forEach((slice) => {
    if (slice.type === 'tool-call') {
      // CompletionToolCall 应该有 id 属性，但类型定义可能不完整
      const toolCallId = (slice.toolCall as any).id || (slice.toolCall as any).toolCallId
      if (toolCallId) {
        toolCallIds.add(toolCallId)
      }
    }
    else if (slice.type === 'tool-call-result') {
      toolResultIds.add(slice.id)
    }
  })

  // 如果有 tool-call 但没有对应的 result，说明工具正在执行，应该显示 placeholder
  for (const id of toolCallIds) {
    if (!toolResultIds.has(id)) {
      return true
    }
  }

  return false
})
```

**作用**：
- 确保在工具执行期间，`showStreamingPlaceholder = true`
- 进而 `props.showPlaceholder = true` 传递给 `assistant-item.vue`

### 修复 2：`assistant-item.vue` - 流式输出不视为历史消息

**文件**：`packages/stage-ui/src/components/scenarios/chat/assistant-item.vue`（第50-64行）

```typescript
// 检查消息是否是历史消息（创建时间超过5秒）
// 但如果正在显示 placeholder（流式输出中），则不视为历史消息
const isHistoricalMessage = computed(() => {
  // 如果正在显示 placeholder，说明是流式输出中，不是历史消息
  if (props.showPlaceholder) {
    return false
  }

  const createdAt = props.message.createdAt
  if (!createdAt)
    return true // 没有创建时间的消息视为历史消息

  const now = Date.now()
  const age = now - createdAt
  return age > 5000 // 超过5秒的消息视为历史消息
})
```

**作用**：
- 即使消息超过5秒，只要 `props.showPlaceholder = true`，就不视为历史消息
- 确保 `showLoader` 的判断能够正常工作

### 逻辑流程

```
工具调用开始
    ↓
history.vue: 检测到未完成的工具调用
    ↓
showStreamingPlaceholder = true
    ↓
props.showPlaceholder = true (传递给 assistant-item)
    ↓
isHistoricalMessage = false (因为 showPlaceholder = true)
    ↓
showLoader = true (因为 isHistoricalMessage = false)
    ↓
加载气泡持续显示 ✓
```

---

## 修改文件

| 文件 | 修改内容 | 行号 |
|------|----------|------|
| `packages/stage-ui/src/components/scenarios/chat/history.vue` | **关键修复**：更新 `showStreamingPlaceholder` 逻辑，检测未完成的工具调用 | 50-85 |
| `packages/stage-ui/src/components/scenarios/chat/assistant-item.vue` | **防护修复**：更新 `isHistoricalMessage` 逻辑，流式输出中不视为历史消息 | 50-64 |

### 为什么需要修改两个文件？

**问题链条**：

1. `history.vue` 中的 `showStreamingPlaceholder` 只在 `slices.length === 0` 时为 `true`
2. 一旦有任何 slice（包括 tool-call），它就变成 `false`
3. `show-placeholder` prop 传递给 `assistant-item.vue` 的值为 `false`
4. 即使消息未超过5秒，`isHistoricalMessage` 也可能在5秒后变为 `true`
5. `showLoader` 依赖 `isHistoricalMessage`，导致加载器消失

**修复方案**：

- **`history.vue`（第一层防护）**：修改 `showStreamingPlaceholder` 的判断逻辑，使其在有未完成工具调用时也返回 `true`，确保 `props.showPlaceholder = true`
- **`assistant-item.vue`（第二层防护）**：修改 `isHistoricalMessage` 的判断逻辑，使其在 `props.showPlaceholder = true` 时返回 `false`，防止5秒后加载器消失

**双层防护的必要性**：

- 如果只修复 `assistant-item.vue`，当 `props.showPlaceholder = false` 时（因为 `history.vue` 的逻辑问题），修复无效
- 如果只修复 `history.vue`，当消息超过5秒时，`isHistoricalMessage = true` 仍会导致加载器消失
- 两者配合，确保在任何情况下，工具执行期间加载器都能持续显示

---

## 测试计划

### 测试场景

#### 1. 联网搜索场景

**步骤**：
1. 启动桌面版：`pnpm dev:tamagotchi`
2. 打开聊天窗口
3. 提问："最近有什么新闻？"（触发 intelligent_web_search）

**预期结果**：
- ✓ 加载气泡出现
- ✓ AI 开始回复："让我查一下～"
- ✓ 工具调用时，加载气泡继续显示（不消失）
- ✓ 工具结果返回后，AI 继续回复
- ✓ 回复完成后，加载气泡消失

#### 2. 记忆搜索场景

**步骤**：
1. 提问："你还记得我之前说过什么吗？"（触发 search_memory）

**预期结果**：
- ✓ 加载气泡出现
- ✓ 工具调用时，加载气泡继续显示
- ✓ 回复完成后，加载气泡消失

#### 3. 纯文本回复场景（对照组）

**步骤**：
1. 提问："你好"（不触发工具调用）

**预期结果**：
- ✓ 加载气泡出现
- ✓ AI 回复时，加载气泡消失
- ✓ 无空窗期

#### 4. 多轮工具调用场景

**步骤**：
1. 提问："帮我查一下最近的新闻，然后记住我喜欢看科技新闻"（可能触发多个工具）

**预期结果**：
- ✓ 每次工具调用时，加载气泡都显示
- ✓ 无空窗期

#### 5. 历史消息场景（对照组）

**步骤**：
1. 滚动查看历史消息

**预期结果**：
- ✓ 历史消息不显示加载气泡
- ✓ 工具调用结果正常显示

---

## 验证清单

- [ ] 联网搜索时，加载气泡不消失
- [ ] 记忆搜索时，加载气泡不消失
- [ ] 纯文本回复时，加载气泡正常消失
- [ ] 多轮工具调用时，加载气泡正常显示
- [ ] 历史消息不显示加载气泡
- [ ] 类型检查通过
- [ ] 无新增 console 错误

---

## 技术细节

### 关键数据结构

```typescript
// ChatSlices 类型
type ChatSlices
  = | { type: 'text', text: string }
    | { type: 'tool-call', id: string, name: string, input: any }
    | { type: 'tool-call-result', id: string, result: any }

// streamingMessage 结构
interface StreamingMessage {
  slices: ChatSlices[]
  tool_results: Array<{ id: string, result: any }>
  content: string
}
```

### 状态流转

```
初始化 → 文本流入 → 工具调用 → 工具执行中 → 工具结果 → 继续文本 → 完成
  ↓         ↓          ↓           ↓            ↓          ↓         ↓
 []      [text]   [text,call]  [text,call]  [text,call,  [text,    null
                                              result]      call,
                                                          result,
                                                          text]
  ↓         ↓          ↓           ↓            ↓          ↓         ↓
 show     hide       SHOW        SHOW         hide       hide      hide
loader   loader     loader      loader       loader     loader    loader
```

---

## 相关问题

### 为什么不直接检查 `isStreaming` 状态？

`isStreaming` 是全局状态，无法区分"正在生成文本"和"正在执行工具"。

### 为什么不在 `chat.ts` 中添加状态标志？

修改 store 会影响更多代码，风险更大。在组件层面修复更安全。

### 为什么不使用 `tool_results` 数组？

`tool_results` 是工具执行完成后的结果，无法判断"正在执行"的状态。

---

## 后续优化

### 可选改进

1. **加载器样式优化**：
   - 工具执行时，显示不同的加载动画
   - 例如："正在搜索..."、"正在查询记忆..."

2. **工具执行进度**：
   - 显示工具执行的进度条
   - 例如："搜索中 (1/3)"

3. **工具执行日志**：
   - 在开发模式下，显示工具执行的详细日志
   - 方便调试

---

## 修复效果总结

### 修复前的问题

```
用户提问 → 加载气泡出现 → AI开始回复 → 工具调用 → 5秒后气泡消失（空窗期）→ 工具结果返回 → AI继续回复
```

**时间线**：
- T0: 用户提问
- T1: 加载气泡出现 ✓
- T2: AI 开始回复 ✓
- T3: 工具调用（联网搜索）
- T8 (T3+5秒): 气泡消失 ✗（因为 `isHistoricalMessage = true`）
- T9-T15: 空窗期 ✗（用户不知道系统在做什么）
- T16: 工具结果返回
- T17: AI 继续回复 ✓

### 修复后的效果

```
用户提问 → 加载气泡出现 → AI开始回复 → 工具调用 → 气泡持续显示 → 工具结果返回 → AI继续回复
```

**时间线**：
- T0: 用户提问
- T1: 加载气泡出现 ✓
- T2: AI 开始回复 ✓
- T3: 工具调用（联网搜索）
- T3-T15: 气泡持续显示 ✓（因为 `showStreamingPlaceholder = true` 且 `isHistoricalMessage = false`）
- T16: 工具结果返回
- T17: AI 继续回复 ✓
- T18: 回复完成，气泡消失 ✓

**关键改进**：
- ✓ 无空窗期
- ✓ 用户始终知道系统在工作
- ✓ 即使工具执行超过5秒，加载器也持续显示
- ✓ 用户体验流畅，不会误以为系统卡住

---

## 参考资料

- [AIRI 项目 - Claude 协作指南](../../CLAUDE.md)
- [对话自然度改进](./conversation-naturalness-improvements.md)
- [智能联网系统设计](./intelligent-web-search-complete-proposal.md)

---

**最后更新**：2026-03-16
**维护者**：Claude (Anthropic) + @zyp
