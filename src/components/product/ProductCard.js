'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, ShoppingBag, Eye, Package } from 'lucide-react';
import { addToWishlist, removeFromWishlist, selectIsWishlisted } from '@/lib/store/wishlistSlice';
import { selectUser } from '@/lib/store/authSlice';
import { formatCurrency, getEffectivePrice, getDiscountPercent } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/common/Toast';
import StarRating from '@/components/ui/StarRating';
import QuickViewModal from '@/components/product/QuickViewModal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import IconButton from '@/components/ui/IconButton';
import useAddToCart from '@/hooks/useAddToCart';
import { wishlistApi } from '@/lib/apiClient/wishlist';

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export default function ProductCard({ product, variant = 'default' }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);
  const { addProductToCart } = useAddToCart();
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const {
    _id, id, name, slug, price, discountPrice, images, description,
    ratingAvg, reviewCount, createdAt, stock,
  } = product || {};

  const productId = _id || id;
  const isWishlisted = useSelector(selectIsWishlisted(productId));

  const isRow = variant === 'bestseller';
  const mainImage = images?.[0] || '';
  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = effectivePrice < Number(price);
  const discountPercent = getDiscountPercent(product);
  const createdTime = createdAt ? new Date(createdAt).getTime() : 0;
  const isNew = createdTime > 0 && typeof window !== 'undefined' && (new Date().getTime() - createdTime < NEW_WINDOW_MS);
  const outOfStock = typeof stock === 'number' && stock <= 0;

  const handleAddToCart = () => addProductToCart(product, 1);

  const handleToggleWishlist = async () => {
    if (isWishlisted) {
      dispatch(removeFromWishlist(productId));
      toast.info(`Removed ${name} from wishlist`);
      if (user) {
        try {
          await wishlistApi.remove(productId);
        } catch { }
      }
      return;
    }

    dispatch(addToWishlist(product));
    toast.success(`Added ${name} to wishlist!`);
    if (user) {
      try {
        await wishlistApi.add(productId);
      } catch { }
    }
  };

  return (
    <>
      <article
        className={cn(
          'group overflow-hidden rounded-xl border border-warm-200 bg-white transition-shadow hover:border-warm-300 hover:shadow-sm',
          isRow ? 'flex' : 'flex h-full flex-col'
        )}
      >
        {/* Image */}
        <div
          className={cn(
            'relative shrink-0 overflow-hidden bg-warm-50',
            isRow ? 'w-36 sm:w-40' : 'aspect-square'
          )}
        >
          <Link href={`/products/${slug}`} aria-label={name} className="relative block h-full w-full">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={name}
                fill
                sizes={isRow ? '160px' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-warm-100 text-warm-300">
                <Package className="h-8 w-8" />
              </div>
            )}
          </Link>

          <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
            {isRow ? (
              <Badge tone="danger" className="bg-warm-900">Bestseller</Badge>
            ) : (
              isNew && <Badge tone="danger" className="bg-warm-900">New</Badge>
            )}
            {discountPercent > 0 && <Badge tone="danger">-{discountPercent}%</Badge>}
          </div>

          <div className="absolute right-2 top-2 flex flex-col gap-1.5">
            <IconButton
              label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isWishlisted}
              onClick={handleToggleWishlist}
              className={cn(
                'h-8 w-8 shadow-xs backdrop-blur-xs',
                isWishlisted
                  ? 'bg-rose-500 text-white hover:bg-rose-600 hover:text-white'
                  : 'bg-white/90 hover:bg-white hover:text-rose-600'
              )}
            >
              <Heart className={cn('h-4 w-4', isWishlisted && 'fill-white')} />
            </IconButton>

            {/* Quick view sirf desktop par, hover se */}
            <IconButton
              label="Quick view"
              onClick={() => setQuickViewOpen(true)}
              className="hidden h-8 w-8 bg-white/90 shadow-xs backdrop-blur-xs transition-all focus-visible:opacity-100 md:inline-flex md:opacity-0 md:group-hover:opacity-100"
            >
              <Eye className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
          <Link href={`/products/${slug}`} className="flex-1 space-y-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-warm-900 transition-colors group-hover:text-brand-600">
              {name}
            </h3>

            {isRow && description && (
              <p className="line-clamp-2 text-xs text-warm-500">{description}</p>
            )}

            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-bold text-warm-900">{formatCurrency(effectivePrice)}</span>
              {hasDiscount && (
                <span className="text-xs text-warm-400 line-through">{formatCurrency(price)}</span>
              )}
            </div>

            <StarRating rating={Number(ratingAvg)} count={reviewCount} size="xs" />
          </Link>

          <Button
            variant="dark"
            size="sm"
            className="w-full"
            onClick={handleAddToCart}
            disabled={outOfStock}
          >
            <ShoppingBag className="h-4 w-4" />
            {outOfStock ? 'Out of stock' : 'Add to cart'}
          </Button>
        </div>
      </article>

      <QuickViewModal
        product={product}
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}