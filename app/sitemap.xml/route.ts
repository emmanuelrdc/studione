import { NextResponse } from 'next/server'

interface PageEntry {
  path: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export async function GET(request: Request) {
  // Prefer a configured canonical site URL (set NEXT_PUBLIC_SITE_URL in Vercel env)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  const pages: PageEntry[] = [
    { path: '/', changefreq: 'weekly', priority: 1.0 },
    { path: '/place', changefreq: 'monthly', priority: 0.8 },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages
      .map((page) => {
        const url = `${origin.replace(/\/$/, '')}${page.path}`
        return `  <url>\n    <loc>${url}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`
      })
      .join('\n') +
    `\n</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
