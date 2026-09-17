import type { MetadataRoute } from 'next'
import { APP_URL } from '@/lib/appUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/woningen',
        '/object/',
        '/marktanalyse',
        '/kantoor',
        '/account',
        '/admin',
        '/api/',
        '/auth/',
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
