import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { PageView } from '@/lib/db/models';
import { routeHandler } from '@/app/api/routeHandler';
import { z } from 'zod';

const trackSchema = z.object({
  path: z.string(),
  userAgent: z.string().optional(),
});

export const POST = routeHandler({
  schema: trackSchema,
  handler: async (request, { data }) => {
    const { path, userAgent = '' } = data;

    if (!path || path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ success: false });
    }

    const cookieStore = await cookies();
    let visitorId = cookieStore.get('nova_visitor_id')?.value;
    let newCookieSet = false;

    if (!visitorId) {
      visitorId = crypto.randomUUID();
      newCookieSet = true;
    }

    let device = 'desktop';
    const ua = userAgent.toLowerCase();
    if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobile'))) {
      device = 'tablet';
    } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod') || ua.includes('android')) {
      device = 'mobile';
    }

    await PageView.create({
      visitorId,
      path: path.split('?')[0],
      userAgent,
      device,
      referrer: request.headers.get('referer') || null,
    });

    const response = NextResponse.json({ success: true });

    if (newCookieSet) {
      response.cookies.set('nova_visitor_id', visitorId, {
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
    }

    return response;
  },
});