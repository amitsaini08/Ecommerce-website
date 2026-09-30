import { NextResponse } from 'next/server';
import { connectToDatabase, Product, Review, User } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { reviewSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';
import { recalcProductRating, getUserId, formatReview, getReviewSummary } from '@/lib/reviews';
import { broadcast } from '@/lib/broadcast';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    await connectToDatabase();

    const product = await Product.findOne({ slug }).lean();
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    let user = null;
    try { user = await getAuthUser(request); } catch { }
    const uid = user?._id;

    const baseFilter = { productId: product._id, isHidden: false };
    const othersFilter = uid ? { ...baseFilter, userId: { $ne: uid } } : baseFilter;


    const [reviewList, total, summary, mineList] = await Promise.all([
      Review.find(othersFilter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'name').lean(),
      Review.countDocuments(othersFilter),
      getReviewSummary(product._id),
      uid && page === 1
        ? Review.find({ ...baseFilter, userId: uid }).populate('userId', 'name').sort({ createdAt: -1 }).lean()
        : [],
    ]);


    return NextResponse.json({
      myReviews: mineList.map(formatReview),
      reviews: reviewList.map(formatReview),
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Reviews GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Please login to review' }, { status: 401 });
    }

    const { slug } = await params;
    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(reviewSchema, rawBody);

    if (!validation.success) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Validation failed', field: firstError?.field },
        { status: 400 }
      );
    }

    const { rating, comment } = validation.sanitizedData;

    await connectToDatabase();

    const product = await Product.findOne({ slug }).select('_id').lean();
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Always create a new review (users can review more than once)
    const newReviewCreated = await Review.create({
      productId: product._id,
      userId: getUserId(user),
      userName: user.name,
      rating,
      comment: comment || null,
      mediaUrls: rawBody?.mediaUrls || [],
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
  } catch (error) {
    console.error('Reviews POST error:', error);
    return NextResponse.json({ error: 'Failed to add review' }, { status: 500 });
  }
}