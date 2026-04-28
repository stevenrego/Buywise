import { NextRequest, NextResponse } from 'next/server'
import { buildComparison, buildFallbackComparison } from '../../../lib/kuwait-comparison'
import type { AnalysisResult, MarketScope } from '../../../lib/buywise-types'

type Provider = 'openai' | 'deepseek'

export const runtime = 'nodejs'

const PRODUCT_ALIAS_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bps\s*5\s*pro\b/i, replacement: 'PlayStation 5 Pro' },
  { pattern: /\bps\s*5\b/i, replacement: 'PlayStation 5' },
  { pattern: /\bplaystation\s*5\b/i, replacement: 'PlayStation 5' },
  { pattern: /\biphone\s*16\s*pro\s*max\b/i, replacement: 'iPhone 16 Pro Max' },
  { pattern: /\biphone\s*16\s*pro\b/i, replacement: 'iPhone 16 Pro' },
  { pattern: /\biphone\s*16\b/i, replacement: 'iPhone 16' },
  { pattern: /\biphone\s*15\s*pro\s*max\b/i, replacement: 'iPhone 15 Pro Max' },
  { pattern: /\biphone\s*15\s*pro\b/i, replacement: 'iPhone 15 Pro' },
  { pattern: /\biphone\s*15\b/i, replacement: 'iPhone 15' },
  { pattern: /\bairpods\s*pro\s*2\b/i, replacement: 'AirPods Pro 2' },
  { pattern: /\bairpods\s*pro\b/i, replacement: 'AirPods Pro' },
  { pattern: /\bxbox\s*series\s*x\b/i, replacement: 'Xbox Series X' },
  { pattern: /\bxbox\s*series\s*s\b/i, replacement: 'Xbox Series S' },
  { pattern: /\bsamsung\s*galaxy\s*s\s*24\b/i, replacement: 'Samsung Galaxy S24' },
  { pattern: /\bsamsung\s*galaxy\s*s\s*24\s*ultra\b/i, replacement: 'Samsung Galaxy S24 Ultra' },
  { pattern: /\bsamsung\s*galaxy\s*z\s*fold\s*6\b/i, replacement: 'Samsung Galaxy Z Fold 6' },
  { pattern: /\bsamsung\s*galaxy\s*z\s*flip\s*6\b/i, replacement: 'Samsung Galaxy Z Flip 6' },
  { pattern: /\bmacbook\s*air\s*m3\b/i, replacement: 'MacBook Air M3' },
  { pattern: /\bmacbook\s*pro\s*m3\b/i, replacement: 'MacBook Pro M3' }
]

function normalizeScope(scope: unknown): MarketScope {
  return scope === 'middle-east' || scope === 'worldwide' ? scope : 'kuwait'
}

function normalizeProductInput(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return ''

  try {
    // Keep full URLs intact so the comparison layer can inspect the page directly.
    new URL(trimmed)
    return trimmed
  } catch {
    // Not a URL, normalize the typed product name.
  }

  let normalized = trimmed
    .replace(/[-_/+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const rule of PRODUCT_ALIAS_RULES) {
    if (rule.pattern.test(normalized)) {
      normalized = rule.replacement
      break
    }
  }

  return normalized
}

function fallback(input: string, comparison = buildFallbackComparison(input)): AnalysisResult {
  return {
    verdict: 'WAIT',
    score: 68,
    productName: input.slice(0, 80) || 'Shared product',
    summary: 'Demo mode is active. Add an OpenAI or DeepSeek key to enable live product analysis. The comparison layer still tries to surface Kuwait retailers and likely cheaper options.',
    pros: ['Fast check flow', 'Works with shared links or product descriptions', 'Kuwait-specific decision format'],
    cons: ['Live price comparison is still best-effort from public pages', 'Instagram video extraction needs a native app or approved scraping or API flow'],
    redFlags: ['Do not trust influencer claims without independent review data', 'Check warranty and return policy before buying'],
    kuwaitNotes: ['Compare with Xcite, Eureka, Blink, Best Al Yousifi, Lulu, Carrefour, and Amazon UAE where relevant', 'Check whether warranty is Kuwait-local or international only'],
    betterAlternatives: ['Compare across Kuwait retailers before buying', 'Wait for clearer pricing or verified seller information'],
    comparison,
    demoMode: true,
    providerLabel: 'demo mode'
  }
}

function getProvider(): Provider {
  return process.env.DEFAULT_AI_PROVIDER?.toLowerCase() === 'deepseek' ? 'deepseek' : 'openai'
}

function getAvailableProvider(primary: Provider): Provider | null {
  if (primary === 'openai' && process.env.OPENAI_API_KEY) return 'openai'
  if (primary === 'deepseek' && process.env.DEEPSEEK_API_KEY) return 'deepseek'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  return null
}

function buildPrompt(input: string) {
  return `You are BuyWise Kuwait, an unbiased shopping decision engine for Kuwait.
Analyze the shared product description or link.
First normalize the product into a clear canonical name before judging it. Expand shorthand like "Ps5" into "PlayStation 5" when appropriate.
Return only valid JSON with these exact keys:
- verdict: BUY, WAIT, or AVOID
- score: integer from 0 to 100
- productName: string
- summary: string
- pros: string[]
- cons: string[]
- redFlags: string[]
- kuwaitNotes: string[]
- betterAlternatives: string[]
Keep it concise, practical, and shopper-friendly.
Consider local warranty, delivery risk, return policy, hype, seller credibility, and overpricing.
Input: ${input}`
}

function analysisSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      verdict: { type: 'string', enum: ['BUY', 'WAIT', 'AVOID'] },
      score: { type: 'integer', minimum: 0, maximum: 100 },
      productName: { type: 'string' },
      summary: { type: 'string' },
      pros: { type: 'array', items: { type: 'string' } },
      cons: { type: 'array', items: { type: 'string' } },
      redFlags: { type: 'array', items: { type: 'string' } },
      kuwaitNotes: { type: 'array', items: { type: 'string' } },
      betterAlternatives: { type: 'array', items: { type: 'string' } }
    },
    required: ['verdict', 'score', 'productName', 'summary', 'pros', 'cons', 'redFlags', 'kuwaitNotes', 'betterAlternatives']
  }
}

async function callOpenAI(prompt: string) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'buywise_analysis',
          schema: analysisSchema()
        }
      }
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`)
  }

  const data = await response.json()
  const output = data.output?.[0]?.content
  const text = data.output_text || output?.find((item: { type?: string }) => item.type === 'output_text')?.text
  if (!text) {
    throw new Error('OpenAI returned an empty response')
  }

  return { payload: JSON.parse(text), providerLabel: 'OpenAI' }
}

async function callDeepSeek(prompt: string) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are BuyWise Kuwait, an unbiased shopping decision engine for Kuwait. Return only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with status ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('DeepSeek returned an empty response')
  }

  return { payload: JSON.parse(text), providerLabel: 'DeepSeek' }
}

export async function POST(req: NextRequest) {
  let requestInput = ''
  let normalizedInput = ''
  let scope: MarketScope = 'kuwait'
  try {
    const body = await req.json()
    const { input, marketScope } = body as { input?: unknown; marketScope?: unknown }
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 })
    }
    requestInput = input
    normalizedInput = normalizeProductInput(input)
    scope = normalizeScope(marketScope)

    const primaryProvider = getProvider()
    const activeProvider = getAvailableProvider(primaryProvider)

    if (!activeProvider) {
      const comparison = await buildComparison(normalizedInput || input, undefined, scope)
      return NextResponse.json(fallback(normalizedInput || input, comparison))
    }

    const prompt = buildPrompt(normalizedInput || input)
    const result = activeProvider === 'deepseek' ? await callDeepSeek(prompt) : await callOpenAI(prompt)
    const comparison = await buildComparison(normalizedInput || input, result.payload?.productName, scope)

    return NextResponse.json({ ...result.payload, comparison, demoMode: false, providerLabel: result.providerLabel })
  } catch (error: unknown) {
    const comparison = buildFallbackComparison(normalizedInput || requestInput, undefined, scope)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ ...fallback(normalizedInput || requestInput, comparison), error: message })
  }
}
