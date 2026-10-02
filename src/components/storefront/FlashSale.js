import { Tag, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import Section from '@/components/ui/Section';
import PromoCard from '@/components/ui/PromoCard';

export default function FlashSale({ hasDiscounts = true }) {
  return (
    <Section padding="sm">
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {hasDiscounts && (
          <PromoCard
            tone="brand"
            icon={Tag}
            badge="Special Offers"
            title="Discounted Deals"
            description="Save on selected items in stock. Limited availability while inventory lasts."
            ctaLabel="Shop Discounted Items"
            ctaHref="/products?sort=discount"
          />
        )}

        <PromoCard
          tone="dark"
          icon={Sparkles}
          badge="Latest Arrivals"
          title={`Fresh Styles ${new Date().getFullYear()}`}
          description="Explore the latest additions to our store catalog."
          ctaLabel="Explore New Products"
          ctaHref="/products?sort=newest"
          className={cn(!hasDiscounts && 'md:col-span-2')}
        />
      </div>
    </Section>
  );
}