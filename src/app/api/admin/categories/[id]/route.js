import { NextResponse } from 'next/server';
import { categorySchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { categoryService } from '@/lib/services/categoryService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await categoryService.getCategoryById(id);
    return NextResponse.json(result);
  },
});

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: categorySchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const result = await categoryService.updateCategory({ id, data });
    return NextResponse.json(result);
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await categoryService.deleteCategory(id);
    return NextResponse.json(result);
  },
});