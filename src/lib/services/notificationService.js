import webpush from 'web-push';
import { Notification, PushSubscription, User } from '@/lib/db/models';
import { emitToUser } from '@/lib/broadcast';
import { AppError } from '@/app/api/routeHandler';
import { formatCurrency } from '@/lib/utils';

if (process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

const toPayload = (n) => ({
    id: String(n._id),
    type: n.type,
    title: n.title,
    forRole: n.forRole || 'customer',
    body: n.body || '',
    link: n.link || '/',
    isRead: n.isRead,
    createdAt: n.createdAt,
});

const METHOD_LABEL = { cod: 'COD', razorpay: 'Online' };
export const orderRef = (order) => String(order._id).slice(-6).toUpperCase();

async function sendPush(userId, payload) {
    if (!process.env.VAPID_PRIVATE_KEY) return;

    const subs = await PushSubscription.find({ userId }).lean();
    const message = JSON.stringify({ title: payload.title, body: payload.body, link: payload.link, id: payload.id });

    await Promise.allSettled(
        subs.map(async (s) => {
            try {
                await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, message);
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await PushSubscription.deleteOne({ _id: s._id });
                }
            }
        })
    );
}

export const notificationService = {

    async notify({ userId, type, title, body, link, data, forRole = 'customer' }) {
        console.log('notify', { userId, type, title, body, link, data, forRole });
        const doc = await Notification.create({ userId, type, title, body, link, data, forRole });
        console.log("doc", doc);
        const payload = toPayload(doc);

        emitToUser(userId, 'notification:new', payload);
        await sendPush(userId, payload);
        return doc;
    },

    async notifyAdmins(args) {
        const admins = await User.find({ role: 'admin' }).select('_id').lean();
        await Promise.allSettled(admins.map((a) => this.notify({ ...args, userId: a._id, forRole: 'admin' })));
    },

    async list({ userId, page = 1, limit = 15, unreadOnly = false, forRole = 'customer' }) {
        const base = { userId, forRole };
        const filter = { ...base, ...(unreadOnly && { isRead: false }) };
        const [items, total, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ ...base, isRead: false }),
        ]);
        return {
            notifications: items.map(toPayload),
            unreadCount,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    async markRead({ userId, id }) {
        const r = await Notification.updateOne({ _id: id, userId }, { isRead: true, readAt: new Date() });
        if (r.matchedCount === 0) throw new AppError('Notification not found', 404);
        return { success: true };
    },

    async markAllRead({ userId, forRole = 'customer' }) {
        await Notification.updateMany({ userId, forRole, isRead: false }, { isRead: true, readAt: new Date() });
        return { success: true };
    },

    async remove({ userId, id }) {
        await Notification.deleteOne({ _id: id, userId });
        return { success: true };
    },

    async subscribe({ userId, subscription, userAgent }) {
        await PushSubscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            { userId, keys: subscription.keys, userAgent },
            { upsert: true }
        );
        return { success: true };
    },

    async unsubscribe({ userId, endpoint }) {
        await PushSubscription.deleteOne({ endpoint, userId });
        return { success: true };
    },

    async notifySafe(args) {
        try { await this.notify(args); } catch (e) { console.error('notify failed', e); }
    },


    async notifyAdminsSafe(args) {
        try { await this.notifyAdmins(args); } catch (e) { console.error('notifyAdmins failed', e); }
    },
    orderPlaced({ order }) {
        const ref = orderRef(order);
        if (order.userId) {
            this.notifySafe({
                userId: order.userId, type: 'order_placed', title: 'Order placed',
                body: `Your order #${ref} has been received.`, link: `/orders/${order._id}`,
            });
        }
        this.notifyAdminsSafe({
            type: 'order_placed', title: 'New order received',
            body: `Order #${ref} (${METHOD_LABEL[order.paymentMethod] || 'Online'}) of ${formatCurrency(order.totalAmount)}`,
            link: `/admin/orders/${order._id}`,
        });
    },

    orderUpdate(order, title, body) {
        if (!order.userId) return;
        this.notifySafe({ userId: order.userId, type: 'order_status', title, body, link: `/orders/${order._id}` });
    },

    adminOrderAlert(order, title, body) {
        this.notifyAdminsSafe({ type: 'order_status', title, body, link: `/admin/orders/${order._id}` });
    },
};