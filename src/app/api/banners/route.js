import { NextResponse } from 'next/server';
import { connectToDatabase, Banner } from '@/lib/db/models';

export async function GET() {
  try {
    await connectToDatabase();
    const activeBanners = await Banner.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ banners: activeBanners.map((b) => ({ ...b, id: b._id })) });
  } catch (error) {
    console.error('Fetch active banners error:', error);
    return NextResponse.json({ banners: [] });
  }
}
