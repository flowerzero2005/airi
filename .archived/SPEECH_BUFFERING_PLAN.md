# 语音合成缓冲播放改进方案

## 当前问题

1. **中文合成一卡一卡**：每个小段（4-12词）合成完就立即播放，导致播放不连贯
2. **容易被打断**：任何音频输入都可能打断语音，而不是持续检测到用户语音
3. **缺少缓冲机制**：没有等待整个回答合成完再播放

## 当前实现分析

### 文件位置
- `packages/pipelines-audio/src/speech-pipeline.ts` - 语音管道主逻辑
- `packages/pipelines-audio/src/processors/tts-chunker.ts` - 文本分块器
- `packages/pipelines-audio/src/managers/playback-manager.ts` - 播放管理器
- `packages/stage-ui/src/libs/audio/vad.ts` - 语音活动检测

### 当前流程
```
文本流 → 分块器(4-12词) → TTS合成 → 立即播放
                ↓
            每段独立播放
```

## 改进方案

### 1. 添加缓冲模式

在 `speech-pipeline.ts` 中添加缓冲选项：

```typescript
export interface SpeechPipelineOptions<TAudio> {
  // ... 现有选项

  // 新增：缓冲模式
  bufferMode?: 'stream' | 'buffer-all' | 'buffer-sentence'
  // stream: 当前模式，立即播放
  // buffer-all: 等待整个 intent 完成后再播放
  // buffer-sentence: 按句子缓冲（遇到句号、问号、感叹号）
}
```

### 2. 实现缓冲逻辑

修改 `runIntent` 函数：

```typescript
async function runIntent(intent: IntentState) {
  activeIntent = intent
  context.emit(speechPipelineEventMap.onIntentStart, intent.intentId)

  const tokenStream = intent.stream
  const segmentStream = segmenter(tokenStream, { streamId: intent.streamId, intentId: intent.intentId })

  // 新增：音频缓冲区
  const audioBuffer: TAudio[] = []
  let isIntentComplete = false

  try {
    const reader = segmentStream.getReader()

    while (true) {
      const { value, done } = await reader.read()

      if (done) {
        isIntentComplete = true
        break
      }

      if (!value)
        continue
      if (intent.canceled || intent.controller.signal.aborted) {
        await reader.cancel()
        break
      }

      // ... TTS 合成逻辑 ...
      const audio = await options.tts(request, intent.controller.signal)

      if (!audio)
        continue

      // 根据缓冲模式决定是否立即播放
      if (options.bufferMode === 'buffer-all') {
        // 缓冲模式：先存起来
        audioBuffer.push(audio)
      }
      else if (options.bufferMode === 'buffer-sentence') {
        // 句子缓冲：遇到句号才播放
        audioBuffer.push(audio)
        if (value.text.match(/[。！？.!?]$/)) {
          // 播放缓冲的句子
          audioBuffer.forEach((bufferedAudio) => {
            options.playback.schedule({
              // ... 播放参数
              audio: bufferedAudio
            })
          })
          audioBuffer.length = 0
        }
      }
      else {
        // 流式模式：立即播放（当前行为）
        options.playback.schedule({
          // ... 播放参数
          audio
        })
      }
    }

    // Intent 完成后，播放所有缓冲的音频
    if (options.bufferMode === 'buffer-all' && audioBuffer.length > 0) {
      audioBuffer.forEach((bufferedAudio) => {
        options.playback.schedule({
          // ... 播放参数
          audio: bufferedAudio
        })
      })
    }

    reader.releaseLock()
  }
  catch (err) {
    logger.warn('Speech pipeline intent failed:', err)
  }
  finally {
    // ... 清理逻辑
  }
}
```

### 3. 改进打断逻辑

在 VAD 检测中添加持续检测：

```typescript
// 在 vad.ts 或相关文件中
export interface VADInterruptConfig {
  // 需要持续检测到语音多久才触发打断（毫秒）
  interruptThreshold: number // 默认 500ms
  // 语音概率阈值
  speechProbabilityThreshold: number // 默认 0.7
}

class VADInterruptDetector {
  private speechStartTime: number | null = null
  private config: VADInterruptConfig

  onSpeechDetected(probability: number) {
    if (probability >= this.config.speechProbabilityThreshold) {
      if (!this.speechStartTime) {
        this.speechStartTime = Date.now()
      }
      else {
        const duration = Date.now() - this.speechStartTime
        if (duration >= this.config.interruptThreshold) {
          // 触发打断
          this.emit('interrupt-speech')
          this.speechStartTime = null
        }
      }
    }
    else {
      // 语音停止，重置
      this.speechStartTime = null
    }
  }
}
```

### 4. 配置界面

在设置页面添加选项：

```vue
<template>
  <div>
    <h3>语音播放模式</h3>
    <select v-model="speechBufferMode">
      <option value="stream">
        流式播放（立即播放）
      </option>
      <option value="buffer-sentence">
        句子缓冲（按句播放）
      </option>
      <option value="buffer-all">
        完整缓冲（全部合成后播放）
      </option>
    </select>

    <h3>打断设置</h3>
    <label>
      持续检测时长（毫秒）
      <input v-model.number="interruptThreshold" type="number" min="100" max="2000">
    </label>
    <p>需要持续检测到用户语音达到此时长才会打断 AI 语音</p>
  </div>
</template>
```

## 实现优先级

1. **高优先级**：实现 `buffer-all` 模式（完整缓冲）
2. **中优先级**：实现持续检测打断逻辑
3. **低优先级**：实现 `buffer-sentence` 模式（句子缓冲）

## 注意事项

1. **内存管理**：缓冲模式会占用更多内存，需要注意长文本的情况
2. **延迟权衡**：完整缓冲会增加首次播放延迟，但播放更流畅
3. **用户体验**：建议默认使用句子缓冲模式，平衡延迟和流畅度

## 测试计划

1. 测试中文长文本（100+ 字）的缓冲播放
2. 测试打断逻辑的灵敏度
3. 测试不同缓冲模式的内存占用
4. 测试网络不稳定情况下的表现
