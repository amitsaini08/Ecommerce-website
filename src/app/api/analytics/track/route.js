import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { connectToDatabase, PageView } from '@/lib/db/models';

export async function POST(req) {
  try {
    const body = await req.json();
    const { path, userAgent = '' } = body;

    if (!path || path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ success: false });
    }

    const cookieStore = await cookies();
    let visitorId = cookieStore.get('nova_visitor_id')?.value || cookieStore.get('hh_visitor_id')?.value;
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

    await connectToDatabase();
    await PageView.create({
      _id: crypto.randomUUID(),
      visitorId,
      path: path.split('?')[0],
      userAgent,
      device,
      referrer: req.headers.get('referer') || null,
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
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
