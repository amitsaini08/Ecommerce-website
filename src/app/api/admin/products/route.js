import { NextResponse } from 'next/server';
import { productSchema } from '@/lib/validations';
import { routeHandler } from '../../routeHandler';
import { productService } from '@/lib/services/productService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive') || '';
    const codAvailable = searchParams.get('codAvailable') || '';
    const stockStatus = searchParams.get('stockStatus') || '';

    const result = await productService.getAdminProducts({ page, limit, search, isActive, codAvailable, stockStatus });
    return NextResponse.json(result);
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: productSchema,
  handler: async (request, { data }) => {
    const result = await productService.createProduct(data);
    return NextResponse.json(result, { status: 201 });
  },
});
