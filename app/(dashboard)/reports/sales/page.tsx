'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths } from 'date-fns';
import { Download, Search, TrendingUp, DollarSign, Users, MapPin, Calendar, Clock, Package } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type TabType = 'daily' | 'cleaner' | 'area';
type ViewType = 'analytics' | 'detailed';

interface DailySales {
  date: string;
  bookings: number;
  sales: number;
  hours: number;
  withMaterials: number;
  withoutMaterials: number;
  salesWithMat: number;
  salesWithoutMat: number;
  hoursWithMat: number;
  hoursWithoutMat: number;
  avgPerDay: number;
  avgPerHourWithMat: number;
  avgPerHourWithoutMat: number;
  ratePerHourWithMat: number;
  ratePerHourWithoutMat: number;
}

interface StaffSales {
  name: string;
  bookings: number;
  sales: number;
  hours: number;
  withMaterials: number;
  withoutMaterials: number;
  salesWithMat: number;
  salesWithoutMat: number;
  hoursWithMat: number;
  hoursWithoutMat: number;
  avgPerHourWithMat: number;
  avgPerHourWithoutMat: number;
  ratePerHourWithMat: number;
  ratePerHourWithoutMat: number;
}

interface AreaSales {
  area: string;
  bookings: number;
  sales: number;
  hours: number;
  withMaterials: number;
  withoutMaterials: number;
  salesWithMat: number;
  salesWithoutMat: number;
  hoursWithMat: number;
  hoursWithoutMat: number;
  avgPerHourWithMat: number;
  avgPerHourWithoutMat: number;
  ratePerHourWithMat: number;
  ratePerHourWithoutMat: number;
}

export default function SalesReportsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [activeView, setActiveView] = useState<ViewType>('analytics');
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('today');
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

  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [cleanerSales, setCleanerSales] = useState<StaffSales[]>([]);
  const [areaSales, setAreaSales] = useState<AreaSales[]>([]);

  const [summary, setSummary] = useState({
    totalSales: 0,
    totalBookings: 0,
    totalHours: 0,
    avgPerDay: 0,
    avgPerHour: 0,
    avgPerBooking: 0,
    withMaterials: 0,
    withoutMaterials: 0,
    avgPerHourWithMat: 0,
    avgPerHourWithoutMat: 0,
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
  setShowCustomPicker(false); // ← إخفاء البوكسات
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
        setDailySales([]);
        setCleanerSales([]);
        setAreaSales([]);
        setSummary({
          totalSales: 0,
          totalBookings: 0,
          totalHours: 0,
          avgPerDay: 0,
          avgPerHour: 0,
          avgPerBooking: 0,
          withMaterials: 0,
          withoutMaterials: 0,
          avgPerHourWithMat: 0,
          avgPerHourWithoutMat: 0,
        });
        setLoading(false);
        return;
      }

      const totalSales = allData.reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const totalBookings = allData.length;
      const totalHours = allData.reduce((sum, b) => sum + Number(b.duration_hours || 0), 0);
      const withMaterials = allData.filter(b => b.with_materials === true).length;
      const withoutMaterials = allData.filter(b => b.with_materials === false).length;

      const salesWithMat = allData
        .filter(b => b.with_materials === true)
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const salesWithoutMat = allData
        .filter(b => b.with_materials === false)
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const hoursWithMat = allData
        .filter(b => b.with_materials === true)
        .reduce((sum, b) => sum + Number(b.duration_hours || 0), 0);
      const hoursWithoutMat = allData
        .filter(b => b.with_materials === false)
        .reduce((sum, b) => sum + Number(b.duration_hours || 0), 0);

      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const avgPerDay = daysDiff > 0 ? totalSales / daysDiff : 0;
      const avgPerHour = totalHours > 0 ? totalSales / totalHours : 0;
      const avgPerBooking = totalBookings > 0 ? totalSales / totalBookings : 0;
      const avgPerHourWithMat = hoursWithMat > 0 ? salesWithMat / hoursWithMat : 0;
      const avgPerHourWithoutMat = hoursWithoutMat > 0 ? salesWithoutMat / hoursWithoutMat : 0;

      setSummary({
        totalSales,
        totalBookings,
        totalHours,
        avgPerDay,
        avgPerHour,
        avgPerBooking,
        withMaterials,
        withoutMaterials,
        avgPerHourWithMat,
        avgPerHourWithoutMat,
      });

      const dailyMap = new Map<string, any>();
      allData.forEach(booking => {
        const date = booking.booking_date;
        const withMat = booking.with_materials === true;
        const existing = dailyMap.get(date) || {
          bookings: 0,
          sales: 0,
          hours: 0,
          withMaterials: 0,
          withoutMaterials: 0,
          salesWithMat: 0,
          salesWithoutMat: 0,
          hoursWithMat: 0,
          hoursWithoutMat: 0,
        };

        dailyMap.set(date, {
          bookings: existing.bookings + 1,
          sales: existing.sales + Number(booking.final_price || 0),
          hours: existing.hours + Number(booking.duration_hours || 0),
          withMaterials: existing.withMaterials + (withMat ? 1 : 0),
          withoutMaterials: existing.withoutMaterials + (withMat ? 0 : 1),
          salesWithMat: existing.salesWithMat + (withMat ? Number(booking.final_price || 0) : 0),
          salesWithoutMat: existing.salesWithoutMat + (withMat ? 0 : Number(booking.final_price || 0)),
          hoursWithMat: existing.hoursWithMat + (withMat ? Number(booking.duration_hours || 0) : 0),
          hoursWithoutMat: existing.hoursWithoutMat + (withMat ? 0 : Number(booking.duration_hours || 0)),
        });
      });

      const daily = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          bookings: stats.bookings,
          sales: stats.sales,
          hours: stats.hours,
          withMaterials: stats.withMaterials,
          withoutMaterials: stats.withoutMaterials,
          salesWithMat: stats.salesWithMat,
          salesWithoutMat: stats.salesWithoutMat,
          hoursWithMat: stats.hoursWithMat,
          hoursWithoutMat: stats.hoursWithoutMat,
          avgPerDay: stats.sales,
          avgPerHourWithMat: stats.hoursWithMat > 0 ? stats.salesWithMat / stats.hoursWithMat : 0,
          avgPerHourWithoutMat: stats.hoursWithoutMat > 0 ? stats.salesWithoutMat / stats.hoursWithoutMat : 0,
          ratePerHourWithMat: stats.hoursWithMat > 0 ? stats.salesWithMat / stats.hoursWithMat : 0,
          ratePerHourWithoutMat: stats.hoursWithoutMat > 0 ? stats.salesWithoutMat / stats.hoursWithoutMat : 0,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setDailySales(daily);

      const cleanerMap = new Map<string, any>();
      allData.forEach(booking => {
        const name = booking.cleaner_name || 'Unknown';
        const withMat = booking.with_materials === true;
        const existing = cleanerMap.get(name) || {
          bookings: 0,
          sales: 0,
          hours: 0,
          withMaterials: 0,
          withoutMaterials: 0,
          salesWithMat: 0,
          salesWithoutMat: 0,
          hoursWithMat: 0,
          hoursWithoutMat: 0,
        };

        cleanerMap.set(name, {
          bookings: existing.bookings + 1,
          sales: existing.sales + Number(booking.final_price || 0),
          hours: existing.hours + Number(booking.duration_hours || 0),
          withMaterials: existing.withMaterials + (withMat ? 1 : 0),
          withoutMaterials: existing.withoutMaterials + (withMat ? 0 : 1),
          salesWithMat: existing.salesWithMat + (withMat ? Number(booking.final_price || 0) : 0),
          salesWithoutMat: existing.salesWithoutMat + (withMat ? 0 : Number(booking.final_price || 0)),
          hoursWithMat: existing.hoursWithMat + (withMat ? Number(booking.duration_hours || 0) : 0),
          hoursWithoutMat: existing.hoursWithoutMat + (withMat ? 0 : Number(booking.duration_hours || 0)),
        });
      });

      const cleaners = Array.from(cleanerMap.entries())
        .map(([name, stats]) => ({
          name,
          bookings: stats.bookings,
          sales: stats.sales,
          hours: stats.hours,
          withMaterials: stats.withMaterials,
          withoutMaterials: stats.withoutMaterials,
          salesWithMat: stats.salesWithMat,
          salesWithoutMat: stats.salesWithoutMat,
          hoursWithMat: stats.hoursWithMat,
          hoursWithoutMat: stats.hoursWithoutMat,
          avgPerHourWithMat: stats.hoursWithMat > 0 ? stats.salesWithMat / stats.hoursWithMat : 0,
          avgPerHourWithoutMat: stats.hoursWithoutMat > 0 ? stats.salesWithoutMat / stats.hoursWithoutMat : 0,
          ratePerHourWithMat: stats.hoursWithMat > 0 ? stats.salesWithMat / stats.hoursWithMat : 0,
          ratePerHourWithoutMat: stats.hoursWithoutMat > 0 ? stats.salesWithoutMat / stats.hoursWithoutMat : 0,
        }))
        .sort((a, b) => b.sales - a.sales);
      setCleanerSales(cleaners);

      const areaMap = new Map<string, any>();
      allData.forEach(booking => {
        const area = booking.client_area;
        if (area && area.trim() !== '') {
          const withMat = booking.with_materials === true;
          const existing = areaMap.get(area) || {
            bookings: 0,
            sales: 0,
            hours: 0,
            withMaterials: 0,
            withoutMaterials: 0,
            salesWithMat: 0,
            salesWithoutMat: 0,
            hoursWithMat: 0,
            hoursWithoutMat: 0,
          };

          areaMap.set(area, {
            bookings: existing.bookings + 1,
            sales: existing.sales + Number(booking.final_price || 0),
            hours: existing.hours + Number(booking.duration_hours || 0),
            withMaterials: existing.withMaterials + (withMat ? 1 : 0),
            withoutMaterials: existing.withoutMaterials + (withMat ? 0 : 1),
            salesWithMat: existing.salesWithMat + (withMat ? Number(booking.final_price || 0) : 0),
            salesWithoutMat: existing.salesWithoutMat + (withMat ? 0 : Number(booking.final_price || 0)),
            hoursWithMat: existing.hoursWithMat + (withMat ? Number(booking.duration_hours || 0) : 0),
            hoursWithoutMat: existing.hoursWithoutMat + (withMat ? 0 : Number(booking.duration_hours || 0)),
          });
        }
      });

      const areas = Array.from(areaMap.entries())
        .map(([area, stats]) => ({
          area,
          bookings: stats.bookings,
          sales: stats.sales,
          hours: stats.hours,
          withMaterials: stats.withMaterials,
          withoutMaterials: stats.withoutMaterials,
          salesWithMat: stats.salesWithMat,
          salesWithoutMat: stats.salesWithoutMat,
          hoursWithMat: stats.hoursWithMat,
          hoursWithoutMat: stats.hoursWithoutMat,
          avgPerHourWithMat: stats.hoursWithMat > 0 ? stats.salesWithMat / stats.hoursWithMat : 0,
          avgPerHourWithoutMat: stats.hoursWithoutMat > 0 ? stats.salesWithoutMat / stats.hoursWithoutMat : 0,
          ratePerHourWithMat: stats.hoursWithMat > 0 ? stats.salesWithMat / stats.hoursWithMat : 0,
          ratePerHourWithoutMat: stats.hoursWithoutMat > 0 ? stats.salesWithoutMat / stats.hoursWithoutMat : 0,
        }))
        .sort((a, b) => b.sales - a.sales);
      setAreaSales(areas);

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
      case 'daily':
        if (activeView === 'analytics') {
          dataToExport = currentData.map((d: any) => ({
            Date: format(parseISO(d.date), 'MMM dd, yyyy'),
            Bookings: d.bookings,
            'Total Sales': d.sales.toFixed(2),
            'Total Hours': Math.round(d.hours),
            'With Materials': d.withMaterials,
            'Without Materials': d.withoutMaterials,
            'Avg/Hour +Mat': d.avgPerHourWithMat.toFixed(2),
            'Avg/Hour -Mat': d.avgPerHourWithoutMat.toFixed(2),
            'Rate/Hour +Mat': d.ratePerHourWithMat.toFixed(2),
            'Rate/Hour -Mat': d.ratePerHourWithoutMat.toFixed(2),
          }));
        } else {
          dataToExport = currentData.map((d: any) => ({
            Date: format(parseISO(d.date), 'MMM dd, yyyy'),
            Bookings: d.bookings,
            Sales: d.sales.toFixed(2),
            Hours: Math.round(d.hours),
            'With Materials': d.withMaterials,
            'Without Materials': d.withoutMaterials,
          }));
        }
        filename = 'Daily_Sales_Report';
        break;

      case 'cleaner':
        if (activeView === 'analytics') {
          dataToExport = currentData.map((d: any) => ({
            Cleaner: d.name,
            Bookings: d.bookings,
            'Total Sales': d.sales.toFixed(2),
            'Total Hours': Math.round(d.hours),
            'With Materials': d.withMaterials,
            'Without Materials': d.withoutMaterials,
            'Avg/Hour +Mat': d.avgPerHourWithMat.toFixed(2),
            'Avg/Hour -Mat': d.avgPerHourWithoutMat.toFixed(2),
            'Rate/Hour +Mat': d.ratePerHourWithMat.toFixed(2),
            'Rate/Hour -Mat': d.ratePerHourWithoutMat.toFixed(2),
          }));
        } else {
          dataToExport = currentData.map((d: any) => ({
            Cleaner: d.name,
            Bookings: d.bookings,
            Sales: d.sales.toFixed(2),
            Hours: Math.round(d.hours),
            'With Materials': d.withMaterials,
            'Without Materials': d.withoutMaterials,
          }));
        }
        filename = 'Cleaner_Sales_Report';
        break;

      case 'area':
        if (activeView === 'analytics') {
          dataToExport = currentData.map((d: any) => ({
            Area: d.area,
            Bookings: d.bookings,
            'Total Sales': d.sales.toFixed(2),
            'Total Hours': Math.round(d.hours),
            'With Materials': d.withMaterials,
            'Without Materials': d.withoutMaterials,
            'Avg/Hour +Mat': d.avgPerHourWithMat.toFixed(2),
            'Avg/Hour -Mat': d.avgPerHourWithoutMat.toFixed(2),
            'Rate/Hour +Mat': d.ratePerHourWithMat.toFixed(2),
            'Rate/Hour -Mat': d.ratePerHourWithoutMat.toFixed(2),
          }));
        } else {
          dataToExport = currentData.map((d: any) => ({
            Area: d.area,
            Bookings: d.bookings,
            Sales: d.sales.toFixed(2),
            Hours: Math.round(d.hours),
            'With Materials': d.withMaterials,
            'Without Materials': d.withoutMaterials,
          }));
        }
        filename = 'Area_Sales_Report';
        break;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
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
    { id: 'daily' as TabType, label: 'Daily Sales', icon: Calendar },
    { id: 'cleaner' as TabType, label: 'By Cleaner', icon: Users },
    { id: 'area' as TabType, label: 'By Area', icon: MapPin },
  ];

  const getCurrentData = () => {
    let data: any[] = [];
    switch (activeTab) {
      case 'daily':
        data = dailySales;
        break;
      case 'cleaner':
        data = cleanerSales;
        break;
      case 'area':
        data = areaSales;
        break;
    }

    if (searchTerm === '') return data;

    return data.filter(item => {
      const searchValue = searchTerm.toLowerCase();
      if (activeTab === 'daily') {
        return item.date.includes(searchValue);
      } else if (activeTab === 'area') {
        return item.area.toLowerCase().includes(searchValue);
      } else {
        return item.name.toLowerCase().includes(searchValue);
      }
    });
  };

  const calculateTotals = () => {
    const data = getCurrentData();
    return data.reduce(
      (acc, item) => ({
        bookings: acc.bookings + item.bookings,
        sales: acc.sales + item.sales,
        hours: acc.hours + item.hours,
        withMaterials: acc.withMaterials + item.withMaterials,
        withoutMaterials: acc.withoutMaterials + item.withoutMaterials,
        salesWithMat: acc.salesWithMat + item.salesWithMat,
        salesWithoutMat: acc.salesWithoutMat + item.salesWithoutMat,
        hoursWithMat: acc.hoursWithMat + item.hoursWithMat,
        hoursWithoutMat: acc.hoursWithoutMat + item.hoursWithoutMat,
      }),
      {
        bookings: 0,
        sales: 0,
        hours: 0,
        withMaterials: 0,
        withoutMaterials: 0,
        salesWithMat: 0,
        salesWithoutMat: 0,
        hoursWithMat: 0,
        hoursWithoutMat: 0,
      }
    );
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-sm border border-blue-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalSales)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-green-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg per Day</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.avgPerDay)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg/Hour +Materials</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.avgPerHourWithMat)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-orange-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg/Hour -Materials</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.avgPerHourWithoutMat)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalBookings}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-pink-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round(summary.totalHours)}</p>
            </div>
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-teal-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">With Materials</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.withMaterials}</p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Without Materials</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.withoutMaterials}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
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

        <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Analytics View
            </button>
            <button
              onClick={() => setActiveView('detailed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === 'detailed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Detailed View
            </button>
          </div>

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

        <div className="overflow-x-auto">
          {activeTab === 'daily' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">With Materials</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Without Materials</th>
                  {activeView === 'analytics' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Hour +Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Hour -Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Hour +Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Hour -Mat</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {format(parseISO(item.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.bookings}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(item.sales)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{Math.round(item.hours)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.withMaterials}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.withoutMaterials}</td>
                    {activeView === 'analytics' && (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgPerHourWithMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgPerHourWithoutMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.ratePerHourWithMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.ratePerHourWithoutMat)}</td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900">TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.bookings}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.sales)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{Math.round(totals.hours)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.withMaterials}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.withoutMaterials}</td>
                  {activeView === 'analytics' && (
                    <>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithMat > 0 ? totals.salesWithMat / totals.hoursWithMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithoutMat > 0 ? totals.salesWithoutMat / totals.hoursWithoutMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithMat > 0 ? totals.salesWithMat / totals.hoursWithMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithoutMat > 0 ? totals.salesWithoutMat / totals.hoursWithoutMat : 0)}
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'cleaner' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cleaner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">With Materials</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Without Materials</th>
                  {activeView === 'analytics' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Hour +Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Hour -Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Hour +Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Hour -Mat</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.bookings}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(item.sales)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{Math.round(item.hours)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.withMaterials}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.withoutMaterials}</td>
                    {activeView === 'analytics' && (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgPerHourWithMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgPerHourWithoutMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.ratePerHourWithMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.ratePerHourWithoutMat)}</td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900">TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.bookings}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.sales)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{Math.round(totals.hours)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.withMaterials}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.withoutMaterials}</td>
                  {activeView === 'analytics' && (
                    <>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithMat > 0 ? totals.salesWithMat / totals.hoursWithMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithoutMat > 0 ? totals.salesWithoutMat / totals.hoursWithoutMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithMat > 0 ? totals.salesWithMat / totals.hoursWithMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithoutMat > 0 ? totals.salesWithoutMat / totals.hoursWithoutMat : 0)}
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'area' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">With Materials</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Without Materials</th>
                  {activeView === 'analytics' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Hour +Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Hour -Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Hour +Mat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate/Hour -Mat</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.area}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.bookings}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(item.sales)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{Math.round(item.hours)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.withMaterials}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.withoutMaterials}</td>
                    {activeView === 'analytics' && (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgPerHourWithMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgPerHourWithoutMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.ratePerHourWithMat)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.ratePerHourWithoutMat)}</td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900">TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.bookings}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.sales)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{Math.round(totals.hours)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.withMaterials}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.withoutMaterials}</td>
                  {activeView === 'analytics' && (
                    <>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithMat > 0 ? totals.salesWithMat / totals.hoursWithMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithoutMat > 0 ? totals.salesWithoutMat / totals.hoursWithoutMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithMat > 0 ? totals.salesWithMat / totals.hoursWithMat : 0)}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-900">
                        {formatCurrency(totals.hoursWithoutMat > 0 ? totals.salesWithoutMat / totals.hoursWithoutMat : 0)}
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}