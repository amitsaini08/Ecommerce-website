import { Product, Category } from '@/lib/db/models';
import { getAllDescendantIds } from '@/lib/categoryHelpers';
import { AppError } from '@/app/api/routeHandler';

export const productService = {

  async getPublicProducts({ page = 1, limit = 12, sort = 'newest', category, search, minPrice, maxPrice, minRating, inStockOnly = false, }) {
    const offset = (page - 1) * limit;
    const query = { isActive: true };

    if (minRating && !isNaN(parseFloat(minRating))) {
      query.ratingAvg = { $gte: parseFloat(minRating) };
    }

    if (inStockOnly) {
      query.stock = { $gt: 0 };
      query.isOutOfStock = { $ne: true };
    }

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    const hasMin = Number.isFinite(min);
    const hasMax = Number.isFinite(max);

    if (hasMin || hasMax) {

      const effectivePrice = {
        $cond: [
          {
            $and: [
              { $gt: [{ $ifNull: ['$discountPrice', 0] }, 0] },
              { $lt: ['$discountPrice', '$price'] },
            ],
          },
          '$discountPrice',
          '$price',
        ],
      };

      const priceConds = [];
      if (hasMin) priceConds.push({ $gte: [effectivePrice, min] });
      if (hasMax) priceConds.push({ $lte: [effectivePrice, max] });

      query.$expr = { $and: priceConds };
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

    return {
      products: sanitizedProducts,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  },


  async getProductBySlug(slug) {
    const product = await Product.findOne({ slug }).lean();

    if (!product) throw new AppError('Product not found', 404);

    let categoryName = null;
    let categorySlug = null;
    let categories = [];
    if (product.categoryIds && product.categoryIds.length > 0) {
      const catList = await Category.find({ _id: { $in: product.categoryIds } }).lean();
      categories = catList.map((c) => ({ _id: String(c._id), name: c.name, slug: c.slug }));
      if (catList.length > 0) {
        categoryName = catList[0].name;
        categorySlug = catList[0].slug;
      }
    }

    const { productLink, ...rest } = product;

    return {
      product: {
        ...rest, categoryName, categorySlug, categories,
      },
    };
  },


  async getAdminProducts({ page = 1, limit = 20, search = '', isActive = '', codAvailable = '', stockStatus = '' }) {
    const offset = (page - 1) * limit;

    const matchQuery = {};
    if (isActive === 'true' || isActive === 'false') { matchQuery.isActive = isActive === 'true'; }
    if (codAvailable === 'true' || codAvailable === 'false') { matchQuery.codAvailable = codAvailable === 'true'; }
    if (stockStatus === 'out') { matchQuery.stock = 0; }
    else if (stockStatus === 'low') { matchQuery.stock = { $gt: 0, $lte: 10 }; }
    else if (stockStatus === 'in') { matchQuery.stock = { $gt: 10 }; }

    const pipeline = [];

    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({ $match: matchQuery });
    }

    if (search) {
      pipeline.push({
        $lookup: {
          from: 'categories',
          localField: 'categoryIds',
          foreignField: '_id',
          as: 'categories',
        },
      });

      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { slug: { $regex: search, $options: 'i' } },
            { 'categories.name': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        products: [
          { $sort: { createdAt: -1 } },
          { $skip: offset },
          { $limit: limit },
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryIds',
              foreignField: '_id',
              as: 'categories',
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              price: 1,
              stock: 1,
              isActive: 1,
              codAvailable: 1,
              images: 1,
              categoryIds: 1,
              createdAt: 1,
              updatedAt: 1,
              categoryNames: '$categories.name',
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    });

    const result = await Product.aggregate(pipeline);
    const products = result[0]?.products || [];
    const total = result[0]?.total[0]?.count || 0;

    return { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },


  async createProduct(data) {
    const { name, slug, description, price, discountPrice, stock, images, isActive, codAvailable } = data;
    const categoryIds = Array.isArray(data.categoryIds) ? data.categoryIds : [];
    const productLink = data.productLink ? String(data.productLink).trim() : null;

    const newProduct = await Product.create({
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description: description || null,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : null,
      categoryIds,
      stock: stock || 0,
      isOutOfStock: (stock || 0) <= 0,
      images: images || [],
      isActive: isActive !== false,
      codAvailable: codAvailable !== false,
      productLink,
    });

    return { product: newProduct.toObject() };
  },


  async getAdminProductById(id) {
    const product = await Product.findById(id).populate('categoryIds', 'name slug').lean();
    if (!product) throw new AppError('Product not found', 404);
    return { product };
  },


  async updateProduct({ id, data }) {
    const { name, slug, description, price, discountPrice, categoryIds, stock, images, isActive, codAvailable, productLink, specifications } = data;

    const product = await Product.findById(id);
    if (!product) throw new AppError('Product not found', 404);

    if (name !== undefined) product.name = name;
    if (slug !== undefined) product.slug = slug.toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (discountPrice !== undefined) product.discountPrice = discountPrice ? Number(discountPrice) : null;
    if (categoryIds !== undefined) product.categoryIds = categoryIds || [];
    if (stock !== undefined) {
      product.stock = Number(stock);
      product.isOutOfStock = Number(stock) <= 0;
    }
    if (images !== undefined) product.images = images;
    if (isActive !== undefined) product.isActive = isActive;
    if (codAvailable !== undefined) product.codAvailable = codAvailable;
    if (productLink !== undefined) product.productLink = productLink || null;
    if (specifications !== undefined) product.specifications = specifications;

    await product.save();
    return { product: product.toObject() };
  },


  async deleteProduct(id) {
    const res = await Product.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new AppError('Product not found', 404);
    return { message: 'Deleted' };
  },
};
