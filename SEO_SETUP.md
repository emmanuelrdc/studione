# SEO & Deployment Setup for Studio One

## Quick Setup (Finish in Vercel)

### 1. Set Environment Variable in Vercel

1. Go to: https://vercel.com/dashboard
2. Click your project: **studione**
3. Go to: **Settings** → **Environment Variables**
4. Add new variable:
   - **Key**: `NEXT_PUBLIC_SITE_URL`
   - **Value**: `https://studione.vercel.app`
   - **Environments**: Select `Production`
5. Click **Save**

### 2. Trigger Redeploy

1. Go to **Deployments** tab
2. Click the **three dots (⋮)** on the latest deployment
3. Click **Redeploy**
4. Wait for build to complete (green checkmark)

### 3. Verify Everything Works

Run these commands to check sitemap and robots are correct:

```powershell
# Check sitemap headers
curl -I https://studione.vercel.app/sitemap.xml

# Check sitemap content (should show studione.vercel.app URLs)
curl https://studione.vercel.app/sitemap.xml

# Check robots headers
curl -I https://studione.vercel.app/robots.txt

# Check robots content (should point to studione.vercel.app)
curl https://studione.vercel.app/robots.txt
```

Expected output:
- Sitemap: All `<loc>` tags should start with `https://studione.vercel.app/`
- Robots: `Sitemap:` line should be `https://studione.vercel.app/sitemap.xml`

### 4. Update Google Search Console

1. Go to: https://search.google.com/search-console
2. Select property: **studione.vercel.app**
3. Go to **Sitemaps** (left sidebar)
4. Delete any old/broken sitemaps
5. Click **Add/test sitemap**
6. Enter: `https://studione.vercel.app/sitemap.xml`
7. Click **Submit**
8. Check status — should be **Success** (green checkmark)

### 5. Monitor Indexing (Optional)

Once sitemap is accepted:
- Go to **Coverage** tab → see which pages are indexed
- Go to **Enhancements** → check for Rich Results issues
- Use **URL Inspection** to manually request indexing of `/` and `/place`

---

## What Was Implemented

✅ **Metadata & SEO**
- Page-specific metadata (home, place) with unique titles/descriptions
- Open Graph and Twitter card support
- JSON-LD structured data (BeautySalon with hours, geo, phone)
- Robots.txt with sitemap reference
- Dynamic sitemap.xml with priority hierarchy

✅ **Search Console Integration**
- Google verification file added: `public/google560dfdcea0d33f7e.html`
- Sitemap and robots configured to use canonical domain via `NEXT_PUBLIC_SITE_URL`

✅ **Files Modified**
- `app/layout.tsx` — root metadata + JSON-LD
- `app/page.tsx` — home page metadata
- `app/place/page.tsx` — location/contact page with metadata
- `app/sitemap.xml/route.ts` — dynamic XML sitemap
- `app/robots.txt/route.ts` — robots with sitemap reference
- `lib/seo-metadata.ts` — reusable metadata helpers
- `.env.example` — environment configuration template

---

## Troubleshooting

**If sitemap still shows wrong domain:**
- Verify `NEXT_PUBLIC_SITE_URL=https://studione.vercel.app` is set in Vercel (Settings → Environment Variables)
- Confirm redeploy completed (green checkmark in Deployments)
- Clear browser cache: `Ctrl+Shift+Del` → Clear all

**If Search Console still says "couldn't fetch":**
- Check HTTP status: `curl -I https://studione.vercel.app/sitemap.xml` should show `200`
- Check robots.txt: `curl https://studione.vercel.app/robots.txt` should reference correct sitemap URL
- Wait 5-10 minutes after redeploy (caching)
- Manually request indexing in Search Console → URL Inspection

**If you see "studioone-hazel.vercel.app" in sitemap:**
- Environment variable not set or not deployed yet
- Redeploy from Vercel (don't just push to git)

---

## Next Steps (Optional Enhancements)

After sitemap is indexed, consider:
- Add Services and Gallery pages with metadata
- Generate dynamic Open Graph images per page
- Add hreflang tags if supporting multiple languages
- Set up Google Analytics for traffic monitoring
- Configure Lighthouse CI for continuous performance monitoring

Questions? Check Google Search Console error messages or run the curl commands above to diagnose.
