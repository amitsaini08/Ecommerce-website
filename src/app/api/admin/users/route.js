import { NextResponse } from 'next/server';
import { connectToDatabase, User } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    await connectToDatabase();
    const list = await User.find()
      .select('_id name email role isVerified createdAt')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const count = await User.countDocuments();
    return NextResponse.json({
      users: list.map((u) => ({ ...u, id: u._id })),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { userId, role } = await request.json();
    if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 });

    await connectToDatabase();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    user.role = role;
    await user.save();

    return NextResponse.json({ user: { ...user.toObject(), id: user._id } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
