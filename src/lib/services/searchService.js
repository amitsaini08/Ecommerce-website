import { Category, Product } from '@/lib/db/models';
import { getAllDescendantIds } from '@/lib/categoryHelpers';

export const searchService = {
  /**
   * Search across categories and products with filters, sorting, and pagination
   */
  async search({ q = '', page = 1, limit = 12, sort = 'newest', category, minPrice, maxPrice, minRating, inStockOnly = false }) {
    const offset = (page - 1) * limit;

    if (!q.trim() && !category && !minPrice && !maxPrice && !minRating && !inStockOnly) {
      return {
        categories: [],
        products: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      };
    }

    let matchedCategories = [];
    let expandedCategoryIds = [];

    if (q.trim()) {
      const regex = { $regex: q.trim(), $options: 'i' };
      matchedCategories = await Category.aggregate([
        { $match: { $or: [{ name: regex }, { slug: regex }] } },
        {
          $graphLookup: {
            from: Category.collection.name,
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'parentIds',
            as: 'descendants',
          },
        },
        { $sort: { name: 1 } },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            imageUrl: 1,
            descendantIds: '$descendants._id',
          },
        },
      ]);

      expandedCategoryIds = [
        ...new Set(
          matchedCategories.flatMap((c) => [
            c._id,
            ...(c.descendantIds || []),
          ])
        ),
      ];
    }

    const query = { isActive: true };

    if (minRating && !isNaN(parseFloat(minRating))) {
      query.ratingAvg = { $gte: parseFloat(minRating) };
    }

    if (inStockOnly) {
      query.stock = { $gt: 0 };
      query.isOutOfStock = { $ne: true };
    }

    if (q.trim()) {
      const regex = { $regex: q.trim(), $options: 'i' };
      const productOr = [{ name: regex }, { description: regex }];
      if (expandedCategoryIds.length > 0) {
        productOr.push({ categoryIds: { $in: expandedCategoryIds } });
      }
      query.$or = productOr;
    }

    if (category) {
      const catObj = await Category.findOne({ slug: category }).lean();
      if (catObj) {
        const descendantIds = await getAllDescendantIds(catObj._id);
        const relevantCatIds = [catObj._id, ...Array.from(descendantIds)];
        query.categoryIds = { $in: relevantCatIds };
      }
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

    const sanitizedProducts = productList.map((product) => {
      const { productLink, ...rest } = product;
      return { ...rest, id: String(product._id) };
    });

    const sanitizedCategories = matchedCategories.slice(0, 5).map((cat) => ({
      _id: String(cat._id),
      name: cat.name,
      slug: cat.slug,
      imageUrl: cat.imageUrl,
    }));

    return {
      categories: sanitizedCategories,
      products: sanitizedProducts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  },
};
