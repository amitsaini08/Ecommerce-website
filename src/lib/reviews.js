import { Product, Review } from '@/lib/db/models';

export async function recalcProductRating(productId) {
  const [s] = await Review.aggregate([
    { $match: { productId, isHidden: false } },
    { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Product.updateOne(
    { _id: productId },
    { ratingAvg: s ? Number(s.avg.toFixed(2)) : 0, reviewCount: s ? s.count : 0 }
  );
}

export const getUserId = (user) => user?._id ?? user?.id;


export const formatReview = (r) => {
  const uid = r.userId?._id ?? r.userId;   // works for populated and plain ids
  return {
    _id: String(r._id),
    rating: r.rating,
    comment: r.comment,
    mediaUrls: r.mediaUrls || [],
    createdAt: r.createdAt,
    userName: r.userId?.name || r.userName || 'Customer',
    userId: uid ? String(uid) : null,
  };
};


export async function getReviewSummary(productId) {
  const rows = await Review.aggregate([
    {
      $match: {
        productId: String(productId),
        isHidden: false,
      },
    },
    { $group: { _id: '$rating', n: { $sum: 1 } } },
  ]);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let count = 0;
  let sum = 0;
  rows.forEach((row) => {
    if (distribution[row._id] !== undefined) distribution[row._id] = row.n;
    count += row.n;
    sum += row._id * row.n;
  });

  return { avg: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
}