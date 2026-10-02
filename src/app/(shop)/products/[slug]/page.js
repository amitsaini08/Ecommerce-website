'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Frown } from 'lucide-react';
import { getDiscountPercent } from '@/lib/utils';
import { useProductReviews } from '@/hooks/useProductReviews';
import Section from '@/components/common/Section';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/common/EmptyState';
import ContentSection from '@/components/common/ContentSection';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import ProductGallery from '@/components/product/ProductGallery';
import ProductBuyBox from '@/components/product/ProductBuyBox';
import ReviewsSection from '@/components/product/ReviewsSection';

import { productsApi } from '@/lib/apiClient/products';

export default function ProductDetailPage() {
  const { slug } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const reviewState = useProductReviews(slug, product?._id);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setLoading(true);
      try {
        const data = await productsApi.getBySlug(slug, { signal: controller.signal });
        setProduct(data?.product || null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setProduct(null);
      }
      setLoading(false);
    }

    loadProduct();
    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <Section>
        <div className="space-y-6">
          <div className="h-4 w-48 animate-pulse rounded-lg bg-warm-100" />
          <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
            <div className="aspect-square animate-pulse rounded-xl bg-warm-100 lg:col-span-2" />
            <div className="space-y-4 lg:col-span-3">
              <div className="h-8 w-3/4 animate-pulse rounded-lg bg-warm-100" />
              <div className="h-5 w-1/3 animate-pulse rounded-lg bg-warm-100" />
              <div className="h-10 w-1/2 animate-pulse rounded-lg bg-warm-100" />
              <div className="h-20 animate-pulse rounded-lg bg-warm-100" />
            </div>
          </div>
        </div>
      </Section>
    );
  }

  if (!product) {
    return (
      <Section>
        <EmptyState
          icon={Frown}
          title="Product not found"
          description="This product may have been removed or is unavailable."
          action={
            <Button href="/products" variant="dark">
              Browse all products
            </Button>
          }
        />
      </Section>
    );
  }

  const images = product.images || [];
  const specifications = Array.isArray(product.specifications) ? product.specifications : [];

  const breadcrumbItems = [
    { label: 'Products', href: '/products' },
    ...(product.categoryName
      ? [{ label: product.categoryName, href: `/categories/${product.categorySlug}` }]
      : []),
    { label: product.name },
  ];

  return (
    <Section>
      <div className="space-y-10">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
          <div className="lg:col-span-2">
            <ProductGallery
              key={product._id}
              images={images}
              name={product.name}
              discountPercent={getDiscountPercent(product)}
            />
          </div>
          <div className="lg:col-span-3">
            <ProductBuyBox key={product._id} product={product} rating={reviewState.summary} />
          </div>
        </div>

        <ContentSection id="description" title="About this product">
          <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-warm-700">
            {product.description || 'No detailed description available for this item.'}
          </p>
        </ContentSection>

        {specifications.length > 0 && (
          <ContentSection id="specifications" title="Specifications">
            <dl className="max-w-3xl divide-y divide-warm-100 overflow-hidden rounded-xl border border-warm-200 bg-white">
              {specifications.map((spec, i) => (
                <div key={i} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm even:bg-warm-50/50">
                  <dt className="font-medium text-warm-900">{spec.label}</dt>
                  <dd className="col-span-2 text-warm-700">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </ContentSection>
        )}

        <ReviewsSection {...reviewState} />
      </div>
    </Section>
  );
}