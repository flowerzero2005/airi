<script setup lang="ts">
import { Alert } from '@proj-airi/stage-ui/components'
import { useWebSearchStore } from '@proj-airi/stage-ui/stores/modules/web-search'
import { Button, FieldCheckbox, FieldInput, FieldRange } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'

const webSearchStore = useWebSearchStore()
const {
  enabled,
  tavilyApiKey,
  characterProfileEnabled,
  configured,
  apiKeyValid,
  apiKeyValidating,
  apiKeyError,
  // Interest weights
  interestAnime,
  interestMemes,
  interestGames,
  interestTechnology,
  interestArt,
  interestMusic,
  interestFood,
  interestFashion,
  interestScience,
  interestPhilosophy,
  interestSports,
  interestNews,
  // Depth preferences
  depthSuperficial,
  depthModerate,
  depthDeep,
  // Expression style
  styleCute,
  stylePlayful,
  styleSerious,
  styleCasual,
  styleProfessional,
  styleEmotional,
  // Behavior preferences
  conservativeness,
  knowledgeTransparency,
  pretendUncertainty,
} = storeToRefs(webSearchStore)

// Check if API key is missing
const apiKeyMissing = computed(() => enabled.value && !configured.value)

// Clear validation when API key changes
watch(tavilyApiKey, () => {
  webSearchStore.clearValidation()
})

// Test API key
async function testApiKey() {
  await webSearchStore.validateApiKey()
}
</script>

<template>
  <div flex="~ col gap-6">
    <div bg="neutral-50 dark:[rgba(0,0,0,0.3)]" rounded-xl p-4 flex="~ col gap-6">
      <!-- Main Settings -->
      <div>
        <h2 class="text-lg text-neutral-500 md:text-2xl dark:text-neutral-500">
          智能联网系统
        </h2>
        <div text="neutral-400 dark:neutral-400">
          <span>配置智能联网行为和人设过滤</span>
        </div>
      </div>

      <!-- Enable/Disable -->
      <div flex="~ col gap-4">
        <FieldCheckbox
          v-model="enabled"
          label="启用智能联网"
          description="允许 AI 在需要时联网查询信息"
        />

        <!-- API Key Missing Warning -->
        <Alert
          v-if="apiKeyMissing"
          type="warning"
        >
          <template #title>
            需要配置 API Key
          </template>
          <template #content>
            智能联网功能需要 Tavily API Key 才能正常工作。请在下方输入您的 API Key。
            <br>
            获取地址: <a href="https://tavily.com" target="_blank" class="underline">https://tavily.com</a>
          </template>
        </Alert>

        <div v-if="enabled" flex="~ col gap-2">
          <FieldInput
            v-model="tavilyApiKey"
            label="Tavily API Key"
            description="用于网络搜索的 API 密钥。获取地址: https://tavily.com"
            type="password"
            placeholder="tvly-xxxxxxxxxxxxxxxxxxxxxxxx"
          />

          <!-- Test Connection Button -->
          <div flex="~ gap-2 items-center">
            <Button
              :disabled="!tavilyApiKey || apiKeyValidating"
              @click="testApiKey"
            >
              {{ apiKeyValidating ? '测试中...' : '测试连接' }}
            </Button>

            <!-- Validation Status -->
            <div v-if="apiKeyValid === true" flex="~ gap-1 items-center" text="green-600 dark:green-400 sm">
              <div i-solar:check-circle-bold-duotone />
              <span>API Key 有效</span>
            </div>
            <div v-else-if="apiKeyValid === false" flex="~ gap-1 items-center" text="red-600 dark:red-400 sm">
              <div i-solar:close-circle-bold-duotone />
              <span>{{ apiKeyError || 'API Key 无效' }}</span>
            </div>
          </div>
        </div>

        <FieldCheckbox
          v-model="characterProfileEnabled"
          :disabled="!enabled"
          label="启用人设过滤"
          description="根据角色人设过滤和选择查询结果"
        />
      </div>

      <!-- Character Profile Settings -->
      <div v-if="enabled && characterProfileEnabled" flex="~ col gap-6">
        <!-- Interest Weights -->
        <div>
          <h3 class="mb-4 text-base text-neutral-600 md:text-lg dark:text-neutral-400">
            兴趣偏好权重
          </h3>
          <div text="neutral-400 dark:neutral-400 text-sm mb-4">
            <span>配置角色对不同内容类型的兴趣程度（0 = 不感兴趣，1 = 超级喜欢）</span>
          </div>
          <div flex="~ col gap-3">
            <FieldRange
              v-model="interestAnime"
              label="动漫"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestMemes"
              label="梗/搞笑"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestGames"
              label="游戏"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestTechnology"
              label="科技"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestArt"
              label="艺术"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestMusic"
              label="音乐"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestFood"
              label="美食"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestFashion"
              label="时尚"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestScience"
              label="科学"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestPhilosophy"
              label="哲学"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestSports"
              label="运动"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="interestNews"
              label="新闻时事"
              :min="0"
              :max="1"
              :step="0.05"
            />
          </div>
        </div>

        <!-- Depth Preferences -->
        <div>
          <h3 class="mb-4 text-base text-neutral-600 md:text-lg dark:text-neutral-400">
            信息深度偏好
          </h3>
          <div text="neutral-400 dark:neutral-400 text-sm mb-4">
            <span>配置角色对不同深度信息的偏好（总和应接近 1.0）</span>
          </div>
          <div flex="~ col gap-3">
            <FieldRange
              v-model="depthSuperficial"
              label="表面/趣味性"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="depthModerate"
              label="中等深度"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="depthDeep"
              label="深度/专业"
              :min="0"
              :max="1"
              :step="0.05"
            />
          </div>
        </div>

        <!-- Expression Style -->
        <div>
          <h3 class="mb-4 text-base text-neutral-600 md:text-lg dark:text-neutral-400">
            表达风格偏好
          </h3>
          <div text="neutral-400 dark:neutral-400 text-sm mb-4">
            <span>配置角色的表达风格倾向</span>
          </div>
          <div flex="~ col gap-3">
            <FieldRange
              v-model="styleCute"
              label="可爱"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="stylePlayful"
              label="玩味"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="styleSerious"
              label="严肃"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="styleCasual"
              label="随意"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="styleProfessional"
              label="专业"
              :min="0"
              :max="1"
              :step="0.05"
            />
            <FieldRange
              v-model="styleEmotional"
              label="情感化"
              :min="0"
              :max="1"
              :step="0.05"
            />
          </div>
        </div>
      </div>

      <!-- Behavior Settings -->
      <div v-if="enabled" flex="~ col gap-6">
        <div>
          <h3 class="mb-4 text-base text-neutral-600 md:text-lg dark:text-neutral-400">
            查询行为设置
          </h3>
          <div flex="~ col gap-3">
            <FieldRange
              v-model="conservativeness"
              label="保守程度"
              description="0 = 积极查询，1 = 非常保守"
              :min="0"
              :max="1"
              :step="0.1"
            />
            <FieldRange
              v-model="knowledgeTransparency"
              label="知识来源透明度"
              description="0 = 隐藏来源，1 = 明确说明查询了信息"
              :min="0"
              :max="1"
              :step="0.1"
            />
            <FieldCheckbox
              v-model="pretendUncertainty"
              label="装不太懂"
              description="即使查到准确信息，也用试探性语气表达"
            />
          </div>
        </div>
      </div>

      <!-- Info Alert -->
      <Alert type="info">
        <template #title>
          关于智能联网系统
        </template>
        <template #description>
          <div flex="~ col gap-2">
            <p>智能联网系统会根据对话情境自动判断是否需要查询信息，而不是简单的关键词触发。</p>
            <p>人设过滤功能会根据角色的兴趣偏好，从查询结果中选择符合人设的内容进行表达。</p>
            <p>这让 AI 的联网行为更加自然、有个性，符合角色设定。</p>
          </div>
        </template>
      </Alert>

      <!-- Reset Button -->
      <div>
        <Button
          @click="webSearchStore.resetToDefaults()"
        >
          恢复默认设置
        </Button>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  title: 智能联网
  subtitle: 设置
  description: 配置智能联网系统和人设过滤
  icon: i-solar:global-bold-duotone
  order: 8
</route>
