import { NextRequest, NextResponse } from 'next/server'
import { buildComparison, buildFallbackComparison } from '../../../lib/kuwait-comparison'
import type { AnalysisResult, MarketScope } from '../../../lib/buywise-types'

type Provider = 'openai' | 'deepseek'

export const runtime = 'nodejs'

function normalizeScope(scope: unknown): MarketScope {
  return scope === 'middle-east' || scope === 'worldwide' ? scope : 'kuwait'
}

function fallback(input: string, comparison = buildFallbackComparison(input)) : AnalysisResult {
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
  let scope: MarketScope = 'kuwait'
  try {
    const body = await req.json()
    const { input, marketScope } = body as { input?: unknown; marketScope?: unknown }
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 })
    }
    requestInput = input
    scope = normalizeScope(marketScope)

    const primaryProvider = getProvider()
    const activeProvider = getAvailableProvider(primaryProvider)
    const comparisonPromise = buildComparison(input, undefined, scope)

    if (!activeProvider) {
      const comparison = await comparisonPromise
      return NextResponse.json(fallback(input, comparison))
    }

    const prompt = buildPrompt(input)
    const resultPromise = activeProvider === 'deepseek' ? callDeepSeek(prompt) : callOpenAI(prompt)
    const [result, comparison] = await Promise.all([resultPromise, comparisonPromise])

    return NextResponse.json({ ...result.payload, comparison, demoMode: false, providerLabel: result.providerLabel })
  } catch (error: unknown) {
    const comparison = buildFallbackComparison(requestInput, undefined, scope)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ ...fallback(requestInput, comparison), error: message })
  }
}
