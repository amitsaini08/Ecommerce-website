import { NextResponse } from 'next/server';
import { connectToDatabase, Review } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';
import { reviewSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';
import { sanitizeMediaUrls, deleteCloudinaryMedia } from '@/lib/cloudinary';
import { recalcProductRating, sameId, formatReview, getReviewSummary } from '@/lib/reviews';
import { broadcast } from '@/lib/broadcast';

const MAX_MEDIA = 4;

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const validation = parseAndValidate(reviewSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[0]?.message || 'Invalid review data' },
        { status: 400 }
      );
    }
    const { rating, comment } = validation.sanitizedData;

    await connectToDatabase();
    const existing = await Review.findById(id);
    if (!existing || !sameId(existing.userId, user?._id)) {
      return NextResponse.json({ error: 'Review not found or unauthorized' }, { status: 404 });
    }

    const current = existing.mediaUrls || [];
    const removeRequested = Array.isArray(body.removeMedia) ? body.removeMedia : [];
    const toRemove = removeRequested.filter((u) => current.includes(u));
    const kept = current.filter((u) => !toRemove.includes(u));
    const toAdd = sanitizeMediaUrls(body.addMedia)
      .filter((u) => !current.includes(u))
      .slice(0, Math.max(0, MAX_MEDIA - kept.length));

    existing.rating = rating;
    existing.comment = comment || null;
    existing.mediaUrls = [...kept, ...toAdd];
    await existing.save();

    await recalcProductRating(existing.productId);
    await deleteCloudinaryMedia(toRemove);

    const review = formatReview(existing.toObject());
    const summary = await getReviewSummary(existing.productId);

    broadcast(String(existing.productId), 'review:updated', { review, summary },
      request.headers.get('x-socket-id'));

    return NextResponse.json({ review, summary, message: 'Review updated successfully!' });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Reviews PUT error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    await connectToDatabase();
    const existing = await Review.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    if (!sameId(existing.userId, user?._id) && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { productId } = existing;
    const mediaToDelete = existing.mediaUrls || [];

    await Review.deleteOne({ _id: id });
    await recalcProductRating(productId);
    await deleteCloudinaryMedia(mediaToDelete);

    const summary = await getReviewSummary(productId);

    broadcast(String(productId), 'review:deleted', { reviewId: String(id), summary },
      request.headers.get('x-socket-id'));

    return NextResponse.json({ ok: true, summary, message: 'Review deleted successfully!' });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Reviews DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}