import { emitNotificationsChanged } from '../notificationEvents';
import { api } from './client';

const synced = (promise) =>
    promise.then((res) => {
        emitNotificationsChanged();
        return res;
    });

export const notificationsApi = {
  list: (query = '', opts) => api.get(`/api/notifications${query}`, opts),
  markRead: (id) => synced(api.patch(`/api/notifications/${id}`)),
  markAllRead: (forRole = 'customer') => synced(api.post(`/api/notifications/read-all?forRole=${forRole}`, {})),
  remove: (id) => synced(api.del(`/api/notifications/${id}`)),
  subscribePush: (subscription) => api.post('/api/push/subscribe', subscription),
  unsubscribePush: (endpoint) => api.del('/api/push/subscribe', { body: { endpoint } }),
};