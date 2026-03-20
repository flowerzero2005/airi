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

export interface SearchBehaviorConfig {
  pretendUncertainty: boolean
  knowledgeTransparency: number // 0-1
}

export function digestSearchResults(
  filteredResults: FilteredResult[],
  characterProfile: CharacterProfile,
  intentAnalysis: IntentAnalysis,
  behaviorConfig?: SearchBehaviorConfig,
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

  const mainFindings = summarizeInCharacterVoice(filteredResults, characterProfile, behaviorConfig)
  const interestingBits = extractInterestingBits(filteredResults, characterProfile)
  const characterOpinion = generateCharacterOpinion(filteredResults, characterProfile, intentAnalysis)
  const expressionSuggestions = generateExpressionSuggestions(characterProfile, intentAnalysis, filteredResults, behaviorConfig)

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
  behaviorConfig?: SearchBehaviorConfig,
): MainFinding[] {
  const findings: MainFinding[] = []

  for (const result of results.slice(0, 2)) {
    const topics = result.topics || []
    const excitement = calculateExcitement(topics, profile)

    const keyPoint = extractKeyPoint(result)
    let point = ''

    // 应用表达风格
    const style = profile.expressionStyle

    if (excitement > 0.8) {
      const adj = getExcitedAdjective()
      // 根据 cute 和 playful 调整语气
      if (style.cute > 0.7) {
        point = `诶诶诶！${keyPoint}${adj}的～！`
      }
      else if (style.playful > 0.6) {
        point = `哇！${keyPoint}${adj}诶！`
      }
      else {
        point = `${keyPoint}${adj}的！`
      }
    }
    else if (excitement > 0.5) {
      if (style.cute > 0.7) {
        point = `${keyPoint}～感觉挺有意思的呢`
      }
      else if (style.casual > 0.7) {
        point = `${keyPoint}，感觉还不错`
      }
      else if (style.serious > 0.6) {
        point = `${keyPoint}，这个值得关注`
      }
      else {
        point = `${keyPoint}～感觉挺有意思的`
      }
    }
    else {
      // 低兴奋度 - 根据 professional 和 serious 调整
      if (style.professional > 0.6) {
        point = `关于${keyPoint}的信息`
      }
      else if (style.serious > 0.6) {
        point = `${keyPoint}，需要了解一下`
      }
      else {
        point = `嗯...${keyPoint}`
      }
    }

    // 应用"装不太懂"效果
    if (behaviorConfig?.pretendUncertainty) {
      point = applyUncertaintyTone(point, excitement)
    }

    // 应用知识来源透明度
    if (behaviorConfig?.knowledgeTransparency) {
      point = applySourceTransparency(point, behaviorConfig.knowledgeTransparency)
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
  behaviorConfig?: SearchBehaviorConfig,
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

  // 完整的表达风格支持
  if (profile.expressionStyle.cute > 0.7) {
    style.push('可以用"～"结尾')
    style.push('保持可爱的语气')
    style.push('使用"诶"、"呀"等语气词')
  }

  if (profile.expressionStyle.playful > 0.7) {
    style.push('可以开玩笑')
    style.push('保持轻松玩味')
    style.push('可以调侃一下')
  }

  if (profile.expressionStyle.serious > 0.6) {
    style.push('减少过多语气词')
    style.push('保持相对正式的表达')
    avoid.push('不要太随意')
  }

  if (profile.expressionStyle.casual > 0.7) {
    style.push('口语化表达')
    style.push('不用太拘谨')
  }

  if (profile.expressionStyle.professional > 0.6) {
    style.push('术语使用要准确')
    style.push('逻辑清晰')
    avoid.push('不要太口语化')
  }

  if (profile.expressionStyle.emotional > 0.7) {
    style.push('可以表达感受')
    style.push('展现情感共鸣')
    style.push('关注情绪层面')
  }

  // 装不太懂的建议
  if (behaviorConfig?.pretendUncertainty) {
    style.push('使用试探性语气（好像、听说、应该）')
    style.push('保持谦虚态度')
    style.push('可以说"不太确定"')
  }

  // 知识来源透明度建议
  if (behaviorConfig?.knowledgeTransparency) {
    if (behaviorConfig.knowledgeTransparency > 0.7) {
      style.push('可以提及"我查了一下"')
      style.push('适当说明信息来源')
    }
    else if (behaviorConfig.knowledgeTransparency < 0.3) {
      avoid.push('不要提及搜索行为')
      style.push('像自己知道的一样表达')
    }
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

// 应用不确定性语气
function applyUncertaintyTone(text: string, excitement: number): string {
  // 高兴奋度时也要装不太懂
  if (excitement > 0.7) {
    const prefixes = ['好像', '听说', '感觉']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    return text.replace(/^(诶诶诶！|哇！)/, `$1${prefix}`)
  }

  // 中等兴奋度
  if (excitement > 0.4) {
    const prefixes = ['好像', '应该是', '听说']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    // 在句子开头或关键词前添加不确定性
    if (text.includes('～')) {
      return text.replace('～', `～${prefix}`)
    }
    return `${prefix}${text}`
  }

  // 低兴奋度 - 更加不确定
  const prefixes = ['不太确定，但好像', '我记得好像', '应该是']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  return text.replace(/^嗯\.\.\./, `嗯...${prefix}`)
}

// 应用知识来源透明度
function applySourceTransparency(text: string, transparency: number): string {
  // 高透明度 (0.7-1.0) - 明确说明查询了
  if (transparency > 0.7) {
    const prefixes = ['我刚查了一下，', '查到的信息是，', '搜了一下发现，']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    return `${prefix}${text}`
  }

  // 中等透明度 (0.4-0.6) - 偶尔提及
  if (transparency > 0.4 && Math.random() > 0.5) {
    const prefixes = ['我看了看，', '了解了一下，']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    return `${prefix}${text}`
  }

  // 低透明度 (0-0.3) - 完全隐藏，像自己知道的
  return text
}
