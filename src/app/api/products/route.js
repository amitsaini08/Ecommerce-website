import { NextResponse } from 'next/server';
import { Product, Category } from '@/lib/db/models';
import { getAllDescendantIds } from '@/lib/categoryHelpers';
import { routeHandler } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: false,
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'newest';
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minRating = searchParams.get('minRating');
    const inStockOnly = searchParams.get('inStockOnly') === 'true';
    const offset = (page - 1) * limit;

    const query = { isActive: true };

    if (minRating && !isNaN(parseFloat(minRating))) {
      query.ratingAvg = { $gte: parseFloat(minRating) };
    }

    if (inStockOnly) {
      query.stock = { $gt: 0 };
      query.isOutOfStock = { $ne: true };
    }

    if (category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat) {
        const descendantIds = await getAllDescendantIds(cat._id);
        const relevantCategoryIds = [cat._id, ...Array.from(descendantIds)];
        query.categoryIds = { $in: relevantCategoryIds };
      }
    }

    if (search) {
      const matchingCategories = await Category.find({ name: { $regex: search, $options: 'i' } }).select('_id').lean();
      const categoryIds = matchingCategories.map((c) => c._id);
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        ...(categoryIds.length > 0 ? [{ categoryIds: { $in: categoryIds } }] : []),
      ];
    }

    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'price-asc': sortOption = { price: 1 }; break;
      case 'price-desc': sortOption = { price: -1 }; break;
      case 'best-sellers': sortOption = { reviewCount: -1 }; break;
      case 'top-rated': sortOption = { ratingAvg: -1 }; break;
      case 'oldest': sortOption = { createdAt: 1 }; break;
      case 'newest': default: sortOption = { createdAt: -1 }; break;
    }

    const productList = await Product.find(query).sort(sortOption).skip(offset).limit(limit).lean();
    const count = await Product.countDocuments(query);

    const sanitizedProducts = productList.map((p) => {
      const { productLink, ...rest } = p;
      return { ...rest, id: String(p._id) };
    });

    return NextResponse.json({
      products: sanitizedProducts,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  },
});
