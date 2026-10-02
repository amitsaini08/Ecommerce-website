'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle, XCircle, ShoppingCart, Heart, Truck } from 'lucide-react';
import { addToWishlist, removeFromWishlist, selectIsWishlisted } from '@/lib/store/wishlistSlice';
import { selectUser } from '@/lib/store/authSlice';
import { formatCurrency, getEffectivePrice } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import QuantityStepper from '@/components/ui/QuantityStepper';
import useAddToCart from '@/hooks/useAddToCart';

export default function ProductBuyBox({ product, rating }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);
  const isWishlisted = useSelector((state) => selectIsWishlisted(product._id)(state));
  const { addProductToCart } = useAddToCart();

  const [quantity, setQuantity] = useState(1);

  const price = Number(product.price);
  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = effectivePrice < price;
  const inStock = product.stock > 0;

  const handleAddToCart = () => addProductToCart(product, quantity);

  async function toggleWishlist() {
    if (isWishlisted) {
      dispatch(removeFromWishlist(product._id));
      toast.info(`Removed ${product.name} from wishlist`);
      if (user) {
        try {
          await fetch(`/api/wishlist/${product._id}`, { method: 'DELETE' });
        } catch { }
      }
      return;
    }

    dispatch(addToWishlist(product));
    toast.success(`Added ${product.name} to wishlist!`);
    if (user) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product._id }),
        });
      } catch { }
    }
  }

  const wishlistLabel = isWishlisted ? 'Remove from wishlist' : 'Save to wishlist';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {product.categoryName && (
          <Link
            href={`/categories/${product.categorySlug}`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {product.categoryName}
          </Link>
        )}

        <h1 className="text-2xl font-bold leading-tight tracking-tight text-warm-900 sm:text-3xl">
          {product.name}
        </h1>

        <a href="#reviews" className="group inline-flex items-center gap-2">
          <StarRating rating={rating.avg} count={rating.count} size="sm" />
          <span className="text-sm text-warm-600 group-hover:text-brand-600 group-hover:underline">
            {rating.count} review{rating.count !== 1 ? 's' : ''}
          </span>
        </a>
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-extrabold text-warm-900">{formatCurrency(effectivePrice)}</span>
        {hasDiscount && (
          <>
            <span className="text-lg text-warm-400 line-through">{formatCurrency(price)}</span>
            <Badge tone="success">Save {formatCurrency(price - effectivePrice)}</Badge>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {inStock ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <CheckCircle className="h-4 w-4" /> In stock ({product.stock} available)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
            <XCircle className="h-4 w-4" /> Out of stock
          </span>
        )}
        {product.codAvailable !== false && (
          <span className="inline-flex items-center gap-1.5 text-warm-600">
            <Truck className="h-4 w-4" /> Cash on delivery available
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {inStock && (
          <>
            <QuantityStepper
              value={quantity}
              max={product.stock}
              onChange={setQuantity}
              onLimit={() => toast.warning(`Only ${product.stock} available in stock.`)}
            />
            <Button variant="dark" onClick={handleAddToCart} className="min-w-40 flex-1">
              <ShoppingCart className="h-4 w-4" />
              Add to cart
            </Button>
          </>
        )}

        <Button
          variant="outline"
          onClick={toggleWishlist}
          aria-label={wishlistLabel}
          title={wishlistLabel}
          className={cn(
            'w-10 px-0',
            isWishlisted
              ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-50'
              : 'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600'
          )}
        >
          <Heart className={cn('h-5 w-5', isWishlisted && 'fill-rose-600')} />
        </Button>
      </div>
    </div>
  );
}