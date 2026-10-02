import SectionHeader from '@/components/common/SectionHeader';
import ProductCard from '@/components/product/ProductCard';
import Section from '@/components/common/Section';
import ProductGrid from '@/components/product/ProductGrid';

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