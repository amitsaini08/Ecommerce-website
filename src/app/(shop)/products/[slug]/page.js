'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '@/lib/store/cartSlice';
import { addToWishlist, removeFromWishlist, selectIsWishlisted } from '@/lib/store/wishlistSlice';
import { selectUser } from '@/lib/store/authSlice';
import { useToast } from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ImageUpload from '@/components/ui/ImageUpload';
import { formatCurrency } from '@/lib/utils';
import {
  Frown, Package, CheckCircle, XCircle, ShoppingCart, Heart, Minus, Plus,
  Star, User, Film, X, ImagePlus, Truck, Pencil
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { validateReview, REVIEW_RULES } from "@/lib/reviewRules"

const isVideoUrl = (url) =>
  !!url && (/\.(mp4|webm|mov|avi|mkv)($|\?)/i.test(url) || url.includes('/video/upload/'));



const PAGE_SIZE = 5;

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const EMPTY_FORM = { rating: 4, comment: '', mediaUrls: [] };

function Section({ id, title, aside, children }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-warm-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-warm-900 tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);

  const [product, setProduct] = useState(null);
  const isWishlisted = useSelector((state) =>
    product?._id ? selectIsWishlisted(product._id)(state) : false
  );
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [modalMedia, setModalMedia] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewPagination, setReviewPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);


  const [formErrors, setFormErrors] = useState({});


  const [summary, setSummary] = useState({ avg: 0, count: 0, distribution: {} });
  const [originalMedia, setOriginalMedia] = useState([]);

  const currentUserId = user?._id;

  useEffect(() => { fetchProduct(); }, [slug]);
  useEffect(() => { fetchReviews(); }, [slug, currentUserId]);

  async function fetchProduct() {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${slug}`);
      const data = await res.json();
      if (res.ok) setProduct(data.product);
    } catch { }
    setLoading(false);
  }

  async function fetchReviews(pageNum = 1) {
    if (pageNum === 1) setReviewsLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/products/${slug}/reviews?page=${pageNum}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      if (!res.ok) throw new Error();

      if (pageNum === 1) {
        setMyReviews(data.myReviews || []);
        setReviews(data.reviews || []);
      } else {
        setReviews((prev) => {
          const seen = new Set(prev.map((r) => r._id));
          return [...prev, ...(data.reviews || []).filter((r) => !seen.has(r._id))];
        });
      }
      setSummary(data.summary || { avg: 0, count: 0, distribution: {} });
      setReviewPagination(data.pagination || { page: pageNum, totalPages: 1, total: 0 });
    } catch { }

    setReviewsLoading(false);
    setLoadingMore(false);
  }

  function closeForm() {
    setShowForm(false);
    setShowUpload(false);
    setEditingId(null);
    setOriginalMedia([]);
    setReviewForm(EMPTY_FORM);
    setFormErrors({});
  }

  useEffect(() => {
    if (!product?._id) return;
    const socket = getSocket();

    const join = () => socket.emit('join-product', product._id);
    join();
    socket.on('connect', join);

    const addFirst = (prev, review) =>
      prev.some((r) => r._id === review._id) ? prev : [review, ...prev];

    const onCreated = ({ review, summary }) => {
      if (isMine(review)) setMyReviews((p) => addFirst(p, review));
      else setReviews((p) => addFirst(p, review));
      setSummary(summary);
    };
    const onUpdated = ({ review, summary }) => {
      const swap = (p) => p.map((r) => (r._id === review._id ? review : r));
      if (isMine(review)) setMyReviews(swap); else setReviews(swap);
      setSummary(summary);
    };
    const onDeleted = ({ reviewId, summary }) => {
      setMyReviews((p) => p.filter((r) => r._id !== reviewId));
      setReviews((p) => p.filter((r) => r._id !== reviewId));
      setSummary(summary);
    };

    socket.on('review:created', onCreated);
    socket.on('review:updated', onUpdated);
    socket.on('review:deleted', onDeleted);

    return () => {
      socket.off('connect', join);
      socket.off('review:created', onCreated);
      socket.off('review:updated', onUpdated);
      socket.off('review:deleted', onDeleted);
      socket.emit('leave-product', product._id);
    };
  }, [product?._id, currentUserId]);

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!user) return toast.error('Please login to submit a review');

    const errors = validateReview(reviewForm);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const form = reviewForm;
    const editId = editingId;
    const original = originalMedia;
    const snapshot = myReviews;
    const tempId = `temp-${Date.now()}`;

    if (editId) {
      setMyReviews((prev) => prev.map((r) => (r._id === editId ? { ...r, ...form } : r)));
    } else {
      setMyReviews((prev) => [
        {
          _id: tempId,
          userId: currentUserId,
          userName: user?.name || 'You',
          rating: form.rating,
          comment: form.comment,
          mediaUrls: form.mediaUrls,
          createdAt: new Date().toISOString(),
          _optimistic: true,
        },
        ...prev,
      ]);
    }
    closeForm();

    try {
      const body = editId
        ? {
          rating: form.rating,
          comment: form.comment,
          addMedia: form.mediaUrls.filter((u) => !original.includes(u)),
          removeMedia: original.filter((u) => !form.mediaUrls.includes(u)),
        }
        : form;

      const res = await fetch(
        editId ? `/api/products/${slug}/reviews/${editId}` : `/api/products/${slug}/reviews`,
        {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', 'x-socket-id': getSocket().id ?? '' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save review');

      setMyReviews((prev) => prev.map((r) => (r._id === (editId || tempId) ? data.review : r)));
      setSummary(data.summary);
      toast.success(editId ? 'Review updated!' : 'Review submitted!');
    } catch (err) {
      setMyReviews(snapshot);
      toast.error(err.message || 'Failed to save review');
    }
  }

  async function handleDeleteReview(review) {
    if (!window.confirm('Delete this review? Attached photos/videos will also be removed.')) return;

    const snapshot = myReviews;
    setMyReviews((prev) => prev.filter((r) => r._id !== review._id));

    try {
      const res = await fetch(`/api/products/${slug}/reviews/${review._id}`, {
        method: 'DELETE',
        headers: { 'x-socket-id': getSocket().id ?? '' },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data.summary);
      toast.success('Review deleted');
    } catch {
      setMyReviews(snapshot);
      toast.error('Could not delete review');
    }
  }

  function handleEditReview(review) {
    const media = Array.isArray(review.mediaUrls) ? review.mediaUrls : [];
    setReviewForm({ rating: review.rating, comment: review.comment || '', mediaUrls: media });
    setOriginalMedia(media);
    setEditingId(review._id);
    setShowUpload(media.length > 0);
    setShowForm(true);
  }




  function handleAddToCart() {
    if (!product) return;
    dispatch(
      addItem({
        productId: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] || '',
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        codAvailable: product.codAvailable !== false,
        quantity,
      })
    );
    toast.success(`${product.name} added to cart!`);
  }

  async function toggleWishlist() {
    if (!product) return;
    if (isWishlisted) {
      dispatch(removeFromWishlist(product._id));
      toast.info(`Removed ${product.name} from wishlist`);
      if (user) try { await fetch(`/api/wishlist/${product._id}`, { method: 'DELETE' }); } catch { }
    } else {
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
  }


  const liveAvg = summary.avg;
  const liveCount = summary.count;
  const isMine = (r) => !!currentUserId && String(r.userId) === String(currentUserId);
  const hasMyReview = myReviews.length > 0;
  const hasMore = reviewPagination.page < reviewPagination.totalPages;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        <div className="h-4 w-48 bg-warm-100 rounded animate-pulse" />
        <div className="grid lg:grid-cols-[minmax(0,440px)_1fr] gap-8">
          <div className="aspect-square max-w-[440px] rounded-xl bg-warm-100 animate-pulse" />
          <div className="space-y-4">
            <div className="h-7 w-3/4 bg-warm-100 rounded animate-pulse" />
            <div className="h-5 w-1/3 bg-warm-100 rounded animate-pulse" />
            <div className="h-10 w-1/2 bg-warm-100 rounded animate-pulse" />
            <div className="h-20 bg-warm-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <Frown className="w-12 h-12 mx-auto text-warm-300 mb-3" />
        <h2 className="text-xl font-bold text-warm-900 mb-2">Product not found</h2>
        <p className="text-sm text-warm-500 mb-6">This product may have been removed or is unavailable.</p>
        <Link href="/products" className="px-5 py-2.5 bg-warm-900 text-white text-sm font-semibold rounded-lg hover:bg-warm-800 transition-colors inline-block">
          Browse all products
        </Link>
      </div>
    );
  }

  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;
  const images = product.images?.length > 0 ? product.images : [];
  const specifications = Array.isArray(product.specifications) ? product.specifications : [];
  const inStock = product.stock > 0;

  const breadcrumbItems = [
    { label: 'Products', href: '/products' },
    ...(product.categoryName ? [{ label: product.categoryName, href: `/categories/${product.categorySlug}` }] : []),
    { label: product.name },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-8">
      <Breadcrumbs items={breadcrumbItems} />

      {/* ───────── Hero: gallery + buy box ───────── */}
      <div className="grid lg:grid-cols-[minmax(0,440px)_1fr] gap-6 lg:gap-10">
        {/* Gallery */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full max-w-[440px] lg:sticky lg:top-20 self-start">
          {images.length > 1 && (
            <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[370px] scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative w-12 h-12 rounded-md overflow-hidden shrink-0 border-2 transition-all ${selectedImage === i ? 'border-warm-900' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                </button>
              ))}
            </div>
          )}
          <div className="relative aspect-square flex-1 rounded-xl overflow-hidden bg-warm-50 border border-warm-200">
            {images.length > 0 ? (
              <Image src={images[selectedImage]} alt={product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 400px" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-warm-300">
                <Package className="w-12 h-12" />
              </div>
            )}
            {discount > 0 && (
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-red-600 text-white text-[11px] font-bold rounded-md">
                {discount}% off
              </span>
            )}
          </div>
        </div>

        {/* Buy box */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            {product.categoryName && (
              <Link href={`/categories/${product.categorySlug}`} className="text-xs font-medium text-brand-600 hover:underline">
                {product.categoryName}
              </Link>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-warm-900 tracking-tight leading-tight">{product.name}</h1>
            <a href="#reviews" className="inline-flex items-center gap-2 group">
              <StarRating rating={liveAvg} count={liveCount} size="sm" />
              <span className="text-xs text-warm-600 group-hover:text-brand-600 group-hover:underline">
                {liveCount} review{liveCount !== 1 ? 's' : ''}
              </span>
            </a>
          </div>

          <div className="flex items-baseline flex-wrap gap-2.5">
            <span className="text-2xl font-extrabold text-warm-900">
              {formatCurrency(product.discountPrice || product.price)}
            </span>
            {product.discountPrice && (
              <>
                <span className="text-base text-warm-400 line-through">{formatCurrency(product.price)}</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-md border border-emerald-200">
                  Save {formatCurrency(product.price - product.discountPrice)}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {inStock ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" /> In stock ({product.stock} available)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
                <XCircle className="w-3.5 h-3.5" /> Out of stock
              </span>
            )}
            {product.codAvailable !== false && (
              <span className="inline-flex items-center gap-1.5 text-warm-600">
                <Truck className="w-3.5 h-3.5" /> Cash on delivery available
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {inStock && (
              <>
                <div className="flex items-center border border-warm-300 rounded-lg bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="p-2.5 text-warm-700 hover:bg-warm-50 rounded-l-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center text-sm font-semibold text-warm-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    aria-label="Increase quantity"
                    className="p-2.5 text-warm-700 hover:bg-warm-50 rounded-r-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-5 py-2.5 bg-warm-900 text-white text-sm font-semibold rounded-lg hover:bg-warm-800 active:scale-[0.99] transition-all"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to cart
                </button>
              </>
            )}
            <button
              onClick={toggleWishlist}
              title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className={`p-2.5 border rounded-lg transition-colors ${isWishlisted
                ? 'border-rose-300 bg-rose-50 text-rose-600'
                : 'border-warm-300 text-warm-600 hover:text-rose-600 hover:bg-rose-50'
                }`}
            >
              <Heart className={`w-4.5 h-4.5 ${isWishlisted ? 'fill-rose-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ───────── Description ───────── */}
      <Section id="description" title="About this product">
        <p className="text-sm text-warm-700 leading-7 whitespace-pre-wrap max-w-3xl">
          {product.description || 'No detailed description available for this item.'}
        </p>
      </Section>

      {/* ───────── Specifications ───────── */}
      {specifications.length > 0 && (
        <Section id="specifications" title="Specifications">
          <dl className="max-w-3xl rounded-lg border border-warm-200 bg-white divide-y divide-warm-100 overflow-hidden">
            {specifications.map((spec, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 px-4 py-2.5 text-sm even:bg-warm-50/50">
                <dt className="font-medium text-warm-900">{spec.label}</dt>
                <dd className="col-span-2 text-warm-700">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {/* ───────── Reviews ───────── */}

      <Section id="reviews" title="Customer reviews">
        <div className="flex flex-col gap-6 w-full">

          <RatingSummary avg={summary.avg} count={summary.count} distribution={summary.distribution} />

          {user ? (
            <button type="button" onClick={() => setShowForm(true)}
              className="self-start inline-flex items-center gap-2 px-4 py-2.5 bg-warm-900 text-white text-sm font-semibold rounded-lg hover:bg-warm-800 active:scale-[0.98] transition">
              <Pencil className="w-4 h-4" /> Write a review
            </button>

          ) : (
            <div className="self-start px-4 py-3 bg-warm-50 border border-warm-200 rounded-lg text-sm text-warm-700">
              <Link href="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link> to write a review.
            </div>
          )}


          {user && showForm && (
            <form
              onSubmit={handleSubmitReview}
              className="p-5 bg-warm-50 border border-warm-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-warm-900">
                  {editingId ? 'Edit your review' : 'Your review'}
                </h3>
                <button
                  type="button"
                  onClick={closeForm}
                  aria-label="Close review form"
                  className="p-1.5 -mr-1.5 text-warm-500 hover:text-warm-900 hover:bg-warm-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs font-medium text-warm-600 mb-1.5">Your rating</p>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setReviewForm({ ...reviewForm, rating: star });
                        setFormErrors((p) => ({ ...p, rating: undefined }));
                      }}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                      className="p-0.5 rounded hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"  >
                      <Star
                        className={`w-7 h-7 ${star <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-warm-300'}`}
                      />
                    </button>
                  ))}
                </div>
                {formErrors.rating && <p className="mt-1 text-xs text-red-600">{formErrors.rating}</p>}
              </div>

              <div>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => {
                    setReviewForm({ ...reviewForm, comment: e.target.value });
                    setFormErrors((p) => ({ ...p, comment: undefined }));
                  }}
                  rows={4}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 resize-none ${formErrors.comment
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-warm-300 focus:border-brand-600 focus:ring-brand-600/20'
                    }`}
                  placeholder="What did you like or dislike? How was the quality and delivery?"
                />
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-red-600">{formErrors.comment}</span>
                  <span className={reviewForm.comment.length > REVIEW_RULES.MAX_COMMENT_CHARS ? 'text-red-600' : 'text-warm-500'}>
                    {reviewForm.comment.length}/{REVIEW_RULES.MAX_COMMENT_CHARS}
                  </span>
                </div>
              </div>

              <div>
                {!showUpload && reviewForm.mediaUrls.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowUpload(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-warm-700 bg-white border border-dashed border-warm-300 rounded-lg hover:border-warm-500 hover:bg-warm-50 transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" /> Add photos or video
                  </button>
                ) : (
                  <div className="max-w-sm max-h-56 overflow-y-auto rounded-lg [&_img]:max-h-16 [&_img]:w-16 [&_img]:object-cover [&_video]:max-h-16 [&_video]:w-16">
                    <ImageUpload
                      uploadType="review-media"
                      value={reviewForm.mediaUrls || []}
                      onChange={(urls) => setReviewForm({ ...reviewForm, mediaUrls: urls })}
                      multiple={true}
                      maxFiles={REVIEW_RULES.MAX_MEDIA_FILES}
                      maxSizeMB={50}
                      label="Photos or short video (optional, up to 4)"
                    />
                    {formErrors.media && <p className="mt-1 text-xs text-red-600">{formErrors.media}</p>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-warm-900 text-white text-sm font-semibold rounded-lg hover:bg-warm-800 transition"
                >
                  {editingId ? 'Update review' : 'Submit review'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 text-sm font-medium text-warm-700 hover:bg-warm-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Your review */}
          {hasMyReview && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-warm-900">Your review</h3>
              <ul className="space-y-3">
                {
                  myReviews.map((r) => {
                    if (r._id === editingId) return null;
                    return (
                      <ReviewCard
                        key={r._id}
                        review={r}
                        isOwner
                        onEdit={handleEditReview}
                        onDelete={handleDeleteReview}
                        onOpenMedia={setModalMedia} />)
                  })
                }
              </ul>
            </div>
          )}

          {/* Everyone else */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-warm-900">
              {hasMyReview ? 'Other reviews' : 'All reviews'}
            </h3>

            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-28 bg-warm-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : reviews.length > 0 ? (
              <div className="max-h-220 overflow-y-auto pr-1">
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <ReviewCard key={r._id} review={r} isOwner={false}
                      onEdit={handleEditReview} onDelete={handleDeleteReview} onOpenMedia={setModalMedia} />
                  ))}
                </ul>

                {hasMore && (
                  <div className="py-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => fetchReviews(reviewPagination.page + 1)}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-warm-800 bg-white border border-warm-300 rounded-lg hover:bg-warm-50 disabled:opacity-60 transition-colors"
                    >
                      {loadingMore && (
                        <span className="w-4 h-4 border-2 border-warm-300 border-t-warm-700 rounded-full animate-spin" />
                      )}
                      {loadingMore ? 'Loading…' : 'Load more reviews'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-warm-200 rounded-2xl">
                <p className="text-sm text-warm-500">
                  {hasMyReview ? 'No other reviews yet.' : 'No reviews yet. Be the first to review this product.'}
                </p>
              </div>
            )}
          </div>

        </div>
      </Section>


      {/* Lightbox */}
      {modalMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setModalMedia(null)}>
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-lg bg-black" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModalMedia(null)} aria-label="Close" className="absolute top-3 right-3 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black">
              <X className="w-4 h-4" />
            </button>
            {isVideoUrl(modalMedia) ? (
              <video src={modalMedia} controls autoPlay className="max-h-[80vh] w-auto mx-auto" />
            ) : (
              <img src={modalMedia} alt="" className="max-h-[80vh] w-auto mx-auto object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RatingSummary({ avg = 0, count = 0, distribution = {} }) {
  return (
    <div className="flex w-full h-fit gap-5 p-4 sm:p-5 bg-warm-50 border border-warm-200 rounded-2xl">


      <div className="flex flex-col w-43 items-center justify-center text-center gap-1">
        <p className="text-4xl font-extrabold text-warm-900 leading-none">
          {Number(avg || 0).toFixed(1)}
        </p>
        <StarRating rating={avg} size="sm" />
        <p className="text-xs text-warm-600">
          {count} review{count !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-1.5 w-full self-center">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = distribution?.[star] ?? 0;
          const pct = count ? (n / count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-warm-700">
              <span className="w-8 shrink-0 flex items-center gap-0.5">
                {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              </span>
              <div className="flex-1 h-2 rounded-full bg-warm-200 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-right tabular-nums text-warm-500">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewCard({ review, isOwner, onEdit, onDelete, onOpenMedia }) {
  return (
    <li
      className={`p-4 sm:p-5 w-full border rounded-2xl ${isOwner ? 'border-brand-600/40 bg-brand-50/40' : 'border-warm-200 bg-white'
        } ${review._optimistic ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 bg-warm-100 text-warm-800 font-semibold text-sm rounded-full flex items-center justify-center">
            {review.userName?.[0]?.toUpperCase() || <User className="w-4 h-4 text-warm-500" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-warm-900 truncate">
              {isOwner ? 'You' : review.userName || 'Verified buyer'}
            </p>
            <p className="text-xs text-warm-500">
              {review._optimistic ? 'Posting…' : formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        {isOwner && !review._optimistic && (
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => onEdit(review)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-warm-700 hover:bg-warm-100 rounded-md transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button type="button" onClick={() => onDelete(review)}
              className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors">
              Delete
            </button>
          </div>
        )}
      </div>

      {review.rating > 0 && (
        <div className="flex gap-0.5 mt-3" role="img" aria-label={`Rated ${review.rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-warm-300'}`} />
          ))}
        </div>
      )}

      {review.comment && (
        <p className="text-sm text-warm-700 leading-relaxed mt-2.5 max-w-prose">{review.comment}</p>
      )}

      {Array.isArray(review.mediaUrls) && review.mediaUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
          {review.mediaUrls.map((url, idx) => (
            <button key={idx} type="button" onClick={() => onOpenMedia(url)} aria-label="View media"
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-warm-200 bg-warm-100 shrink-0 hover:border-warm-500 transition-colors">
              {isVideoUrl(url) ? (
                <>
                  <video src={url} className="w-full h-full object-cover" muted />
                  <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Film className="w-4 h-4 text-white" />
                  </span>
                </>
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
