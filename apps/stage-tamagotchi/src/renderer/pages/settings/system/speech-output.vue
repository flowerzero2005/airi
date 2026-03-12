<script setup lang="ts">
import type { SpeechOutputMode } from '@proj-rin/stage-ui/stores/settings'

import { useSettingsSpeechOutput } from '@proj-rin/stage-ui/stores/settings'
import { FieldRange, Radio } from '@proj-rin/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const speechOutputSettings = useSettingsSpeechOutput()
const { mode, customBoost, customMinWords, customMaxWords } = storeToRefs(speechOutputSettings)

const modes: Array<{ value: SpeechOutputMode, titleKey: string, descriptionKey: string }> = [
  { value: 'fast', titleKey: 'tamagotchi.settings.pages.system.speech-output.mode.fast', descriptionKey: 'tamagotchi.settings.pages.system.speech-output.mode-description.fast' },
  { value: 'balanced', titleKey: 'tamagotchi.settings.pages.system.speech-output.mode.balanced', descriptionKey: 'tamagotchi.settings.pages.system.speech-output.mode-description.balanced' },
  { value: 'smooth', titleKey: 'tamagotchi.settings.pages.system.speech-output.mode.smooth', descriptionKey: 'tamagotchi.settings.pages.system.speech-output.mode-description.smooth' },
  { value: 'custom', titleKey: 'tamagotchi.settings.pages.system.speech-output.mode.custom', descriptionKey: 'tamagotchi.settings.pages.system.speech-output.mode-description.custom' },
]
</script>

<template>
  <div :class="['flex flex-col gap-6 p-6']">
    <!-- Info Banner -->
    <div :class="['flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800']">
      <div :class="['i-solar:info-circle-bold text-blue-600 dark:text-blue-400 text-xl flex-shrink-0 mt-0.5']" />
      <div :class="['flex flex-col gap-1']">
        <p :class="['text-sm font-medium text-blue-800 dark:text-blue-200']">
          语音输出优化设置
        </p>
        <p :class="['text-sm text-blue-700 dark:text-blue-300']">
          调整这些设置可以改善 AI 语音回复的流畅度。推荐使用"平衡模式"以获得最佳体验。
        </p>
      </div>
    </div>

    <!-- Mode Selection -->
    <div :class="['flex flex-col gap-3']">
      <h3 :class="['text-lg font-semibold text-neutral-800 dark:text-neutral-200']">
        {{ t('tamagotchi.settings.pages.system.speech-output.mode.label') }}
      </h3>
      <div :class="['flex flex-col gap-2']">
        <div
          v-for="(modeOption, index) in modes"
          :key="modeOption.value"
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="250 + (index * 10)"
          :delay="index * 50"
          :class="['flex flex-col gap-1']"
        >
          <Radio
            :id="`speech-output-mode-${modeOption.value}`"
            v-model="mode"
            name="speech-output-mode"
            :value="modeOption.value"
            :title="t(modeOption.titleKey)"
          />
          <p :class="['text-sm text-neutral-600 dark:text-neutral-400 ml-8 -mt-1']">
            {{ t(modeOption.descriptionKey) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Custom Settings -->
    <div
      v-if="mode === 'custom'"
      v-motion
      :initial="{ opacity: 0, height: 0 }"
      :enter="{ opacity: 1, height: 'auto' }"
      :leave="{ opacity: 0, height: 0 }"
      :class="['flex flex-col gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800']"
    >
      <h4 :class="['text-base font-semibold text-neutral-800 dark:text-neutral-200']">
        {{ t('tamagotchi.settings.pages.system.speech-output.custom-settings.title') }}
      </h4>

      <!-- Boost -->
      <FieldRange
        v-model="customBoost"
        :label="t('tamagotchi.settings.pages.system.speech-output.custom-settings.boost.label')"
        :description="t('tamagotchi.settings.pages.system.speech-output.custom-settings.boost.description')"
        :min="0"
        :max="5"
        :step="1"
      />

      <!-- Min Words -->
      <FieldRange
        v-model="customMinWords"
        :label="t('tamagotchi.settings.pages.system.speech-output.custom-settings.min-words.label')"
        :description="t('tamagotchi.settings.pages.system.speech-output.custom-settings.min-words.description')"
        :min="5"
        :max="50"
        :step="5"
      />

      <!-- Max Words -->
      <FieldRange
        v-model="customMaxWords"
        :label="t('tamagotchi.settings.pages.system.speech-output.custom-settings.max-words.label')"
        :description="t('tamagotchi.settings.pages.system.speech-output.custom-settings.max-words.description')"
        :min="20"
        :max="200"
        :step="10"
      />
    </div>

    <!-- Current Configuration Display -->
    <div :class="['flex flex-col gap-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800']">
      <h4 :class="['text-sm font-semibold text-blue-800 dark:text-blue-200']">
        当前配置
      </h4>
      <div :class="['text-sm text-blue-700 dark:text-blue-300 space-y-1']">
        <p>快速处理: {{ speechOutputSettings.currentConfig.boost }} 个片段</p>
        <p>最小词数: {{ speechOutputSettings.currentConfig.minimumWords }} 词</p>
        <p>最大词数: {{ speechOutputSettings.currentConfig.maximumWords }} 词</p>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: tamagotchi.settings.pages.system.speech-output.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
