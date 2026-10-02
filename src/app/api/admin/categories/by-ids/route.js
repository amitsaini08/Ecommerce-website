import { NextResponse } from 'next/server';
import { Category } from '@/lib/db/models';
import { routeHandler } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get('ids') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ categories: [] });

    const rows = await Category.find({ _id: { $in: ids } }).select('name slug').lean();
    return NextResponse.json({ categories: rows });
  },
});