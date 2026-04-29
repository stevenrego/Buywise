import type { ComparisonConfidence, ComparisonOffer, ComparisonSummary, MarketScope } from './buywise-types'

type RetailerSource = {
  retailer: string
  domain: string
  label: string
}

type SearchResult = {
  title: string
  url: string
  snippet: string
}

type ProductPageData = {
  title?: string
  price?: number | null
  source?: string
  availability?: 'in stock' | 'out of stock' | 'unknown'
}

type DiscoveryMatch = {
  retailer: string
  url: string | null
  pageTitle?: string
  note?: string
  confidence?: 'live' | 'estimated' | 'search' | 'missing'
}

type DiscoveryResult = {
  matches: DiscoveryMatch[]
  notes?: string[]
}

const RETAILER_POOLS: Record<MarketScope, { label: string; retailers: RetailerSource[] }> = {
  kuwait: {
    label: 'Kuwait',
    retailers: [
      { retailer: 'Xcite', domain: 'xcite.com', label: 'Xcite' },
      { retailer: 'Eureka', domain: 'eureka.com.kw', label: 'Eureka' },
      { retailer: 'Blink', domain: 'blink.com.kw', label: 'Blink' },
      { retailer: 'Best Al Yousifi', domain: 'bestalyousifi.com', label: 'Best Al Yousifi' },
      { retailer: 'Lulu Hypermarket', domain: 'luluhypermarket.com', label: 'Lulu Hypermarket' },
      { retailer: 'Carrefour', domain: 'carrefourkuwait.com', label: 'Carrefour' },
      { retailer: 'Namshi', domain: 'namshi.com', label: 'Namshi' },
      { retailer: 'Boutiqaat', domain: 'boutiqaat.com', label: 'Boutiqaat' }
    ]
  },
  'middle-east': {
    label: 'Middle East',
    retailers: [
      { retailer: 'Xcite', domain: 'xcite.com', label: 'Xcite' },
      { retailer: 'Eureka', domain: 'eureka.com.kw', label: 'Eureka' },
      { retailer: 'Blink', domain: 'blink.com.kw', label: 'Blink' },
      { retailer: 'Best Al Yousifi', domain: 'bestalyousifi.com', label: 'Best Al Yousifi' },
      { retailer: 'Lulu Hypermarket', domain: 'luluhypermarket.com', label: 'Lulu Hypermarket' },
      { retailer: 'Carrefour', domain: 'carrefourkuwait.com', label: 'Carrefour' },
      { retailer: 'Carrefour UAE', domain: 'carrefouruae.com', label: 'Carrefour UAE' },
      { retailer: 'Noon', domain: 'noon.com', label: 'Noon' },
      { retailer: 'Amazon UAE', domain: 'amazon.ae', label: 'Amazon UAE' },
      { retailer: 'Sharaf DG', domain: 'sharafdg.com', label: 'Sharaf DG' },
      { retailer: 'Namshi', domain: 'namshi.com', label: 'Namshi' },
      { retailer: 'Boutiqaat', domain: 'boutiqaat.com', label: 'Boutiqaat' }
    ]
  },
  worldwide: {
    label: 'Worldwide',
    retailers: [
      { retailer: 'Amazon', domain: 'amazon.com', label: 'Amazon' },
      { retailer: 'Amazon UAE', domain: 'amazon.ae', label: 'Amazon UAE' },
      { retailer: 'Walmart', domain: 'walmart.com', label: 'Walmart' },
      { retailer: 'Best Buy', domain: 'bestbuy.com', label: 'Best Buy' },
      { retailer: 'Target', domain: 'target.com', label: 'Target' },
      { retailer: 'eBay', domain: 'ebay.com', label: 'eBay' },
      { retailer: 'AliExpress', domain: 'aliexpress.com', label: 'AliExpress' },
      { retailer: 'Noon', domain: 'noon.com', label: 'Noon' },
      { retailer: 'Sharaf DG', domain: 'sharafdg.com', label: 'Sharaf DG' }
    ]
  }
}

const PRICE_PATTERN = /(?:KD|KWD|Ø¯\.Ùƒ\.?)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,3})?)|([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,3})?)\s*(?:KD|KWD|Ø¯\.Ùƒ\.?)/i

const PRODUCT_ALIASES: Array<{ pattern: RegExp; replacement: string }> = [
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
  { pattern: /\bsamsung\s*galaxy\s*s\s*24\s*ultra\b/i, replacement: 'Samsung Galaxy S24 Ultra' },
  { pattern: /\bsamsung\s*galaxy\s*s\s*24\b/i, replacement: 'Samsung Galaxy S24' },
  { pattern: /\bmacbook\s*air\s*m3\b/i, replacement: 'MacBook Air M3' },
  { pattern: /\bmacbook\s*pro\s*m3\b/i, replacement: 'MacBook Pro M3' }
]

function normalizeScope(scope?: MarketScope) {
  return scope && scope in RETAILER_POOLS ? scope : 'kuwait'
}

function getRetailerPool(scope?: MarketScope) {
  const normalized = normalizeScope(scope)
  return {
    scope: normalized,
    label: RETAILER_POOLS[normalized].label,
    retailers: RETAILER_POOLS[normalized].retailers
  }
}

function discoverySchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      matches: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            retailer: { type: 'string' },
            url: { type: ['string', 'null'] },
            pageTitle: { type: 'string' },
            note: { type: 'string' },
            confidence: {
              type: 'string',
              enum: ['live', 'estimated', 'search', 'missing']
            }
          },
          required: ['retailer', 'url']
        }
      },
      notes: { type: 'array', items: { type: 'string' } }
    },
    required: ['matches']
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function parseKuwaitPrice(raw: string | number | null | undefined) {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '').trim()
  if (!cleaned) return null
  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? value : null
}

function extractPriceFromText(text: string) {
  const prices = Array.from(text.matchAll(new RegExp(PRICE_PATTERN, 'gi')))
    .map(match => parseKuwaitPrice(match[1] || match[2]))
    .filter((value): value is number => typeof value === 'number' && value > 0)
  return prices.length ? Math.min(...prices) : null
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function cleanSearchText(value: string) {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/[?#].*$/g, '')
    .replace(/\b(?:utm_[^&\s]+|gclid|fbclid|gad_source|gad_campaignid|gbraid|ref|src|adurl)=\S+/gi, ' ')
    .replace(/[-_/+]+/g, ' ')
    .replace(/\b(?:product|products|item|p|en|ar|kw|kuwait|store|shop|official|buy|online)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeSearchFragment(value: string) {
  const cleaned = cleanSearchText(value)
  if (!cleaned) return ''

  let normalized = cleaned.replace(/\s+/g, ' ').trim()
  const lowered = normalized.toLowerCase()
  for (const rule of PRODUCT_ALIASES) {
    if (rule.pattern.test(lowered)) {
      normalized = rule.replacement
      break
    }
  }
  return normalized
}

function extractSearchQuery(input: string, sourceTitle?: string) {
  const trimmed = input.trim()
  if (!trimmed) return sourceTitle?.trim() || 'product'

  try {
    const url = new URL(trimmed)
    const parts = [sourceTitle, url.pathname, url.searchParams.get('q'), url.searchParams.get('query')]
      .filter(Boolean)
      .map(part => cleanSearchText(String(part)))
      .filter(Boolean)
    if (parts.length) return parts.join(' ').replace(/\s+/g, ' ').trim()
  } catch {
    // Not a URL.
  }

  const cleanedInput = normalizeSearchFragment(trimmed)
  const cleanedTitle = normalizeSearchFragment(sourceTitle || '')
  if (cleanedTitle && cleanedTitle.length > cleanedInput.length) return cleanedTitle
  return cleanedInput || cleanedTitle || sourceTitle?.trim() || 'product'
}

type SearchVariant = {
  query: string
  label: string
}

function buildSearchVariants(input: string, sourceTitle?: string, preferredQueries: string[] = []): SearchVariant[] {
  const baseQuery = extractSearchQuery(input, sourceTitle)
  const normalizedBase = normalizeSearchFragment(baseQuery)
  const normalizedTitle = normalizeSearchFragment(sourceTitle || '')
  const variants: SearchVariant[] = []
  const seen = new Set<string>()

  function add(query: string, label: string) {
    const clean = normalizeSearchFragment(query)
    if (!clean) return
    const key = clean.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    variants.push({ query: clean, label })
  }

  add(baseQuery, 'base query')
  add(normalizedTitle, 'source title')

  for (const preferred of preferredQueries) add(preferred, 'ai plan')

  const hints: Array<{ pattern: RegExp; variants: string[] }> = [
    { pattern: /\bps\s*5\b|\bplaystation\s*5\b/i, variants: ['Sony PlayStation 5 console', 'PS5 console', 'PlayStation 5 price Kuwait'] },
    { pattern: /\bxbox\s*series\s*x\b/i, variants: ['Xbox Series X console', 'Xbox Series X price Kuwait'] },
    { pattern: /\bxbox\s*series\s*s\b/i, variants: ['Xbox Series S console', 'Xbox Series S price Kuwait'] },
    { pattern: /\biphone\s*16\s*pro\s*max\b/i, variants: ['Apple iPhone 16 Pro Max', 'iPhone 16 Pro Max price Kuwait'] },
    { pattern: /\biphone\s*16\s*pro\b/i, variants: ['Apple iPhone 16 Pro', 'iPhone 16 Pro price Kuwait'] },
    { pattern: /\biphone\s*16\b/i, variants: ['Apple iPhone 16', 'iPhone 16 price Kuwait'] },
    { pattern: /\biphone\s*15\s*pro\s*max\b/i, variants: ['Apple iPhone 15 Pro Max', 'iPhone 15 Pro Max price Kuwait'] },
    { pattern: /\biphone\s*15\s*pro\b/i, variants: ['Apple iPhone 15 Pro', 'iPhone 15 Pro price Kuwait'] },
    { pattern: /\biphone\s*15\b/i, variants: ['Apple iPhone 15', 'iPhone 15 price Kuwait'] },
    { pattern: /\bairpods\s*pro\s*2\b/i, variants: ['Apple AirPods Pro 2', 'AirPods Pro 2 price Kuwait'] },
    { pattern: /\bairpods\s*pro\b/i, variants: ['Apple AirPods Pro', 'AirPods Pro price Kuwait'] },
    { pattern: /\bsamsung\s*galaxy\s*s\s*24\s*ultra\b/i, variants: ['Samsung Galaxy S24 Ultra', 'Galaxy S24 Ultra price Kuwait'] },
    { pattern: /\bsamsung\s*galaxy\s*s\s*24\b/i, variants: ['Samsung Galaxy S24', 'Galaxy S24 price Kuwait'] },
    { pattern: /\bmacbook\s*air\s*m3\b/i, variants: ['Apple MacBook Air M3', 'MacBook Air M3 price Kuwait'] },
    { pattern: /\bmacbook\s*pro\s*m3\b/i, variants: ['Apple MacBook Pro M3', 'MacBook Pro M3 price Kuwait'] }
  ]

  for (const hint of hints) {
    if (hint.pattern.test(normalizedBase) || hint.pattern.test(normalizedTitle)) {
      for (const variant of hint.variants) add(variant, 'product hint')
    }
  }

  if (/\bconsole\b/i.test(normalizedBase) || /\bconsole\b/i.test(normalizedTitle)) {
    add(`${normalizedBase} gaming console`, 'console expansion')
  }

  if (variants.length === 0) add(normalizedBase || normalizedTitle || baseQuery, 'fallback')
  return variants.slice(0, 6)
}

function buildSearchTerms(retailer: RetailerSource, query: string, searchPlanQueries: string[] = []) {
  const terms = new Set<string>()
  const variants = [query, ...searchPlanQueries].filter(Boolean)

  for (const variant of variants) {
    const trimmed = normalizeSearchFragment(variant)
    if (!trimmed) continue
    terms.add(trimmed)
    terms.add(`${trimmed} Kuwait`)
    terms.add(`${retailer.label} ${trimmed}`)
    terms.add(`${trimmed} ${retailer.label}`)
    terms.add(`site:${retailer.domain} ${trimmed}`)
    terms.add(`site:${retailer.domain} ${trimmed} price`)
  }

  return Array.from(terms).slice(0, 12)
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map(token => token.trim())
    .filter(Boolean)
}

function scoreSearchResult(result: SearchResult, query: string, retailer: RetailerSource) {
  const haystack = `${result.title} ${result.snippet} ${result.url}`.toLowerCase()
  const tokens = tokenize(query)
  const titleTokens = tokenize(result.title)
  let score = 0

  for (const token of tokens) {
    if (titleTokens.includes(token)) score += 5
    else if (haystack.includes(token)) score += 2
  }

  if (result.title.toLowerCase().includes(query.toLowerCase())) score += 15
  if (hostFromUrl(result.url).includes(retailer.domain)) score += 8
  if (result.url.toLowerCase().includes('/products/')) score += 4

  const accessoryPenaltyTerms = ['cover', 'remote', 'headset', 'controller', 'charging', 'camera', 'game', 'gift card', 'card', 'accessory', 'bundle']
  if (/\bplaystation\s*5\b|\bps\s*5\b/i.test(query)) {
    for (const penalty of accessoryPenaltyTerms) {
      if (haystack.includes(penalty)) score -= 6
    }
  }

  if (/\biphone\b/i.test(query) || /\bgalaxy\b/i.test(query) || /\bmacbook\b/i.test(query)) {
    if (haystack.includes('case') || haystack.includes('cover') || haystack.includes('charger')) score -= 4
  }

  return score
}

function fetchTextWithTimeout(url: string, timeoutMs = 7000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  return fetch(url, {
    signal: controller.signal,
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  }).finally(() => clearTimeout(timer))
}

function extractMetaContent(html: string, key: string, attr = 'property') {
  const pattern = new RegExp(`<meta[^>]+${attr}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']+)["']`, 'i')
  return decodeHtml(html.match(pattern)?.[1] ?? '')
}

function extractTitle(html: string) {
  const ogTitle = extractMetaContent(html, 'og:title')
  if (ogTitle) return stripHtml(ogTitle)
  const twitterTitle = extractMetaContent(html, 'twitter:title', 'name')
  if (twitterTitle) return stripHtml(twitterTitle)
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return titleTag ? stripHtml(titleTag) : ''
}

function extractJsonLdProducts(html: string) {
  const blocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
  for (const block of blocks) {
    const raw = block[1].trim()
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as unknown
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const candidate = item as Record<string, unknown>
        const type = candidate['@type']
        const typeName = Array.isArray(type) ? type.map(String).join(' ') : String(type || '')
        if (!typeName.toLowerCase().includes('product')) continue

        const title = typeof candidate.name === 'string' ? candidate.name : undefined
        const offers = candidate.offers as
          | { price?: string | number; availability?: string }
          | Array<{ price?: string | number; availability?: string }>
          | undefined

        const firstOffer = Array.isArray(offers) ? offers[0] : offers
        const price = firstOffer ? parseKuwaitPrice(firstOffer.price ?? null) : null
        const availabilityValue = firstOffer?.availability ? String(firstOffer.availability).toLowerCase() : ''
        const availability: ProductPageData['availability'] = availabilityValue.includes('instock')
          ? 'in stock'
          : availabilityValue.includes('outofstock')
            ? 'out of stock'
            : 'unknown'

        return { title, price, availability }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return null
}

async function fetchProductPageData(url: string): Promise<ProductPageData> {
  try {
    const response = await fetchTextWithTimeout(url)
    if (!response.ok) return {}

    const html = await response.text()
    const jsonLd = extractJsonLdProducts(html)
    const metaPrice =
      parseKuwaitPrice(extractMetaContent(html, 'product:price:amount')) ??
      parseKuwaitPrice(extractMetaContent(html, 'twitter:data1', 'name')) ??
      extractPriceFromText(html)

    return {
      title: jsonLd?.title || extractTitle(html) || undefined,
      price: jsonLd?.price ?? metaPrice,
      source: hostFromUrl(url),
      availability: jsonLd?.availability
    }
  } catch {
    return {}
  }
}

async function callOpenAISearch(
  prompt: string,
  schemaName: string,
  schema: ReturnType<typeof discoverySchema>,
  allowedDomains: string[]
) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SEARCH_MODEL || 'gpt-5.4-mini',
      tools: [
        {
          type: 'web_search',
          filters: {
            allowed_domains: allowedDomains.slice(0, 20)
          }
        }
      ],
      tool_choice: 'auto',
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
    throw new Error(`OpenAI search request failed with status ${response.status}`)
  }

  const data = await response.json()
  const output = data.output?.[0]?.content
  const text = data.output_text || output?.find((item: { type?: string }) => item.type === 'output_text')?.text
  if (!text) {
    throw new Error('OpenAI search returned an empty response')
  }

  return { payload: JSON.parse(text), providerLabel: 'OpenAI Search' }
}

async function discoverRetailerMatchesFromSearch(
  query: string,
  sourceTitle: string | undefined,
  scope: MarketScope,
  preferredQueries: string[] = []
): Promise<DiscoveryMatch[]> {
  const pool = getRetailerPool(scope)
  const variants = buildSearchVariants(query, sourceTitle, preferredQueries)
  const matches: DiscoveryMatch[] = []

  for (const retailer of pool.retailers) {
    let picked: DiscoveryMatch | null = null

    outer: for (const variant of variants) {
      for (const searchTerm of buildSearchTerms(retailer, variant.query, preferredQueries)) {
        const searchResults = await fetchSearchResults(searchTerm)
        const candidate = searchResults
          .filter(result => hostFromUrl(result.url).includes(retailer.domain))
          .map(result => ({
            result,
            score: scoreSearchResult(result, variant.query, retailer)
          }))
          .sort((a, b) => b.score - a.score)[0]

        if (candidate && candidate.score >= 8) {
          picked = {
            retailer: retailer.retailer,
            url: candidate.result.url,
            pageTitle: candidate.result.title,
            note: candidate.result.snippet || `Found a likely product page for ${retailer.label}.`,
            confidence: candidate.score >= 14 ? 'search' : 'estimated'
          }
          break outer
        }
      }
    }

    if (picked) matches.push(picked)
  }

  return matches
}

async function discoverRetailerMatches(
  query: string,
  sourceTitle: string | undefined,
  scope: MarketScope,
  preferredQueries: string[] = []
): Promise<DiscoveryMatch[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    const matches = await discoverRetailerMatchesFromSearch(query, sourceTitle, scope, preferredQueries)
    return matches.length ? matches : null
  }

  const pool = getRetailerPool(scope)
  const prompt = `You are BuyWise Kuwait.
Use web search to find the best public product page URL for each retailer that likely carries the requested product in the requested market.

Rules:
- Prefer exact product pages over category pages.
- Use only URLs you are confident are public and relevant.
- Do not invent prices.
- If a retailer has no clear match, return url as null.
- For Kuwait-first mode, prioritize Kuwaiti retailers and Kuwait-local product pages.
- If the input is vague, use the provided search plan to narrow it, but still return the most likely store pages if you can.

Product input: ${query}
Source title: ${sourceTitle || ''}
Market scope: ${scope}
Retailers:
${pool.retailers.map(retailer => `- ${retailer.retailer} (${retailer.domain})`).join('\n')}

Search hints:
${preferredQueries.length ? preferredQueries.map(item => `- ${item}`).join('\n') : '- none'}

Return JSON with:
- matches: [{ retailer, url, pageTitle, note, confidence }]
- notes: [string]
`

  try {
    const raw = await callOpenAISearch(
      prompt,
      'buywise_discovery',
      discoverySchema(),
      pool.retailers.map(retailer => retailer.domain)
    )
    const payload = raw.payload as Partial<DiscoveryResult>
    const matches = Array.isArray(payload.matches) ? payload.matches : []

    const normalized = matches
      .map(match => ({
        retailer: typeof match.retailer === 'string' ? match.retailer.trim() : '',
        url: typeof match.url === 'string' && match.url.trim() ? match.url.trim() : null,
        pageTitle: typeof match.pageTitle === 'string' && match.pageTitle.trim() ? match.pageTitle.trim() : undefined,
        note: typeof match.note === 'string' && match.note.trim() ? match.note.trim() : undefined,
        confidence: match.confidence
      }))
      .filter(match => match.retailer)

    if (normalized.length) return normalized
  } catch {
    // Fall back to search engine discovery below.
  }

  const fallbackMatches = await discoverRetailerMatchesFromSearch(query, sourceTitle, scope, preferredQueries)
  return fallbackMatches.length ? fallbackMatches : null
}

async function fetchDuckDuckGoResults(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetchTextWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 6000)
    if (!response.ok) return []

    const html = await response.text()
    const results: SearchResult[] = []
    const regex = /<a\b[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a\b[^>]*class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/a>)?/gi

    for (const match of Array.from(html.matchAll(regex))) {
      const href = match[1]
      const title = stripHtml(match[2] || '')
      const snippet = stripHtml(match[3] || '')
      if (!href || !title) continue

      let url = decodeHtml(href)
      if (url.startsWith('//')) url = `https:${url}`
      try {
        const parsed = new URL(url)
        const redirectTarget = parsed.searchParams.get('uddg')
        if (redirectTarget) url = decodeURIComponent(redirectTarget)
      } catch {
        // Keep fallback url string.
      }

      results.push({ title, url, snippet })
      if (results.length >= 6) break
    }

    return results
  } catch {
    return []
  }
}

async function fetchBingResults(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetchTextWithTimeout(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, 6000)
    if (!response.ok) return []

    const html = await response.text()
    const results: SearchResult[] = []
    const regex = /<li\b[^>]*class=["'][^"']*\bb_algo\b[^"']*["'][\s\S]*?<h2>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<div\b[^>]*class=["'][^"']*\bb_caption\b[^"']*["'][\s\S]*?<p>([\s\S]*?)<\/p>)?/gi

    for (const match of Array.from(html.matchAll(regex))) {
      const href = match[1]
      const title = stripHtml(match[2] || '')
      const snippet = stripHtml(match[3] || '')
      if (!href || !title) continue

      let url = decodeHtml(href)
      try {
        const parsed = new URL(url)
        const redirectTarget = parsed.searchParams.get('u') || parsed.searchParams.get('uddg')
        if (redirectTarget) url = decodeURIComponent(redirectTarget)
      } catch {
        // Keep fallback url string.
      }

      results.push({ title, url, snippet })
      if (results.length >= 6) break
    }

    return results
  } catch {
    return []
  }
}

async function fetchSearchResults(query: string): Promise<SearchResult[]> {
  const [duckDuckGo, bing] = await Promise.all([fetchDuckDuckGoResults(query), fetchBingResults(query)])
  const merged = new Map<string, SearchResult>()

  for (const result of [...duckDuckGo, ...bing]) {
    const key = `${hostFromUrl(result.url)}|${result.title.toLowerCase()}|${result.url}`
    if (!merged.has(key)) merged.set(key, result)
  }

  return Array.from(merged.values()).slice(0, 10)
}

function buildOfferNote(title: string, source: string, price: number | null) {
  if (price !== null) return `Found a live or near-live price from ${source}.`
  if (title) return `Matched the product on ${source}, but the page did not expose a price cleanly.`
  return `Could not track a clear price on ${source} yet.`
}

async function lookupRetailerOffer(
  query: string,
  retailer: RetailerSource,
  sourceTitle?: string,
  searchPlanQueries: string[] = [],
  discoveredUrl?: string | null
): Promise<ComparisonOffer> {
  if (discoveredUrl) {
    const pageData = await fetchProductPageData(discoveredUrl)
    const price = pageData.price ?? extractPriceFromText(`${pageData.title || ''} ${query}`)
    const confidence: ComparisonConfidence =
      pageData.price !== null && pageData.price !== undefined ? 'live' : price !== null ? 'estimated' : 'search'

    return {
      retailer: retailer.retailer,
      price,
      currency: 'KD',
      url: discoveredUrl,
      searchUrl: `https://www.bing.com/search?q=${encodeURIComponent(`site:${retailer.domain} ${query}`)}`,
      source: pageData.title || retailer.label,
      confidence,
      note: buildOfferNote(pageData.title || retailer.label, retailer.label, price),
      availability: pageData.availability || 'unknown'
    }
  }

  const variants = buildSearchVariants(query, sourceTitle, searchPlanQueries)
  const primaryQuery = variants[0]?.query || query
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`site:${retailer.domain} ${primaryQuery}`)}`
  const candidateResults: Array<{ result: SearchResult; score: number }> = []

  for (const variant of variants) {
    for (const searchTerm of buildSearchTerms(retailer, variant.query, searchPlanQueries)) {
      const searchResults = await fetchSearchResults(searchTerm)
      for (const result of searchResults) {
        if (!hostFromUrl(result.url).includes(retailer.domain)) continue
        candidateResults.push({
          result,
          score: scoreSearchResult(result, variant.query, retailer)
        })
      }
      if (candidateResults.some(candidate => candidate.score >= 12)) break
    }
    if (candidateResults.some(candidate => candidate.score >= 12)) break
  }

  const firstMatch = candidateResults.sort((a, b) => b.score - a.score)[0]?.result

  if (!firstMatch) {
    return {
      retailer: retailer.retailer,
      price: null,
      currency: 'KD',
      searchUrl,
      source: retailer.label,
      confidence: 'missing',
      note: `No clear public result found for ${retailer.label} yet.`,
      availability: 'unknown'
    }
  }

  const pageData = await fetchProductPageData(firstMatch.url)
  const title = pageData.title || firstMatch.title
  const price = pageData.price ?? extractPriceFromText(`${firstMatch.title} ${firstMatch.snippet}`)
  const confidence: ComparisonConfidence = pageData.price !== null && pageData.price !== undefined ? 'live' : price !== null ? 'estimated' : 'search'

  return {
    retailer: retailer.retailer,
    price,
    currency: 'KD',
    url: firstMatch.url,
    searchUrl,
    source: title || retailer.label,
    confidence,
    note: buildOfferNote(title, retailer.label, price),
    availability: pageData.availability || 'unknown'
  }
}

function buildFallbackOffers(query: string, scope?: MarketScope): ComparisonOffer[] {
  return getRetailerPool(scope).retailers.map(retailer => ({
    retailer: retailer.retailer,
    price: null,
    currency: 'KD',
    searchUrl: `https://www.bing.com/search?q=${encodeURIComponent(`site:${retailer.domain} ${query}`)}`,
    source: retailer.label,
    confidence: 'missing',
    note: `Search ${retailer.label} for this product.`,
    availability: 'unknown'
  }))
}

function applyComparisonRanking(offers: ComparisonOffer[], sourcePrice: number | null | undefined) {
  const priced = offers.filter(offer => typeof offer.price === 'number')
  if (priced.length === 0) return { offers, cheapestOffer: null, savings: null }

  const cheapestOffer = priced.reduce((best, offer) => {
    if (best.price === null || (offer.price !== null && offer.price < best.price)) return offer
    return best
  }, priced[0])

  const savings =
    typeof sourcePrice === 'number' && cheapestOffer.price !== null ? Math.max(0, sourcePrice - cheapestOffer.price) : null

  const rankedOffers = offers.map(offer => ({
    ...offer,
    isCheapest: cheapestOffer.url ? offer.url === cheapestOffer.url : offer.retailer === cheapestOffer.retailer,
    savingsFromSource: typeof sourcePrice === 'number' && offer.price !== null ? Math.max(0, sourcePrice - offer.price) : null
  }))

  return { offers: rankedOffers, cheapestOffer, savings }
}

function marketFallbackMessage(scopeLabel: string) {
  return `Couldn't verify a public match yet in ${scopeLabel}. Try a direct model name, a cleaner product page, or widen the market scope.`
}

export async function buildComparison(
  input: string,
  sourceTitle?: string,
  scope: MarketScope = 'kuwait',
  preferredQueries: string[] = []
): Promise<ComparisonSummary> {
  const trimmed = input.trim()
  const query = extractSearchQuery(trimmed, sourceTitle)
  const variants = buildSearchVariants(trimmed, sourceTitle, preferredQueries)
  const pool = getRetailerPool(scope)
  const sourceUrl = (() => {
    try {
      return new URL(trimmed).toString()
    } catch {
      return undefined
    }
  })()

  const sourceData = sourceUrl ? await fetchProductPageData(sourceUrl) : {}
  const sourcePrice = sourceData.price ?? extractPriceFromText(trimmed)
  const sourceProductName = sourceData.title || sourceTitle || variants[0]?.query || query
  const discoveredMatches = await discoverRetailerMatches(query, sourceProductName, scope, preferredQueries)
  const discoveredByRetailer = new Map(
    (discoveredMatches || [])
      .filter(match => match.url)
      .map(match => [match.retailer.toLowerCase(), match.url as string])
  )

  const retailerOffers = await Promise.allSettled(
    pool.retailers.map(retailer =>
      lookupRetailerOffer(query, retailer, sourceProductName, preferredQueries, discoveredByRetailer.get(retailer.retailer.toLowerCase()))
    )
  )

  const offers = retailerOffers.map((result, index) => {
    if (result.status === 'fulfilled') return result.value
    const retailer = pool.retailers[index]
    return {
      retailer: retailer.retailer,
      price: null,
      currency: 'KD' as const,
      searchUrl: `https://www.bing.com/search?q=${encodeURIComponent(`site:${retailer.domain} ${query}`)}`,
      source: retailer.label,
      confidence: 'missing' as const,
      note: `Search ${retailer.label} for this product.`,
      availability: 'unknown' as const
    }
  })

  const withSourceOffer: ComparisonOffer[] = [
    ...(sourcePrice !== null
      ? [
          {
            retailer: 'Current link',
            price: sourcePrice,
            currency: 'KD' as const,
            url: sourceUrl,
            searchUrl: sourceUrl || `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
            source: sourceData.source || sourceProductName,
            confidence: 'live' as const,
            note: 'Price detected from the shared product page.',
            availability: sourceData.availability || 'unknown'
          }
        ]
      : []),
    ...offers
  ]

  const { offers: rankedOffers, cheapestOffer, savings } = applyComparisonRanking(withSourceOffer, sourcePrice)
  const liveCount = rankedOffers.filter(offer => offer.confidence === 'live' && typeof offer.price === 'number').length
  const estimatedCount = rankedOffers.filter(offer => offer.confidence === 'estimated' && typeof offer.price === 'number').length
  const trackingStatus: ComparisonSummary['trackingStatus'] = liveCount > 0 ? 'live' : estimatedCount > 0 ? 'estimated' : 'missing'

  const fallbackMessage =
    trackingStatus === 'missing'
      ? `${marketFallbackMessage(pool.label)} We tried ${variants.slice(0, 3).map(variant => variant.query).join(', ')}.`
      : sourcePrice === null
        ? `We found ${pool.label} store candidates, but the source page did not expose a clean price.`
        : undefined

  return {
    marketScope: pool.scope,
    marketLabel: pool.label,
    query,
    sourceProductName,
    sourcePrice,
    sourceUrl,
    trackingStatus,
    offers: rankedOffers,
    cheapestOffer,
    savings,
    fallbackMessage
  }
}

export function buildFallbackComparison(input: string, sourceTitle?: string, scope: MarketScope = 'kuwait'): ComparisonSummary {
  const query = extractSearchQuery(input, sourceTitle)
  const pool = getRetailerPool(scope)
  return {
    marketScope: pool.scope,
    marketLabel: pool.label,
    query,
    sourceProductName: sourceTitle || query,
    sourcePrice: null,
    sourceUrl: undefined,
    trackingStatus: 'missing',
    offers: buildFallbackOffers(query, scope),
    cheapestOffer: null,
    savings: null,
    fallbackMessage: marketFallbackMessage(pool.label)
  }
}
