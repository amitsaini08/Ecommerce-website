const EVENT = 'notifications:changed';

export const emitNotificationsChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
};

export const onNotificationsChanged = (handler) => {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
};