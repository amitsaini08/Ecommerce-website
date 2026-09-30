import { NextResponse } from 'next/server';
import { connectToDatabase, Category, Product } from '@/lib/db/models';
import { getAllDescendantIds } from '@/lib/categoryHelpers';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    await connectToDatabase();
    const category = await Category.findOne({ slug }).lean();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const subcategories = await Category.find({ parentIds: category._id }).lean();

    const descendantIds = await getAllDescendantIds(category._id);
    const relevantCategoryIds = [category._id, ...Array.from(descendantIds)];

    const categoryProducts = await Product.find({ categoryIds: { $in: relevantCategoryIds }, isActive: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const sanitizedProducts = categoryProducts.map((p) => {
      const { productLink, ...rest } = p;
      return { ...rest, id: p._id };
    });

    return NextResponse.json({
      category: { ...category, id: category._id },
      subcategories: subcategories.map((s) => ({ ...s, id: s._id })),
      products: sanitizedProducts,
    });
  } catch (error) {
    console.error('Category detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}
