import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  const robots = `User-agent: *\nDisallow:\n\nSitemap: ${origin.replace(/\/$/, '')}/sitemap.xml\n`

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
