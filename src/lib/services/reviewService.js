import { Product, Review, User } from '@/lib/db/models';
import { recalcProductRating, getUserId, formatReview, getReviewSummary, sameId } from '@/lib/reviews';
import { deleteCloudinaryMedia } from '@/lib/cloudinary';
import { AppError } from '@/app/api/routeHandler';

export const reviewService = {
 
  async getProductReviews({ slug, user, page = 1, limit = 10 }) {
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
    
    return {
      myReviews: mineList.map(formatReview),
      reviews: reviewList.map(formatReview),
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

 
  async createReview({ slug, user, data }) {
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

    return { review, summary, productId: String(product._id) };
  },

  async updateReview({ id, user, data }) {
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

    return { review, summary, productId: String(existing.productId), message: 'Review updated successfully!' };
  },

 
  async deleteReview({ id, user }) {
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

    return { ok: true, summary, productId: String(productId), message: 'Review deleted successfully!' };
  },

 
  async getAdminReviews({ page = 1, limit = 20 }) {
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

    return {
      reviews: reviewsFormatted,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  },

  
  async createAdminReview(data) {
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
    return { review: newReview.toObject() };
  },

  
  async toggleHideReview(id) {
    const review = await Review.findById(id);
    if (!review) throw new AppError('Review not found', 404);

    review.isHidden = !review.isHidden;
    await review.save();

    await recalcProductRating(review.productId);
    return { review: review.toObject() };
  },

 
  async deleteAdminReview(id) {
    const review = await Review.findById(id);
    if (!review) throw new AppError('Review not found', 404);

    const productId = review.productId;
    await Review.deleteOne({ _id: id });
    await recalcProductRating(productId);

    return { message: 'Deleted' };
  },
};
