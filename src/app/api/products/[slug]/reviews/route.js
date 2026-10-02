import { NextResponse } from 'next/server';
import { Product, Review } from '@/lib/db/models';
import { reviewSchema } from '@/lib/validations';
import { recalcProductRating, getUserId, formatReview, getReviewSummary } from '@/lib/reviews';
import { broadcast } from '@/lib/broadcast';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: false,
  handler: async (request, { user, params }) => {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    const product = await Product.findOne({ slug }).lean();
    if (!product) throw new AppError('Product not found', 404);

    const uid = user?._id;
    const baseFilter = { productId: String(product._id), isHidden: false };
    const othersFilter = uid ? { ...baseFilter, userId: { $ne: String(uid) } } : baseFilter;

    const [reviewList, total, summary, mineList] = await Promise.all([
      Review.find(othersFilter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'name').lean(),
      Review.countDocuments(othersFilter),
      getReviewSummary(product._id),
      uid && page === 1
        ? Review.find({ ...baseFilter, userId: String(uid) }).populate('userId', 'name').sort({ createdAt: -1 }).lean()
        : [],
    ]);

    return NextResponse.json({
      myReviews: mineList.map(formatReview),
      reviews: reviewList.map(formatReview),
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  },
});

export const POST = routeHandler({
  auth: true,
  rateLimit: { key: 'submit-review', max: 3, windowSec: 10 * 60 },
  schema: reviewSchema,
  handler: async (request, { user, data, params }) => {
    const { slug } = await params;
    const { rating, comment } = data;

    const product = await Product.findOne({ slug }).select('_id').lean();
    if (!product) throw new AppError('Product not found', 404);

    const newReviewCreated = await Review.create({
      productId: String(product._id),
      userId: String(getUserId(user)),
      userName: user.name,
      rating,
      comment: comment || null,
      mediaUrls: data?.mediaUrls || [],
    });

    await recalcProductRating(product._id);
    const review = formatReview(newReviewCreated.toObject());
    const summary = await getReviewSummary(product._id);

    broadcast(
      String(product._id),
      'review:created',
      { review, summary },
      request.headers.get('x-socket-id')
    );

    return NextResponse.json({ review, summary }, { status: 201 });
  },
});