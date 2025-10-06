'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths } from 'date-fns';
import { Download, Search, Users, TrendingUp, MapPin, UserCheck } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type TabType = 'overview' | 'area' | 'list';

interface CustomerOverview {
  type: string;
  count: number;
  totalRevenue: number;
  avgRevenue: number;
  percentage: number;
}

interface CustomerByArea {
  area: string;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  totalRevenue: number;
  avgRevenue: number;
  bookings: number;
}

interface CustomerDetail {
  name: string;
  mobile: string;
  area: string;
  type: string;
  totalBookings: number;
  totalRevenue: number;
  avgBooking: number;
  lastBookingDate: string;
}

export default function CustomerReportsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('thisMonth');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [tempDateRange, setTempDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [overview, setOverview] = useState<CustomerOverview[]>([]);
  const [byArea, setByArea] = useState<CustomerByArea[]>([]);
  const [customerList, setCustomerList] = useState<CustomerDetail[]>([]);

  const [summary, setSummary] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    retentionRate: 0,
    avgRevenuePerCustomer: 0,
    mostActiveArea: '',
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

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
        start = startOfMonth(now);
        end = endOfMonth(now);
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

  const loadData = async () => {
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
        setOverview([]);
        setByArea([]);
        setCustomerList([]);
        setSummary({
          totalCustomers: 0,
          newCustomers: 0,
          returningCustomers: 0,
          retentionRate: 0,
          avgRevenuePerCustomer: 0,
          mostActiveArea: '',
        });
        setLoading(false);
        return;
      }

      // Calculate overview
      const newCustomers = allData.filter(b => b.customer_type === 'new').length;
      const returningCustomers = allData.filter(b => b.customer_type === 'regular').length;
      const totalCustomers = new Set(allData.map(b => b.client_mobile || b.client_name)).size;

      const newRevenue = allData
        .filter(b => b.customer_type === 'new')
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const returningRevenue = allData
        .filter(b => b.customer_type === 'regular')
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const totalRevenue = newRevenue + returningRevenue;

      const overviewData: CustomerOverview[] = [
        {
          type: 'New Customers',
          count: newCustomers,
          totalRevenue: newRevenue,
          avgRevenue: newCustomers > 0 ? newRevenue / newCustomers : 0,
          percentage: totalCustomers > 0 ? (newCustomers / (newCustomers + returningCustomers)) * 100 : 0,
        },
        {
          type: 'Returning Customers',
          count: returningCustomers,
          totalRevenue: returningRevenue,
          avgRevenue: returningCustomers > 0 ? returningRevenue / returningCustomers : 0,
          percentage: totalCustomers > 0 ? (returningCustomers / (newCustomers + returningCustomers)) * 100 : 0,
        },
      ];
      setOverview(overviewData);

      // Calculate by area
      const areaMap = new Map<string, any>();
      allData.forEach(booking => {
        const area = booking.client_area || 'Unknown';
        const isNew = booking.customer_type === 'new';

        if (!areaMap.has(area)) {
          areaMap.set(area, {
            customers: new Set(),
            newCustomers: 0,
            returningCustomers: 0,
            revenue: 0,
            bookings: 0,
          });
        }

        const areaData = areaMap.get(area);
        areaData.customers.add(booking.client_mobile || booking.client_name);
        if (isNew) areaData.newCustomers++;
        else areaData.returningCustomers++;
        areaData.revenue += Number(booking.final_price || 0);
        areaData.bookings++;
      });

      const byAreaData: CustomerByArea[] = Array.from(areaMap.entries())
        .map(([area, data]) => ({
          area,
          totalCustomers: data.customers.size,
          newCustomers: data.newCustomers,
          returningCustomers: data.returningCustomers,
          totalRevenue: data.revenue,
          avgRevenue: data.customers.size > 0 ? data.revenue / data.customers.size : 0,
          bookings: data.bookings,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
      setByArea(byAreaData);

      // Calculate customer list
      const customerMap = new Map<string, any>();
      allData.forEach(booking => {
        const key = booking.client_mobile || booking.client_name;
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            name: booking.client_name,
            mobile: booking.client_mobile,
            area: booking.client_area,
            type: booking.customer_type,
            bookings: 0,
            revenue: 0,
            lastDate: booking.booking_date,
          });
        }

        const customer = customerMap.get(key);
        customer.bookings++;
        customer.revenue += Number(booking.final_price || 0);
        if (booking.booking_date > customer.lastDate) {
          customer.lastDate = booking.booking_date;
        }
      });

      const customerListData: CustomerDetail[] = Array.from(customerMap.entries())
        .map(([key, data]) => ({
          name: data.name,
          mobile: data.mobile,
          area: data.area,
          type: data.type,
          totalBookings: data.bookings,
          totalRevenue: data.revenue,
          avgBooking: data.bookings > 0 ? data.revenue / data.bookings : 0,
          lastBookingDate: data.lastDate,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
      setCustomerList(customerListData);

      // Calculate summary
      const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
      const avgRevenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
      const mostActiveArea = byAreaData.length > 0 ? byAreaData[0].area : 'N/A';

      setSummary({
        totalCustomers,
        newCustomers,
        returningCustomers,
        retentionRate,
        avgRevenuePerCustomer,
        mostActiveArea,
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    let dataToExport: any[] = [];
    let filename = '';

    const currentData = getCurrentData();

    switch (activeTab) {
      case 'overview':
        dataToExport = currentData.map((d: any) => ({
          'Customer Type': d.type,
          Count: d.count,
          'Total Revenue': d.totalRevenue.toFixed(2),
          'Avg Revenue': d.avgRevenue.toFixed(2),
          'Percentage': d.percentage.toFixed(1) + '%',
        }));
        filename = 'Customer_Overview_Report';
        break;

      case 'area':
        dataToExport = currentData.map((d: any) => ({
          Area: d.area,
          'Total Customers': d.totalCustomers,
          'New Customers': d.newCustomers,
          'Returning Customers': d.returningCustomers,
          'Total Revenue': d.totalRevenue.toFixed(2),
          'Avg Revenue': d.avgRevenue.toFixed(2),
          Bookings: d.bookings,
        }));
        filename = 'Customers_By_Area_Report';
        break;

      case 'list':
        dataToExport = currentData.map((d: any) => ({
          Name: d.name,
          Mobile: d.mobile,
          Area: d.area,
          Type: d.type,
          'Total Bookings': d.totalBookings,
          'Total Revenue': d.totalRevenue.toFixed(2),
          'Avg Booking': d.avgBooking.toFixed(2),
          'Last Booking': format(parseISO(d.lastBookingDate), 'MMM dd, yyyy'),
        }));
        filename = 'Customer_List_Report';
        break;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer Report');
    XLSX.writeFile(workbook, `${filename}_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: TrendingUp },
    { id: 'area' as TabType, label: 'By Area', icon: MapPin },
    { id: 'list' as TabType, label: 'Customer List', icon: Users },
  ];

  const getCurrentData = () => {
    let data: any[] = [];
    switch (activeTab) {
      case 'overview':
        data = overview;
        break;
      case 'area':
        data = byArea;
        break;
      case 'list':
        data = customerList;
        break;
    }

    if (searchTerm === '') return data;

    return data.filter(item => {
      const searchValue = searchTerm.toLowerCase();
      if (activeTab === 'overview') {
        return item.type.toLowerCase().includes(searchValue);
      } else if (activeTab === 'area') {
        return item.area.toLowerCase().includes(searchValue);
      } else {
        return (
          item.name?.toLowerCase().includes(searchValue) ||
          item.mobile?.toLowerCase().includes(searchValue) ||
          item.area?.toLowerCase().includes(searchValue)
        );
      }
    });
  };

  const calculateTotals = () => {
    const data = getCurrentData();
    if (activeTab === 'overview') {
      return data.reduce(
        (acc, item) => ({
          count: acc.count + item.count,
          totalRevenue: acc.totalRevenue + item.totalRevenue,
        }),
        { count: 0, totalRevenue: 0 }
      );
    } else if (activeTab === 'area') {
      return data.reduce(
        (acc, item) => ({
          totalCustomers: acc.totalCustomers + item.totalCustomers,
          newCustomers: acc.newCustomers + item.newCustomers,
          returningCustomers: acc.returningCustomers + item.returningCustomers,
          totalRevenue: acc.totalRevenue + item.totalRevenue,
          bookings: acc.bookings + item.bookings,
        }),
        { totalCustomers: 0, newCustomers: 0, returningCustomers: 0, totalRevenue: 0, bookings: 0 }
      );
    } else {
      return data.reduce(
        (acc, item) => ({
          totalBookings: acc.totalBookings + item.totalBookings,
          totalRevenue: acc.totalRevenue + item.totalRevenue,
        }),
        { totalBookings: 0, totalRevenue: 0 }
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Reports</h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(parseISO(dateRange.start), 'MMM dd, yyyy')} - {format(parseISO(dateRange.end), 'MMM dd, yyyy')}
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map(filter => (
          <button
            key={filter.value}
            onClick={() => handleQuickFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && (
        <div className="bg-white rounded-xl p-4 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={tempDateRange.start}
              onChange={e => setTempDateRange({ ...tempDateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={tempDateRange.end}
              onChange={e => setTempDateRange({ ...tempDateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={applyCustomRange}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/60 backdrop-blur-sm border border-blue-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-green-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">New Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.newCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Returning Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.returningCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-orange-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Retention Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.retentionRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Revenue/Customer</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.avgRevenuePerCustomer)}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-pink-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Most Active Area</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.mostActiveArea}</p>
            </div>
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-200">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {activeTab === 'overview' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.count}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgRevenue)}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{item.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900">TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.count}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.totalRevenue)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">-</td>
                  <td className="px-6 py-4 text-sm text-blue-900">100%</td>
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'area' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Customers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returning</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.area}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.totalCustomers}</td>
                    <td className="px-6 py-4 text-sm text-green-600">{item.newCustomers}</td>
                    <td className="px-6 py-4 text-sm text-blue-600">{item.returningCustomers}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgRevenue)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.bookings}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900">TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.totalCustomers}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.newCustomers}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.returningCustomers}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.totalRevenue)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">-</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.bookings}</td>
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'list' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Booking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Booking</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.mobile}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.area}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.type === 'new'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.totalBookings}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgBooking)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(parseISO(item.lastBookingDate), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900" colSpan={4}>TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.totalBookings}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.totalRevenue)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900" colSpan={2}>-</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}