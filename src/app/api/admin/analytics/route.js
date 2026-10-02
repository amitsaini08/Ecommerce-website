import { NextResponse } from 'next/server';
import {  PageView, Order } from '@/lib/db/models';
import { routeHandler } from '../../routeHandler';


export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [currentVisitorsRes, currentViewsCount] = await Promise.all([
      PageView.distinct('visitorId', { createdAt: { $gte: thirtyDaysAgo } }),
      PageView.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    const currentUniqueVisitors = currentVisitorsRes.length;
    const currentTotalViews = currentViewsCount;

    const [prevVisitorsRes, prevViewsCount] = await Promise.all([
      PageView.distinct('visitorId', { createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo } }),
      PageView.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lte: thirtyDaysAgo } }),
    ]);

    const prevUniqueVisitors = prevVisitorsRes.length;
    const prevTotalViews = prevViewsCount;

    const uniqueVisitorsChangePct = prevUniqueVisitors > 0
      ? Math.round(((currentUniqueVisitors - prevUniqueVisitors) / prevUniqueVisitors) * 100)
      : currentUniqueVisitors > 0 ? 100 : 0;

    const pageViewsChangePct = prevTotalViews > 0
      ? Math.round(((currentTotalViews - prevTotalViews) / prevTotalViews) * 100)
      : currentTotalViews > 0 ? 100 : 0;

    const orderStatsRes = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' } } },
    ]);

    const totalOrders = orderStatsRes[0]?.totalOrders || 0;
    const totalRevenue = orderStatsRes[0]?.totalRevenue || 0;

    const dailyData = await PageView.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          uniqueVisitorsSet: { $addToSet: '$visitorId' },
          pageViews: { $sum: 1 },
        },
      },
      {
        $project: {
          date: '$_id',
          uniqueVisitors: { $size: '$uniqueVisitorsSet' },
          pageViews: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    const dailyMap = new Map(dailyData.map((d) => [d.date, d]));
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const monthDayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const found = dailyMap.get(dateStr);
      chartData.push({
        date: monthDayStr,
        fullDate: dateStr,
        visitors: Number(found?.uniqueVisitors || 0),
        views: Number(found?.pageViews || 0),
      });
    }

    const topPagesRes = await PageView.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$path', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 5 },
    ]);

    const deviceRes = await PageView.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $toLower: { $ifNull: ['$device', 'desktop'] } }, count: { $sum: 1 } } },
    ]);

    const deviceMap = {};
    deviceRes.forEach((d) => {
      const rawName = d._id ? String(d._id).toLowerCase() : 'desktop';
      const normName = rawName === 'mobile' ? 'Mobile' : rawName === 'tablet' ? 'Tablet' : 'Desktop';
      deviceMap[normName] = (deviceMap[normName] || 0) + Number(d.count);
    });

    const totalDeviceViews = Object.values(deviceMap).reduce((acc, curr) => acc + curr, 0);
    const deviceBreakdown = Object.entries(deviceMap).map(([name, count]) => ({
      name,
      value: count,
      percentage: totalDeviceViews > 0 ? Math.round((count / totalDeviceViews) * 100) : 0,
    }));

    return NextResponse.json({
      metrics: {
        uniqueVisitors: currentUniqueVisitors,
        uniqueVisitorsChangePct,
        totalPageViews: currentTotalViews,
        pageViewsChangePct,
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        avgSessionDuration: currentTotalViews > 0 ? '2m 35s' : '0m 0s',
      },
      chartData,
      topPages: topPagesRes.map((p) => ({ path: p._id, views: Number(p.views) })),
      deviceBreakdown,
    });
  },
});