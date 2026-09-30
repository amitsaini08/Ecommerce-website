import { connectToDatabase, Product, Category } from '@/lib/db/models';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://novahub.com';

  const staticRoutes = [
    '',
    '/products',
    '/categories',
    '/login',
    '/signup',
    '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  try {
    await connectToDatabase();

    const dbProducts = await Product.find({ isActive: true }).select('slug createdAt').lean();

    const productRoutes = dbProducts.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.createdAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const dbCategories = await Category.find().select('slug createdAt').lean();

    const categoryRoutes = dbCategories.map((c) => ({
      url: `${baseUrl}/categories/${c.slug}`,
      lastModified: c.createdAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...productRoutes, ...categoryRoutes];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticRoutes;
  }
}
