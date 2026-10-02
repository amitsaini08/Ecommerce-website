import { NextResponse } from 'next/server';
import { productSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { productService } from '@/lib/services/productService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await productService.getAdminProductById(id);
    return NextResponse.json(result);
  },
});

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: productSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const result = await productService.updateProduct({ id, data });
    return NextResponse.json(result);
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await productService.deleteProduct(id);
    return NextResponse.json(result);
  },
});
