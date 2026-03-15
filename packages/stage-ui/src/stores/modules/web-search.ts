import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface CharacterInterestWeights {
  // Content type preferences (0-1)
  anime: number
  memes: number
  games: number
  technology: number
  art: number
  music: number
  food: number
  fashion: number
  science: number
  philosophy: number
  sports: number
  news: number
}

export interface CharacterDepthPreference {
  superficial: number // Fun/interesting content
  moderate: number // Moderate depth
  deep: number // Professional/technical content
}

export interface CharacterExpressionStyle {
  cute: number
  playful: number
  serious: number
  casual: number
  professional: number
  emotional: number
}

export interface CharacterProfile {
  interestWeights: CharacterInterestWeights
  depthPreference: CharacterDepthPreference
  expressionStyle: CharacterExpressionStyle
}

// Default profile: 15-year-old 2D anime girl
const DEFAULT_CHARACTER_PROFILE: CharacterProfile = {
  interestWeights: {
    anime: 0.95,
    memes: 0.90,
    games: 0.85,
    technology: 0.60,
    art: 0.70,
    music: 0.75,
    food: 0.80,
    fashion: 0.65,
    science: 0.40,
    philosophy: 0.30,
    sports: 0.50,
    news: 0.35,
  },
  depthPreference: {
    superficial: 0.70,
    moderate: 0.25,
    deep: 0.05,
  },
  expressionStyle: {
    cute: 0.90,
    playful: 0.85,
    serious: 0.20,
    casual: 0.80,
    professional: 0.30,
    emotional: 0.75,
  },
}

export const useWebSearchStore = defineStore('web-search-store', () => {
  // Enable/disable intelligent web search
  const enabled = useLocalStorageManualReset<boolean>('settings/web-search/enabled', true)

  // API Configuration
  const tavilyApiKey = useLocalStorageManualReset<string>('settings/web-search/tavily-api-key', '')

  // Character profile settings
  const characterProfileEnabled = useLocalStorageManualReset<boolean>('settings/web-search/character-profile-enabled', true)

  // Interest weights
  const interestAnime = useLocalStorageManualReset<number>('settings/web-search/interest/anime', DEFAULT_CHARACTER_PROFILE.interestWeights.anime)
  const interestMemes = useLocalStorageManualReset<number>('settings/web-search/interest/memes', DEFAULT_CHARACTER_PROFILE.interestWeights.memes)
  const interestGames = useLocalStorageManualReset<number>('settings/web-search/interest/games', DEFAULT_CHARACTER_PROFILE.interestWeights.games)
  const interestTechnology = useLocalStorageManualReset<number>('settings/web-search/interest/technology', DEFAULT_CHARACTER_PROFILE.interestWeights.technology)
  const interestArt = useLocalStorageManualReset<number>('settings/web-search/interest/art', DEFAULT_CHARACTER_PROFILE.interestWeights.art)
  const interestMusic = useLocalStorageManualReset<number>('settings/web-search/interest/music', DEFAULT_CHARACTER_PROFILE.interestWeights.music)
  const interestFood = useLocalStorageManualReset<number>('settings/web-search/interest/food', DEFAULT_CHARACTER_PROFILE.interestWeights.food)
  const interestFashion = useLocalStorageManualReset<number>('settings/web-search/interest/fashion', DEFAULT_CHARACTER_PROFILE.interestWeights.fashion)
  const interestScience = useLocalStorageManualReset<number>('settings/web-search/interest/science', DEFAULT_CHARACTER_PROFILE.interestWeights.science)
  const interestPhilosophy = useLocalStorageManualReset<number>('settings/web-search/interest/philosophy', DEFAULT_CHARACTER_PROFILE.interestWeights.philosophy)
  const interestSports = useLocalStorageManualReset<number>('settings/web-search/interest/sports', DEFAULT_CHARACTER_PROFILE.interestWeights.sports)
  const interestNews = useLocalStorageManualReset<number>('settings/web-search/interest/news', DEFAULT_CHARACTER_PROFILE.interestWeights.news)

  // Depth preferences
  const depthSuperficial = useLocalStorageManualReset<number>('settings/web-search/depth/superficial', DEFAULT_CHARACTER_PROFILE.depthPreference.superficial)
  const depthModerate = useLocalStorageManualReset<number>('settings/web-search/depth/moderate', DEFAULT_CHARACTER_PROFILE.depthPreference.moderate)
  const depthDeep = useLocalStorageManualReset<number>('settings/web-search/depth/deep', DEFAULT_CHARACTER_PROFILE.depthPreference.deep)

  // Expression style
  const styleCute = useLocalStorageManualReset<number>('settings/web-search/style/cute', DEFAULT_CHARACTER_PROFILE.expressionStyle.cute)
  const stylePlayful = useLocalStorageManualReset<number>('settings/web-search/style/playful', DEFAULT_CHARACTER_PROFILE.expressionStyle.playful)
  const styleSerious = useLocalStorageManualReset<number>('settings/web-search/style/serious', DEFAULT_CHARACTER_PROFILE.expressionStyle.serious)
  const styleCasual = useLocalStorageManualReset<number>('settings/web-search/style/casual', DEFAULT_CHARACTER_PROFILE.expressionStyle.casual)
  const styleProfessional = useLocalStorageManualReset<number>('settings/web-search/style/professional', DEFAULT_CHARACTER_PROFILE.expressionStyle.professional)
  const styleEmotional = useLocalStorageManualReset<number>('settings/web-search/style/emotional', DEFAULT_CHARACTER_PROFILE.expressionStyle.emotional)

  // Search behavior preferences
  const conservativeness = useLocalStorageManualReset<number>('settings/web-search/conservativeness', 0.5) // 0 = aggressive, 1 = very conservative
  const knowledgeTransparency = useLocalStorageManualReset<number>('settings/web-search/knowledge-transparency', 0.2) // 0 = hide source, 1 = show source
  const pretendUncertainty = useLocalStorageManualReset<boolean>('settings/web-search/pretend-uncertainty', true)

  // Computed character profile
  const characterProfile = computed<CharacterProfile>(() => ({
    interestWeights: {
      anime: interestAnime.value,
      memes: interestMemes.value,
      games: interestGames.value,
      technology: interestTechnology.value,
      art: interestArt.value,
      music: interestMusic.value,
      food: interestFood.value,
      fashion: interestFashion.value,
      science: interestScience.value,
      philosophy: interestPhilosophy.value,
      sports: interestSports.value,
      news: interestNews.value,
    },
    depthPreference: {
      superficial: depthSuperficial.value,
      moderate: depthModerate.value,
      deep: depthDeep.value,
    },
    expressionStyle: {
      cute: styleCute.value,
      playful: stylePlayful.value,
      serious: styleSerious.value,
      casual: styleCasual.value,
      professional: styleProfessional.value,
      emotional: styleEmotional.value,
    },
  }))

  // API Key validation state (use ref instead of localStorage for validation status)
  const apiKeyValid = ref<boolean | null>(null)
  const apiKeyValidating = ref(false)
  const apiKeyError = ref<string | null>(null)

  // Check if the module is properly configured
  const configured = computed(() => {
    // Must have Tavily API Key configured
    // We don't require validation here because validation is session-based
    return tavilyApiKey.value.trim().length > 0
  })

  // Validate Tavily API Key by making a test request
  async function validateApiKey(): Promise<{ valid: boolean, error?: string }> {
    const key = tavilyApiKey.value.trim()

    if (!key) {
      apiKeyValid.value = false
      apiKeyError.value = 'API Key 不能为空'
      return { valid: false, error: 'API Key 不能为空' }
    }

    apiKeyValidating.value = true
    apiKeyError.value = null

    try {
      // Make a minimal test request to Tavily API
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: key,
          query: 'test',
          max_results: 1,
          search_depth: 'basic',
        }),
      })

      const data = await response.json()

      if (response.ok && data.results) {
        // API Key is valid
        apiKeyValid.value = true
        apiKeyError.value = null
        return { valid: true }
      }
      else if (response.status === 401 || response.status === 403) {
        // Invalid API Key
        apiKeyValid.value = false
        apiKeyError.value = 'API Key 无效或已过期'
        return { valid: false, error: 'API Key 无效或已过期' }
      }
      else {
        // Other error
        const errorMsg = data.error || data.message || `HTTP ${response.status}`
        apiKeyValid.value = false
        apiKeyError.value = `验证失败: ${errorMsg}`
        return { valid: false, error: errorMsg }
      }
    }
    catch (error) {
      // Network error or other exception
      const errorMsg = error instanceof Error ? error.message : String(error)
      apiKeyValid.value = false
      apiKeyError.value = `网络错误: ${errorMsg}`
      return { valid: false, error: errorMsg }
    }
    finally {
      apiKeyValidating.value = false
    }
  }

  // Clear validation state when API key changes
  function clearValidation() {
    apiKeyValid.value = null
    apiKeyError.value = null
  }

  function resetToDefaults() {
    enabled.reset()
    tavilyApiKey.value = '' // Don't reset API key
    characterProfileEnabled.reset()

    // Reset interest weights
    interestAnime.reset()
    interestMemes.reset()
    interestGames.reset()
    interestTechnology.reset()
    interestArt.reset()
    interestMusic.reset()
    interestFood.reset()
    interestFashion.reset()
    interestScience.reset()
    interestPhilosophy.reset()
    interestSports.reset()
    interestNews.reset()

    // Reset depth preferences
    depthSuperficial.reset()
    depthModerate.reset()
    depthDeep.reset()

    // Reset expression style
    styleCute.reset()
    stylePlayful.reset()
    styleSerious.reset()
    styleCasual.reset()
    styleProfessional.reset()
    styleEmotional.reset()

    // Reset behavior preferences
    conservativeness.reset()
    knowledgeTransparency.reset()
    pretendUncertainty.reset()
  }

  return {
    // Main settings
    enabled,
    tavilyApiKey,
    characterProfileEnabled,

    // API Key validation
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

    // Computed
    characterProfile,
    configured,

    // Actions
    validateApiKey,
    clearValidation,
    resetToDefaults,
  }
})
