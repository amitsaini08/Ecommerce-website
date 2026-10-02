import SectionHeader from '@/components/common/SectionHeader';
import ProductCard from '@/components/product/ProductCard';
import Section from '@/components/common/Section';
import ProductGrid from '@/components/product/ProductGrid';

export default function NewArrivals({ products = [] }) {
  if (!products?.length) return null;

  return (
    <Section>
      <SectionHeader
        title="New Arrivals"
        subtitle="Fresh additions to our curated collection. Discover the latest drops."
        viewAllHref="/products?sort=newest"
      />
      <ProductGrid className="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
        {products.map((product) => (
          <ProductCard key={product._id || product.id} product={product} />
        ))}
      </ProductGrid>
    </Section>
  );
}