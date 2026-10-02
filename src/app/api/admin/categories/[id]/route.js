import { NextResponse } from 'next/server';
import { Category } from '@/lib/db/models';
import { validateNoCycle } from '@/lib/categoryHelpers';
import { categorySchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const cat = await Category.findById(id).lean();
    if (!cat) throw new AppError('Category not found', 404);
    return NextResponse.json({ category: cat });
  },
});

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: categorySchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const cat = await Category.findById(id);
    if (!cat) throw new AppError('Category not found', 404);

    if (data.parentId !== undefined || data.parentIds !== undefined) {
      const parentIds = data.parentIds || (data.parentId ? [data.parentId] : []);
      await validateNoCycle(id, parentIds);
      cat.parentIds = parentIds;
      cat.isRoot = cat.parentIds.length === 0;
    }
    if (data.name) cat.name = data.name;
    if (data.slug) cat.slug = data.slug.toLowerCase().replace(/\s+/g, '-');
    if (data.imageUrl !== undefined) cat.imageUrl = data.imageUrl || null;

    await cat.save();
    return NextResponse.json({ category: cat.toObject() });
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const res = await Category.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new AppError('Category not found', 404);
    return NextResponse.json({ message: 'Deleted' });
  },
});