<script setup lang="ts">
import { Alert } from '@proj-airi/stage-ui/components'
import { useSpeechPlaybackSettingsStore } from '@proj-airi/stage-ui/stores/settings/speech-playback'
import { FieldCheckbox, FieldRange } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const speechPlaybackSettings = useSpeechPlaybackSettingsStore()
const { settings } = storeToRefs(speechPlaybackSettings)
</script>

<template>
  <div flex="~ col gap-6">
    <!-- 音频缓冲设置 -->
    <div rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800 flex="~ col gap-4">
      <div>
        <h2 class="text-lg text-neutral-700 md:text-xl dark:text-neutral-300">
          音频缓冲设置
        </h2>
        <div text="sm neutral-500 dark:neutral-400">
          <span>控制语音合成的播放方式，提升播放流畅度</span>
        </div>
      </div>

      <FieldCheckbox
        v-model="settings.bufferingEnabled"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="50"
        label="启用音频缓冲"
        description="等待多个语音片段合成完成后再开始播放，避免一卡一卡的播放效果"
      />

      <template v-if="settings.bufferingEnabled">
        <FieldRange
          v-model="settings.minSegments"
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="250"
          :delay="100"
          label="最少缓冲片段数"
          description="至少缓冲多少个语音片段后才开始播放（建议 3-10）"
          :min="1"
          :max="20"
          :step="1"
          :format-value="value => `${value} 个片段`"
        />

        <FieldRange
          v-model="settings.bufferTimeout"
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="250"
          :delay="150"
          label="缓冲超时时间"
          description="超过此时间后自动开始播放，防止等待过久（建议 2000-5000ms）"
          :min="1000"
          :max="10000"
          :step="500"
          :format-value="value => `${value}ms`"
        />

        <Alert
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="250"
          :delay="200"
          type="info"
          icon="i-solar:info-circle-line-duotone"
        >
          <template #title>
            工作原理
          </template>
          <template #content>
            启用缓冲后，系统会等待至少 {{ settings.minSegments }} 个语音片段合成完成，或等待 {{ settings.bufferTimeout }}ms 后开始播放。这样可以避免中文语音合成时一小段一小段播放的问题。
          </template>
        </Alert>
      </template>
    </div>

    <!-- 打断检测设置 -->
    <div rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800 flex="~ col gap-4">
      <div>
        <h2 class="text-lg text-neutral-700 md:text-xl dark:text-neutral-300">
          语音打断设置
        </h2>
        <div text="sm neutral-500 dark:neutral-400">
          <span>控制用户语音如何打断 AI 的语音输出</span>
        </div>
      </div>

      <FieldCheckbox
        v-model="settings.interruptionEnabled"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="50"
        label="启用智能打断"
        description="只有持续检测到用户语音输入时才会打断 AI 语音，避免误触发"
      />

      <template v-if="settings.interruptionEnabled">
        <FieldRange
          v-model="settings.continuousDetectionThreshold"
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="250"
          :delay="100"
          label="持续检测阈值"
          description="需要持续检测到用户语音多久才触发打断（建议 300-1000ms）"
          :min="100"
          :max="2000"
          :step="100"
          :format-value="value => `${value}ms`"
        />

        <FieldRange
          v-model="settings.speechEndBuffer"
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="250"
          :delay="150"
          label="语音结束缓冲时间"
          description="用户停止说话后等待多久才认为语音结束（建议 300-800ms）"
          :min="100"
          :max="2000"
          :step="100"
          :format-value="value => `${value}ms`"
        />

        <Alert
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="250"
          :delay="200"
          type="info"
          icon="i-solar:info-circle-line-duotone"
        >
          <template #title>
            工作原理
          </template>
          <template #content>
            启用智能打断后，系统会使用状态机检测用户语音。只有当用户持续说话超过 {{ settings.continuousDetectionThreshold }}ms 时，才会打断 AI 的语音输出。这样可以避免环境噪音或短暂的声音误触发打断。
          </template>
        </Alert>
      </template>
    </div>

    <!-- 装饰图标 -->
    <div
      v-motion
      text="neutral-200/50 dark:neutral-600/20" pointer-events-none
      fixed top="[calc(100dvh-15rem)]" bottom-0 right--5 z--1
      :initial="{ scale: 0.9, opacity: 0, x: 20 }"
      :enter="{ scale: 1, opacity: 1, x: 0 }"
      :duration="500"
      size-60
      flex items-center justify-center
    >
      <div text="60" i-solar:soundwave-bold-duotone />
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  title: 语音播放设置
  subtitle: 设置
  stageTransition:
    name: slide
</route>
