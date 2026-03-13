import type { TtsInputChunkOptions } from '@proj-airi/pipelines-audio'

import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed } from 'vue'

export type SpeechOutputMode = 'fast' | 'balanced' | 'smooth' | 'custom'

export interface SpeechOutputModeConfig {
  boost: number
  minimumWords: number
  maximumWords: number
  description: string
}

const modeConfigs: Record<Exclude<SpeechOutputMode, 'custom'>, SpeechOutputModeConfig> = {
  fast: {
    boost: 1,
    minimumWords: 2,
    maximumWords: 8,
    description: '立即开始播放，响应最快，但可能有较多停顿',
  },
  balanced: {
    boost: 0,
    minimumWords: 30,
    maximumWords: 100,
    description: '等待完整句子组，平衡响应速度和流畅度（推荐）',
  },
  smooth: {
    boost: 0,
    minimumWords: 50,
    maximumWords: 150,
    description: '等待完整段落，最流畅自然，但首次响应延迟较高',
  },
}

export const useSettingsSpeechOutput = defineStore('settings-speech-output', () => {
  // State
  const mode = useLocalStorageManualReset<SpeechOutputMode>('settings/speech-output/mode', 'balanced')
  const customBoost = useLocalStorageManualReset<number>('settings/speech-output/custom-boost', 0)
  const customMinWords = useLocalStorageManualReset<number>('settings/speech-output/custom-min-words', 30)
  const customMaxWords = useLocalStorageManualReset<number>('settings/speech-output/custom-max-words', 100)

  // Computed
  const currentConfig = computed<SpeechOutputModeConfig>(() => {
    if (mode.value === 'custom') {
      return {
        boost: customBoost.value,
        minimumWords: customMinWords.value,
        maximumWords: customMaxWords.value,
        description: '自定义配置',
      }
    }
    return modeConfigs[mode.value]
  })

  const chunkOptions = computed<TtsInputChunkOptions>(() => ({
    boost: currentConfig.value.boost,
    minimumWords: currentConfig.value.minimumWords,
    maximumWords: currentConfig.value.maximumWords,
  }))

  // Actions
  function resetState() {
    mode.reset()
    customBoost.reset()
    customMinWords.reset()
    customMaxWords.reset()
  }

  return {
    // State
    mode,
    customBoost,
    customMinWords,
    customMaxWords,

    // Computed
    currentConfig,
    chunkOptions,
    modeConfigs,

    // Actions
    resetState,
  }
})
