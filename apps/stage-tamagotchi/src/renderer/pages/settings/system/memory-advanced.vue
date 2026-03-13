<script setup lang="ts">
import { useMemoryAdvancedSettingsStore } from '@proj-airi/stage-ui/stores/settings/memory-advanced'
import { FieldCheckbox, FieldRange } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const memoryAdvancedStore = useMemoryAdvancedSettingsStore()
const { settings } = storeToRefs(memoryAdvancedStore)
</script>

<template>
  <div :class="['flex flex-col gap-6 p-6']">
    <!-- Info Banner -->
    <div :class="['flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800']">
      <div :class="['i-solar:info-circle-bold text-blue-600 dark:text-blue-400 text-xl flex-shrink-0 mt-0.5']" />
      <div :class="['flex flex-col gap-1']">
        <p :class="['text-sm font-medium text-blue-800 dark:text-blue-200']">
          {{ t('tamagotchi.settings.pages.system.memory-advanced.info.title') }}
        </p>
        <p :class="['text-sm text-blue-700 dark:text-blue-300']">
          {{ t('tamagotchi.settings.pages.system.memory-advanced.info.description') }}
        </p>
      </div>
    </div>

    <!-- 阶段1: 记忆隔离 -->
    <div :class="['flex flex-col gap-3']">
      <h3 :class="['text-lg font-semibold text-neutral-800 dark:text-neutral-200']">
        {{ t('tamagotchi.settings.pages.system.memory-advanced.isolation.title') }}
      </h3>
      <FieldCheckbox
        v-model="settings.enableMultiUser"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.isolation.multi-user.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.isolation.multi-user.description')"
      />
      <div
        v-if="settings.enableMultiUser"
        v-motion
        :initial="{ opacity: 0, height: 0 }"
        :enter="{ opacity: 1, height: 'auto' }"
        :class="['ml-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800']"
      >
        <p :class="['text-sm text-yellow-800 dark:text-yellow-200']">
          ⚠️ {{ t('tamagotchi.settings.pages.system.memory-advanced.isolation.multi-user.warning') }}
        </p>
      </div>
    </div>

    <!-- 阶段2: 语义理解 -->
    <div :class="['flex flex-col gap-3']">
      <h3 :class="['text-lg font-semibold text-neutral-800 dark:text-neutral-200']">
        {{ t('tamagotchi.settings.pages.system.memory-advanced.semantic.title') }}
      </h3>
      <FieldCheckbox
        v-model="settings.enableSemanticSearch"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="50"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.semantic.search.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.semantic.search.description')"
      />
      <FieldCheckbox
        v-model="settings.enableSmartValueJudgment"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="100"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.semantic.value-judgment.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.semantic.value-judgment.description')"
      />
    </div>

    <!-- 阶段3: 自然对话 -->
    <div :class="['flex flex-col gap-3']">
      <h3 :class="['text-lg font-semibold text-neutral-800 dark:text-neutral-200']">
        {{ t('tamagotchi.settings.pages.system.memory-advanced.natural.title') }}
      </h3>
      <FieldCheckbox
        v-model="settings.enableConversationInit"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="150"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.natural.conversation-init.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.natural.conversation-init.description')"
      />
      <FieldCheckbox
        v-model="settings.enableNaturalOutput"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="200"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.natural.output.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.natural.output.description')"
      />
      <FieldRange
        v-if="settings.enableNaturalOutput"
        v-model="settings.naturalOutputDelay"
        v-motion
        :initial="{ opacity: 0, height: 0 }"
        :enter="{ opacity: 1, height: 'auto' }"
        :min="100"
        :max="1000"
        :step="50"
        :class="['ml-4']"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.natural.output-delay.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.natural.output-delay.description')"
      />
      <FieldCheckbox
        v-model="settings.enableSemanticSegmentation"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="250"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.natural.semantic-segmentation.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.natural.semantic-segmentation.description')"
      >
        <template #badge>
          <span :class="['text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400']">
            {{ t('tamagotchi.settings.pages.system.memory-advanced.natural.semantic-segmentation.badge') }}
          </span>
        </template>
      </FieldCheckbox>
      <FieldRange
        v-model="settings.bubbleDelayMs"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="300"
        :min="500"
        :max="5000"
        :step="100"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.natural.bubble-delay.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.natural.bubble-delay.description')"
      />
      <FieldCheckbox
        v-model="settings.enableAdaptiveBubbleDelay"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="350"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.natural.adaptive-bubble-delay.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.natural.adaptive-bubble-delay.description')"
      />
      <FieldRange
        v-model="settings.typingSpeed"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="400"
        :min="10"
        :max="100"
        :step="5"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.natural.typing-speed.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.natural.typing-speed.description')"
      />
    </div>

    <!-- 阶段4: 消息处理 -->
    <div :class="['flex flex-col gap-3']">
      <h3 :class="['text-lg font-semibold text-neutral-800 dark:text-neutral-200']">
        {{ t('tamagotchi.settings.pages.system.memory-advanced.message.title') }}
      </h3>
      <FieldCheckbox
        v-model="settings.enableMessageMerging"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="400"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.message.merging.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.message.merging.description')"
      >
        <template #badge>
          <span :class="['text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400']">
            {{ t('tamagotchi.settings.pages.system.memory-advanced.message.merging.badge') }}
          </span>
        </template>
      </FieldCheckbox>
      <FieldRange
        v-if="settings.enableMessageMerging"
        v-model="settings.messageMergeDelay"
        v-motion
        :initial="{ opacity: 0, height: 0 }"
        :enter="{ opacity: 1, height: 'auto' }"
        :min="1000"
        :max="5000"
        :step="500"
        :class="['ml-4']"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.message.merge-delay.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.message.merge-delay.description')"
      />
    </div>

    <!-- 阶段5: 主动话题 -->
    <div :class="['flex flex-col gap-3']">
      <h3 :class="['text-lg font-semibold text-neutral-800 dark:text-neutral-200']">
        {{ t('tamagotchi.settings.pages.system.memory-advanced.proactive.title') }}
        <span :class="['text-xs text-red-500 ml-2']">{{ t('tamagotchi.settings.pages.system.memory-advanced.proactive.experimental') }}</span>
      </h3>
      <FieldCheckbox
        v-model="settings.enableProactiveTopic"
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="250"
        :label="t('tamagotchi.settings.pages.system.memory-advanced.proactive.enable.label')"
        :description="t('tamagotchi.settings.pages.system.memory-advanced.proactive.enable.description')"
      />
      <div
        v-if="settings.enableProactiveTopic"
        v-motion
        :initial="{ opacity: 0, height: 0 }"
        :enter="{ opacity: 1, height: 'auto' }"
        :class="['ml-4 flex flex-col gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800']"
      >
        <FieldCheckbox
          v-model="settings.proactiveRandomInterval"
          :label="t('tamagotchi.settings.pages.system.memory-advanced.proactive.random-interval.label')"
          :description="t('tamagotchi.settings.pages.system.memory-advanced.proactive.random-interval.description')"
        >
          <template #badge>
            <span :class="['text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400']">
              推荐
            </span>
          </template>
        </FieldCheckbox>

        <FieldRange
          v-if="!settings.proactiveRandomInterval"
          v-model="settings.proactiveCheckInterval"
          :min="1"
          :max="60"
          :step="1"
          :label="t('tamagotchi.settings.pages.system.memory-advanced.proactive.interval.label')"
          :description="t('tamagotchi.settings.pages.system.memory-advanced.proactive.interval.description')"
        />

        <div v-if="settings.proactiveRandomInterval" :class="['flex flex-col gap-3']">
          <FieldRange
            v-model="settings.proactiveMinInterval"
            :min="1"
            :max="30"
            :step="1"
            :label="t('tamagotchi.settings.pages.system.memory-advanced.proactive.min-interval.label')"
            :description="t('tamagotchi.settings.pages.system.memory-advanced.proactive.min-interval.description')"
          />
          <FieldRange
            v-model="settings.proactiveMaxInterval"
            :min="settings.proactiveMinInterval + 1"
            :max="60"
            :step="1"
            :label="t('tamagotchi.settings.pages.system.memory-advanced.proactive.max-interval.label')"
            :description="t('tamagotchi.settings.pages.system.memory-advanced.proactive.max-interval.description')"
          />
        </div>

        <div>
          <label :class="['text-sm font-medium mb-2 block text-neutral-800 dark:text-neutral-200']">
            {{ t('tamagotchi.settings.pages.system.memory-advanced.proactive.time-range.label') }}
          </label>
          <div :class="['flex gap-2 items-center']">
            <input
              v-model.number="settings.proactiveTimeRange.start"
              type="number"
              :min="0"
              :max="23"
              :class="['w-20 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200']"
            >
            <span>-</span>
            <input
              v-model.number="settings.proactiveTimeRange.end"
              type="number"
              :min="0"
              :max="23"
              :class="['w-20 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200']"
            >
            <span :class="['text-sm text-neutral-500']">{{ t('tamagotchi.settings.pages.system.memory-advanced.proactive.time-range.unit') }}</span>
          </div>
          <p :class="['text-xs text-neutral-600 dark:text-neutral-400 mt-1']">
            {{ t('tamagotchi.settings.pages.system.memory-advanced.proactive.time-range.description') }}
          </p>
        </div>
      </div>
    </div>

    <!-- 重置按钮 -->
    <div>
      <button
        v-motion
        :initial="{ opacity: 0, y: 10 }"
        :enter="{ opacity: 1, y: 0 }"
        :duration="250"
        :delay="300"
        type="button"
        :class="['px-4 py-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors']"
        @click="memoryAdvancedStore.resetToDefaults()"
      >
        {{ t('tamagotchi.settings.pages.system.memory-advanced.reset') }}
      </button>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: tamagotchi.settings.pages.system.memory-advanced.title
  descriptionKey: tamagotchi.settings.pages.system.memory-advanced.description
  subtitleKey: settings.title
  settingsEntry: true
  order: 25
  icon: i-solar:brain-bold-duotone
  stageTransition:
    name: slide
</route>
