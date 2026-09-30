import { NextResponse } from 'next/server';
import { connectToDatabase, Product } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();
    const product = await Product.findById(id) 
    .populate('categoryIds', 'name slug').lean();
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product: { ...product, id: product._id } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, price, discountPrice, categoryIds, stock, images, isActive, codAvailable, productLink, specifications } = body;

    await connectToDatabase();
    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
    if(specifications !== undefined) product.specifications = specifications

    await product.save();

    return NextResponse.json({ product: { ...product.toObject(), id: product._id } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();
    await Product.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
