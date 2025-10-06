'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  CreditCard,
  Tag,
  Activity,
  MapPin,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DashboardData {
  totalSales: number;
  totalBookings: number;
  totalHours: number;
  avgHourlyRate: number;
  newCustomers: number;
  pendingPayments: number;
  totalDiscounts: number;
  avgBookingPrice: number;
  salesTrend: Array<{ date: string; sales: number; bookings: number }>;
  topCleaners: Array<{ name: string; sales: number; hours: number }>;
  materialsRatio: Array<{ name: string; value: number }>;
  topAreas: Array<{ area: string; bookings: number; sales: number }>;
  allAreas: string[];
}

interface AreaStats {
  bookings: number;
  sales: number;
  avgPrice: number;
}

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export default function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('today');
  const [dateRange, setDateRange] = useState({
    start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    end: format(endOfDay(new Date()), 'yyyy-MM-dd'),
  });
  const [tempDateRange, setTempDateRange] = useState({
    start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    end: format(endOfDay(new Date()), 'yyyy-MM-dd'),
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [areaStats, setAreaStats] = useState<AreaStats | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [dateRange]);

  useEffect(() => {
    if (selectedArea && data) {
      calculateAreaStats(selectedArea);
    }
  }, [selectedArea, data]);

  const handleQuickFilter = (filter: QuickFilter) => {
    setActiveFilter(filter);
    setShowCustomPicker(filter === 'custom');

    if (filter === 'custom') {
      setTempDateRange(dateRange);
      return;
    }

    const now = new Date();
    let start: Date;
    let end: Date;

    switch (filter) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'thisWeek':
        start = startOfWeek(now, { weekStartsOn: 0 });
        end = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        start = startOfWeek(lastWeek, { weekStartsOn: 0 });
        end = endOfWeek(lastWeek, { weekStartsOn: 0 });
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'thisYear':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfDay(now);
        end = endOfDay(now);
    }

    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    });
  };

  const applyCustomRange = () => {
    setDateRange(tempDateRange);
    setShowCustomPicker(false);
  };

  const calculateAreaStats = (area: string) => {
    if (!data) return;

    const { data: baseData } = supabase
      .from('vw_reports_base')
      .select('final_price')
      .eq('client_area', area)
      .gte('booking_date', dateRange.start)
      .lte('booking_date', dateRange.end)
      .then(result => {
        if (result.data && result.data.length > 0) {
          const bookings = result.data.length;
          const sales = result.data.reduce((sum, b) => sum + Number(b.final_price || 0), 0);
          const avgPrice = sales / bookings;
          setAreaStats({ bookings, sales, avgPrice });
        } else {
          setAreaStats({ bookings: 0, sales: 0, avgPrice: 0 });
        }
      });
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data: pageData, error } = await supabase
          .from('vw_reports_base')
          .select('*')
          .gte('booking_date', dateRange.start)
          .lte('booking_date', dateRange.end)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Error fetching data:', error);
          break;
        }

        if (pageData && pageData.length > 0) {
          allData = [...allData, ...pageData];
          hasMore = pageData.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      if (!allData || allData.length === 0) {
        setData({
          totalSales: 0,
          totalBookings: 0,
          totalHours: 0,
          avgHourlyRate: 0,
          newCustomers: 0,
          pendingPayments: 0,
          totalDiscounts: 0,
          avgBookingPrice: 0,
          salesTrend: [],
          topCleaners: [],
          materialsRatio: [],
          topAreas: [],
          allAreas: [],
        });
        setLoading(false);
        return;
      }

      const totalSales = allData.reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const totalBookings = allData.length;
      const totalHours = allData.reduce((sum, b) => sum + Number(b.duration_hours || 0), 0);
      const avgHourlyRate = totalHours > 0 ? totalSales / totalHours : 0;
      const newCustomers = allData.filter(b => b.customer_type === 'new').length;
      const pendingPayments = allData
        .filter(b => b.is_credit_sale && b.payment_status === 'unpaid')
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const totalDiscounts = allData.reduce((sum, b) => sum + Number(b.discount_amount || 0), 0);
      const avgBookingPrice = totalBookings > 0 ? totalSales / totalBookings : 0;

      const salesByDate = new Map<string, { sales: number; bookings: number }>();
      allData.forEach(booking => {
        const date = booking.booking_date;
        const existing = salesByDate.get(date) || { sales: 0, bookings: 0 };
        salesByDate.set(date, {
          sales: existing.sales + Number(booking.final_price || 0),
          bookings: existing.bookings + 1,
        });
      });
      const salesTrend = Array.from(salesByDate.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const cleanerMap = new Map<string, { sales: number; hours: number }>();
      allData.forEach(booking => {
        const name = booking.cleaner_name;
        const existing = cleanerMap.get(name) || { sales: 0, hours: 0 };
        cleanerMap.set(name, {
          sales: existing.sales + Number(booking.final_price || 0),
          hours: existing.hours + Number(booking.duration_hours || 0),
        });
      });
      const topCleaners = Array.from(cleanerMap.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);

      const withMaterials = allData.filter(b => b.with_materials === true).length;
      const withoutMaterials = allData.filter(b => b.with_materials === false).length;
      const materialsRatio = [
        { name: 'With Materials', value: withMaterials },
        { name: 'Without Materials', value: withoutMaterials },
      ];

      const areaMap = new Map<string, { bookings: number; sales: number }>();
      allData.forEach(booking => {
        const area = booking.client_area;
        if (area && area.trim() !== '') {
          const existing = areaMap.get(area) || { bookings: 0, sales: 0 };
          areaMap.set(area, {
            bookings: existing.bookings + 1,
            sales: existing.sales + Number(booking.final_price || 0),
          });
        }
      });

      const topAreas = Array.from(areaMap.entries())
        .map(([area, stats]) => ({ area, ...stats }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);

      const allAreas = Array.from(areaMap.keys()).sort();

      setData({
        totalSales,
        totalBookings,
        totalHours,
        avgHourlyRate,
        newCustomers,
        pendingPayments,
        totalDiscounts,
        avgBookingPrice,
        salesTrend,
        topCleaners,
        materialsRatio,
        topAreas,
        allAreas,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const quickFilters: { label: string; value: QuickFilter }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'Last Week', value: 'lastWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {format(parseISO(dateRange.start), 'MMM dd, yyyy')} - {format(parseISO(dateRange.end), 'MMM dd, yyyy')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => handleQuickFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === filter.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {showCustomPicker && (
          <div className="bg-white border border-gray-300 rounded-lg p-4 flex gap-4 items-center shadow-sm">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={tempDateRange.start}
                onChange={e => setTempDateRange({ ...tempDateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={tempDateRange.end}
                onChange={e => setTempDateRange({ ...tempDateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={applyCustomRange}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        )}

        {activeFilter === 'custom' && !showCustomPicker && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Selected Period:</p>
                <p className="text-lg font-semibold text-blue-700">
                  {format(parseISO(dateRange.start), 'MMM dd, yyyy')} - {format(parseISO(dateRange.end), 'MMM dd, yyyy')}
                </p>
              </div>
              <button
                onClick={() => setShowCustomPicker(true)}
                className="px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-300"
              >
                Change Dates
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={formatCurrency(data.totalSales)}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Avg Booking Price"
          value={formatCurrency(data.avgBookingPrice)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Total Bookings"
          value={data.totalBookings.toString()}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Total Hours"
          value={data.totalHours.toFixed(1)}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Avg Hourly Rate"
          value={formatCurrency(data.avgHourlyRate)}
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="New Customers"
          value={data.newCustomers.toString()}
          icon={Users}
          color="pink"
        />
        <StatCard
          title="Pending Payments"
          value={formatCurrency(data.pendingPayments)}
          icon={CreditCard}
          color="red"
        />
        <StatCard
          title="Total Discounts"
          value={formatCurrency(data.totalDiscounts)}
          icon={Tag}
          color="yellow"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Area Analysis</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Area
            </label>
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose an area...</option>
              {data.allAreas.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
          {selectedArea && areaStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Bookings</p>
                <p className="text-2xl font-bold text-blue-600">{areaStats.bookings}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Sales</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(areaStats.sales)}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Avg Price</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(areaStats.avgPrice)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={date => format(parseISO(date), 'MMM dd')}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={date => format(parseISO(date), 'MMM dd, yyyy')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Sales"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Services Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.materialsRatio}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={entry => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.materialsRatio.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top 10 Areas by Sales
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.topAreas}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="area" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="sales" fill="#10b981" name="Sales" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Performers (Selected Period)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.topCleaners}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'pink' | 'red' | 'yellow';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    pink: 'bg-pink-50 text-pink-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}