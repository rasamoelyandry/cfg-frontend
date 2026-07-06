import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ordersApi } from '../api/orders.js';
import { paymentsApi } from '../api/payments.js';
import { restaurantsApi } from '../api/restaurants.js';
import { useAuthStore } from '../store/auth.js';
import Spinner from '../components/Spinner.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d',    label: '7 jours'     },
  { key: '30d',   label: '30 jours'    },
  { key: 'month', label: 'Ce mois'     },
];

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4'];

const METHOD_LABELS = {
  CASH:         'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MVOLA:        'Mvola',
  AIRTEL_MONEY: 'Airtel Money',
};

const STATUS_ORDER = ['DRAFT', 'PENDING', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED'];
const STATUS_LABELS = {
  DRAFT:     'Brouillon',
  PENDING:   'En attente',
  PREPARING: 'En préparation',
  READY:     'Prêt',
  SERVED:    'Servi',
  PAID:      'Payé',
  CANCELLED: 'Annulé',
};
const STATUS_COLORS = {
  DRAFT:     '#d1d5db',
  PENDING:   '#fbbf24',
  PREPARING: '#f97316',
  READY:     '#34d399',
  SERVED:    '#60a5fa',
  PAID:      '#6366f1',
  CANCELLED: '#f87171',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodStart(period) {
  const now = new Date();
  switch (period) {
    case 'today': { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case '7d':    { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
    case '30d':   { const d = new Date(now); d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d; }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
    default:      return new Date(0);
  }
}

function formatCurrency(amount, currency = 'MGA') {
  const n = Math.round(Number(amount) || 0);
  if (currency === 'MGA') return `${n.toLocaleString('fr-FR')} Ar`;
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n); }
  catch { return `${n.toLocaleString('fr-FR')} ${currency}`; }
}

function fmtDay(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtHour(h) { return `${h}h`; }

function toContent(data) {
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data)) return data;
  return [];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon }) {
  const bg = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50  text-green-600',
    amber:  'bg-amber-50  text-amber-600',
    blue:   'bg-blue-50   text-blue-600',
    rose:   'bg-rose-50   text-rose-600',
  }[color] || 'bg-gray-100 text-gray-600';

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty({ message = 'Aucune donnée sur la période' }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 gap-2 text-gray-300">
      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-xs">{message}</p>
    </div>
  );
}

function RevenueTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg border border-gray-100 rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-indigo-600">{formatCurrency(payload[0]?.value, currency)}</p>
    </div>
  );
}

function GenericTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg border border-gray-100 rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-800">{payload[0]?.value}{unit && ` ${unit}`}</p>
    </div>
  );
}

function CompletionRing({ rate, size = 80 }) {
  const r = 15.9;
  const circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;
  const color = rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#f43f5e';
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className="-rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3" />
      <circle
        cx="18" cy="18" r={r}
        fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { restaurantId } = useParams();
  const user = useAuthStore((s) => s.user);
  const rid = restaurantId || user?.restaurantId;

  const [period, setPeriod]       = useState('7d');
  const [orders, setOrders]       = useState([]);
  const [payments, setPayments]   = useState([]);
  const [currency, setCurrency]   = useState('MGA');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const load = useCallback(() => {
    if (!rid) return;
    setLoading(true);
    setError('');
    Promise.all([
      ordersApi.list(rid, { page: 0, size: 500 }),
      paymentsApi.list(rid, { page: 0, size: 500 }),
      restaurantsApi.get(rid),
    ])
      .then(([od, pd, rd]) => {
        setOrders(toContent(od));
        setPayments(toContent(pd));
        setCurrency(rd?.currency || 'MGA');
      })
      .catch(() => setError('Impossible de charger les données du tableau de bord.'))
      .finally(() => setLoading(false));
  }, [rid]);

  useEffect(() => { load(); }, [load, lastRefresh]);

  // ── Compute all metrics ───────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const start = getPeriodStart(period);

    const filteredOrders   = orders.filter(o => new Date(o.createdAt) >= start);
    const filteredPayments = payments.filter(p => new Date(p.paidAt) >= start);

    // KPIs
    const revenue    = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const paidCount  = filteredOrders.filter(o => o.status === 'PAID').length;
    const avgTicket  = paidCount > 0 ? revenue / paidCount : 0;
    const activeNow  = orders.filter(o => ['PENDING', 'PREPARING', 'READY', 'SERVED'].includes(o.status)).length;

    // Revenue trend (daily or hourly for today)
    let revenueTrend;
    if (period === 'today') {
      const map = {};
      for (let h = 6; h <= 23; h++) map[h] = 0;
      filteredPayments.forEach(p => {
        const h = new Date(p.paidAt).getHours();
        if (h >= 6) map[h] = (map[h] || 0) + Number(p.amount || 0);
      });
      revenueTrend = Object.entries(map).map(([h, v]) => ({ label: fmtHour(Number(h)), value: Math.round(v) }));
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : new Date().getDate();
      const map = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        map[fmtDay(d)] = 0;
      }
      filteredPayments.forEach(p => {
        const key = fmtDay(p.paidAt);
        if (key in map) map[key] += Number(p.amount || 0);
      });
      revenueTrend = Object.entries(map).map(([label, value]) => ({ label, value: Math.round(value) }));
    }

    // Top dishes (from paid orders)
    const dishMap = {};
    filteredOrders
      .filter(o => o.status === 'PAID')
      .forEach(o => (o.items || []).forEach(it => {
        if (it.status !== 'CANCELLED') {
          const name = it.menuItemName || '?';
          dishMap[name] = (dishMap[name] || 0) + (it.quantity || 1);
        }
      }));
    const topDishes = Object.entries(dishMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 22) + '…' : name, count }))
      .reverse();

    // Payment methods
    const methodMap = {};
    filteredPayments.forEach(p => {
      const label = METHOD_LABELS[p.method] || p.method;
      methodMap[label] = (methodMap[label] || 0) + Number(p.amount || 0);
    });
    const paymentMethods = Object.entries(methodMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);

    // Peak hours (all non-cancelled orders in period)
    const hourMap = {};
    for (let h = 6; h <= 23; h++) hourMap[h] = 0;
    filteredOrders
      .filter(o => o.status !== 'CANCELLED' && o.status !== 'DRAFT')
      .forEach(o => {
        const h = new Date(o.createdAt).getHours();
        if (h >= 6) hourMap[h] = (hourMap[h] || 0) + 1;
      });
    const peakHours = Object.entries(hourMap).map(([h, count]) => ({ label: fmtHour(Number(h)), count }));

    // Status breakdown
    const statusMap = {};
    filteredOrders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    const statusBreakdown = STATUS_ORDER
      .filter(s => statusMap[s])
      .map(s => ({ status: s, label: STATUS_LABELS[s], count: statusMap[s], color: STATUS_COLORS[s] }));

    // Completion rate
    const paid       = statusMap['PAID']      || 0;
    const cancelled  = statusMap['CANCELLED'] || 0;
    const completionRate = (paid + cancelled) > 0 ? Math.round((paid / (paid + cancelled)) * 100) : null;

    // Avg preparation time (sentToKitchenAt → completedAt, PAID orders only)
    const prepTimes = filteredOrders
      .filter(o => o.status === 'PAID' && o.sentToKitchenAt && o.completedAt)
      .map(o => (new Date(o.completedAt) - new Date(o.sentToKitchenAt)) / 60000);
    const avgPrepMin = prepTimes.length > 0
      ? Math.round(prepTimes.reduce((s, t) => s + t, 0) / prepTimes.length)
      : null;

    return {
      revenue, paidCount, avgTicket, activeNow,
      revenueTrend, topDishes, paymentMethods, peakHours,
      statusBreakdown, completionRate, avgPrepMin,
      totalInPeriod: filteredOrders.length,
    };
  }, [orders, payments, period]);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
  );

  if (error) return (
    <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
      {error}
      <button onClick={load} className="ml-4 text-red-600 underline text-xs">Réessayer</button>
    </div>
  );

  const hasRevenue   = metrics.revenueTrend.some(d => d.value > 0);
  const hasDishes    = metrics.topDishes.length > 0;
  const hasMethods   = metrics.paymentMethods.length > 0;
  const hasPeakData  = metrics.peakHours.some(h => h.count > 0);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {metrics.totalInPeriod} commande{metrics.totalInPeriod !== 1 ? 's' : ''} sur la période
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLastRefresh(Date.now())}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Rafraîchir"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p.key
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Chiffre d'affaires"
          value={formatCurrency(metrics.revenue, currency)}
          color="indigo"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Commandes payées"
          value={metrics.paidCount}
          color="green"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Ticket moyen"
          value={metrics.paidCount > 0 ? formatCurrency(metrics.avgTicket, currency) : '—'}
          sub={metrics.paidCount > 0 ? 'par commande payée' : 'aucune commande payée'}
          color="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <KpiCard
          label="En cours maintenant"
          value={metrics.activeNow}
          sub={metrics.activeNow === 0 ? 'aucune commande active' : `commande${metrics.activeNow > 1 ? 's' : ''} en salle`}
          color={metrics.activeNow > 0 ? 'blue' : 'rose'}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Revenue chart + Payment methods ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <SectionCard
          title="Revenus"
          subtitle={period === 'today' ? "Chiffre d'affaires par heure" : "Chiffre d'affaires par jour"}
          className="lg:col-span-2"
        >
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={metrics.revenueTrend} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  interval={period === '30d' ? 4 : 'preserveStartEnd'}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v.toLocaleString('fr-FR')}
                  width={60}
                />
                <Tooltip content={<RevenueTooltip currency={currency} />} />
                <Area
                  type="monotone" dataKey="value" name="Revenus"
                  stroke="#6366f1" strokeWidth={2}
                  fill="url(#gradRevenue)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 210 }}><Empty /></div>
          )}
        </SectionCard>

        <SectionCard title="Moyens de paiement" subtitle="Répartition du CA encaissé">
          {hasMethods ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={metrics.paymentMethods}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {metrics.paymentMethods.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {metrics.paymentMethods.map((m, i) => {
                  const pct = metrics.revenue > 0 ? Math.round((m.value / metrics.revenue) * 100) : 0;
                  return (
                    <div key={m.name} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-gray-600 flex-1 truncate">{m.name}</span>
                      <span className="text-xs text-gray-400">{pct}%</span>
                      <span className="text-xs font-semibold text-gray-800">{formatCurrency(m.value, currency)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ height: 210 }}><Empty message="Aucun paiement enregistré" /></div>
          )}
        </SectionCard>
      </div>

      {/* ── Top dishes + Peak hours ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard title="Top plats commandés" subtitle="Quantités vendues sur commandes payées">
          {hasDishes ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={metrics.topDishes}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category" dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: '#374151' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f5f3ff' }}
                  formatter={v => [v, 'vendus']}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {metrics.topDishes.map((_, i, arr) => (
                    <Cell
                      key={i}
                      fill={i === arr.length - 1 ? '#6366f1' : i === arr.length - 2 ? '#818cf8' : '#a5b4fc'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260 }}><Empty message="Aucun plat vendu sur la période" /></div>
          )}
        </SectionCard>

        <SectionCard title="Heures de pointe" subtitle="Nombre de commandes par heure (6h–23h)">
          {hasPeakData ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={metrics.peakHours} margin={{ top: 0, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: '#fefce8' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white shadow-lg border border-gray-100 rounded-lg px-3 py-2 text-xs">
                        <p className="text-gray-500">{label}</p>
                        <p className="font-bold text-amber-600">{payload[0]?.value} commande{payload[0]?.value > 1 ? 's' : ''}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24}>
                  {metrics.peakHours.map((h, i) => {
                    const max = Math.max(...metrics.peakHours.map(x => x.count));
                    const intensity = max > 0 ? h.count / max : 0;
                    const color = intensity > 0.75 ? '#f59e0b' : intensity > 0.4 ? '#fbbf24' : '#fde68a';
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260 }}><Empty /></div>
          )}
        </SectionCard>
      </div>

      {/* ── Indicateurs opérationnels ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Taux de complétion */}
        <SectionCard title="Taux de complétion" subtitle="Commandes payées vs annulées">
          {metrics.completionRate !== null ? (
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <CompletionRing rate={metrics.completionRate} size={72} />
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-gray-900">
                  {metrics.completionRate}%
                </span>
              </div>
              <div className="space-y-2 flex-1">
                {metrics.statusBreakdown
                  .filter(s => ['PAID', 'CANCELLED'].includes(s.status))
                  .map(s => (
                    <div key={s.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-500">{s.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{s.count}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Aucune commande clôturée</p>
          )}
        </SectionCard>

        {/* Statuts en cours */}
        <SectionCard title="Répartition des statuts" subtitle="Toutes les commandes de la période">
          {metrics.statusBreakdown.length > 0 ? (
            <div className="space-y-2">
              {metrics.statusBreakdown.map(s => {
                const pct = Math.round((s.count / metrics.totalInPeriod) * 100);
                return (
                  <div key={s.status}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-600">{s.label}</span>
                      <span className="font-medium text-gray-800">{s.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Aucune commande sur la période</p>
          )}
        </SectionCard>

        {/* Temps moyen de préparation */}
        <SectionCard title="Temps de préparation" subtitle="Cuisine → clôture, commandes payées">
          <div className="flex flex-col items-center justify-center h-full py-2 gap-1">
            {metrics.avgPrepMin !== null ? (
              <>
                <p className="text-4xl font-bold text-gray-900">{metrics.avgPrepMin}<span className="text-lg font-normal text-gray-400 ml-1">min</span></p>
                <p className="text-xs text-gray-400">temps moyen</p>
                <p className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                  metrics.avgPrepMin <= 15 ? 'bg-green-100 text-green-700' :
                  metrics.avgPrepMin <= 30 ? 'bg-amber-100 text-amber-700' :
                                             'bg-red-100 text-red-700'
                }`}>
                  {metrics.avgPrepMin <= 15 ? 'Excellent' : metrics.avgPrepMin <= 30 ? 'Correct' : 'À améliorer'}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400 italic text-center">Données insuffisantes<br />(nécessite envoi en cuisine + clôture)</p>
            )}
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
