import { NextResponse } from 'next/server';
import { connectToDatabase, Product, Category } from '@/lib/db/models';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    await connectToDatabase();
    const product = await Product.findOne({ slug }).lean();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    let categoryName = null;
    let categorySlug = null;
    let categories = [];
    if (product.categoryIds && product.categoryIds.length > 0) {
      const catList = await Category.find({ _id: { $in: product.categoryIds } }).lean();
      categories = catList.map((c) => ({ id: c._id, name: c.name, slug: c.slug }));
      if (catList.length > 0) {
        categoryName = catList[0].name;
        categorySlug = catList[0].slug;
      }
    }

    const { productLink, ...rest } = product;

    return NextResponse.json({
      product: {
        ...rest,
        _id: product._id,
        categoryName,
        categorySlug,
        categories,
      },
    });
  } catch (error) {
    console.error('Product detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
