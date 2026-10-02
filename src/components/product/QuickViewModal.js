'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import {
  addToWishlist,
  removeFromWishlist,
  selectIsWishlisted,
} from '@/lib/store/wishlistSlice';
import { selectUser } from '@/lib/store/authSlice';
import { useToast } from '@/components/common/Toast';
import StarRating from '@/components/ui/StarRating';
import QuantityStepper from '@/components/ui/QuantityStepper';
import Button from '@/components/ui/Button';
import { formatCurrency, getEffectivePrice, getDiscountPercent } from '@/lib/utils';
import { X, ShoppingBag, Heart, Package, ArrowRight } from 'lucide-react';
import { wishlistApi } from '@/lib/apiClient/wishlist';
import useAddToCart from '@/hooks/useAddToCart';

export default function QuickViewModal({ product, isOpen, onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);
  const { addProductToCart } = useAddToCart();

  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const productId = product?._id || product?.id;
  const isWishlisted = useSelector((state) =>
    productId ? selectIsWishlisted(productId)(state) : false
  );

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedImgIndex(0);
      setQuantity(1);
    });
  }, [product]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const {
    name,
    slug,
    price,
    images = [],
    description,
    ratingAvg,
    reviewCount,
    stock = 10,
    isOutOfStock,
  } = product;

  const outOfStock = Boolean(isOutOfStock) || stock <= 0;
  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = effectivePrice < Number(price);
  const discount = getDiscountPercent(product);
  const mainImage = images[selectedImgIndex] || images[0] || '';

  const handleAddToCart = () => {
    if (outOfStock) return;
    // useAddToCart ka return value False ho to modal khula rehta hai (stock limit etc.)
    const result = addProductToCart(product, quantity);
    if (result !== false) onClose();
  };

  const handleToggleWishlist = async () => {
    if (isWishlisted) {
      dispatch(removeFromWishlist(productId));
      toast.info('Removed from wishlist');
      if (user) {
        try {
          await wishlistApi.remove(productId);
        } catch {}
      }
    } else {
      dispatch(addToWishlist(product));
      toast.success('Added to wishlist!');
      if (user) {
        try {
          await wishlistApi.add(productId);
        } catch {}
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-3xl bg-white rounded-md shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-warm-400 hover:text-warm-900 rounded-full hover:bg-warm-100 transition-colors z-20"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
            <div className="space-y-3">
              <div className="relative aspect-square rounded-md bg-warm-50 border border-warm-200 overflow-hidden">
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-warm-300">
                    <Package className="w-16 h-16" />
                  </div>
                )}

                {discount > 0 && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-full">
                    -{discount}% OFF
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImgIndex(idx)}
                      aria-label={`View image ${idx + 1}`}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImgIndex === idx
                          ? 'border-warm-900 ring-2 ring-warm-900/20'
                          : 'border-warm-200 hover:border-warm-400'
                      }`}
                    >
                      <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-md font-bold text-warm-900 tracking-tight mb-2">{name}</h2>

                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={Number(ratingAvg)} count={reviewCount} />
                  <span className="text-[11px] text-warm-400">|</span>
                  {outOfStock ? (
                    <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60">
                      Out of stock
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      In Stock ({stock})
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-[15px] font-extrabold text-warm-900">
                    {formatCurrency(effectivePrice)}
                  </span>
                  {hasDiscount && (
                    <span className="text-[15px] text-warm-400 line-through">
                      {formatCurrency(price)}
                    </span>
                  )}
                </div>

                <p className="text-[12px] text-warm-600 leading-relaxed line-clamp-3 mb-6">
                  {description || 'High quality curated product designed for premium everyday use.'}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-warm-100">
                {!outOfStock && (
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold text-warm-700 uppercase tracking-wider">
                      Quantity:
                    </span>
                    <QuantityStepper
                      size="sm"
                      value={quantity}
                      max={stock}
                      onChange={setQuantity}
                      onLimit={() => toast.warning(`Only ${stock} available in stock.`)}
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    variant="dark"
                    className="flex-1"
                    onClick={handleAddToCart}
                    disabled={outOfStock}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {outOfStock
                      ? 'Out of stock'
                      : `Add to cart (${formatCurrency(effectivePrice * quantity)})`}
                  </Button>

                  <button
                    onClick={handleToggleWishlist}
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-pressed={isWishlisted}
                    className={`h-10 w-10 flex items-center justify-center border rounded-md transition-all ${
                      isWishlisted
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-warm-200 text-warm-700 hover:bg-warm-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <Link
                    href={`/products/${slug}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    View Full Details <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}