import type { Card, ccv3 } from '@proj-airi/ccc'

import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import SystemPromptV2 from '../../constants/prompts/system-v2'

import { useConsciousnessStore } from './consciousness'
import { useSpeechStore } from './speech'

export interface AiriExtension {
  modules: {
    consciousness: {
      provider: string // Example: "openai"
      model: string // Example: "gpt-4o"
    }

    speech: {
      provider: string // Example: "elevenlabs"
      model: string // Example: "eleven_multilingual_v2"
      voice_id: string // Example: "alloy"

      pitch?: number
      rate?: number
      ssml?: boolean
      language?: string
    }

    vrm?: {
      source?: 'file' | 'url'
      file?: string // Example: "vrm/model.vrm"
      url?: string // Example: "https://example.com/vrm/model.vrm"
    }

    live2d?: {
      source?: 'file' | 'url'
      file?: string // Example: "live2d/model.json"
      url?: string // Example: "https://example.com/live2d/model.json"
    }
  }

  agents: {
    [key: string]: { // example: minecraft
      prompt: string
      enabled?: boolean
    }
  }
}

export interface AiriCard extends Card {
  extensions: {
    airi: AiriExtension
  } & Card['extensions']
}

export const useAiriCardStore = defineStore('airi-card', () => {
  const { t } = useI18n()

  const SYSTEM_PROMPT_VERSION = '1.2.1' // Increment when system prompt changes - Updated 2026-03-20: De-templating & companion rules

  const cards = useLocalStorageManualReset<Map<string, AiriCard>>('airi-cards', new Map())
  const activeCardId = useLocalStorageManualReset<string>('airi-card-active-id', 'default')

  // IMPORTANT: Check version immediately after loading from localStorage
  // This ensures version updates work without manual localStorage clearing
  const existingDefaultCard = cards.value.get('default')
  if (existingDefaultCard && existingDefaultCard.version !== SYSTEM_PROMPT_VERSION) {
    console.log('[AiriCard] Version mismatch detected on store init!')
    console.log('[AiriCard] Old version:', existingDefaultCard.version, '→ New version:', SYSTEM_PROMPT_VERSION)
    console.log('[AiriCard] Will update card in initialize()')
  }

  const activeCard = computed(() => cards.value.get(activeCardId.value))

  const consciousnessStore = useConsciousnessStore()
  const speechStore = useSpeechStore()

  const {
    activeProvider: activeConsciousnessProvider,
    activeModel: activeConsciousnessModel,
  } = storeToRefs(consciousnessStore)

  const {
    activeSpeechProvider,
    activeSpeechVoiceId,
    activeSpeechModel,
  } = storeToRefs(speechStore)

  const addCard = (card: AiriCard | Card | ccv3.CharacterCardV3) => {
    const newCardId = nanoid()
    const newCards = new Map(cards.value)
    newCards.set(newCardId, newAiriCard(card))
    cards.value = newCards
    return newCardId
  }

  const removeCard = (id: string) => {
    const newCards = new Map(cards.value)
    newCards.delete(id)
    cards.value = newCards
  }

  const updateCard = (id: string, updates: AiriCard | Card | ccv3.CharacterCardV3) => {
    const existingCard = cards.value.get(id)
    if (!existingCard)
      return false

    const updatedCard = {
      ...existingCard,
      ...updates,
    }

    const newCards = new Map(cards.value)
    newCards.set(id, newAiriCard(updatedCard))
    cards.value = newCards
    return true
  }

  const getCard = (id: string) => {
    return cards.value.get(id)
  }

  function resolveAiriExtension(card: Card | ccv3.CharacterCardV3): AiriExtension {
    // Get existing extension if available
    const existingExtension = ('data' in card
      ? card.data?.extensions?.airi
      : card.extensions?.airi) as AiriExtension

    // Create default modules config
    const defaultModules = {
      consciousness: {
        provider: activeConsciousnessProvider.value,
        model: activeConsciousnessModel.value,
      },
      speech: {
        provider: activeSpeechProvider.value,
        model: activeSpeechModel.value,
        voice_id: activeSpeechVoiceId.value,
      },
    }

    // Return default if no extension exists
    if (!existingExtension) {
      return {
        modules: defaultModules,
        agents: {},
      }
    }

    // Merge existing extension with defaults
    return {
      modules: {
        consciousness: {
          provider: existingExtension.modules?.consciousness?.provider ?? defaultModules.consciousness.provider,
          model: existingExtension.modules?.consciousness?.model ?? defaultModules.consciousness.model,
        },
        speech: {
          provider: existingExtension.modules?.speech?.provider ?? defaultModules.speech.provider,
          model: existingExtension.modules?.speech?.model ?? defaultModules.speech.model,
          voice_id: existingExtension.modules?.speech?.voice_id ?? defaultModules.speech.voice_id,
          pitch: existingExtension.modules?.speech?.pitch,
          rate: existingExtension.modules?.speech?.rate,
          ssml: existingExtension.modules?.speech?.ssml,
          language: existingExtension.modules?.speech?.language,
        },
        vrm: existingExtension.modules?.vrm,
        live2d: existingExtension.modules?.live2d,
      },
      agents: existingExtension.agents ?? {},
    }
  }

  function newAiriCard(card: Card | ccv3.CharacterCardV3): AiriCard {
    // Handle ccv3 format if needed
    if ('data' in card) {
      const ccv3Card = card as ccv3.CharacterCardV3
      return {
        name: ccv3Card.data.name,
        version: ccv3Card.data.character_version ?? '1.0.0',
        description: ccv3Card.data.description ?? '',
        creator: ccv3Card.data.creator ?? '',
        notes: ccv3Card.data.creator_notes ?? '',
        notesMultilingual: ccv3Card.data.creator_notes_multilingual,
        personality: ccv3Card.data.personality ?? '',
        scenario: ccv3Card.data.scenario ?? '',
        greetings: [
          ccv3Card.data.first_mes,
          ...(ccv3Card.data.alternate_greetings ?? []),
        ],
        greetingsGroupOnly: ccv3Card.data.group_only_greetings ?? [],
        systemPrompt: ccv3Card.data.system_prompt ?? '',
        postHistoryInstructions: ccv3Card.data.post_history_instructions ?? '',
        messageExample: ccv3Card.data.mes_example
          ? ccv3Card.data.mes_example
              .split('<START>\n')
              .filter(Boolean)
              .map(example => example.split('\n')
                .map((line) => {
                  if (line.startsWith('{{char}}:') || line.startsWith('{{user}}:'))
                    return line as `{{char}}: ${string}` | `{{user}}: ${string}`
                  throw new Error(`Invalid message example format: ${line}`)
                }))
          : [],
        tags: ccv3Card.data.tags ?? [],
        extensions: {
          airi: resolveAiriExtension(ccv3Card),
          ...ccv3Card.data.extensions,
        },
      }
    }

    return {
      ...card,
      extensions: {
        airi: resolveAiriExtension(card),
        ...card.extensions,
      },
    }
  }

  function initialize() {
    const existingCard = cards.value.get('default')

    // Update default card if it doesn't exist or version is outdated
    if (!existingCard || existingCard.version !== SYSTEM_PROMPT_VERSION) {
      console.log('[AiriCard] Updating default card to version', SYSTEM_PROMPT_VERSION)
      if (existingCard) {
        console.log('[AiriCard] Old version:', existingCard.version, '→ New version:', SYSTEM_PROMPT_VERSION)
      }
      const newCard = newAiriCard({
        name: 'ReLU',
        version: SYSTEM_PROMPT_VERSION,
        systemPrompt: '', // Clear old systemPrompt
        description: SystemPromptV2(
          t('base.prompt.prefix'),
          t('base.prompt.suffix'),
        ).content,
        personality: '', // Clear old personality
      })
      console.log('[AiriCard] New card description length:', newCard.description.length)
      console.log('[AiriCard] Has web search:', newCard.description.includes('intelligent_web_search'))

      // Trigger reactivity by creating a new Map
      const newCards = new Map(cards.value)
      newCards.set('default', newCard)
      cards.value = newCards

      // Force save to localStorage immediately
      console.log('[AiriCard] Forcing localStorage update')
    }
    else {
      console.log('[AiriCard] Card version is up to date:', SYSTEM_PROMPT_VERSION)
    }

    if (!activeCardId.value)
      activeCardId.value = 'default'
  }

  watch(activeCard, (newCard: AiriCard | undefined) => {
    if (!newCard)
      return

    // TODO: live2d, vrm
    // TODO: Minecraft Agent, etc
    const extension = resolveAiriExtension(newCard)
    if (!extension)
      return

    activeConsciousnessProvider.value = extension?.modules?.consciousness?.provider
    activeConsciousnessModel.value = extension?.modules?.consciousness?.model

    activeSpeechProvider.value = extension?.modules?.speech?.provider
    activeSpeechModel.value = extension?.modules?.speech?.model
    activeSpeechVoiceId.value = extension?.modules?.speech?.voice_id
  })

  function resetState() {
    activeCardId.reset()
    cards.reset()
  }

  return {
    cards,
    activeCard,
    activeCardId,
    addCard,
    removeCard,
    updateCard,
    getCard,
    resetState,
    initialize,

    currentModels: computed(() => {
      return {
        consciousness: {
          provider: activeConsciousnessProvider.value,
          model: activeConsciousnessModel.value,
        },
        speech: {
          provider: activeSpeechProvider.value,
          model: activeSpeechModel.value,
          voice_id: activeSpeechVoiceId.value,
        },
      } satisfies AiriExtension['modules']
    }),

    systemPrompt: computed(() => {
      const card = activeCard.value
      if (!card)
        return ''

      const components = [
        card.systemPrompt,
        card.description,
        card.personality,
      ].filter(Boolean)

      return components.join('\n')
    }),
  }
})
