import { NextResponse } from 'next/server';
import { connectToDatabase, Review, Product } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();
    const review = await Review.findById(id);
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    review.isHidden = !review.isHidden;
    await review.save();

    // Recalculate rating for product
    const stats = await Review.aggregate([
      { $match: { productId: review.productId, isHidden: false } },
      {
        $group: {
          _id: '$productId',
          avg: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const avg = stats.length > 0 ? stats[0].avg.toFixed(2) : 0;
    const count = stats.length > 0 ? stats[0].count : 0;

    await Product.updateOne(
      { _id: review.productId },
      { ratingAvg: avg, reviewCount: count }
    );

    return NextResponse.json({ review: { ...review.toObject(), id: review._id } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();
    const review = await Review.findById(id);
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const productId = review.productId;
    await Review.deleteOne({ _id: id });

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
    const count = stats.length > 0 ? stats[0].count : 0;

    await Product.updateOne(
      { _id: productId },
      { ratingAvg: avg, reviewCount: count }
    );

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
