import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Banner } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    await connectToDatabase();
    const allBanners = await Banner.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ banners: allBanners.map((b) => ({ ...b, id: b._id })) });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { title, subtitle, imageUrl, bgColor, linkUrl, isActive, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Banner title is required' }, { status: 400 });
    }

    await connectToDatabase();
    const newBanner = await Banner.create({
      _id: crypto.randomUUID(),
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : null,
      imageUrl: imageUrl ? imageUrl.trim() : null,
      bgColor: bgColor ? bgColor.trim() : '#18181b',
      linkUrl: linkUrl ? linkUrl.trim() : null,
      isActive: isActive ?? true,
      sortOrder: Number(sortOrder || 0),
    });

    return NextResponse.json({ banner: { ...newBanner.toObject(), id: newBanner._id }, message: 'Banner created successfully' }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}
