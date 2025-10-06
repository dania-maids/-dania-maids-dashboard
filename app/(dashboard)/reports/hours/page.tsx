'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, parse } from 'date-fns';
import { Download, Search, Clock, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type TabType = 'cleaner' | 'daily' | 'overtime';

interface CleanerHours {
  name: string;
  totalHours: number;
  workingHours: number;
  idleHours: number;
  idleMinutes: number;
  overtimeHours: number;
  workingDays: number;
  avgHoursPerDay: number;
  utilizationRate: number;
}

interface DailyHours {
  date: string;
  cleaner: string;
  totalHours: number;
  workingHours: number;
  idleHours: number;
  idleMinutes: number;
  overtimeHours: number;
  bookings: number;
  utilizationRate: number;
}

interface OvertimeRecord {
  date: string;
  cleaner: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  bookings: number;
}

export default function HoursReportsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('cleaner');
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

  const [cleanerHours, setCleanerHours] = useState<CleanerHours[]>([]);
  const [dailyHours, setDailyHours] = useState<DailyHours[]>([]);
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);

  const [summary, setSummary] = useState({
    totalWorkingHours: 0,
    totalIdleHours: 0,
    totalOvertimeHours: 0,
    avgUtilization: 0,
    totalCleaners: 0,
    totalDays: 0,
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
  };

  const calculateIdleTime = (bookings: any[]) => {
    if (bookings.length <= 1) return 0;

    // Sort by start time
    const sorted = bookings.sort((a, b) => {
      const timeA = a.start_time || '00:00:00';
      const timeB = b.start_time || '00:00:00';
      return timeA.localeCompare(timeB);
    });

    let totalIdleMinutes = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = sorted[i].end_time || '00:00:00';
      const nextStart = sorted[i + 1].start_time || '00:00:00';

      // Parse times (HH:MM:SS format)
      const [endHour, endMin] = currentEnd.split(':').map(Number);
      const [startHour, startMin] = nextStart.split(':').map(Number);

      const endMinutes = endHour * 60 + endMin;
      const startMinutes = startHour * 60 + startMin;

      const idleMinutes = startMinutes - endMinutes;
      if (idleMinutes > 0) {
        totalIdleMinutes += idleMinutes;
      }
    }

    return totalIdleMinutes;
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
        setCleanerHours([]);
        setDailyHours([]);
        setOvertimeRecords([]);
        setSummary({
          totalWorkingHours: 0,
          totalIdleHours: 0,
          totalOvertimeHours: 0,
          avgUtilization: 0,
          totalCleaners: 0,
          totalDays: 0,
        });
        setLoading(false);
        return;
      }

      // Group by cleaner and date
      const cleanerDateMap = new Map<string, Map<string, any[]>>();
      allData.forEach(booking => {
        const cleanerName = booking.cleaner_name || 'Unknown';
        const date = booking.booking_date;

        if (!cleanerDateMap.has(cleanerName)) {
          cleanerDateMap.set(cleanerName, new Map());
        }

        const dateMap = cleanerDateMap.get(cleanerName)!;
        if (!dateMap.has(date)) {
          dateMap.set(date, []);
        }

        dateMap.get(date)!.push(booking);
      });

      // Calculate cleaner hours
      const cleanerHoursData: CleanerHours[] = [];
      let totalWorkingHours = 0;
      let totalIdleMinutes = 0;
      let totalOvertimeHours = 0;

      cleanerDateMap.forEach((dateMap, cleanerName) => {
        let cleanerWorkingHours = 0;
        let cleanerIdleMinutes = 0;
        let cleanerOvertimeHours = 0;
        const workingDays = dateMap.size;

        dateMap.forEach((bookings, date) => {
          const dayWorkingHours = bookings.reduce((sum, b) => sum + Number(b.duration_hours || 0), 0);
          cleanerWorkingHours += dayWorkingHours;

          // Calculate idle time for this day
          const dayIdleMinutes = calculateIdleTime(bookings);
          cleanerIdleMinutes += dayIdleMinutes;

          // Use overtime_hours from database or calculate
          const dayOvertimeHours = bookings.reduce((sum, b) => sum + Number(b.overtime_hours || 0), 0);
          cleanerOvertimeHours += dayOvertimeHours;
        });

        const cleanerIdleHours = cleanerIdleMinutes / 60;
        const avgHoursPerDay = workingDays > 0 ? cleanerWorkingHours / workingDays : 0;
        const utilizationRate =
          cleanerWorkingHours + cleanerIdleHours > 0
            ? (cleanerWorkingHours / (cleanerWorkingHours + cleanerIdleHours)) * 100
            : 0;

        cleanerHoursData.push({
          name: cleanerName,
          totalHours: cleanerWorkingHours + cleanerIdleHours,
          workingHours: cleanerWorkingHours,
          idleHours: cleanerIdleHours,
          idleMinutes: cleanerIdleMinutes,
          overtimeHours: cleanerOvertimeHours,
          workingDays,
          avgHoursPerDay,
          utilizationRate,
        });

        totalWorkingHours += cleanerWorkingHours;
        totalIdleMinutes += cleanerIdleMinutes;
        totalOvertimeHours += cleanerOvertimeHours;
      });

      setCleanerHours(cleanerHoursData.sort((a, b) => b.workingHours - a.workingHours));

      // Calculate daily hours
      const dailyHoursData: DailyHours[] = [];
      cleanerDateMap.forEach((dateMap, cleanerName) => {
        dateMap.forEach((bookings, date) => {
          const dayWorkingHours = bookings.reduce((sum, b) => sum + Number(b.duration_hours || 0), 0);
          const dayIdleMinutes = calculateIdleTime(bookings);
          const dayIdleHours = dayIdleMinutes / 60;
          const dayOvertimeHours = bookings.reduce((sum, b) => sum + Number(b.overtime_hours || 0), 0);
          const utilizationRate =
            dayWorkingHours + dayIdleHours > 0
              ? (dayWorkingHours / (dayWorkingHours + dayIdleHours)) * 100
              : 0;

          dailyHoursData.push({
            date,
            cleaner: cleanerName,
            totalHours: dayWorkingHours + dayIdleHours,
            workingHours: dayWorkingHours,
            idleHours: dayIdleHours,
            idleMinutes: dayIdleMinutes,
            overtimeHours: dayOvertimeHours,
            bookings: bookings.length,
            utilizationRate,
          });
        });
      });

      setDailyHours(dailyHoursData.sort((a, b) => b.date.localeCompare(a.date)));

      // Calculate overtime records
      const overtimeData: OvertimeRecord[] = [];
      cleanerDateMap.forEach((dateMap, cleanerName) => {
        dateMap.forEach((bookings, date) => {
          const dayTotalHours = bookings.reduce((sum, b) => sum + Number(b.duration_hours || 0), 0);
          const dayOvertimeHours = bookings.reduce((sum, b) => sum + Number(b.overtime_hours || 0), 0);
          
          if (dayOvertimeHours > 0 || dayTotalHours > 8) {
            overtimeData.push({
              date,
              cleaner: cleanerName,
              totalHours: dayTotalHours,
              regularHours: Math.min(dayTotalHours, 8),
              overtimeHours: dayOvertimeHours > 0 ? dayOvertimeHours : Math.max(0, dayTotalHours - 8),
              bookings: bookings.length,
            });
          }
        });
      });

      setOvertimeRecords(overtimeData.sort((a, b) => b.overtimeHours - a.overtimeHours));

      // Calculate summary
      const totalIdleHours = totalIdleMinutes / 60;
      const avgUtilization =
        totalWorkingHours + totalIdleHours > 0
          ? (totalWorkingHours / (totalWorkingHours + totalIdleHours)) * 100
          : 0;

      setSummary({
        totalWorkingHours,
        totalIdleHours,
        totalOvertimeHours,
        avgUtilization,
        totalCleaners: cleanerDateMap.size,
        totalDays: new Set(allData.map(b => b.booking_date)).size,
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
      case 'cleaner':
        dataToExport = currentData.map((d: any) => ({
          Cleaner: d.name,
          'Working Hours': d.workingHours.toFixed(2),
          'Idle Hours': d.idleHours.toFixed(2),
          'Idle Minutes': d.idleMinutes,
          'Overtime Hours': d.overtimeHours.toFixed(2),
          'Working Days': d.workingDays,
          'Avg Hours/Day': d.avgHoursPerDay.toFixed(2),
          'Utilization %': d.utilizationRate.toFixed(1),
        }));
        filename = 'Cleaner_Hours_Report';
        break;

      case 'daily':
        dataToExport = currentData.map((d: any) => ({
          Date: format(parseISO(d.date), 'MMM dd, yyyy'),
          Cleaner: d.cleaner,
          'Working Hours': d.workingHours.toFixed(2),
          'Idle Hours': d.idleHours.toFixed(2),
          'Idle Minutes': d.idleMinutes,
          'Overtime Hours': d.overtimeHours.toFixed(2),
          Bookings: d.bookings,
          'Utilization %': d.utilizationRate.toFixed(1),
        }));
        filename = 'Daily_Hours_Report';
        break;

      case 'overtime':
        dataToExport = currentData.map((d: any) => ({
          Date: format(parseISO(d.date), 'MMM dd, yyyy'),
          Cleaner: d.cleaner,
          'Total Hours': d.totalHours.toFixed(2),
          'Regular Hours': d.regularHours.toFixed(2),
          'Overtime Hours': d.overtimeHours.toFixed(2),
          Bookings: d.bookings,
        }));
        filename = 'Overtime_Report';
        break;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hours Report');
    XLSX.writeFile(workbook, `${filename}_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
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
    { id: 'cleaner' as TabType, label: 'By Cleaner', icon: Activity },
    { id: 'daily' as TabType, label: 'Daily Breakdown', icon: Clock },
    { id: 'overtime' as TabType, label: 'Overtime Records', icon: AlertCircle },
  ];

  const getCurrentData = () => {
    let data: any[] = [];
    switch (activeTab) {
      case 'cleaner':
        data = cleanerHours;
        break;
      case 'daily':
        data = dailyHours;
        break;
      case 'overtime':
        data = overtimeRecords;
        break;
    }

    if (searchTerm === '') return data;

    return data.filter(item => {
      const searchValue = searchTerm.toLowerCase();
      if (activeTab === 'cleaner') {
        return item.name.toLowerCase().includes(searchValue);
      } else {
        return (
          item.cleaner.toLowerCase().includes(searchValue) ||
          item.date.includes(searchValue)
        );
      }
    });
  };

  const calculateTotals = () => {
    const data = getCurrentData();
    if (activeTab === 'cleaner') {
      return data.reduce(
        (acc, item) => ({
          workingHours: acc.workingHours + item.workingHours,
          idleHours: acc.idleHours + item.idleHours,
          idleMinutes: acc.idleMinutes + item.idleMinutes,
          overtimeHours: acc.overtimeHours + item.overtimeHours,
          workingDays: acc.workingDays + item.workingDays,
        }),
        { workingHours: 0, idleHours: 0, idleMinutes: 0, overtimeHours: 0, workingDays: 0 }
      );
    } else if (activeTab === 'daily') {
      return data.reduce(
        (acc, item) => ({
          workingHours: acc.workingHours + item.workingHours,
          idleHours: acc.idleHours + item.idleHours,
          idleMinutes: acc.idleMinutes + item.idleMinutes,
          overtimeHours: acc.overtimeHours + item.overtimeHours,
          bookings: acc.bookings + item.bookings,
        }),
        { workingHours: 0, idleHours: 0, idleMinutes: 0, overtimeHours: 0, bookings: 0 }
      );
    } else {
      return data.reduce(
        (acc, item) => ({
          totalHours: acc.totalHours + item.totalHours,
          regularHours: acc.regularHours + item.regularHours,
          overtimeHours: acc.overtimeHours + item.overtimeHours,
          bookings: acc.bookings + item.bookings,
        }),
        { totalHours: 0, regularHours: 0, overtimeHours: 0, bookings: 0 }
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
          <h1 className="text-3xl font-bold text-gray-900">Hours & Performance Reports</h1>
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
              <p className="text-sm text-gray-600">Total Working Hours</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.totalWorkingHours.toFixed(1)}h
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-orange-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Idle Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.totalIdleHours.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatTime(summary.totalIdleHours * 60)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-red-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Overtime</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.totalOvertimeHours.toFixed(1)}h
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-green-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.avgUtilization.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cleaners</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalCleaners}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Working Days</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalDays}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-indigo-600" />
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
          {activeTab === 'cleaner' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cleaner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Idle Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Idle (Minutes)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.workingHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-orange-600 font-semibold">{item.idleHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatTime(item.idleMinutes)}</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">{item.overtimeHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.workingDays}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.avgHoursPerDay.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">{item.utilizationRate.toFixed(1)}%</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900">TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.workingHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.idleHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatTime(totals.idleMinutes)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.overtimeHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.workingDays}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">-</td>
                  <td className="px-6 py-4 text-sm text-blue-900">-</td>
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'daily' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cleaner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Idle Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Idle (Minutes)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {format(parseISO(item.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.cleaner}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.workingHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-orange-600 font-semibold">{item.idleHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatTime(item.idleMinutes)}</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">{item.overtimeHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.bookings}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">{item.utilizationRate.toFixed(1)}%</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900" colSpan={2}>TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.workingHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.idleHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatTime(totals.idleMinutes)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.overtimeHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.bookings}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">-</td>
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'overtime' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cleaner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Regular (8h)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {format(parseISO(item.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.cleaner}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.totalHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.regularHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-red-600 font-semibold">{item.overtimeHours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.bookings}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900" colSpan={2}>TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.totalHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.regularHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.overtimeHours.toFixed(1)}h</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.bookings}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}