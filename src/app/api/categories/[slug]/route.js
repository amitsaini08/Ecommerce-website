import { NextResponse } from 'next/server';
import { connectToDatabase, Category, Product } from '@/lib/db/models';
import { getAllDescendantIds } from '@/lib/categoryHelpers';
import { routeHandler } from '../../routeHandler';



export const GET = routeHandler({
  handler: async (request, { params }) => {
    const { slug } = await params;

    const category = await Category.findOne({ slug }).lean();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const subcategories = await Category.find({ parentIds: category._id }).lean();
    const descendantIds = await getAllDescendantIds(category._id);
    const relevantCategoryIds = [category._id, ...Array.from(descendantIds)];

    const categoryProducts = await Product.find({ categoryIds: { $in: relevantCategoryIds }, isActive: true })
      .sort({ createdAt: -1 }).limit(20).lean();

    const sanitizedProducts = categoryProducts.map((p) => {
      const { productLink, ...rest } = p;
      return rest ;
    });

    return NextResponse.json({ category,  subcategories,  products: sanitizedProducts});
  },
});
