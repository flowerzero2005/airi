import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface SpeechPlaybackSettings {
  // 音频缓冲设置
  bufferingEnabled: boolean
  minSegments: number // 最少缓冲片段数
  bufferTimeout: number // 超时自动播放（ms）

  // 打断检测设置
  interruptionEnabled: boolean
  continuousDetectionThreshold: number // 持续检测阈值（ms）
  speechEndBuffer: number // 语音结束缓冲时间（ms）
}

export const useSpeechPlaybackSettingsStore = defineStore('speech-playback-settings', () => {
  const STORAGE_KEY = 'airi-speech-playback-settings'
  const isLoaded = ref(false)

  const settings = ref<SpeechPlaybackSettings>({
    // 音频缓冲默认设置
    bufferingEnabled: true,
    minSegments: 5,
    bufferTimeout: 3000,

    // 打断检测默认设置
    interruptionEnabled: true,
    continuousDetectionThreshold: 500,
    speechEndBuffer: 500,
  })

  // 从 localStorage 加载
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        settings.value = { ...settings.value, ...data }
        console.log('[Speech Playback Settings] Loaded from storage')
      }
    }
    catch (error) {
      console.error('[Speech Playback Settings] Failed to load from storage:', error)
    }
    finally {
      isLoaded.value = true
    }
  }

  // 保存到 localStorage
  function saveToStorage() {
    if (!isLoaded.value)
      return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
      console.log('[Speech Playback Settings] Saved to storage')
    }
    catch (error) {
      console.error('[Speech Playback Settings] Failed to save to storage:', error)
    }
  }

  // 监听变化并自动保存
  watch(settings, () => {
    if (isLoaded.value) {
      saveToStorage()
    }
  }, { deep: true })

  // 立即加载数据
  loadFromStorage()

  return {
    settings,
    isLoaded,
    loadFromStorage,
    saveToStorage,
  }
})
