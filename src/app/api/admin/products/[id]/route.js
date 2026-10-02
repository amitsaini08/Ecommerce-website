import { NextResponse } from 'next/server';
import { Product } from '@/lib/db/models';
import { productSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const product = await Product.findById(id).populate('categoryIds', 'name slug').lean();
    if (!product) throw new AppError('Product not found', 404);
    return NextResponse.json({ product });
  },
});

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: productSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
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
    return NextResponse.json({ product: product.toObject() });
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const res = await Product.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new AppError('Product not found', 404);
    return NextResponse.json({ message: 'Deleted' });
  },
});
