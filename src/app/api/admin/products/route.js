import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Product, Category } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';
import { productSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

// export async function GET(request) {
//   try {
//     await requireAdmin(request);
//     const { searchParams } = new URL(request.url);
//     const page = parseInt(searchParams.get('page') || '1');
//     const limit = parseInt(searchParams.get('limit') || '20');
//     const search = searchParams.get('search') || '';
//     const offset = (page - 1) * limit;

//     const category = searchParams.get('category') || '';
//     const isActive = searchParams.get('isActive') || '';
//     const codAvailable = searchParams.get('codAvailable') || '';
//     const stockStatus = searchParams.get('stockStatus') || '';

//     await connectToDatabase();

//     const query = {};
//     if (search) {
//       const matchingCategories = await Category.find({ name: { $regex: search, $options: 'i' } }).select('_id').lean();
//       const categoryIds = matchingCategories.map((category) => category._id);

//       query.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { slug: { $regex: search, $options: 'i' } },
//         ...(categoryIds.length > 0 ? [{ categoryIds: { $in: categoryIds } }] : []),
//       ];
//     }

//     if (category) query.categoryIds = category;
//     if (isActive === 'true' || isActive === 'false') query.isActive = isActive === 'true';
//     if (codAvailable === 'true' || codAvailable === 'false') query.codAvailable = (codAvailable === 'true');
//     if (stockStatus === 'out') {
//       query.stock = 0;
//     } else if (stockStatus === 'low') {
//       query.stock = { $gt: 0, $lte: 10 };
//     } else if (stockStatus === 'in') {
//       query.stock = { $gt: 10 };
//     }


//     const list = await Product.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
//     const count = await Product.countDocuments(query);

//     const allCategoryIds = list.flatMap((p) => p.categoryIds || []).filter(Boolean);
//     const categoriesList = await Category.find({ _id: { $in: allCategoryIds } }).lean();
//     const categoryMap = {};
//     categoriesList.forEach((c) => {
//       categoryMap[c._id] = c.name;
//     });

//     const productsFormatted = list.map((p) => ({
//       ...p,
//       id: p._id,
//       categoryNames: (p.categoryIds || [])
//         .map((cid) => categoryMap[cid])
//         .filter(Boolean),
//     }));

//     return NextResponse.json({
//       products: productsFormatted,
//       pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
//     });
//   } catch (error) {
//     if (error.message === 'Unauthorized' || error.message === 'Forbidden')
//       return NextResponse.json({ error: error.message }, { status: 403 });
//     return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
//   }
// }

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const isActive = searchParams.get("isActive") || "";
    const codAvailable = searchParams.get("codAvailable") || "";
    const stockStatus = searchParams.get("stockStatus") || "";

    const offset = (page - 1) * limit;

    await connectToDatabase();

    const matchQuery = {};

    // Product filters
    if (isActive === "true" || isActive === "false") { matchQuery.isActive = isActive === "true" }
    if (codAvailable === "true" || codAvailable === "false") { matchQuery.codAvailable = codAvailable === "true" }

    if (stockStatus === "out") { matchQuery.stock = 0 }
    else if (stockStatus === "low") { matchQuery.stock = { $gt: 0, $lte: 10 } }
    else if (stockStatus === "in") { matchQuery.stock = { $gt: 10 }; }

    const pipeline = [];

    // Apply product-only filters before lookup
    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({
        $match: matchQuery,
      });
    }

    if (search) {
      pipeline.push({
        $lookup: {
          from: "categories",
          localField: "categoryIds",
          foreignField: "_id",
          as: "categories",
        },
      });

      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } },
            { "categories.name": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Pagination + total count
    pipeline.push({
      $facet: {
        products: [ { $sort: { createdAt: -1 } },  { $skip: offset }, { $limit: limit, },

          // Lookup categories for returned products
          {
            $lookup: {
              from: "categories",
              localField: "categoryIds",
              foreignField: "_id",
              as: "categories",
            },
          },

          {
            $project: {
              _id: 1,
              id: "$_id",

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

              categoryNames: "$categories.name",
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    });

    const result = await Product.aggregate(pipeline);

    const products = result[0]?.products || [];
    const total = result[0]?.total[0]?.count || 0;

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {

    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(productSchema, rawBody);

    if (!validation.success) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Validation failed',
          field: firstError?.field,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { name, slug, description, price, discountPrice, stock, images, isActive, codAvailable } = validation.sanitizedData;
    const categoryIds = Array.isArray(rawBody.categoryIds) ? rawBody.categoryIds : [];
    const productLink = rawBody.productLink ? String(rawBody.productLink).trim() : null;

    await connectToDatabase();
    const newProduct = await Product.create({
      _id: crypto.randomUUID(),
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

    return NextResponse.json({ product: { ...newProduct.toObject(), id: newProduct._id } }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
