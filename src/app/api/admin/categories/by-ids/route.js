// src/app/api/admin/categories/by-ids/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase, Category } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';


export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get('ids') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ categories: [] });

    await connectToDatabase();
    const rows = await Category.find({ _id: { $in: ids } }).select('name slug').lean();
    return NextResponse.json({ categories: rows.map((c) => ({ ...c, id: c._id })) });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}