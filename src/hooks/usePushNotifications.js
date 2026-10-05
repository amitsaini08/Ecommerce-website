'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '@/lib/apiClient/notifications';

const urlBase64ToUint8Array = (base64) => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const isSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

async function getRegistration() {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

export async function syncPushSubscription() {
  if (!isSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await getRegistration();
    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      }));
    await notificationsApi.subscribePush(sub.toJSON()); 
    return true;
  } catch {
    return false;
  }
}

export async function removePushSubscription() {
  if (!isSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await notificationsApi.unsubscribePush(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  } catch {}
}



export function usePushNotifications() {
  const [permission, setPermission] = useState('default'); 
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupported()) return setPermission('unsupported');
    setPermission(Notification.permission);

    navigator.serviceWorker
      .getRegistration('/sw.js')
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return false;
      const ok = await syncPushSubscription();
      setSubscribed(ok);
      return ok;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    await removePushSubscription();
    setSubscribed(false);
    setBusy(false);
  }, []);

  return { permission, subscribed, busy, enable, disable };
}