export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://novahub.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/checkout', '/orders/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
