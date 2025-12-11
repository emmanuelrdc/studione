import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin

  const robots = `User-agent: *\nDisallow:\n\nSitemap: ${origin}/sitemap.xml\n`

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
