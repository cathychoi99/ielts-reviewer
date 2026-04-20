import OpenAI from 'openai';
import type { BandLevel } from '../../shared/types.js';

function buildSystemPrompt(bandLevel: BandLevel): string {
  return `你是一个雅思备考助手。请分析以下英语材料，提取：
1. 词汇（vocabulary）：生词或雅思高频词汇
2. 词组（collocation）：值得学习的词组搭配
3. 句子（sentence）：值得学习的句子表达

用户当前英语水平为 Band ${bandLevel}，请过滤掉低于该水平的基础内容。
根据雅思考试重点为每个摘录标注优先级（high/medium/low）。

请严格按以下 JSON 格式返回：
{
  "extractions": [
    {
      "type": "vocabulary",
      "word": "...",
      "definition": "...",
      "partOfSpeech": "...",
      "example": "...",
      "priority": "high|medium|low"
    },
    {
      "type": "collocation",
      "phrase": "...",
      "definition": "...",
      "example": "...",
      "priority": "high|medium|low"
    },
    {
      "type": "sentence",
      "sentence": "...",
      "analysis": "...",
      "scenario": "...",
      "priority": "high|medium|low"
    }
  ]
}`;
}

export async function parseContent(
  content: string,
  bandLevel: BandLevel,
  apiKey: string,
  apiBaseUrl: string,
): Promise<string> {
  if (!apiKey) {
    const err = new Error('请先在设置中配置 AI API Key');
    (err as Error & { statusCode: number }).statusCode = 422;
    throw err;
  }

  const client = new OpenAI({
    apiKey,
    baseURL: apiBaseUrl,
    timeout: 60_000,
  });

  // Split long content into chunks of ~3000 chars at paragraph boundaries
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if (current.length + p.length > 3000 && current.length > 0) {
      chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? '\n\n' : '') + p;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const allExtractions: any[] = [];

  try {
    for (const chunk of chunks) {
      const response = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: buildSystemPrompt(bandLevel) },
          { role: 'user', content: chunk },
        ],
        response_format: { type: 'json_object' },
      });

      const result = response.choices[0]?.message?.content;
      if (!result) continue;

      try {
        const parsed = JSON.parse(result);
        if (parsed.extractions && Array.isArray(parsed.extractions)) {
          allExtractions.push(...parsed.extractions);
        }
      } catch {
        // skip malformed chunk result
      }
    }

    if (allExtractions.length === 0) {
      throw new Error('AI 未返回任何摘录');
    }

    return JSON.stringify({ extractions: allExtractions });
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    const error = new Error(`AI 服务调用失败: ${message}`);
    (error as Error & { statusCode: number }).statusCode = 502;
    throw error;
  }
}
