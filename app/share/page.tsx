import ShareClient from './shareClient'

export const dynamic = 'force-dynamic'

export default async function SharePage({ searchParams }: { searchParams: Promise<{ title?: string; text?: string; url?: string }> }) {
  const params = await searchParams
  const shared = [params.title, params.text, params.url].filter(Boolean).join('\n')

  return <ShareClient shared={shared} />
}
