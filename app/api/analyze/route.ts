import { NextRequest, NextResponse } from 'next/server'
import { buildComparison, buildFallbackComparison } from '../../../lib/kuwait-comparison'
import type { AnalysisResult, ClarificationSummary, MarketScope, SearchPlanSummary } from '../../../lib/buywise-types'

type Provider = 'openai' | 'deepseek'

export const runtime = 'nodejs'

type SearchPlan = SearchPlanSummary

function normalizeScope(scope: unknown): MarketScope {
  return scope === 'middle-east' || scope === 'worldwide' ? scope : 'kuwait'
}

function cleanInput(input: string) {
  return input.trim().replace(/\s+/g, ' ')
}

function fallback(input: string, comparison = buildFallbackComparison(input), searchPlan?: SearchPlan): AnalysisResult {
  return {
    verdict: 'WAIT',
    score: 68,
    productName: input.slice(0, 80) || 'Shared product',
    summary:
      'Demo mode is active. Add an OpenAI or DeepSeek key to enable live AI search planning. The comparison layer still tries to surface Kuwait stores and likely cheaper options.',
    pros: ['Fast check flow', 'Works with shared links or product descriptions', 'Kuwait-first comparison by default'],
    cons: ['Live store discovery is still best-effort from public pages', 'Some merchants block search-engine discovery'],
    redFlags: ['Check warranty and return policy before buying', 'Treat missing matches as a search limitation, not proof the product is unavailable'],
    kuwaitNotes: ['Compare Xcite, Eureka, Blink, Best Al Yousifi, Lulu, Carrefour, and Amazon UAE where relevant', 'Use Middle East or worldwide scope when Kuwait listings are thin'],
    betterAlternatives: ['Compare across Kuwait retailers before buying', 'Try broader search terms or widen the market scope'],
    comparison,
    searchPlan,
    demoMode: true,
    providerLabel: 'demo mode'
  }
}

function buildClarification(question: string, options: string[], reason?: string): ClarificationSummary {
  return {
    question,
    options: options.slice(0, 5),
    reason
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
      notes: { type: 'array', items: { type: 'string' } },
      needsClarification: { type: 'boolean' },
      clarificationQuestion: { type: 'string' },
      clarificationOptions: { type: 'array', items: { type: 'string' } },
      clarificationReason: { type: 'string' }
    },
    required: ['canonicalName', 'productCategory', 'searchQueries', 'excludedTerms', 'notes']
  }
}

function detectAmbiguousInput(input: string): ClarificationSummary | null {
  const clean = input.trim().toLowerCase()
  if (!clean) return null
  if (/^https?:\/\//i.test(input.trim())) return null

  const hasStorage = /\b(64|128|256|512|1024)\s*(gb|gib|tb)\b/i.test(clean)
  const hasPhoneFamily = /\biphone\b/i.test(clean) || /\bgalaxy\b/i.test(clean) || /\bpixel\b/i.test(clean) || /\boneplus\b/i.test(clean)

  const families: Array<{ pattern: RegExp; question: string; options: string[]; reason: string }> = [
    {
      pattern: /\biphone\b/i,
      question: 'Which iPhone model or storage size do you mean?',
      options: ['iPhone 16 128GB', 'iPhone 16 Pro 256GB', 'iPhone 16 Pro Max 256GB'],
      reason: 'The model family is clear, but the exact configuration is not.'
    },
    {
      pattern: /\bairpods\b/i,
      question: 'Which AirPods model do you mean?',
      options: ['AirPods', 'AirPods Pro', 'AirPods Max'],
      reason: 'AirPods covers several different products with very different prices.'
    },
    {
      pattern: /\bmacbook\b/i,
      question: 'Which MacBook model do you mean?',
      options: ['MacBook Air', 'MacBook Air M3', 'MacBook Pro'],
      reason: 'MacBook is too broad to compare reliably without the model family.'
    },
    {
      pattern: /\bplaystation\b|\bps\s*5\b/i,
      question: 'Which PlayStation model do you mean?',
      options: ['PS5', 'PS5 Slim', 'PS5 Pro'],
      reason: 'PlayStation has multiple console versions with different prices.'
    },
    {
      pattern: /\bxbox\b/i,
      question: 'Which Xbox model do you mean?',
      options: ['Xbox Series S', 'Xbox Series X', 'Xbox console bundle'],
      reason: 'Xbox has several consoles and bundles that should not be mixed together.'
    },
    {
      pattern: /\bsamsung\b|\bgalaxy\b/i,
      question: 'Which Samsung model do you mean?',
      options: ['Galaxy S24', 'Galaxy S24 Ultra', 'Galaxy Z Fold'],
      reason: 'Samsung covers many categories and the comparison needs a specific model.'
    }
  ]

  if (hasPhoneFamily && !hasStorage) {
    return buildClarification(
      'Which exact model or storage size do you mean?',
      ['iPhone 16 128GB', 'iPhone 16 Pro 256GB', 'iPhone 16 Pro Max 256GB'],
      'The product family is clear, but the storage size is missing.'
    )
  }

  for (const family of families) {
    if (family.pattern.test(clean)) {
      const tokenCount = clean.split(/\s+/).length
      const hasSpecificModel = /\b\d{2}\b|\bpro\b|\bultra\b|\bmax\b|\bplus\b|\bslim\b|\bair\b|\bseries\b/i.test(clean)
      if (tokenCount <= 2 && !hasSpecificModel) {
        return buildClarification(family.question, family.options, family.reason)
      }
    }
  }

  return null
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
    const clarification = detectAmbiguousInput(clean)
    return {
      canonicalName: clean,
      productCategory: 'product',
      searchQueries: clarification ? [] : [clean],
      excludedTerms: [],
      notes: clarification
        ? ['Demo mode is active, so the app is asking for one quick clarification before comparing prices.']
        : ['Demo mode is active, so the app is using a basic fallback plan.'],
      needsClarification: Boolean(clarification),
      clarificationQuestion: clarification?.question,
      clarificationOptions: clarification?.options,
      clarificationReason: clarification?.reason
    }
  }

  const prompt = `You are BuyWise Kuwait. First decide whether the input is specific enough to compare prices safely.

If it is too vague, ask one short clarification question and stop. If it is specific enough, build a smart search plan that a shopping comparison engine can use to find real product listings and compare prices.

Input:
${clean}

Return ONLY valid JSON with these exact keys:
- canonicalName: string
- productCategory: string
- searchQueries: string[]
- excludedTerms: string[]
- notes: string[]
- needsClarification: boolean
- clarificationQuestion: string
- clarificationOptions: string[]
- clarificationReason: string

Rules:
- canonicalName should be the real product name, not the shorthand.
- searchQueries should contain 4 to 6 concise phrases, from most specific to broader.
- Include the exact product name, a Kuwait price phrase, a store-friendly version, a broader family phrase, and at least one retailer-friendly phrase when useful.
- For phones and electronics, include capacity or model-year variants if they are obvious from the input.
- Never invent a storage size, color, or edition that the user did not provide.
- If the input looks like a phone model without storage, ask for storage instead of assuming one.
- excludedTerms should list obvious false matches to avoid.
- notes should briefly explain the interpretation.
- If clarification is needed, keep searchQueries empty and provide 3 to 5 concrete choices.
- Keep it practical for Kuwait-first shopping comparison.`

  const raw =
    activeProvider === 'deepseek'
      ? await callDeepSeek(prompt)
      : await callOpenAI(prompt, 'buywise_plan', planSchema())

  const plan = raw.payload as Partial<SearchPlan>
  const searchQueries = Array.isArray(plan.searchQueries) ? plan.searchQueries.filter(item => typeof item === 'string' && item.trim()) : []
  const clarificationOptions = Array.isArray(plan.clarificationOptions)
    ? plan.clarificationOptions.filter(item => typeof item === 'string' && item.trim())
    : []

  return {
    canonicalName: typeof plan.canonicalName === 'string' && plan.canonicalName.trim() ? plan.canonicalName.trim() : clean,
    productCategory: typeof plan.productCategory === 'string' && plan.productCategory.trim() ? plan.productCategory.trim() : 'product',
    searchQueries: searchQueries.slice(0, 6),
    excludedTerms: Array.isArray(plan.excludedTerms) ? plan.excludedTerms.filter(item => typeof item === 'string' && item.trim()) : [],
    notes: Array.isArray(plan.notes) ? plan.notes.filter(item => typeof item === 'string' && item.trim()) : [],
    needsClarification: Boolean(plan.needsClarification) || Boolean(detectAmbiguousInput(clean)),
    clarificationQuestion:
      typeof plan.clarificationQuestion === 'string' && plan.clarificationQuestion.trim()
        ? plan.clarificationQuestion.trim()
        : detectAmbiguousInput(clean)?.question,
    clarificationOptions: clarificationOptions.length ? clarificationOptions.slice(0, 5) : detectAmbiguousInput(clean)?.options,
    clarificationReason:
      typeof plan.clarificationReason === 'string' && plan.clarificationReason.trim()
        ? plan.clarificationReason.trim()
        : detectAmbiguousInput(clean)?.reason
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
  let plan: SearchPlan | undefined
  try {
    const body = await req.json()
    const { input, marketScope } = body as { input?: unknown; marketScope?: unknown }
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 })
    }

    requestInput = input
    scope = normalizeScope(marketScope)

    plan = await generateSearchPlan(input)
    const clarification =
      plan.needsClarification && plan.clarificationQuestion
        ? buildClarification(plan.clarificationQuestion, plan.clarificationOptions || [], plan.clarificationReason)
        : null

    if (clarification) {
      return NextResponse.json({
        verdict: 'WAIT',
        score: 45,
        productName: plan.canonicalName || input,
        summary: clarification.question,
        pros: [],
        cons: [],
        redFlags: [],
        kuwaitNotes: [],
        betterAlternatives: [],
        clarification,
        searchPlan: plan,
        demoMode: !getAvailableProvider(getProvider()),
        providerLabel: getAvailableProvider(getProvider()) ? getProvider() : 'demo mode'
      })
    }

    const comparison = await buildComparison(input, plan.canonicalName, scope, plan.searchQueries)
    const activeProvider = getAvailableProvider(getProvider())

    if (!activeProvider) {
      return NextResponse.json(fallback(plan.canonicalName || input, comparison, plan))
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
    const fallbackPlan = plan || (requestInput ? await generateSearchPlan(requestInput) : undefined)
    if (!fallbackPlan) {
      return NextResponse.json({ ...fallback(requestInput, comparison), error: message })
    }
    const clarification =
      fallbackPlan?.needsClarification && fallbackPlan.clarificationQuestion
        ? buildClarification(fallbackPlan.clarificationQuestion, fallbackPlan.clarificationOptions || [], fallbackPlan.clarificationReason)
        : null
    if (clarification) {
      return NextResponse.json({
        verdict: 'WAIT',
        score: 45,
        productName: fallbackPlan.canonicalName || requestInput || 'Shared product',
        summary: clarification.question,
        pros: [],
        cons: [],
        redFlags: [],
        kuwaitNotes: [],
        betterAlternatives: [],
        clarification,
        searchPlan: fallbackPlan,
        error: message,
        demoMode: !getAvailableProvider(getProvider()),
        providerLabel: getAvailableProvider(getProvider()) ? getProvider() : 'demo mode'
      })
    }
    return NextResponse.json({ ...fallback(requestInput, comparison, fallbackPlan), error: message })
  }
}
