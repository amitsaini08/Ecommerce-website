import { NextResponse } from 'next/server';
import { Review, Product, User } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { reviewSchema } from '@/lib/validations';
import { recalcProductRating } from '@/lib/reviews';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const list = await Review.find().sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    const count = await Review.countDocuments();

    const productIds = list.map((r) => r.productId).filter(Boolean);
    const userIds = list.map((r) => r.userId).filter(Boolean);

    const [productsList, usersList] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).lean(),
      User.find({ _id: { $in: userIds } }).lean(),
    ]);

    const productMap = new Map(productsList.map((p) => [String(p._id), p]));
    const userMap = new Map(usersList.map((u) => [String(u._id), u]));

    const reviewsFormatted = list.map((r) => {
      const p = productMap.get(String(r.productId));
      const u = r.userId ? userMap.get(String(r.userId)) : null;
      return {
        _id: String(r._id),
        rating: r.rating,
        comment: r.comment,
        mediaUrls: r.mediaUrls || [],
        isHidden: r.isHidden,
        createdAt: r.createdAt,
        userName: r.userName || u?.name || 'Customer',
        userEmail: u?.email || '',
        productName: p?.name || 'Product',
        productSlug: p?.slug || '',
      };
    });

    return NextResponse.json({
      reviews: reviewsFormatted,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: reviewSchema,
  handler: async (request, { data }) => {
    const { productId, rating, comment, mediaUrls } = data;
    const product = await Product.findById(productId);
    if (!product) throw new AppError('Product not found', 404);

    const newReview = await Review.create({
      productId: String(product._id),
      userName: 'Verified Buyer',
      rating: Number(rating),
      comment: comment || null,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
    });

    await recalcProductRating(product._id);
    return NextResponse.json({ review: newReview.toObject() }, { status: 201 });
  },
});
