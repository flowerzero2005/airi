import { tool } from '@xsai/tool'
import { z } from 'zod'

export interface IntentAnalysis {
  // Primary intent type
  primaryIntent:
    | 'seeking_information' // Seeking information
    | 'casual_chat' // Casual chat
    | 'seeking_opinion' // Seeking opinion
    | 'sharing_experience' // Sharing experience
    | 'emotional_support' // Emotional support
    | 'problem_solving' // Problem solving

  // Secondary intents (can have multiple)
  secondaryIntents: string[]

  // Topic key points
  topicKeyPoints: {
    entities: string[] // Entities (names, places, events, etc.)
    concepts: string[] // Concepts (technology, theory, etc.)
    timeContext: string | null // Time context
    spatialContext: string | null // Spatial context
  }

  // Information need level (0-1)
  informationNeedLevel: number

  // Emotional tone
  emotionalTone: 'curious' | 'casual' | 'urgent' | 'playful' | 'serious'
}

export const intentAnalyzer = tool({
  name: 'analyze_user_intent',
  description: `Analyze user's true intent behind their message.

  This tool helps understand:
  - What the user really wants (information, chat, opinion, etc.)
  - Key topics and entities mentioned
  - Whether web search is needed
  - How urgent the information need is

  Use this BEFORE deciding to search the web.`,

  parameters: z.object({
    userMessage: z.string().describe('The user\'s message to analyze'),
    conversationContext: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional().describe('Recent conversation history for context'),
  }),

  execute: async ({ userMessage, conversationContext }) => {
    // Analyze user message to determine intent
    const analysis: IntentAnalysis = {
      primaryIntent: detectPrimaryIntent(userMessage, conversationContext),
      secondaryIntents: detectSecondaryIntents(userMessage),
      topicKeyPoints: extractKeyPoints(userMessage),
      informationNeedLevel: calculateInformationNeed(userMessage, conversationContext),
      emotionalTone: detectEmotionalTone(userMessage),
    }

    return analysis
  },
})

function detectPrimaryIntent(
  message: string,
  context?: Array<{ role: string, content: string }>,
): IntentAnalysis['primaryIntent'] {
  const lowerMessage = message.toLowerCase()

  // Greeting patterns - casual chat
  if (/^(hi|hello|hey|嗨|你好|在吗|在不在)/.test(lowerMessage)) {
    return 'casual_chat'
  }

  // Question patterns - seeking information
  if (/[?？]/.test(message) || /^(什么|怎么|为什么|哪里|谁|when|what|how|why|where|who)/i.test(lowerMessage)) {
    // Check if it's a rhetorical question or sharing experience
    if (/^(你觉得|你认为|你说|你看)/.test(lowerMessage)) {
      return 'seeking_opinion'
    }
    return 'seeking_information'
  }

  // Sharing patterns
  if (/^(我|今天|刚才|昨天|最近)/.test(lowerMessage)) {
    return 'sharing_experience'
  }

  // Emotional support patterns
  if (/(累|烦|难过|开心|高兴|郁闷|焦虑|tired|sad|happy|anxious)/i.test(lowerMessage)) {
    return 'emotional_support'
  }

  // Problem solving patterns
  if (/(帮我|能不能|可以|怎么办|help|can you|could you)/i.test(lowerMessage)) {
    return 'problem_solving'
  }

  // Default to casual chat
  return 'casual_chat'
}

function detectSecondaryIntents(message: string): string[] {
  const intents: string[] = []
  const lowerMessage = message.toLowerCase()

  if (/(推荐|建议|recommend|suggest)/i.test(lowerMessage)) {
    intents.push('seeking_recommendation')
  }

  if (/(记得|想起|recall|remember)/i.test(lowerMessage)) {
    intents.push('recall_assistance')
  }

  if (/(发现|探索|discover|explore)/i.test(lowerMessage)) {
    intents.push('discovery')
  }

  if (/(验证|确认|verify|confirm)/i.test(lowerMessage)) {
    intents.push('verification')
  }

  return intents
}

function extractKeyPoints(message: string): IntentAnalysis['topicKeyPoints'] {
  const keyPoints: IntentAnalysis['topicKeyPoints'] = {
    entities: [],
    concepts: [],
    timeContext: null,
    spatialContext: null,
  }

  // Extract time context
  const timePatterns = [
    /最近|现在|今天|昨天|明天|这周|上周|下周/,
    /recently|now|today|yesterday|tomorrow|this week|last week|next week/i,
  ]
  for (const pattern of timePatterns) {
    const match = message.match(pattern)
    if (match) {
      keyPoints.timeContext = match[0]
      break
    }
  }

  // Extract spatial context
  const spatialPatterns = [
    /在(.{1,10})(这里|那里|附近)/,
    /at|in|near/i,
  ]
  for (const pattern of spatialPatterns) {
    const match = message.match(pattern)
    if (match) {
      keyPoints.spatialContext = match[0]
      break
    }
  }

  // Extract concepts (simplified - in production, use NLP)
  const conceptKeywords = [
    '电影',
    '游戏',
    '动漫',
    '音乐',
    '美食',
    '科技',
    '新闻',
    'movie',
    'game',
    'anime',
    'music',
    'food',
    'tech',
    'news',
  ]
  for (const keyword of conceptKeywords) {
    if (message.includes(keyword)) {
      keyPoints.concepts.push(keyword)
    }
  }

  return keyPoints
}

function calculateInformationNeed(
  message: string,
  context?: Array<{ role: string, content: string }>,
): number {
  let needLevel = 0.5 // Default medium need

  // High need indicators
  if (/[?？]/.test(message)) {
    needLevel += 0.2
  }
  if (/(什么|怎么|为什么|哪里|谁)/.test(message)) {
    needLevel += 0.2
  }
  if (/(最近|现在|今天)/.test(message)) {
    needLevel += 0.1
  }

  // Low need indicators
  if (/^(hi|hello|hey|嗨|你好)/i.test(message)) {
    needLevel -= 0.4
  }
  if (/(我觉得|我认为|我想)/.test(message)) {
    needLevel -= 0.2
  }

  return Math.max(0, Math.min(1, needLevel))
}

function detectEmotionalTone(message: string): IntentAnalysis['emotionalTone'] {
  const lowerMessage = message.toLowerCase()

  if (/(急|快|赶紧|urgent|hurry)/i.test(lowerMessage)) {
    return 'urgent'
  }

  if (/([哈呀诶嘿～~])/.test(lowerMessage)) {
    return 'playful'
  }

  if (/[?？]/.test(message) && /(什么|怎么|为什么)/.test(lowerMessage)) {
    return 'curious'
  }

  if (/(请|麻烦|谢谢|please|thank)/i.test(lowerMessage)) {
    return 'serious'
  }

  return 'casual'
}
