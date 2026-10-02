import { NextResponse } from 'next/server';
import { Review } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { recalcProductRating } from '@/lib/reviews';

export const PATCH = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const review = await Review.findById(id);
    if (!review) throw new AppError('Review not found', 404);

    review.isHidden = !review.isHidden;
    await review.save();

    await recalcProductRating(review.productId);
    return NextResponse.json({ review: review.toObject() });
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const review = await Review.findById(id);
    if (!review) throw new AppError('Review not found', 404);

    const productId = review.productId;
    await Review.deleteOne({ _id: id });
    await recalcProductRating(productId);

    return NextResponse.json({ message: 'Deleted' });
  },
});
