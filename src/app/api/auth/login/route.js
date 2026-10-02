import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { User } from '@/lib/db/models';
import { generateTokens, setAuthCookies } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { routeHandler } from '../../routeHandler';


export const POST = routeHandler({
  schema: loginSchema,
  // rateLimit: { key: 'login', max: 5, windowSec: 15 * 60 },
  handler: async (request,{data}) => {
   
    const { email, password } = data;
    const user = await User.findOne({ email }).lean();

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Account does not exist with this email.', field: 'email' },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid password', field: 'password' },
        { status: 401 }
      );
    }
    
    const tokens = generateTokens({
      _id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      message: 'Login successful!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });

    return setAuthCookies(response, tokens);
  }
})
