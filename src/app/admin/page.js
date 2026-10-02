'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  ShoppingCart,
  Users,
  IndianRupee,
  AlertTriangle,
  ArrowRight,
  Eye,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/cn';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Alert from '@/components/ui/Alert';

const POLL_MS = 30000;

// recharts CSS classes nahi leta, isliye hex yahin ek jagah
const CHART = { views: '#4f46e5', visitors: '#10b981', grid: '#f1f5f9', tick: '#64748b' };

const TONES = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
};

const DEVICE_ICONS = { Mobile: Smartphone, Tablet: Tablet };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async ({ manual = false, signal } = {}) => {
    if (manual) setRefreshing(true);

    try {
      const [statsRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/stats', { signal }),
        fetch('/api/admin/analytics', { signal }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());

      if (!statsRes.ok || !analyticsRes.ok) {
        setError('Some dashboard data could not be loaded.');
      } else {
        setError('');
        setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Could not reach the server. Retrying automatically.');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData({ signal: controller.signal });

    // tab hidden ho to polling skip
    const id = setInterval(() => {
      if (!document.hidden) loadData({ signal: controller.signal });
    }, POLL_MS);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [loadData]);

  const metrics = analytics?.metrics;

  const statCards = [
    {
      label: '30-day visitors',
      value: formatNumber(metrics?.uniqueVisitors),
      change: metrics?.uniqueVisitorsChangePct,
      icon: Users,
      tone: 'blue',
    },
    {
      label: '30-day page views',
      value: formatNumber(metrics?.totalPageViews),
      change: metrics?.pageViewsChangePct,
      icon: Eye,
      tone: 'indigo',
    },
    {
      label: 'Total orders',
      value: formatNumber(stats?.totalOrders),
      icon: ShoppingCart,
      tone: 'emerald',
    },
    {
      label: 'Total revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: IndianRupee,
      tone: 'amber',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time storefront performance, traffic metrics, and inventory alerts."
        actions={
          <>
            <Badge tone="success" className="gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live (30s)
            </Badge>
            {lastUpdated && (
              <span className="hidden text-xs text-warm-400 sm:inline">Updated {lastUpdated}</span>
            )}
            <IconButton
              label="Refresh now"
              title="Refresh now"
              onClick={() => loadData({ manual: true })}
              disabled={refreshing}
              className="border border-warm-200"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </IconButton>
          </>
        }
      />

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-warm-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          {/* Traffic + devices */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card
              className="lg:col-span-2"
              title="Store traffic (last 30 days)"
              description="Unique visitors and total page views per day"
              actions={
                <div className="hidden items-center gap-3 text-xs font-semibold sm:flex">
                  <span className="flex items-center gap-1.5 text-indigo-600">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" /> Page views
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Visitors
                  </span>
                </div>
              }
            >
              <div className="h-56 w-full">
                {analytics?.chartData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics.chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART.views} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={CHART.views} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART.visitors} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={CHART.visitors} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: CHART.tick }}
                        tickLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: CHART.tick }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          fontSize: 12,
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        name="Page views"
                        stroke={CHART.views}
                        strokeWidth={2}
                        fill="url(#colorViews)"
                      />
                      <Area
                        type="monotone"
                        dataKey="visitors"
                        name="Unique visitors"
                        stroke={CHART.visitors}
                        strokeWidth={2}
                        fill="url(#colorVisitors)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-center text-sm text-warm-400">
                    No traffic recorded in the last 30 days.
                  </p>
                )}
              </div>
            </Card>

            <Card
              title="Device breakdown"
              description="Traffic by visitor device"
              className="flex flex-col"
            >
              <div className="flex-1 space-y-4">
                {analytics?.deviceBreakdown?.length > 0 ? (
                  analytics.deviceBreakdown.map((dev) => {
                    const Icon = DEVICE_ICONS[dev.name] || Monitor;
                    return (
                      <div key={dev.name} className="space-y-1.5">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="flex items-center gap-1.5 text-warm-700">
                            <Icon className="h-4 w-4 text-warm-500" /> {dev.name}
                          </span>
                          <span className="text-warm-900">
                            {dev.percentage}% ({formatNumber(dev.value)})
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-warm-100">
                          <div
                            className="h-full rounded-full bg-brand-600 transition-all duration-500"
                            style={{ width: `${dev.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-4 text-center text-sm text-warm-400">No device data yet.</p>
                )}
              </div>

              <div className="mt-4 flex justify-between border-t border-warm-100 pt-3 text-sm text-warm-500">
                <span>Avg session duration</span>
                <span className="font-bold text-warm-900">{metrics?.avgSessionDuration || '0m 0s'}</span>
              </div>
            </Card>
          </div>

          {/* Top pages + low stock */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Most visited pages (30 days)">
              {analytics?.topPages?.length > 0 ? (
                <ul className="divide-y divide-warm-100">
                  {analytics.topPages.map((page, idx) => (
                    <li key={page.path} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warm-100 text-xs font-bold text-warm-700">
                          {idx + 1}
                        </span>
                        <span className="truncate font-mono text-warm-800">{page.path}</span>
                      </div>
                      <Badge className="shrink-0 bg-warm-100 text-warm-800">
                        {formatNumber(page.views)} views
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-warm-400">No page views tracked yet.</p>
              )}
            </Card>

            <Card
              title={
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Low stock alerts (≤ 5)
                </>
              }
              actions={
                <Button href="/admin/products" variant="ghost" size="sm" className="text-brand-600">
                  Manage products <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              {stats?.lowStockProducts?.length > 0 ? (
                <ul className="space-y-2">
                  {stats.lowStockProducts.map((p) => (
                    <li
                      key={p._id || p.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold text-warm-900">{p.name}</span>
                      <Badge tone="warning" className="shrink-0">
                        {p.stock} left
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-warm-400">
                  All active products have healthy stock (&gt; 5 units).
                </p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// Sirf dashboard mein use hota hai
function StatCard({ label, value, change, icon: Icon, tone }) {
  const hasChange = typeof change === 'number';
  const up = change >= 0;
  const Trend = up ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-warm-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-warm-500">{label}</span>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', TONES[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="text-2xl font-bold tracking-tight text-warm-900">{value}</p>

      {hasChange && (
        <p
          className={cn(
            'mt-1 inline-flex items-center gap-1 text-xs font-semibold',
            up ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          <Trend className="h-3.5 w-3.5" />
          {Math.abs(change)}% vs prev 30d
        </p>
      )}
    </div>
  );
}