import { NextResponse } from 'next/server';
import { connectToDatabase, Banner } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { title, subtitle, imageUrl, bgColor, linkUrl, isActive, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Banner title is required' }, { status: 400 });
    }

    await connectToDatabase();
    const banner = await Banner.findById(id);
    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    banner.title = title.trim();
    banner.subtitle = subtitle ? subtitle.trim() : null;
    banner.imageUrl = imageUrl ? imageUrl.trim() : null;
    banner.bgColor = bgColor ? bgColor.trim() : '#18181b';
    banner.linkUrl = linkUrl ? linkUrl.trim() : null;
    banner.isActive = isActive ?? true;
    banner.sortOrder = Number(sortOrder || 0);

    await banner.save();

    return NextResponse.json({ banner: { ...banner.toObject(), id: banner._id }, message: 'Banner updated successfully' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();
    const res = await Banner.deleteOne({ _id: id });

    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}
