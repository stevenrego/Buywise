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

const PRICE_PATTERN = /(?:KD|KWD|Ø¯\.Ùƒ\.?)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,3})?)|([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,3})?)\s*(?:KD|KWD|Ø¯\.Ùƒ\.?)/i

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
  const cleaned = raw
    .replace(/[^\d.,-]/g, '')
    .replace(/,/g, '')
    .trim()
  if (!cleaned) return null
  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? value : null
}

function extractPriceFromText(text: string) {
  const prices = Array.from(text.matchAll(new RegExp(PRICE_PATTERN, 'gi')))
    .map(match => parseKuwaitPrice(match[1] || match[2]))
    .filter((value): value is number => typeof value === 'number' && value > 0)

  if (prices.length === 0) return null
  return Math.min(...prices)
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

function normalizeSearchFragment(value: string) {
  const cleaned = cleanSearchText(value)
  if (!cleaned) return ''

  let normalized = cleaned.replace(/\s+/g, ' ').trim()
  const lowered = normalized.toLowerCase()

  for (const rule of PRODUCT_ALIAS_RULES) {
    if (rule.pattern.test(lowered)) {
      normalized = rule.replacement
      break
    }
  }

  return normalized
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

  for (const preferred of preferredQueries) {
    add(preferred, 'ai plan')
  }

  const productHints: Array<{ pattern: RegExp; variants: string[] }> = [
    {
      pattern: /\bps\s*5\b|\bplaystation\s*5\b/i,
      variants: [
        'Sony PlayStation 5 console',
        'PlayStation 5 console',
        'PS5 console',
        'PlayStation 5',
        'Sony PS5'
      ]
    },
    {
      pattern: /\bxbox\s*series\s*x\b/i,
      variants: ['Microsoft Xbox Series X console', 'Xbox Series X console', 'Xbox Series X']
    },
    {
      pattern: /\bxbox\s*series\s*s\b/i,
      variants: ['Microsoft Xbox Series S console', 'Xbox Series S console', 'Xbox Series S']
    },
    {
      pattern: /\biphone\s*16\s*pro\s*max\b/i,
      variants: ['Apple iPhone 16 Pro Max', 'iPhone 16 Pro Max', 'iPhone 16 Pro Max phone']
    },
    {
      pattern: /\biphone\s*16\s*pro\b/i,
      variants: ['Apple iPhone 16 Pro', 'iPhone 16 Pro', 'iPhone 16 Pro phone']
    },
    {
      pattern: /\biphone\s*16\b/i,
      variants: ['Apple iPhone 16', 'iPhone 16', 'iPhone 16 phone']
    },
    {
      pattern: /\biphone\s*15\s*pro\s*max\b/i,
      variants: ['Apple iPhone 15 Pro Max', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max phone']
    },
    {
      pattern: /\biphone\s*15\s*pro\b/i,
      variants: ['Apple iPhone 15 Pro', 'iPhone 15 Pro', 'iPhone 15 Pro phone']
    },
    {
      pattern: /\biphone\s*15\b/i,
      variants: ['Apple iPhone 15', 'iPhone 15', 'iPhone 15 phone']
    },
    {
      pattern: /\bairpods\s*pro\s*2\b/i,
      variants: ['Apple AirPods Pro 2', 'AirPods Pro 2', 'AirPods Pro 2nd generation']
    },
    {
      pattern: /\bairpods\s*pro\b/i,
      variants: ['Apple AirPods Pro', 'AirPods Pro']
    },
    {
      pattern: /\bsamsung\s*galaxy\s*s\s*24\s*ultra\b/i,
      variants: ['Samsung Galaxy S24 Ultra', 'Galaxy S24 Ultra', 'Samsung S24 Ultra']
    },
    {
      pattern: /\bsamsung\s*galaxy\s*s\s*24\b/i,
      variants: ['Samsung Galaxy S24', 'Galaxy S24', 'Samsung S24']
    },
    {
      pattern: /\bmacbook\s*air\s*m3\b/i,
      variants: ['Apple MacBook Air M3', 'MacBook Air M3', 'MacBook Air M3 laptop']
    },
    {
      pattern: /\bmacbook\s*pro\s*m3\b/i,
      variants: ['Apple MacBook Pro M3', 'MacBook Pro M3', 'MacBook Pro M3 laptop']
    }
  ]

  for (const hint of productHints) {
    if (hint.pattern.test(normalizedBase) || hint.pattern.test(normalizedTitle)) {
      for (const variant of hint.variants) add(variant, 'product hint')
    }
  }

  if (/\bconsole\b/i.test(normalizedBase) || /\bconsole\b/i.test(normalizedTitle)) {
    add(`${normalizedBase} gaming console`, 'console expansion')
  }

  if (variants.length === 0) {
    add(normalizedBase || normalizedTitle || baseQuery, 'fallback')
  }

  return variants.slice(0, 6)
}

function buildSearchTerms(retailer: RetailerSource, query: string, searchPlanQueries: string[] = []) {
  const terms = new Set<string>()
  const variants = [query, ...searchPlanQueries].filter(Boolean)

  for (const variant of variants) {
    const trimmed = normalizeSearchFragment(variant)
    if (!trimmed) continue
    terms.add(`site:${retailer.domain} ${trimmed}`)
    terms.add(`${retailer.label} ${trimmed}`)
    terms.add(`${trimmed} ${retailer.label}`)
    terms.add(`${trimmed} Kuwait ${retailer.label}`)
    terms.add(`${trimmed} price Kuwait ${retailer.label}`)
  }

  return Array.from(terms).slice(0, 10)
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

function extractSearchQuery(input: string, sourceTitle?: string) {
  const trimmed = input.trim()
  if (!trimmed) return sourceTitle?.trim() || 'product'

  try {
    const url = new URL(trimmed)
    const parts = [sourceTitle, url.pathname, url.searchParams.get('q'), url.searchParams.get('query')]
      .filter(Boolean)
      .map(part => cleanSearchText(String(part)))
      .filter(Boolean)
    if (parts.length > 0) return parts.join(' ').replace(/\s+/g, ' ').trim()
  } catch {
    // Not a URL, fall through.
  }

  const cleanedInput = normalizeSearchFragment(trimmed)
  const cleanedTitle = normalizeSearchFragment(sourceTitle || '')
  const chosen = cleanedInput.length >= cleanedTitle.length ? cleanedInput : cleanedTitle

  return chosen || cleanedTitle || cleanedInput || sourceTitle?.trim() || 'product'
}

function searchUrlFor(retailer: RetailerSource, query: string) {
  return `https://www.bing.com/search?q=${encodeURIComponent(`site:${retailer.domain} ${query}`)}`
}

async function fetchTextWithTimeout(url: string, timeoutMs = 7000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })
    return response
  } finally {
    clearTimeout(timer)
  }
}

function extractMetaContent(html: string, key: string, attr = 'property') {
  const pattern = new RegExp(`<meta[^>]+${attr}=["']${escapeRegExp(key)}["'][^>]+content=["']([^"']+)["']`, 'i')
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

async function fetchDuckDuckGoResults(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetchTextWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 6000)
    if (!response.ok) return []

    const html = await response.text()
    const results: SearchResult[] = []
    const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/gi

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
        if (redirectTarget) {
          url = decodeURIComponent(redirectTarget)
        }
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

function buildOfferNote(title: string, source: string, price: number | null) {
  if (price !== null) return `Found a live or near-live price from ${source}.`
  if (title) return `Matched the product on ${source}, but the page did not expose a price cleanly.`
  return `Could not track a clear price on ${source} yet.`
}

async function lookupRetailerOffer(query: string, retailer: RetailerSource, sourceTitle?: string, searchPlanQueries: string[] = []): Promise<ComparisonOffer> {
  const variants = buildSearchVariants(query, sourceTitle, searchPlanQueries)
  const primaryQuery = variants[0]?.query || query
  const searchUrl = searchUrlFor(retailer, primaryQuery)
  const candidateResults: Array<{ result: SearchResult; query: string; score: number }> = []

  for (const variant of variants) {
    for (const searchTerm of buildSearchTerms(retailer, variant.query, searchPlanQueries)) {
      const searchResults = await fetchDuckDuckGoResults(searchTerm)
      for (const result of searchResults) {
        if (!hostFromUrl(result.url).includes(retailer.domain)) continue
        candidateResults.push({
          result,
          query: searchTerm,
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
    searchUrl: searchUrlFor(retailer, query),
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
    savingsFromSource:
      typeof sourcePrice === 'number' && offer.price !== null ? Math.max(0, sourcePrice - offer.price) : null
  }))

  return { offers: rankedOffers, cheapestOffer, savings }
}

function marketFallbackMessage(scopeLabel: string) {
  return `Couldn't track this one down yet in ${scopeLabel}. Try a cleaner product page or a direct model name.`
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
      const parsed = new URL(trimmed)
      return parsed.toString()
    } catch {
      return undefined
    }
  })()

  const sourceData = sourceUrl ? await fetchProductPageData(sourceUrl) : {}
  const sourcePrice = sourceData.price ?? extractPriceFromText(trimmed)
  const sourceProductName = sourceData.title || sourceTitle || variants[0]?.query || query

  const retailerOffers = await Promise.allSettled(
    pool.retailers.map(retailer => lookupRetailerOffer(query, retailer, sourceProductName, preferredQueries))
  )
  const offers = retailerOffers.map((result, index) => {
    if (result.status === 'fulfilled') return result.value
    const retailer = pool.retailers[index]
    return {
      retailer: retailer.retailer,
      price: null,
      currency: 'KD' as const,
      searchUrl: searchUrlFor(retailer, query),
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
            searchUrl: sourceUrl || searchUrlFor(pool.retailers[0], query),
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

  const trackingStatus: ComparisonSummary['trackingStatus'] =
    liveCount > 0 ? 'live' : estimatedCount > 0 ? 'estimated' : 'missing'

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
