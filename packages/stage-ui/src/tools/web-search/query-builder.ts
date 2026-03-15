import type { IntentAnalysis } from './intent-analyzer'

import { tool } from '@xsai/tool'
import { z } from 'zod'

export interface QueryStrategy {
  // Query type
  queryType:
    | 'direct_search' // Direct search
    | 'multi_angle_search' // Multi-angle search
    | 'verification_search' // Verification search
    | 'exploratory_search' // Exploratory search

  // Query keywords
  keywords: string[]

  // Query depth
  depth: 'shallow' | 'moderate' | 'deep'

  // Whether multi-round query is needed
  multiRound: boolean

  // Result filters
  filters: {
    timeRange?: string // Time range
    sourceType?: string[] // Source type
    language?: string // Language
  }
}

export const queryBuilder = tool({
  name: 'build_search_query',
  description: `Build intelligent search queries based on intent analysis.

  This tool constructs optimized search queries by:
  - Analyzing user intent and topic key points
  - Generating multiple search angles if needed
  - Adding appropriate filters (time, source, language)
  - Optimizing keywords for better search results

  Use this AFTER intent analysis to prepare for web search.`,

  parameters: z.object({
    intentAnalysis: z.object({
      primaryIntent: z.string(),
      topicKeyPoints: z.object({
        entities: z.array(z.string()),
        concepts: z.array(z.string()),
        timeContext: z.string().nullable(),
        spatialContext: z.string().nullable(),
      }),
      informationNeedLevel: z.number(),
    }),
    userQuery: z.string().describe('Original user query'),
  }),

  execute: async ({ intentAnalysis, userQuery }) => {
    const strategy = buildQueryStrategy(
      intentAnalysis as IntentAnalysis,
      userQuery,
    )

    return strategy
  },
})

function buildQueryStrategy(
  intent: IntentAnalysis,
  userQuery: string,
): QueryStrategy {
  const { topicKeyPoints, informationNeedLevel } = intent

  // Determine query type
  let queryType: QueryStrategy['queryType'] = 'direct_search'
  if (topicKeyPoints.entities.length === 0 && topicKeyPoints.concepts.length === 0) {
    queryType = 'exploratory_search'
  }
  else if (informationNeedLevel > 0.7 && topicKeyPoints.concepts.length > 1) {
    queryType = 'multi_angle_search'
  }

  // Build keywords
  const keywords = buildKeywords(intent, userQuery)

  // Determine depth
  const depth = informationNeedLevel > 0.7 ? 'moderate' : 'shallow'

  // Determine if multi-round is needed
  const multiRound = queryType === 'multi_angle_search' && keywords.length > 3

  // Build filters
  const filters = buildFilters(intent)

  return {
    queryType,
    keywords,
    depth,
    multiRound,
    filters,
  }
}

function buildKeywords(intent: IntentAnalysis, userQuery: string): string[] {
  const keywords: string[] = []
  const { topicKeyPoints } = intent

  // Add entities
  keywords.push(...topicKeyPoints.entities)

  // Add concepts
  keywords.push(...topicKeyPoints.concepts)

  // If no entities or concepts, use the original query
  if (keywords.length === 0) {
    // Clean up the query - remove "User interests/context:" prefix if present
    const cleanQuery = userQuery.replace(/\(User interests\/context:.*?\)/, '').trim()
    keywords.push(cleanQuery)
  }

  // Add time context if present
  if (topicKeyPoints.timeContext) {
    const timeKeywords = enhanceTimeContext(topicKeyPoints.timeContext)
    keywords.push(...timeKeywords)
  }

  // Extract user interests from query and add personality-based keywords
  const interestMatch = userQuery.match(/User interests\/context: (.+?)(?:\[Interest tags:|$)/)
  const tagsMatch = userQuery.match(/\[Interest tags: (.+?)\]/)

  if (interestMatch || tagsMatch) {
    const interests = interestMatch ? interestMatch[1] : ''
    const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : []

    // Use interest tags for more precise search
    if (tags.length > 0 && /(新闻|news|八卦|热点|有趣|好玩)/i.test(userQuery)) {
      // Add top 3 interest tags to search
      keywords.push(...tags.slice(0, 3))
    }
    // Fallback to text-based interest detection
    else if (/(新闻|news|八卦|热点)/i.test(userQuery)) {
      // For news/gossip queries, add user's interest topics
      if (/动漫|anime/i.test(interests)) {
        keywords.push('动漫')
      }
      if (/游戏|game/i.test(interests)) {
        keywords.push('游戏')
      }
      if (/二次元/.test(interests)) {
        keywords.push('二次元')
      }
      if (/音乐|music/i.test(interests)) {
        keywords.push('音乐')
      }
      if (/美食|food/i.test(interests)) {
        keywords.push('美食')
      }
    }
  }

  // Add AI's personality to search terms (15-year-old anime girl perspective)
  // Make searches more fun and interesting
  if (/(新闻|news)/i.test(userQuery) && !keywords.some(k => /(动漫|游戏|娱乐)/.test(k))) {
    // Default to entertainment/fun news if no specific interest
    keywords.push('有趣', '热门')
  }

  // Remove duplicates and empty strings
  return [...new Set(keywords.filter(k => k.trim().length > 0))]
}

function enhanceTimeContext(timeContext: string): string[] {
  const keywords: string[] = []

  // Map time context to search-friendly keywords
  if (/(最近|近期|recently)/i.test(timeContext)) {
    keywords.push('2024', '最新', 'latest')
  }
  else if (/(今天|today)/i.test(timeContext)) {
    const today = new Date().toISOString().split('T')[0]
    keywords.push(today)
  }
  else if (/(现在|当前|now|current)/i.test(timeContext)) {
    keywords.push('current', '当前')
  }

  return keywords
}

function buildFilters(intent: IntentAnalysis): QueryStrategy['filters'] {
  const filters: QueryStrategy['filters'] = {
    language: 'zh-CN,en',
  }

  // Add time range filter
  if (intent.topicKeyPoints.timeContext) {
    if (/(最近|近期|recently)/i.test(intent.topicKeyPoints.timeContext)) {
      filters.timeRange = 'past_month'
    }
    else if (/(今天|today)/i.test(intent.topicKeyPoints.timeContext)) {
      filters.timeRange = 'past_day'
    }
    else if (/(本周|this week)/i.test(intent.topicKeyPoints.timeContext)) {
      filters.timeRange = 'past_week'
    }
  }

  // Add source type filter based on intent
  if (intent.primaryIntent === 'seeking_information') {
    filters.sourceType = ['news', 'articles', 'official']
  }
  else if (intent.primaryIntent === 'seeking_opinion') {
    filters.sourceType = ['social_media', 'forums', 'blogs']
  }

  return filters
}
