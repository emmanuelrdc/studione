import { NextResponse } from 'next/server'

export async function GET() {
  const SITE_URL = 'https://studione.vercel.app'

  const robots = `User-agent: *
Disallow:

Sitemap: ${SITE_URL}/sitemap.xml
`

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
