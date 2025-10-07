'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { DollarSign, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

interface DriverCollection {
  driver_id: string;
  driver_name: string;
  driver_mobile: string;
  total_bookings: number;
  pickup_bookings: number;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  status: string;
  bookings: BookingDetail[];
}

interface BookingDetail {
  booking_number: string;
  client_name: string;
  client_mobile: string;
  final_price: number;
  booking_date: string;
  start_time: string;
}

export default function CollectionsPage() {
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
  const [collections, setCollections] = useState<DriverCollection[]>([]);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  useEffect(() => {
    loadCollections();
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
        const lastWeek = subDays(startOfWeek(now, { weekStartsOn: 0 }), 7);
        start = startOfWeek(lastWeek, { weekStartsOn: 0 });
        end = endOfWeek(lastWeek, { weekStartsOn: 0 });
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subDays(startOfMonth(now), 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
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

  const loadCollections = async () => {
    setLoading(true);
    try {
      // Get all drivers
      const { data: driversData } = await supabase
        .from('drivers')
        .select('id, name, mobile')
        .eq('status', 'active')
        .order('name');

      if (!driversData) {
        setCollections([]);
        setLoading(false);
        return;
      }

      // Get all bookings with pickup completed in date range
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          booking_date,
          start_time,
          client_name,
          client_mobile,
          final_price,
          is_credit_sale,
          payment_status,
          booking_transport(
            pickup_driver_id,
            pickup_completed
          )
        `)
        .gte('booking_date', dateRange.start)
        .lte('booking_date', dateRange.end)
        .neq('status', 'cancelled');

      // Process collections for each driver
      const driverCollections: DriverCollection[] = [];

      driversData.forEach(driver => {
        const driverBookings = bookingsData?.filter(
          b => 
            b.booking_transport?.pickup_driver_id === driver.id &&
            b.booking_transport?.pickup_completed === true &&
            b.is_credit_sale === false // Only cash bookings
        ) || [];

        if (driverBookings.length > 0) {
          const expectedAmount = driverBookings.reduce(
            (sum, b) => sum + Number(b.final_price || 0),
            0
          );

          const bookingDetails: BookingDetail[] = driverBookings.map(b => ({
            booking_number: b.booking_number,
            client_name: b.client_name,
            client_mobile: b.client_mobile,
            final_price: Number(b.final_price || 0),
            booking_date: b.booking_date,
            start_time: b.start_time,
          }));

          driverCollections.push({
            driver_id: driver.id,
            driver_name: driver.name,
            driver_mobile: driver.mobile,
            total_bookings: driverBookings.length,
            pickup_bookings: driverBookings.length,
            expected_amount: expectedAmount,
            actual_amount: 0,
            difference: 0,
            status: 'pending',
            bookings: bookingDetails,
          });
        }
      });

      setCollections(driverCollections.sort((a, b) => b.expected_amount - a.expected_amount));
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = collections.map(c => ({
      'Driver Name': c.driver_name,
      'Driver Mobile': c.driver_mobile,
      'Total Bookings': c.total_bookings,
      'Expected Amount': c.expected_amount.toFixed(2),
      'Status': c.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Driver Collections');
    XLSX.writeFile(workbook, `Driver_Collections_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMobile = (mobile: string) => {
    if (!mobile) return '';
    return String(mobile).replace(/\s/g, '');
  };

  if (loading) {
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
    { label: 'Custom', value: 'custom' },
  ];

  const totalExpected = collections.reduce((sum, c) => sum + c.expected_amount, 0);
  const totalBookings = collections.reduce((sum, c) => sum + c.total_bookings, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Driver Collections</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-sm border border-blue-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{collections.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-green-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalBookings}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expected Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalExpected)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-orange-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg per Driver</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(collections.length > 0 ? totalExpected / collections.length : 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Collections List */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Driver Collections Details</h2>
        </div>

        {collections.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No collections found for this period</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {collections.map(collection => (
              <div key={collection.driver_id} className="p-6 hover:bg-gray-50 transition-colors">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedDriver(
                    expandedDriver === collection.driver_id ? null : collection.driver_id
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{collection.driver_name}</h3>
                      <p className="text-sm text-gray-600">{formatMobile(collection.driver_mobile)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Bookings</p>
                      <p className="text-lg font-semibold text-gray-900">{collection.total_bookings}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Expected Amount</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(collection.expected_amount)}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      collection.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : collection.status === 'submitted'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {collection.status === 'pending' && <Clock className="w-4 h-4 inline mr-1" />}
                      {collection.status === 'completed' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                      {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                    </div>
                  </div>
                </div>

                {/* Expanded Bookings Details */}
                {expandedDriver === collection.driver_id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Booking Details:</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Booking #</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {collection.bookings.map((booking, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                                {booking.booking_number}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {format(parseISO(booking.booking_date), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {booking.start_time.substring(0, 5)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {booking.client_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatMobile(booking.client_mobile)}
                              </td>
                              <td className="px-4 py-3 text-sm text-green-600 font-semibold text-right">
                                {formatCurrency(booking.final_price)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-blue-50 font-semibold">
                            <td colSpan={5} className="px-4 py-3 text-sm text-blue-900 text-right">
                              Total:
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-900 text-right">
                              {formatCurrency(collection.expected_amount)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}