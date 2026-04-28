import { NextRequest, NextResponse } from 'next/server'
import { buildComparison, buildFallbackComparison } from '../../../lib/kuwait-comparison'
import type { AnalysisResult, MarketScope } from '../../../lib/buywise-types'

type Provider = 'openai' | 'deepseek'

export const runtime = 'nodejs'

type SearchPlan = {
  canonicalName: string
  productCategory: string
  searchQueries: string[]
  excludedTerms: string[]
  notes: string[]
}

function normalizeScope(scope: unknown): MarketScope {
  return scope === 'middle-east' || scope === 'worldwide' ? scope : 'kuwait'
}

function cleanInput(input: string) {
  return input.trim().replace(/\s+/g, ' ')
}

function fallback(input: string, comparison = buildFallbackComparison(input)): AnalysisResult {
  return {
    verdict: 'WAIT',
    score: 68,
    productName: input.slice(0, 80) || 'Shared product',
    summary:
      'Demo mode is active. Add an OpenAI or DeepSeek key to enable live product analysis. The comparison layer still tries to surface Kuwait retailers and likely cheaper options.',
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

function planSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      canonicalName: { type: 'string' },
      productCategory: { type: 'string' },
      searchQueries: { type: 'array', items: { type: 'string' } },
      excludedTerms: { type: 'array', items: { type: 'string' } },
      notes: { type: 'array', items: { type: 'string' } }
    },
    required: ['canonicalName', 'productCategory', 'searchQueries', 'excludedTerms', 'notes']
  }
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

async function callOpenAI(prompt: string, schemaName: string, schema: ReturnType<typeof planSchema> | ReturnType<typeof analysisSchema>) {
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
          name: schemaName,
          schema
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
          content: 'You are BuyWise Kuwait. Return only valid JSON.'
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

async function generateSearchPlan(input: string): Promise<SearchPlan> {
  const clean = cleanInput(input)
  const activeProvider = getAvailableProvider(getProvider())

  if (!activeProvider) {
    return {
      canonicalName: clean,
      productCategory: 'product',
      searchQueries: [clean],
      excludedTerms: [],
      notes: ['Demo mode is active, so the app is using a basic fallback plan.']
    }
  }

  const prompt = `You are BuyWise Kuwait. Build a smart search plan from this input so a shopping comparison engine can find real product listings.

Input:
${clean}

Return ONLY valid JSON with these exact keys:
- canonicalName: string
- productCategory: string
- searchQueries: string[]
- excludedTerms: string[]
- notes: string[]

Rules:
- canonicalName should be the real product name, not the shorthand.
- searchQueries should contain 3 to 6 concise phrases, from most specific to broader.
- Include the exact product name, the broad product family, and a store-friendly version when useful.
- excludedTerms should list obvious false matches to avoid.
- notes should briefly explain the interpretation.
- Keep it practical for Kuwait-first shopping comparison.`

  const raw =
    activeProvider === 'deepseek'
      ? await callDeepSeek(prompt)
      : await callOpenAI(prompt, 'buywise_plan', planSchema())

  const plan = raw.payload as Partial<SearchPlan>
  const searchQueries = Array.isArray(plan.searchQueries) ? plan.searchQueries.filter(item => typeof item === 'string' && item.trim()) : []

  return {
    canonicalName: typeof plan.canonicalName === 'string' && plan.canonicalName.trim() ? plan.canonicalName.trim() : clean,
    productCategory: typeof plan.productCategory === 'string' && plan.productCategory.trim() ? plan.productCategory.trim() : 'product',
    searchQueries: searchQueries.slice(0, 6),
    excludedTerms: Array.isArray(plan.excludedTerms) ? plan.excludedTerms.filter(item => typeof item === 'string' && item.trim()) : [],
    notes: Array.isArray(plan.notes) ? plan.notes.filter(item => typeof item === 'string' && item.trim()) : []
  }
}

function buildAnalysisPrompt(plan: SearchPlan, input: string) {
  return `You are BuyWise Kuwait, an unbiased shopping decision engine for Kuwait.
Use this product plan to produce the final verdict analysis.

Product plan:
${JSON.stringify(plan, null, 2)}

User input:
${input}

Return ONLY valid JSON with these exact keys:
- verdict: BUY, WAIT, or AVOID
- score: integer from 0 to 100
- productName: string
- summary: string
- pros: string[]
- cons: string[]
- redFlags: string[]
- kuwaitNotes: string[]
- betterAlternatives: string[]

Keep it concise, practical, and shopper-friendly.`
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

    const plan = await generateSearchPlan(input)
    const comparison = await buildComparison(input, plan.canonicalName, scope, plan.searchQueries)
    const activeProvider = getAvailableProvider(getProvider())

    if (!activeProvider) {
      return NextResponse.json(fallback(plan.canonicalName || input, comparison))
    }

    const analysisPrompt = buildAnalysisPrompt(plan, input)
    const result =
      activeProvider === 'deepseek'
        ? await callDeepSeek(analysisPrompt)
        : await callOpenAI(analysisPrompt, 'buywise_analysis', analysisSchema())

    return NextResponse.json({ ...result.payload, comparison, demoMode: false, providerLabel: result.providerLabel, searchPlan: plan })
  } catch (error: unknown) {
    const comparison = buildFallbackComparison(requestInput, undefined, scope)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ ...fallback(requestInput, comparison), error: message })
  }
}
