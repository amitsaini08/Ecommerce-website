import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectToDatabase, User } from '@/lib/db/models';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { signupSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';
import { routeHandler } from '../../routeHandler';


export const POST = routeHandler({
  schema: signupSchema,
  rateLimit: { key: 'signup', max: 5, windowSec: 60 * 60 },
  handler: async (request, { data }) => {
    const { name, email, password } = data;
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
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'customer',
    });

    return NextResponse.json({ message: 'Account created!', email: newUser.email });
  },
});
