import SectionHeader from '@/components/ui/SectionHeader';
import ProductCard from '@/components/ui/ProductCard';
import Section from '@/components/ui/Section';
import ProductGrid from '@/components/ui/ProductGrid';

export default function BestSellers({ products = [] }) {
  if (!products?.length) return null;

  return (
    <Section background="warm">
      <SectionHeader
        title="Best Sellers"
        subtitle="Customer favorites. Most loved items based on verified reviews and purchases."
        viewAllHref="/products?sort=best-sellers"
      />
      <ProductGrid variant="wide">
        {products.map((product) => (
          <ProductCard key={product._id || product.id} product={product} variant="bestseller" />
        ))}
      </ProductGrid>
    </Section>
  );
}