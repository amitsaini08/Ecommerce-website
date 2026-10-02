import { NextResponse } from 'next/server';
import { Product, Category } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: false,
  handler: async (request, { params }) => {
    const { slug } = await params;
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

    return NextResponse.json({
      product: {
        ...rest,
        categoryName,
        categorySlug,
        categories,
      },
    });
  },
});