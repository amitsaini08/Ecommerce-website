import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Review, Product, User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    await connectToDatabase();
    const list = await Review.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const count = await Review.countDocuments();

    const productIds = list.map((r) => r.productId).filter(Boolean);
    const userIds = list.map((r) => r.userId).filter(Boolean);

    const [productsList, usersList] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).lean(),
      User.find({ _id: { $in: userIds } }).lean(),
    ]);

    const productMap = {};
    productsList.forEach((p) => {
      productMap[p._id] = p;
    });

    const userMap = {};
    usersList.forEach((u) => {
      userMap[u._id] = u;
    });

    const reviewsFormatted = list.map((r) => {
      const p = productMap[r.productId];
      const u = r.userId ? userMap[r.userId] : null;
      return {
        id: r._id,
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
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { productId, userName, rating, comment, imageUrl, mediaUrls } = body;

    if (!productId || !rating) {
      return NextResponse.json({ error: 'ProductId and rating required' }, { status: 400 });
    }

    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const newReview = await Review.create({
      _id: crypto.randomUUID(),
      productId,
      userName: userName || 'Verified Buyer',
      rating: Number(rating),
      comment: comment || null,
      imageUrl: imageUrl || null,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
    });

    // Recalculate rating
    const stats = await Review.aggregate([
      { $match: { productId, isHidden: false } },
      {
        $group: {
          _id: '$productId',
          avg: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const avg = stats.length > 0 ? stats[0].avg.toFixed(2) : 0;
    const reviewCount = stats.length > 0 ? stats[0].count : 0;

    product.ratingAvg = avg;
    product.reviewCount = reviewCount;
    await product.save();

    return NextResponse.json({ review: { ...newReview.toObject(), id: newReview._id } }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
