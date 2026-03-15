import { tool } from '@xsai/tool'
import { z } from 'zod'

export interface SearchResult {
  title: string
  snippet: string
  url: string
  source: string
  publishDate?: string
  topics?: string[]
}

export const webSearch = tool({
  name: 'web_search',
  description: `Perform web search to get current information from the internet.

  This tool searches the web and returns relevant results. Use this when:
  - User asks about current events or recent information
  - You need to verify facts or get latest data
  - User explicitly asks you to search

  The search results will be returned as an array of results with title, snippet, URL, and source.`,

  parameters: z.object({
    query: z.string().describe('Search query string'),
    maxResults: z.number().optional().default(5).describe('Maximum number of results to return (default: 5)'),
    timeRange: z.string().optional().describe('Time range filter: "past_day", "past_week", "past_month", "past_year"'),
    searchDepth: z.enum(['basic', 'advanced']).optional().default('basic').describe('Search depth: "basic" for quick results, "advanced" for comprehensive search'),
  }),

  execute: async ({ query, maxResults = 5, timeRange, searchDepth = 'basic' }) => {
    try {
      // Get API key from store
      const { useWebSearchStore } = await import('../../stores/modules/web-search')
      const webSearchStore = useWebSearchStore()
      const apiKey = webSearchStore.tavilyApiKey

      if (!apiKey) {
        return {
          success: false,
          error: 'Tavily API key not configured. Please configure it in Settings > Modules > Web Search.',
          results: [],
        }
      }

      // Call Tavily API
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          search_depth: searchDepth,
          include_answer: false,
          include_raw_content: false,
          include_images: false,
          ...(timeRange && { days: mapTimeRangeToDays(timeRange) }),
        }),
      })

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Transform Tavily results to our format
      const results: SearchResult[] = (data.results || []).map((result: any) => ({
        title: result.title || '',
        snippet: result.content || '',
        url: result.url || '',
        source: extractDomain(result.url || ''),
        publishDate: result.published_date,
        topics: extractTopics(result.content || ''),
      }))

      return {
        success: true,
        query,
        results,
        resultsCount: results.length,
      }
    }
    catch (error) {
      console.error('[WebSearch] Search failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        results: [],
      }
    }
  },
})

function mapTimeRangeToDays(timeRange: string): number {
  const mapping: Record<string, number> = {
    past_day: 1,
    past_week: 7,
    past_month: 30,
    past_year: 365,
  }
  return mapping[timeRange] || 30
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  }
  catch {
    return 'unknown'
  }
}

function extractTopics(content: string): string[] {
  const topics: string[] = []
  const lowerContent = content.toLowerCase()

  // Simple topic extraction based on keywords
  const topicKeywords: Record<string, string[]> = {
    anime: ['动漫', '番剧', 'anime', '二次元', '漫画'],
    games: ['游戏', 'game', '玩', '电竞'],
    memes: ['梗', '搞笑', 'meme', '有趣', '好玩'],
    technology: ['科技', 'tech', '技术', 'AI', '电脑'],
    art: ['艺术', 'art', '画', '设计'],
    music: ['音乐', 'music', '歌', '曲'],
    food: ['美食', 'food', '吃', '餐'],
    news: ['新闻', 'news', '时事', '报道'],
  }

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        topics.push(topic)
        break
      }
    }
  }

  return topics
}
