/**
 * 自动插入 SEGMENT 标记
 * 当 AI 没有主动输出标记时，根据语义模式自动插入
 */

const SEGMENT_MARKER = '<|SEGMENT|>'

/**
 * 移除所有特殊标记（ACT、DELAY 等）
 * @param text 包含标记的文本
 * @returns 移除标记后的纯文本
 */
export function removeSpecialMarkers(text: string): string {
  // 移除所有 <|...|> 格式的标记
  // 使用非贪婪匹配，并且正确处理嵌套的内容
  let result = text

  // 循环移除，直到没有标记为止（处理可能的嵌套情况）
  let prevResult = ''
  let iterations = 0
  while (result !== prevResult && iterations < 10) {
    prevResult = result
    // 匹配 <| 开始，到 |> 结束，中间可以包含任何字符（包括换行）
    result = result.replace(/<\|[\s\S]*?\|>/g, '')
    iterations++
  }

  return result.trim()
}

/**
 * 检测并自动插入分段标记
 * @param text 原始文本
 * @returns 插入标记后的文本
 */
export function autoInsertSegmentMarkers(text: string): string {
  let result = text

  // 1. 检测步骤编号模式（优先级最高）
  // 匹配：1) 、2) 、3) 或 1. 、2. 、3. 等格式
  // 确保在行首或前面有换行符
  const stepPattern = /(\n|^)(\d{1,2}[).、）])/g
  result = result.replace(stepPattern, (match, lineBreak, stepNum) => {
    // 如果前面已经有 SEGMENT 标记，不重复添加
    if (match.includes(SEGMENT_MARKER)) {
      return match
    }
    return `${lineBreak}${SEGMENT_MARKER}${stepNum}`
  })

  // 2. 检测标题编号模式（01、02、03 或第一、第二等）
  const numberedPattern = /\n\n(?=\d{1,2}[.、）)]|第[一二三四五六七八九十]+[段条点])/g
  result = result.replace(numberedPattern, `\n\n${SEGMENT_MARKER}`)

  // 3. 检测 ACT 标签后的编号段落（特殊情况）
  const actWithNumberPattern = /\n\n(<\|ACT:[^|]+\|>)\s*(\d{1,2}[.、）)])/g
  result = result.replace(actWithNumberPattern, `\n\n${SEGMENT_MARKER}$1$2`)

  // 4. 检测空行分隔的段落（两个或更多换行符）
  // 重要：不要在 ACT 标签、DELAY 标签或步骤编号前分段
  const emptyLinePattern = /\n{2,}(?!<\|(?:ACT|DELAY):)(?!\d{1,2}[).、）])(?=\S)/g
  result = result.replace(emptyLinePattern, `\n\n${SEGMENT_MARKER}`)

  // 5. 检测话题转换词
  const transitionWords = [
    '另外',
    '此外',
    '而且',
    '不过',
    '然而',
    '首先',
    '其次',
    '最后',
    '总之',
    '所以',
    '因此',
  ]

  for (const word of transitionWords) {
    const pattern = new RegExp(`([。！？.!?])\\s*\\n+\\s*(${word})`, 'g')
    result = result.replace(pattern, `$1\n\n${SEGMENT_MARKER}$2`)
  }

  // 6. 检测问句后的新段落
  result = result.replace(/([？?])[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*([^？?\s])/g, `$1\n\n${SEGMENT_MARKER}$2`)

  // 7. 处理长段落：如果一个段落太长（> 150 字），在合适的位置分段
  const segments = result.split(SEGMENT_MARKER)
  const processedSegments: string[] = []

  for (const segment of segments) {
    const cleanSegment = removeSpecialMarkers(segment)

    // 如果段落长度超过 150 字，尝试在句子结束处分段
    if (cleanSegment.length > 150) {
      // 按句子分割（保留标点）
      const sentences = segment.split(/([。！？.!?]+)/).filter(s => s.trim())
      let currentChunk = ''
      const chunks: string[] = []

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i]
        const testChunk = currentChunk + sentence
        const cleanTestChunk = removeSpecialMarkers(testChunk)

        // 如果加上这句话后超过 100 字，且当前块不为空，就分段
        if (cleanTestChunk.length > 100 && currentChunk.trim()) {
          chunks.push(currentChunk.trim())
          currentChunk = sentence
        }
        else {
          currentChunk += sentence
        }
      }

      // 添加最后一块
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }

      // 如果成功分割成多块，使用分割结果
      if (chunks.length > 1) {
        processedSegments.push(...chunks)
      }
      else {
        processedSegments.push(segment)
      }
    }
    else {
      processedSegments.push(segment)
    }
  }

  result = processedSegments.join(SEGMENT_MARKER)

  return result
}

/**
 * 检查文本中是否已包含 SEGMENT 标记
 */
export function hasSegmentMarkers(text: string): boolean {
  return text.includes(SEGMENT_MARKER)
}
