import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectToDatabase, User } from '@/lib/db/models';
import { routeHandler } from '../../routeHandler';


export const GET = routeHandler({
  auth: true,
  roles: ['admin', 'customer'],
  handler: async (request, { user }) => {
    const authUser = user;
    const dbUser = await User.findById(authUser.id).select('_id name email phone role avatarUrl').lean();

    if (dbUser) {
      return NextResponse.json({
        user: {
          _id: dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone,
          role: dbUser.role,
          avatarUrl: dbUser.avatarUrl,
        },
      });
    }

    return NextResponse.json({ user: authUser });
  }
});
