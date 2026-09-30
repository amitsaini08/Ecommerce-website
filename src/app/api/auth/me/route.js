import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectToDatabase, User } from '@/lib/db/models';

export async function GET(request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const dbUser = await User.findById(authUser.id)
      .select('_id name email phone role avatarUrl')
      .lean();

    if (dbUser) {
      return NextResponse.json({
        user: {
          id: dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone,
          role: dbUser.role,
          avatarUrl: dbUser.avatarUrl,
        },
      });
    }

    return NextResponse.json({ user: authUser });
  } catch (error) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
}
