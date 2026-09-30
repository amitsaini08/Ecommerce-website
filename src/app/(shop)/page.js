import { connectToDatabase, Product, Category } from '@/lib/db/models';
import CategoryQuickNav from '@/components/storefront/CategoryQuickNav';
import BannerCarousel from '@/components/storefront/BannerCarousel';
import TrustBadges from '@/components/storefront/TrustBadges';
import NewArrivals from '@/components/storefront/NewArrivals';
import BestSellers from '@/components/storefront/BestSellers';
import FlashSale from '@/components/storefront/FlashSale';

export const metadata = {
  title: "NovaHub — Official Online Store",
  description: 'Shop quality products delivered directly to your doorstep. Free shipping on eligible orders.',
};

async function getHomepageData() {
  try {
    await connectToDatabase();
    const [allCategories, newArrivals, bestSellers] = await Promise.all([
      Category.find().sort({ name: 1 }).limit(12).lean(),
      Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(12).lean(),
      Product.find({ isActive: true }).sort({ reviewCount: -1 }).limit(8).lean(),
    ]);

    return {
      categories: allCategories.map((c) => ({ ...c, id: c._id })),
      newArrivals: newArrivals.map((p) => {
        const { productLink, ...rest } = p;
        return { ...rest, id: p._id };
      }),
      bestSellers: bestSellers.map((p) => {
        const { productLink, ...rest } = p;
        return { ...rest, id: p._id };
      }),
    };
  } catch (error) {
    console.error('Homepage data fetch error:', error);
    return { categories: [], newArrivals: [], bestSellers: [] };
  }
}

export default async function HomePage() {
  const { categories: cats, newArrivals, bestSellers } = await getHomepageData();

  return (
    <>
      <CategoryQuickNav categories={cats} />
      <BannerCarousel />
      <NewArrivals products={newArrivals} />
      <BestSellers products={bestSellers} />
      <FlashSale />
      <div className="border-t border-warm-200 mt-8">
        <TrustBadges />
      </div>
    </>
  );
}
