import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studioone-hazel.vercel.app'

export async function GET() {
  const robots = `User-agent: *
Disallow:

Sitemap: ${SITE_URL}/sitemap.xml
Host: ${SITE_URL}
`

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
