import { NextResponse } from 'next/server'

interface PageEntry {
  path: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export async function GET() {
  // Force canonical URL for this deployment
  const SITE_URL = 'https://studione.vercel.app'

  const pages: PageEntry[] = [
    { path: '/', changefreq: 'weekly', priority: 1.0 },
    { path: '/place', changefreq: 'monthly', priority: 0.8 },
  ]

  const sitemapEntries = pages
    .map((page) => {
      const url = `${SITE_URL}${page.path}`
      return `  <url>
    <loc>${url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    })
    .join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
