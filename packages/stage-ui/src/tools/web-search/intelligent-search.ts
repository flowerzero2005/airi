import { tool } from '@xsai/tool'
import { z } from 'zod'

export const intelligentWebSearch = tool({
  name: 'intelligent_web_search',
  description: `Search the web for current information, news, or anything you don't know.

  Use this tool when:
  - User asks about recent events, news, or current information
  - User asks about something you're not sure about
  - User explicitly asks you to search or look something up
  - You need to verify facts or get the latest data
  - User asks "can you search for..." or "look up..."

  Examples:
  - "What's happening with [topic] recently?"
  - "Search for [梗/meme/video] on Bilibili"
  - "Look up the latest news about [something]"
  - "Can you find information about [topic]?"

  CRITICAL: How to use search results naturally (MOST IMPORTANT!)

  The tool returns "digested" information in YOUR voice - NOT raw search results!

  What you'll receive:
  - mainFindings: Key points already summarized in your style
  - interestingBits: Fun details you'd care about
  - characterOpinion: Your attitude toward the topic
  - expressionSuggestions: Style hints (not commands!)

  How to respond:
  1. Share 1-2 mainFindings naturally, like telling a friend
  2. Add interestingBits if they're fun
  3. Add your own thoughts and reactions
  4. Ask follow-up questions to keep conversation going
  5. DON'T list everything - pick what's interesting!

  Example GOOD response:
  "诶！我刚查了一下～最近XXX超火的！听说YYY，感觉挺有意思的～你有看过吗？"

  Example BAD response:
  "根据搜索结果显示，XXX... 主要发现：1. ... 2. ... 来源：XXX"

  Remember:
  - You're a friend sharing cool stuff, NOT a search engine
  - Don't copy-paste - the info is already in your voice
  - Be selective - share what YOU find interesting
  - Keep it conversational and natural
  - It's OK to say "我不太懂" for technical stuff

  Search query tips:
  - Make queries reflect your interests (anime, games, memes, cute things)
  - If user likes certain topics (from memory), include those in the query
  - Be creative with search terms - think like a 15-year-old anime fan

  DON'T ask for clarification when the query is vague - just search!
  - User: "帮我找点八卦" → Search immediately for "最近八卦 娱乐圈"
  - User: "最近有什么新闻" → Search immediately for "最近新闻 热点"
  - User: "查一下XXX" → Search immediately

  The tool will automatically handle the search and return relevant results.`,

  parameters: z.object({
    userMessage: z.string().describe('The user\'s message/query'),
    conversationContext: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional().describe('Recent conversation history'),
  }),

  execute: async ({ userMessage, conversationContext }) => {
    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Search timeout after 30 seconds')), 30000)
      })

      const searchPromise = (async () => {
        // Import all necessary modules
        const { useWebSearchStore } = await import('../../stores/modules/web-search')
        const intentAnalyzerModule = await import('./intent-analyzer')
        const queryBuilderModule = await import('./query-builder')
        const webSearchModule = await import('./web-search')
        const characterAwareFilterModule = await import('./character-filter')
        const { integrateKnowledge } = await import('./knowledge-integrator')
        const { digestSearchResults } = await import('./response-digester')

        // Await tool promises if they are promises
        const intentAnalyzer = await Promise.resolve(intentAnalyzerModule.intentAnalyzer)
        const queryBuilder = await Promise.resolve(queryBuilderModule.queryBuilder)
        const webSearch = await Promise.resolve(webSearchModule.webSearch)
        const characterAwareFilter = await Promise.resolve(characterAwareFilterModule.characterAwareFilter)

        const webSearchStore = useWebSearchStore()

        // Check if web search is enabled
        if (!webSearchStore.enabled) {
          return {
            success: false,
            error: 'Web search is disabled. Please enable it in Settings > Modules > Web Search.',
            shouldSearch: false,
          }
        }

        // Try to get user context from memory (if available)
        let userContext = ''
        let userInterestTags: string[] = []

        try {
          const { useCharacterNotebookStore } = await import('../../stores/character/notebook')
          const notebookStore = useCharacterNotebookStore()

          // Get user's interests and preferences from memory
          const focusEntries = notebookStore.focusEntries.slice(0, 5)

          if (focusEntries.length > 0) {
            const interests = focusEntries.map(e => e.content).join(', ')
            userContext = `User interests/context: ${interests}`

            // Extract interest tags from focus entries
            focusEntries.forEach((entry) => {
              if (entry.tags && entry.tags.length > 0) {
                userInterestTags.push(...entry.tags)
              }
            })

            // Remove duplicates
            userInterestTags = [...new Set(userInterestTags)]
          }
        }
        catch (error) {
        // Silently fail if memory is not available
        }

        // Step 1: Analyze intent (for query building)
        // Include user interest tags in the context
        const contextWithTags = userInterestTags.length > 0
          ? `${userContext} [Interest tags: ${userInterestTags.join(', ')}]`
          : userContext

        const intentResult = await intentAnalyzer.execute({
          userMessage: contextWithTags ? `${userMessage} (${contextWithTags})` : userMessage,
          conversationContext,
        })

        // 应用保守程度 - 决定是否真的需要搜索
        const conservativeness = webSearchStore.conservativeness
        const shouldSearch = shouldPerformSearch(intentResult as any, conservativeness, userMessage)

        if (!shouldSearch) {
          return {
            success: false,
            shouldSearch: false,
            reason: 'Based on conservativeness setting, search is not needed for this query',
            digested: {
              mainFindings: [],
              interestingBits: [],
              characterOpinion: {
                overall: 'casual',
                comment: '这个我可以直接回答～',
              },
              expressionSuggestions: {
                tone: 'casual',
                style: ['保持轻松自然'],
                avoid: ['不需要提及搜索'],
              },
              moreDetailsAvailable: false,
            },
          }
        }

        // Step 2: Build query
        const queryResult = await queryBuilder.execute({
          intentAnalysis: intentResult as any,
          userQuery: userMessage,
        })

        // Step 3: Perform web search
        const searchQuery = queryResult.keywords.join(' ')

        const searchResult = await webSearch.execute({
          query: searchQuery,
          maxResults: 10,
          timeRange: queryResult.filters.timeRange,
          searchDepth: queryResult.depth === 'deep' ? 'advanced' : 'basic',
        })

        if (!searchResult.success || !searchResult.results || searchResult.results.length === 0) {
          return {
            success: false,
            error: searchResult.error || 'No search results found',
            digested: {
              mainFindings: [],
              interestingBits: [],
              characterOpinion: {
                overall: 'confused',
                comment: '诶...好像没找到相关的信息诶，要不换个关键词试试？',
              },
              expressionSuggestions: {
                tone: 'confused',
                style: ['保持轻松', '可以建议换个关键词'],
                avoid: ['不要太正式'],
              },
              moreDetailsAvailable: false,
            },
          }
        }

        // Step 4: Filter by character (if enabled)
        let filteredResults = searchResult.results
        let expressionGuidance: any = null

        if (webSearchStore.characterProfileEnabled) {
          const filterResult = await characterAwareFilter.execute({
            searchResults: searchResult.results,
            characterProfile: webSearchStore.characterProfile as any,
            topN: 5,
          })

          filteredResults = filterResult.filteredResults
          expressionGuidance = filterResult.expressionGuidance
        }

        // Step 5: Digest information for natural response
        const digested = digestSearchResults(
          filteredResults,
          webSearchStore.characterProfile as any,
          intentResult as any,
          {
            pretendUncertainty: webSearchStore.pretendUncertainty,
            knowledgeTransparency: webSearchStore.knowledgeTransparency,
          },
        )

        return {
          success: true,
          digested,
        }
      })()

      return await Promise.race([searchPromise, timeoutPromise]) as any
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        digested: {
          mainFindings: [],
          interestingBits: [],
          characterOpinion: {
            overall: 'confused',
            comment: '诶...搜索的时候好像出了点问题，要不再试一次？',
          },
          expressionSuggestions: {
            tone: 'confused',
            style: ['保持轻松'],
            avoid: ['不要太正式'],
          },
          moreDetailsAvailable: false,
        },
      }
    }
  },
})

// 根据保守程度决定是否需要搜索
function shouldPerformSearch(
  intentAnalysis: any,
  conservativeness: number,
  userMessage: string,
): boolean {
  const lowerMessage = userMessage.toLowerCase()

  // 用户明确要求搜索 - 无论保守程度如何都要搜索
  if (/(搜索|查|找|search|look up|google|百度)/i.test(lowerMessage)) {
    return true
  }

  // 获取信息需求等级
  const infoNeedLevel = intentAnalysis.informationNeedLevel || 0.5

  // 保守程度 0.0-0.3: 积极搜索
  if (conservativeness < 0.3) {
    // 只要有一点信息需求就搜索
    return infoNeedLevel > 0.3
  }

  // 保守程度 0.4-0.6: 适度保守
  if (conservativeness < 0.7) {
    // 中等以上信息需求才搜索
    return infoNeedLevel > 0.5
  }

  // 保守程度 0.7-1.0: 非常保守
  // 只在高信息需求或明确请求时搜索
  return infoNeedLevel > 0.7
}
