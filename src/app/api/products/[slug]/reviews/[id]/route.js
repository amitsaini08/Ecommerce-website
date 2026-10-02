import { NextResponse } from 'next/server';
import { Review } from '@/lib/db/models';
import { reviewSchema } from '@/lib/validations';
import { deleteCloudinaryMedia } from '@/lib/cloudinary';
import { recalcProductRating, sameId, formatReview, getReviewSummary } from '@/lib/reviews';
import { broadcast } from '@/lib/broadcast';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const PUT = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  schema: reviewSchema,
  handler: async (request, { user, data, params }) => {
    const { id } = await params;
    const { rating, comment } = data;

    const existing = await Review.findById(id);
    if (!existing || (!sameId(existing.userId, user._id) && user.role !== 'admin')) {
      throw new AppError('Review not found or unauthorized', 404);
    }

    existing.rating = rating;
    existing.comment = comment || null;
    if (data.mediaUrls) existing.mediaUrls = data.mediaUrls;
    await existing.save();

    await recalcProductRating(existing.productId);
    const review = formatReview(existing.toObject());
    const summary = await getReviewSummary(existing.productId);

    broadcast(String(existing.productId), 'review:updated', { review, summary }, request.headers.get('x-socket-id'));
    return NextResponse.json({ review, summary, message: 'Review updated successfully!' });
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user, params }) => {
    const { id } = await params;
    const existing = await Review.findById(id);

    if (!existing) throw new AppError('Review not found', 404);
    if (!sameId(existing.userId, user._id) && user.role !== 'admin') {
      throw new AppError('Forbidden', 403);
    }

    const { productId, mediaUrls } = existing;
    await Review.deleteOne({ _id: id });
    await recalcProductRating(productId);
    await deleteCloudinaryMedia(mediaUrls || []);

    const summary = await getReviewSummary(productId);
    broadcast(String(productId), 'review:deleted', { reviewId: String(id), summary }, request.headers.get('x-socket-id'));

    return NextResponse.json({ ok: true, summary, message: 'Review deleted successfully!' });
  },
});