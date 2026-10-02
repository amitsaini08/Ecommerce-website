import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { parseAndValidate } from '@/lib/sanitization';
import { connectToDatabase } from '@/lib/db/models';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export class AppError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export function routeHandler({ auth = false, roles = null, rateLimit = null, schema = null, handler }) {
    return async (request, context = {}) => {
        try {
            if (rateLimit) {
                const ip = getClientIP(request);
                const rateCheck = await checkRateLimit(
                    `${rateLimit.key}:${ip}`,
                    rateLimit.max,
                    rateLimit.windowSec
                );
                if (!rateCheck.success) {
                    return NextResponse.json(
                        { error: rateLimit.message || 'Too many attempts. Please try again later.' },
                        { status: 429 }
                    );
                }
            }

            await connectToDatabase();

            let user = null;
            if (auth || roles) {
                console.log("Checking authentication for route...");
                user = await getAuthUser(request);
                console.log("Authenticated user:", user);
                if (!user) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
                }
            }

            if (roles) {
                const allowedRoles = Array.isArray(roles) ? roles : [roles];
                const userRole = user.role || 'customer';
                if (!allowedRoles.includes(userRole)) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
            }

            let data;
            if (schema) {
                const rawBody = await request.json().catch(() => ({}));
                const validation = parseAndValidate(schema, rawBody);

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
                data = validation.sanitizedData;
            }

            return await handler(request, { ...context, user, data });
        } catch (error) {
            if (error instanceof AppError) {
                return NextResponse.json({ error: error.message }, { status: error.status });
            }
            console.error('API route error:', error);
            return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
        }
    };
}
