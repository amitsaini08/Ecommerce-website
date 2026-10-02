import { NextResponse } from 'next/server';
import { Product } from '@/lib/db/models';
import { productSchema } from '@/lib/validations';
import { routeHandler } from '../../routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive") || "";
    const codAvailable = searchParams.get("codAvailable") || "";
    const stockStatus = searchParams.get("stockStatus") || "";
    const offset = (page - 1) * limit;

    const matchQuery = {};
    if (isActive === "true" || isActive === "false") { matchQuery.isActive = isActive === "true"; }
    if (codAvailable === "true" || codAvailable === "false") { matchQuery.codAvailable = codAvailable === "true"; }
    if (stockStatus === "out") { matchQuery.stock = 0; }
    else if (stockStatus === "low") { matchQuery.stock = { $gt: 0, $lte: 10 }; }
    else if (stockStatus === "in") { matchQuery.stock = { $gt: 10 }; }

    const pipeline = [];

    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({ $match: matchQuery });
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

    pipeline.push({
      $facet: {
        products: [
          { $sort: { createdAt: -1 } },
          { $skip: offset },
          { $limit: limit },
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

    return NextResponse.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: productSchema,
  handler: async (request, { data }) => {
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

    return NextResponse.json({ product: newProduct.toObject() }, { status: 201 });
  },
});
