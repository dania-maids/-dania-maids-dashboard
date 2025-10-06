'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, differenceInDays } from 'date-fns';
import { Download, Search, DollarSign, CreditCard, TrendingDown, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type TabType = 'payment' | 'revenue' | 'discounts' | 'debt';

interface PaymentAnalysis {
  type: string;
  count: number;
  totalRevenue: number;
  avgRevenue: number;
  percentage: number;
}

interface RevenueBreakdown {
  category: string;
  revenue: number;
  count: number;
  avgRevenue: number;
  percentage: number;
}

interface DiscountAnalysis {
  category: string;
  totalDiscount: number;
  count: number;
  avgDiscount: number;
  totalRevenue: number;
  discountPercentage: number;
}

interface DebtRecord {
  clientName: string;
  clientMobile: string;
  area: string;
  totalDebt: number;
  bookings: number;
  dueDate: string;
  daysOverdue: number;
  ageCategory: string;
}

export default function FinancialReportsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('payment');
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

  const [paymentAnalysis, setPaymentAnalysis] = useState<PaymentAnalysis[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown[]>([]);
  const [discountAnalysis, setDiscountAnalysis] = useState<DiscountAnalysis[]>([]);
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>([]);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    cashSales: 0,
    creditSales: 0,
    outstandingAmount: 0,
    totalDiscounts: 0,
    avgDiscountPercent: 0,
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
        setPaymentAnalysis([]);
        setRevenueBreakdown([]);
        setDiscountAnalysis([]);
        setDebtRecords([]);
        setSummary({
          totalRevenue: 0,
          cashSales: 0,
          creditSales: 0,
          outstandingAmount: 0,
          totalDiscounts: 0,
          avgDiscountPercent: 0,
        });
        setLoading(false);
        return;
      }

      const totalRevenue = allData.reduce((sum, b) => sum + Number(b.final_price || 0), 0);

      // Payment Analysis
      const cashBookings = allData.filter(b => b.is_credit_sale === false);
      const creditBookings = allData.filter(b => b.is_credit_sale === true);
      
      const cashRevenue = cashBookings.reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const creditRevenue = creditBookings.reduce((sum, b) => sum + Number(b.final_price || 0), 0);

      const paymentData: PaymentAnalysis[] = [
        {
          type: 'Cash Sales',
          count: cashBookings.length,
          totalRevenue: cashRevenue,
          avgRevenue: cashBookings.length > 0 ? cashRevenue / cashBookings.length : 0,
          percentage: totalRevenue > 0 ? (cashRevenue / totalRevenue) * 100 : 0,
        },
        {
          type: 'Credit Sales',
          count: creditBookings.length,
          totalRevenue: creditRevenue,
          avgRevenue: creditBookings.length > 0 ? creditRevenue / creditBookings.length : 0,
          percentage: totalRevenue > 0 ? (creditRevenue / totalRevenue) * 100 : 0,
        },
      ];
      setPaymentAnalysis(paymentData);

      // Revenue Breakdown
      const withMaterialsRevenue = allData
        .filter(b => b.with_materials === true)
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const withoutMaterialsRevenue = allData
        .filter(b => b.with_materials === false)
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const newCustomerRevenue = allData
        .filter(b => b.customer_type === 'new')
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const regularCustomerRevenue = allData
        .filter(b => b.customer_type === 'regular')
        .reduce((sum, b) => sum + Number(b.final_price || 0), 0);

      const revenueData: RevenueBreakdown[] = [
        {
          category: 'With Materials',
          revenue: withMaterialsRevenue,
          count: allData.filter(b => b.with_materials === true).length,
          avgRevenue: allData.filter(b => b.with_materials === true).length > 0 
            ? withMaterialsRevenue / allData.filter(b => b.with_materials === true).length : 0,
          percentage: totalRevenue > 0 ? (withMaterialsRevenue / totalRevenue) * 100 : 0,
        },
        {
          category: 'Without Materials',
          revenue: withoutMaterialsRevenue,
          count: allData.filter(b => b.with_materials === false).length,
          avgRevenue: allData.filter(b => b.with_materials === false).length > 0 
            ? withoutMaterialsRevenue / allData.filter(b => b.with_materials === false).length : 0,
          percentage: totalRevenue > 0 ? (withoutMaterialsRevenue / totalRevenue) * 100 : 0,
        },
        {
          category: 'New Customers',
          revenue: newCustomerRevenue,
          count: allData.filter(b => b.customer_type === 'new').length,
          avgRevenue: allData.filter(b => b.customer_type === 'new').length > 0 
            ? newCustomerRevenue / allData.filter(b => b.customer_type === 'new').length : 0,
          percentage: totalRevenue > 0 ? (newCustomerRevenue / totalRevenue) * 100 : 0,
        },
        {
          category: 'Regular Customers',
          revenue: regularCustomerRevenue,
          count: allData.filter(b => b.customer_type === 'regular').length,
          avgRevenue: allData.filter(b => b.customer_type === 'regular').length > 0 
            ? regularCustomerRevenue / allData.filter(b => b.customer_type === 'regular').length : 0,
          percentage: totalRevenue > 0 ? (regularCustomerRevenue / totalRevenue) * 100 : 0,
        },
      ];
      setRevenueBreakdown(revenueData);

      // Discount Analysis
      const totalDiscounts = allData.reduce((sum, b) => sum + Number(b.discount_amount || 0), 0);
      const bookingsWithDiscount = allData.filter(b => Number(b.discount_amount || 0) > 0);

      const areaDiscountMap = new Map<string, any>();
      allData.forEach(booking => {
        const area = booking.client_area || 'Unknown';
        const discount = Number(booking.discount_amount || 0);
        
        if (!areaDiscountMap.has(area)) {
          areaDiscountMap.set(area, {
            totalDiscount: 0,
            count: 0,
            revenue: 0,
          });
        }

        const areaData = areaDiscountMap.get(area);
        areaData.totalDiscount += discount;
        if (discount > 0) areaData.count++;
        areaData.revenue += Number(booking.final_price || 0);
      });

      const discountData: DiscountAnalysis[] = Array.from(areaDiscountMap.entries())
        .map(([area, data]) => ({
          category: area,
          totalDiscount: data.totalDiscount,
          count: data.count,
          avgDiscount: data.count > 0 ? data.totalDiscount / data.count : 0,
          totalRevenue: data.revenue,
          discountPercentage: data.revenue > 0 ? (data.totalDiscount / (data.revenue + data.totalDiscount)) * 100 : 0,
        }))
        .sort((a, b) => b.totalDiscount - a.totalDiscount);
      setDiscountAnalysis(discountData);

      // Debt Management
      const unpaidBookings = allData.filter(
        b => b.is_credit_sale === true && b.payment_status !== 'paid'
      );

      const clientDebtMap = new Map<string, any>();
      unpaidBookings.forEach(booking => {
        const key = booking.client_mobile || booking.client_name;
        if (!clientDebtMap.has(key)) {
          clientDebtMap.set(key, {
            name: booking.client_name,
            mobile: booking.client_mobile,
            area: booking.client_area,
            debt: 0,
            bookings: 0,
            dueDate: booking.credit_due_date,
            daysOverdue: booking.debt_age_days || 0,
          });
        }

        const clientData = clientDebtMap.get(key);
        clientData.debt += Number(booking.final_price || 0);
        clientData.bookings++;
        
        if (booking.debt_age_days && booking.debt_age_days > clientData.daysOverdue) {
          clientData.daysOverdue = booking.debt_age_days;
          clientData.dueDate = booking.credit_due_date;
        }
      });

      const debtData: DebtRecord[] = Array.from(clientDebtMap.entries())
        .map(([key, data]) => {
          let ageCategory = 'Current';
          if (data.daysOverdue > 60) ageCategory = '60+ Days';
          else if (data.daysOverdue > 30) ageCategory = '30-60 Days';
          else if (data.daysOverdue > 0) ageCategory = '1-30 Days';

          return {
            clientName: data.name,
            clientMobile: data.mobile,
            area: data.area,
            totalDebt: data.debt,
            bookings: data.bookings,
            dueDate: data.dueDate,
            daysOverdue: data.daysOverdue,
            ageCategory,
          };
        })
        .sort((a, b) => b.totalDebt - a.totalDebt);
      setDebtRecords(debtData);

      // Calculate summary
      const outstandingAmount = unpaidBookings.reduce((sum, b) => sum + Number(b.final_price || 0), 0);
      const avgDiscountPercent = totalRevenue > 0 ? (totalDiscounts / (totalRevenue + totalDiscounts)) * 100 : 0;

      setSummary({
        totalRevenue,
        cashSales: cashRevenue,
        creditSales: creditRevenue,
        outstandingAmount,
        totalDiscounts,
        avgDiscountPercent,
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
      case 'payment':
        dataToExport = currentData.map((d: any) => ({
          'Payment Type': d.type,
          Count: d.count,
          'Total Revenue': d.totalRevenue.toFixed(2),
          'Avg Revenue': d.avgRevenue.toFixed(2),
          'Percentage': d.percentage.toFixed(1) + '%',
        }));
        filename = 'Payment_Analysis_Report';
        break;

      case 'revenue':
        dataToExport = currentData.map((d: any) => ({
          Category: d.category,
          Revenue: d.revenue.toFixed(2),
          Count: d.count,
          'Avg Revenue': d.avgRevenue.toFixed(2),
          'Percentage': d.percentage.toFixed(1) + '%',
        }));
        filename = 'Revenue_Breakdown_Report';
        break;

      case 'discounts':
        dataToExport = currentData.map((d: any) => ({
          Category: d.category,
          'Total Discount': d.totalDiscount.toFixed(2),
          Count: d.count,
          'Avg Discount': d.avgDiscount.toFixed(2),
          'Total Revenue': d.totalRevenue.toFixed(2),
          'Discount %': d.discountPercentage.toFixed(1) + '%',
        }));
        filename = 'Discounts_Analysis_Report';
        break;

      case 'debt':
        dataToExport = currentData.map((d: any) => ({
          'Client Name': d.clientName,
          Mobile: d.clientMobile,
          Area: d.area,
          'Total Debt': d.totalDebt.toFixed(2),
          Bookings: d.bookings,
          'Due Date': d.dueDate ? format(parseISO(d.dueDate), 'MMM dd, yyyy') : 'N/A',
          'Days Overdue': d.daysOverdue,
          'Age Category': d.ageCategory,
        }));
        filename = 'Debt_Management_Report';
        break;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Report');
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
    { id: 'payment' as TabType, label: 'Payment Analysis', icon: CreditCard },
    { id: 'revenue' as TabType, label: 'Revenue Breakdown', icon: DollarSign },
    { id: 'discounts' as TabType, label: 'Discounts', icon: TrendingDown },
    { id: 'debt' as TabType, label: 'Debt Management', icon: AlertCircle },
  ];

  const getCurrentData = () => {
    let data: any[] = [];
    switch (activeTab) {
      case 'payment':
        data = paymentAnalysis;
        break;
      case 'revenue':
        data = revenueBreakdown;
        break;
      case 'discounts':
        data = discountAnalysis;
        break;
      case 'debt':
        data = debtRecords;
        break;
    }

    if (searchTerm === '') return data;

    return data.filter(item => {
      const searchValue = searchTerm.toLowerCase();
      if (activeTab === 'payment') {
        return item.type.toLowerCase().includes(searchValue);
      } else if (activeTab === 'revenue' || activeTab === 'discounts') {
        return item.category.toLowerCase().includes(searchValue);
      } else {
        return (
          item.clientName?.toLowerCase().includes(searchValue) ||
          item.clientMobile?.toLowerCase().includes(searchValue) ||
          item.area?.toLowerCase().includes(searchValue)
        );
      }
    });
  };

  const calculateTotals = () => {
    const data = getCurrentData();
    if (activeTab === 'payment') {
      return data.reduce(
        (acc, item) => ({
          count: acc.count + item.count,
          totalRevenue: acc.totalRevenue + item.totalRevenue,
        }),
        { count: 0, totalRevenue: 0 }
      );
    } else if (activeTab === 'revenue') {
      return data.reduce(
        (acc, item) => ({
          revenue: acc.revenue + item.revenue,
          count: acc.count + item.count,
        }),
        { revenue: 0, count: 0 }
      );
    } else if (activeTab === 'discounts') {
      return data.reduce(
        (acc, item) => ({
          totalDiscount: acc.totalDiscount + item.totalDiscount,
          count: acc.count + item.count,
          totalRevenue: acc.totalRevenue + item.totalRevenue,
        }),
        { totalDiscount: 0, count: 0, totalRevenue: 0 }
      );
    } else {
      return data.reduce(
        (acc, item) => ({
          totalDebt: acc.totalDebt + item.totalDebt,
          bookings: acc.bookings + item.bookings,
        }),
        { totalDebt: 0, bookings: 0 }
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
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
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
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-green-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cash Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.cashSales)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Credit Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.creditSales)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-red-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outstanding Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.outstandingAmount)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-orange-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Discounts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalDiscounts)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Discount %</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.avgDiscountPercent.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-indigo-600" />
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
          {activeTab === 'payment' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Type</th>
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

          {activeTab === 'revenue' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.category}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.count}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgRevenue)}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{item.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900">TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.revenue)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.count}</td>
                  <td className="px-6 py-4 text-sm text-blue-900" colSpan={2}>-</td>
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'discounts' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.category}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                      {formatCurrency(item.totalDiscount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.count}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.avgDiscount)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{item.discountPercentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900">TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.totalDiscount)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.count}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">-</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.totalRevenue)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">-</td>
                </tr>
              </tbody>
            </table>
          )}

          {activeTab === 'debt' && (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Debt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age Category</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentData().map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.clientName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.clientMobile}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.area}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">
                      {formatCurrency(item.totalDebt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.bookings}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.dueDate ? format(parseISO(item.dueDate), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.daysOverdue}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.ageCategory === 'Current'
                            ? 'bg-green-100 text-green-700'
                            : item.ageCategory === '1-30 Days'
                            ? 'bg-yellow-100 text-yellow-700'
                            : item.ageCategory === '30-60 Days'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.ageCategory}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                  <td className="px-6 py-4 text-sm text-blue-900" colSpan={3}>TOTALS</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{formatCurrency(totals.totalDebt)}</td>
                  <td className="px-6 py-4 text-sm text-blue-900">{totals.bookings}</td>
                  <td className="px-6 py-4 text-sm text-blue-900" colSpan={3}>-</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}