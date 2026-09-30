import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase, User } from '@/lib/db/models';
import { generateTokens, setAuthCookies } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { loginSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`login:${ip}`, 5, 15 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(loginSchema, rawBody);

    if (!validation.success) {
      const firstField = validation.errors[0];
      return NextResponse.json(
        {
          error: firstField?.message || 'Validation failed',
          field: firstField?.field,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.sanitizedData;

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password', field: 'email' },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password', field: 'password' },
        { status: 401 }
      );
    }
    

    const tokens = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      message: 'Login successful!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });

    return setAuthCookies(response, tokens);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
