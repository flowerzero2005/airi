import type { CharacterProfile } from '@proj-airi/stage-ui/stores/modules/web-search'

import type { FilteredResult } from './character-filter'
import type { IntentAnalysis } from './intent-analyzer'

export interface MainFinding {
  point: string // 用凛的语气总结的要点
  details: string // 简短的细节
  excitement: number // 兴奋度 0-1
  shouldMention: boolean // 是否值得提及
}

export interface CharacterOpinion {
  overall: 'positive' | 'neutral' | 'excited' | 'curious' | 'confused'
  comment?: string // 可选的评论
}

export interface ExpressionSuggestions {
  tone: 'excited' | 'casual' | 'curious' | 'playful' | 'confused'
  style: string[] // 风格建议
  avoid: string[] // 避免的表达方式
}

export interface DigestedInformation {
  mainFindings: MainFinding[]
  interestingBits: string[]
  characterOpinion: CharacterOpinion
  expressionSuggestions: ExpressionSuggestions
  moreDetailsAvailable: boolean
  detailsHint?: string
}

export function digestSearchResults(
  filteredResults: FilteredResult[],
  characterProfile: CharacterProfile,
  intentAnalysis: IntentAnalysis,
): DigestedInformation {
  if (filteredResults.length === 0) {
    return {
      mainFindings: [],
      interestingBits: [],
      characterOpinion: {
        overall: 'confused',
        comment: '诶...好像没找到相关的信息诶',
      },
      expressionSuggestions: {
        tone: 'confused',
        style: ['保持轻松', '可以建议换个关键词'],
        avoid: ['不要太正式'],
      },
      moreDetailsAvailable: false,
    }
  }

  const mainFindings = summarizeInCharacterVoice(filteredResults, characterProfile)
  const interestingBits = extractInterestingBits(filteredResults, characterProfile)
  const characterOpinion = generateCharacterOpinion(filteredResults, characterProfile, intentAnalysis)
  const expressionSuggestions = generateExpressionSuggestions(characterProfile, intentAnalysis, filteredResults)

  return {
    mainFindings,
    interestingBits,
    characterOpinion,
    expressionSuggestions,
    moreDetailsAvailable: filteredResults.length > 3,
    detailsHint: filteredResults.length > 3 ? '如果你想知道更多，我可以再查查～' : undefined,
  }
}

function summarizeInCharacterVoice(
  results: FilteredResult[],
  profile: CharacterProfile,
): MainFinding[] {
  const findings: MainFinding[] = []

  for (const result of results.slice(0, 2)) {
    const topics = result.topics || []
    const excitement = calculateExcitement(topics, profile)

    const keyPoint = extractKeyPoint(result)
    let point = ''

    if (excitement > 0.8) {
      const adj = getExcitedAdjective()
      point = `诶诶诶！${keyPoint}${adj}的！`
    }
    else if (excitement > 0.5) {
      point = `${keyPoint}～感觉挺有意思的`
    }
    else {
      point = `嗯...${keyPoint}`
    }

    findings.push({
      point,
      details: simplifyDetails(result.snippet, profile),
      excitement,
      shouldMention: excitement > 0.4,
    })
  }

  return findings
}

function extractInterestingBits(
  results: FilteredResult[],
  profile: CharacterProfile,
): string[] {
  const bits: string[] = []

  for (const result of results.slice(0, 3)) {
    const snippet = result.snippet
    const topics = result.topics || []

    if (topics.includes('anime') && profile.interestWeights.anime > 0.7) {
      const animeBit = extractAnimeRelated(snippet)
      if (animeBit)
        bits.push(animeBit)
    }

    if (topics.includes('games') && profile.interestWeights.games > 0.7) {
      const gameBit = extractGameRelated(snippet)
      if (gameBit)
        bits.push(gameBit)
    }

    if (topics.includes('memes') && profile.interestWeights.memes > 0.7) {
      const memeBit = extractMemeRelated(snippet)
      if (memeBit)
        bits.push(memeBit)
    }
  }

  return bits.slice(0, 3)
}

function generateCharacterOpinion(
  results: FilteredResult[],
  profile: CharacterProfile,
  intent: IntentAnalysis,
): CharacterOpinion {
  const topics = results.flatMap(r => r.topics || [])
  const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length

  if (topics.some(t => ['anime', 'games', 'memes'].includes(t))) {
    return {
      overall: 'excited',
      comment: profile.expressionStyle.cute > 0.7
        ? '这个我超喜欢的～！'
        : '这个挺有意思的～',
    }
  }

  if (avgRelevance < 0.5) {
    return {
      overall: 'neutral',
      comment: '嗯...虽然我不太懂，但听起来挺厉害的～',
    }
  }

  if (intent.intentType === 'seeking_information') {
    return {
      overall: 'curious',
      comment: '诶，这个我还挺好奇的～',
    }
  }

  return {
    overall: 'positive',
  }
}

function generateExpressionSuggestions(
  profile: CharacterProfile,
  intent: IntentAnalysis,
  results: FilteredResult[],
): ExpressionSuggestions {
  const topics = results.flatMap(r => r.topics || [])
  const avgExcitement = results.reduce((sum, r) => sum + calculateExcitement(r.topics || [], profile), 0) / results.length

  let tone: ExpressionSuggestions['tone'] = 'casual'
  const style: string[] = []
  const avoid: string[] = []

  if (avgExcitement > 0.7) {
    tone = 'excited'
    style.push('可以用语气词（诶、哇、超）')
    style.push('表达兴奋和喜欢')
  }
  else if (avgExcitement > 0.4) {
    tone = 'curious'
    style.push('保持好奇和探索的态度')
  }
  else {
    tone = 'casual'
    style.push('保持轻松随意')
    style.push('可以说"不太懂"')
  }

  if (profile.expressionStyle.cute > 0.7) {
    style.push('可以用"～"结尾')
    style.push('保持可爱的语气')
  }

  if (profile.expressionStyle.playful > 0.7) {
    style.push('可以开玩笑')
    style.push('保持轻松玩味')
  }

  avoid.push('不要列举太多细节')
  avoid.push('不要像新闻播报')
  avoid.push('不要复制粘贴原文')

  if (topics.some(t => ['technology', 'science', 'philosophy'].includes(t))) {
    if (profile.interestWeights.technology < 0.5) {
      avoid.push('不要装懂技术细节')
      style.push('可以坦白说不太懂')
    }
  }

  return {
    tone,
    style,
    avoid,
  }
}

function calculateExcitement(topics: string[], profile: CharacterProfile): number {
  if (topics.length === 0)
    return 0.5

  const weights = topics.map((topic) => {
    const weight = profile.interestWeights[topic as keyof typeof profile.interestWeights]
    return weight !== undefined ? weight : 0.5
  })

  return weights.reduce((sum, w) => sum + w, 0) / weights.length
}

function extractKeyPoint(result: FilteredResult): string {
  return result.title.length > 30 ? `${result.title.slice(0, 30)}...` : result.title
}

function simplifyDetails(snippet: string, profile: CharacterProfile): string {
  let simplified = snippet.slice(0, 100)

  if (simplified.length < snippet.length) {
    simplified += '...'
  }

  return simplified
}

function extractAnimeRelated(snippet: string): string | null {
  const keywords = ['角色', '画风', '声优', '剧情', '制作', '动画']

  for (const keyword of keywords) {
    if (snippet.includes(keyword)) {
      const sentences = snippet.split(/[。！？]/)
      for (const sentence of sentences) {
        if (sentence.includes(keyword) && sentence.length < 50) {
          return `${sentence.trim()}～`
        }
      }
    }
  }

  return null
}

function extractGameRelated(snippet: string): string | null {
  const keywords = ['玩法', '彩蛋', '机制', '角色', '技能', '关卡']

  for (const keyword of keywords) {
    if (snippet.includes(keyword)) {
      const sentences = snippet.split(/[。！？]/)
      for (const sentence of sentences) {
        if (sentence.includes(keyword) && sentence.length < 50) {
          return `${sentence.trim()}～`
        }
      }
    }
  }

  return null
}

function extractMemeRelated(snippet: string): string | null {
  const keywords = ['梗', '搞笑', '有趣', '好玩', '笑']

  for (const keyword of keywords) {
    if (snippet.includes(keyword)) {
      const sentences = snippet.split(/[。！？]/)
      for (const sentence of sentences) {
        if (sentence.includes(keyword) && sentence.length < 50) {
          return `诶！${sentence.trim()}`
        }
      }
    }
  }

  return null
}

function getExcitedAdjective(): string {
  const adjectives = ['超棒', '超有意思', '超酷', '超好玩', '超赞']
  return adjectives[Math.floor(Math.random() * adjectives.length)]
}
