import { NextResponse } from 'next/server';
import { storeSettingsSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { settingsService } from '@/lib/services/settingsService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async () => {
    const result = await settingsService.getSettings();
    return NextResponse.json(result);
  },
});

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: storeSettingsSchema,
  handler: async (request, { data }) => {
    const result = await settingsService.updateSettings(data);
    return NextResponse.json(result);
  },
});
