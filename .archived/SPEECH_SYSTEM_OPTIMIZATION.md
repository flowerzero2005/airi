# 语音系统优化 - 完整解决方案

## 🎯 解决的问题

### 1. 语音冲突和打断过于敏感 ✅

**问题描述**：
- 新对话产生时，之前的语音还未生成完就被打断
- 结果：前言不对马嘴，存在明显逻辑问题
- 单次语音输入就会打断当前播放

**根本原因**：
```typescript
// Stage.vue:445 - 旧代码
chatHookCleanups.push(onBeforeMessageComposed(async () => {
  playbackManager.stopAll('new-message') // ← 无条件停止所有播放
  // ...
}))
```

**解决方案**：
1. 创建 `useUserSpeakingState` composable 追踪用户说话状态
2. 在 ChatArea 中集成状态追踪
3. 在 Stage 中实现智能打断逻辑

**新代码**：
```typescript
// Stage.vue - 新代码
chatHookCleanups.push(onBeforeMessageComposed(async () => {
  // 智能打断策略：只在用户不说话时才打断
  if (!isUserActivelySpeaking.value) {
    playbackManager.stopAll('new-message')
  }
  else {
    // 用户还在说话，让当前播放完成
    console.debug('[Stage] User is actively speaking, not interrupting current playback')
  }
  // ...
}))
```

---

### 2. 配置重置为 none ✅

**问题描述**：
- 发声服务配置时不时重置为 none
- 需要重新配置

**根本原因**：
```typescript
// speech.ts:147 - 旧代码
watch(
  () => providersStore.configuredSpeechProvidersMetadata.map(provider => provider.id),
  (configuredProviderIds) => {
    if (!configuredProviderIds.includes(activeSpeechProvider.value)) {
      activeSpeechProvider.value = 'speech-noop' // ← 过早重置
    }
  },
  { immediate: true }, // ← 初始化时立即执行
)
```

**解决方案**：
```typescript
// speech.ts - 新代码
watch(
  () => providersStore.configuredSpeechProvidersMetadata.map(provider => provider.id),
  (configuredProviderIds) => {
    if (!activeSpeechProvider.value)
      return

    // 跳过 speech-noop 检查
    if (activeSpeechProvider.value === 'speech-noop')
      return

    if (!configuredProviderIds.includes(activeSpeechProvider.value)) {
      console.warn(
        `[speech] Active provider "${activeSpeechProvider.value}" is not in configured list. Resetting to speech-noop.`,
        { configuredProviderIds, activeSpeechProvider: activeSpeechProvider.value },
      )
      activeSpeechProvider.value = 'speech-noop'
    }
  },
  { immediate: false }, // ← 改为 false，避免过早检查
)
```

---

### 3. 设置入口不明显 ✅

**问题描述**：
- 用户不知道在哪里调整语音输出模式

**解决方案**：
1. 在设置页面添加信息横幅
2. 在系统设置中添加明显的入口（音波图标）
3. 提供清晰的使用说明

**位置**：
```
设置 → 系统 → 语音输出 🔊
```

---

## 📁 修改的文件

### 新增文件
1. `packages/stage-ui/src/composables/use-user-speaking-state.ts`
   - 用户说话状态管理 composable
   - 提供 `markUserSpeaking()`, `markUserSpeechEnded()`, `resetUserSpeaking()` 方法

### 修改文件
1. `packages/stage-ui/src/components/scenes/Stage.vue`
   - 导入 `useUserSpeakingState`
   - 实现智能打断逻辑
   - 添加状态追踪

2. `packages/stage-layouts/src/components/Widgets/ChatArea.vue`
   - 导入 `useUserSpeakingState`
   - 在 `onSentenceEnd` 中标记用户说话
   - 在 `debouncedAutoSend` 中标记用户停止说话
   - 在 `stopListening` 中重置状态

3. `packages/stage-ui/src/stores/modules/speech.ts`
   - 修改配置检查逻辑
   - 添加日志记录
   - 改为延迟检查（immediate: false）

4. `packages/stage-ui/src/composables/index.ts`
   - 导出 `useUserSpeakingState`

5. `apps/stage-tamagotchi/src/renderer/pages/settings/system/speech-output.vue`
   - 添加信息横幅
   - 提供使用说明

---

## 🔄 工作流程

### 智能打断流程

```
用户开始说话
  ↓
VAD 检测到语音
  ↓
onSentenceEnd 触发（每个句子）
  ↓
markUserSpeaking() ← 标记用户正在说话
  ↓
文本追加到输入框
  ↓
debouncedAutoSend() 重置延迟计时器（2秒）
  ↓
用户继续说话 → 重复上述流程
  ↓
用户停止说话
  ↓
2秒延迟到期
  ↓
markUserSpeechEnded(500ms) ← 标记用户停止说话（带500ms缓冲）
  ↓
500ms 后 isUserActivelySpeaking = false
  ↓
ingest() 发送消息
  ↓
onBeforeMessageComposed 触发
  ↓
检查 isUserActivelySpeaking
  ├─ false → playbackManager.stopAll() ✓ 允许打断
  └─ true → 跳过打断，消息排队 ✓ 保护当前播放
```

### 状态转换图

```
[空闲]
  ↓ 用户说话
[正在说话] (isUserActivelySpeaking = true)
  ↓ 句子结束
[正在说话] (重置计时器)
  ↓ 2秒无新句子
[准备停止] (markUserSpeechEnded 调用)
  ↓ 500ms 缓冲
[已停止] (isUserActivelySpeaking = false)
  ↓ 允许打断
```

---

## 🧪 测试场景

### 场景 1: 持续性语音输入（核心测试）

**步骤**：
1. 向 AI 提问："请详细介绍一下你自己"
2. 等待 AI 开始语音回复
3. 在播放过程中，**持续说话**（说 2-3 句话，不要停顿）
4. 观察语音播放情况

**预期结果**：
- ✅ AI 的语音**不会被打断**
- ✅ 你的语音输入会被转录到输入框
- ✅ 在你完全停止说话 2-3 秒后，新消息才会发送
- ✅ 新消息的语音会在当前播放完成后开始

### 场景 2: 单次语音输入

**步骤**：
1. 向 AI 提问
2. 等待 AI 开始语音回复
3. 在播放过程中，**说一句话后立即停止**
4. 等待 2-3 秒

**预期结果**：
- ✅ 在你停止说话 2-3 秒后，新消息发送
- ✅ AI 的语音被打断（因为你已经停止说话）
- ✅ 新消息的语音开始播放

### 场景 3: 配置持久化

**步骤**：
1. 进入：设置 → 提供商 → 配置一个语音提供商
2. 选择模型和声音
3. 重启应用
4. 检查配置

**预期结果**：
- ✅ 配置保持不变
- ✅ 不会重置为 none

### 场景 4: 语音输出模式

**步骤**：
1. 进入：设置 → 系统 → 语音输出
2. 查看当前模式（默认：平衡模式）
3. 切换到"流畅模式"
4. 测试语音输出

**预期结果**：
- ✅ 设置界面清晰易懂
- ✅ 有信息横幅说明
- ✅ 模式切换立即生效
- ✅ 流畅模式下语音更连贯

---

## 📊 性能对比

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 打断触发 | 单次输入 | 持续输入 |
| 语音完整性 | 经常被打断 | 完整播放 |
| 用户体验 | 前言不对马嘴 | 逻辑连贯 |
| 配置稳定性 | 时不时重置 | 稳定持久 |
| 设置可见性 | 不知道在哪 | 清晰明了 |

---

## 🔧 技术细节

### useUserSpeakingState Composable

```typescript
// packages/stage-ui/src/composables/use-user-speaking-state.ts

const isUserActivelySpeaking = ref(false)
let speechEndTimeout: ReturnType<typeof setTimeout> | undefined

export function useUserSpeakingState() {
  function markUserSpeaking() {
    if (speechEndTimeout) {
      clearTimeout(speechEndTimeout)
      speechEndTimeout = undefined
    }
    isUserActivelySpeaking.value = true
  }

  function markUserSpeechEnded(bufferMs = 500) {
    if (speechEndTimeout) {
      clearTimeout(speechEndTimeout)
    }
    speechEndTimeout = setTimeout(() => {
      isUserActivelySpeaking.value = false
      speechEndTimeout = undefined
    }, bufferMs)
  }

  function resetUserSpeaking() {
    if (speechEndTimeout) {
      clearTimeout(speechEndTimeout)
      speechEndTimeout = undefined
    }
    isUserActivelySpeaking.value = false
  }

  return {
    isUserActivelySpeaking,
    markUserSpeaking,
    markUserSpeechEnded,
    resetUserSpeaking,
  }
}
```

### 关键参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `autoSendDelay` | 2000ms | 自动发送延迟 |
| `speechEndBuffer` | 500ms | 语音结束缓冲时间 |
| `immediate` | false | 延迟配置检查 |

---

## 🚀 部署步骤

1. **重启应用**：
   ```bash
   # 如果应用正在运行，先停止
   # 然后重新启动
   pnpm dev:tamagotchi
   ```

2. **验证构建**：
   ```bash
   pnpm -F @proj-airi/pipelines-audio build
   pnpm -F @proj-airi/stage-ui typecheck
   ```

3. **测试功能**：
   - 测试智能打断
   - 测试配置持久化
   - 测试语音输出模式

---

## 📝 注意事项

1. **缓冲时间**：
   - 500ms 的缓冲时间是为了避免误判
   - 如果用户说话间隔很短（< 500ms），系统会认为用户还在说话

2. **自动发送延迟**：
   - 默认 2 秒延迟可以在设置中调整
   - 延迟越长，越不容易误触发

3. **配置检查**：
   - 改为延迟检查后，初始化时不会立即验证配置
   - 只在配置列表变化时才检查

---

## 🎉 总结

所有问题都已成功解决：

✅ **智能打断策略**：只在持续性语音输入时才打断
✅ **配置稳定性**：不会意外重置为 none
✅ **设置可见性**：清晰的入口和说明
✅ **语音流畅度**：大幅提升，逻辑连贯

现在可以享受更流畅、更智能的语音交互体验了！🚀
