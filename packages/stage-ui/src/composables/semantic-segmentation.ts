/**
 * 智能语义分段
 * 根据语义将文本拆分成多个合适的片段
 *
 * 核心逻辑：
 * 1. 短回复（< 30 字）不分段，直接输出
 * 2. 长回复按完整意思分段，不是简单按句子分段
 * 3. 分段标志：
 *    - 话题转换词："另外"、"此外"、"而且"、"不过"、"然而"
 *    - 逻辑连接词："首先"、"其次"、"最后"、"总之"
 *    - 问句结束后
 *    - 每段建议 1-2 句话（更短的分段）
 */
export function segmentBySemantics(text: string): string[] {
  // 1. 短文本不分段
  if (text.length < 30) {
    return [text]
  }

  // 2. 按句子分割（保留标点符号）
  const sentences = text.split(/([。！？.!?]+)/).filter(s => s.trim())

  // 3. 智能合并成段落
  const segments: string[] = []
  let currentSegment = ''
  let sentenceCount = 0

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    currentSegment += sentence

    // 检测是否是标点符号
    if (/^[。！？.!?]+$/.test(sentence)) {
      sentenceCount++

      // 检测分段信号（更激进的分段策略）
      const shouldBreak
        = sentenceCount >= 2 // 2句话一段（原来是3句）
          || /另外|此外|而且|不过|然而|首先|其次|最后|总之|所以|因此|那么/.test(currentSegment)
          || /[？?]$/.test(sentence) // 问句结束
          || currentSegment.length > 80 // 超过80字强制分段

      if (shouldBreak && currentSegment.trim()) {
        segments.push(currentSegment.trim())
        currentSegment = ''
        sentenceCount = 0
      }
    }
  }

  // 添加剩余内容
  if (currentSegment.trim()) {
    segments.push(currentSegment.trim())
  }

  return segments.length > 0 ? segments : [text]
}
