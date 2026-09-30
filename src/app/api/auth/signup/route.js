import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectToDatabase, User } from '@/lib/db/models';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { signupSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`signup:${ip}`, 5, 60 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(signupSchema, rawBody);

    if (!validation.success) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Validation failed',
          field: firstError?.field,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.sanitizedData;

    await connectToDatabase();
    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await User.findOne({ email: cleanEmail });
    if (user) {
      return NextResponse.json(
        { error: 'An account with this email already exists', field: 'email' },
        { status: 409 }
      );
    }



    const passwordHash = await bcrypt.hash(password, 10);
   
    const newUser = await User.create({
      _id: crypto.randomUUID(),
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'customer',
    });

    return NextResponse.json({
      message: 'Account created!',
      email: newUser.email,
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
