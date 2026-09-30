
import { NextResponse } from 'next/server';
import { connectToDatabase, Category } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';
import { validateNoCycle } from '@/lib/categoryHelpers';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await connectToDatabase();
    const cat = await Category.findById(id).lean();
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ category: { ...cat, id: cat._id } });
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
    await connectToDatabase();
    const cat = await Category.findById(id);
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.parentIds !== undefined) {
      await validateNoCycle(id, body.parentIds || []);
      cat.parentIds = body.parentIds || [];
      cat.isRoot = cat.parentIds.length === 0; // keep the denormalized flag in sync
    }
    if (body.name) cat.name = body.name;
    if (body.slug) cat.slug = body.slug.toLowerCase().replace(/\s+/g, '-');
    if (body.imageUrl !== undefined) cat.imageUrl = body.imageUrl || null;

    await cat.save();
    return NextResponse.json({ category: { ...cat.toObject(), id: cat._id } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.message?.includes('parent') || error.message?.includes('cycle'))
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();
    await Category.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}