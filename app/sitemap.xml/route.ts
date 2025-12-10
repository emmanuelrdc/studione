import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studioone-hazel.vercel.app'

interface PageEntry {
  path: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export async function GET() {
  const pages: PageEntry[] = [
    { path: '/', changefreq: 'weekly', priority: 1.0 },
    { path: '/place', changefreq: 'monthly', priority: 0.8 },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${pages
      .map((page) => {
        const url = `${SITE_URL}${page.path}`
        return `<url><loc>${url}</loc><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`
      })
      .join('\n')}
  </urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
