'use client';

import { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { Calendar, Table, LayoutGrid, Search, Save, AlertCircle, MapPin, Phone, Sparkles, Circle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ViewMode = 'table' | 'card' | 'board';
type QuickFilter = 'today' | 'tomorrow' | 'dayAfter' | 'custom';

interface BookingData {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  with_materials: boolean;
  client_name: string;
  client_mobile: string;
  client_area: string;
  client_zone: string;
  client_street: string;
  client_building: string;
  client_location_url: string;
  cleaner_name: string;
  transport_id?: string;
  pickup_driver_id?: string;
  pickup_driver_name?: string;
  pickup_completed?: boolean;
  dropoff_driver_id?: string;
  dropoff_driver_name?: string;
  dropoff_completed?: boolean;
}

interface Driver {
  id: string;
  name: string;
  mobile: string;
  status: string;
}

const formatMobile = (mobile: any) => {
  if (!mobile) return '';
  const mobileStr = typeof mobile === 'number' 
    ? mobile.toLocaleString('fullwide', { useGrouping: false })
    : String(mobile);
  return mobileStr.replace(/\s/g, '');
};

const driverColors = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
];

const getDriverColor = (driverName: string) => {
  if (!driverName) return driverColors[0];
  const index = driverName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % driverColors.length;
  return driverColors[index];
};

export default function LogisticsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('today');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [morningBookings, setMorningBookings] = useState<BookingData[]>([]);
  const [afternoonBookings, setAfternoonBookings] = useState<BookingData[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [changes, setChanges] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleQuickFilter = (filter: QuickFilter) => {
    setActiveFilter(filter);
    
    if (filter === 'custom') {
      setShowCustomPicker(true);
      setCustomDate(selectedDate);
      return;
    }

    setShowCustomPicker(false);
    const today = new Date();
    let date: Date;

    switch (filter) {
      case 'today':
        date = today;
        break;
      case 'tomorrow':
        date = addDays(today, 1);
        break;
      case 'dayAfter':
        date = addDays(today, 2);
        break;
      default:
        date = today;
    }

    setSelectedDate(format(date, 'yyyy-MM-dd'));
  };

  const applyCustomDate = () => {
    setSelectedDate(customDate);
    setShowCustomPicker(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: driversData } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (driversData) setDrivers(driversData);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          cleaners(name),
          booking_transport(
            id,
            pickup_driver_id,
            pickup_completed,
            dropoff_driver_id,
            dropoff_completed
          )
        `)
        .eq('booking_date', selectedDate)
        .neq('status', 'cancelled')
        .order('start_time');

      if (bookingsData) {
        const driverIds = new Set<string>();
        bookingsData.forEach((b: any) => {
          if (b.booking_transport?.pickup_driver_id) {
            driverIds.add(b.booking_transport.pickup_driver_id);
          }
          if (b.booking_transport?.dropoff_driver_id) {
            driverIds.add(b.booking_transport.dropoff_driver_id);
          }
        });

        const { data: driverNames } = await supabase
          .from('drivers')
          .select('id, name')
          .in('id', Array.from(driverIds));

        const driverMap = new Map(driverNames?.map(d => [d.id, d.name]));

        const processed = bookingsData.map((b: any) => ({
          id: b.id,
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
          duration_hours: b.duration_hours,
          with_materials: b.with_materials,
          client_name: b.client_name,
          client_mobile: formatMobile(b.client_mobile),
          client_area: b.client_area,
          client_zone: b.client_zone,
          client_street: b.client_street,
          client_building: b.client_building,
          client_location_url: b.client_location_url,
          cleaner_name: b.cleaners?.name,
          transport_id: b.booking_transport?.id,
          pickup_driver_id: b.booking_transport?.pickup_driver_id,
          pickup_driver_name: b.booking_transport?.pickup_driver_id
            ? driverMap.get(b.booking_transport.pickup_driver_id)
            : null,
          pickup_completed: b.booking_transport?.pickup_completed,
          dropoff_driver_id: b.booking_transport?.dropoff_driver_id,
          dropoff_driver_name: b.booking_transport?.dropoff_driver_id
            ? driverMap.get(b.booking_transport.dropoff_driver_id)
            : null,
          dropoff_completed: b.booking_transport?.dropoff_completed,
        }));

        const morning: BookingData[] = [];
        const afternoon: BookingData[] = [];

        processed.forEach((booking: BookingData) => {
          const [hours] = booking.start_time.split(':').map(Number);
          if (hours >= 6 && hours < 12) {
            morning.push(booking);
          } else {
            afternoon.push(booking);
          }
        });

        setMorningBookings(morning);
        setAfternoonBookings(afternoon);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverChange = (
    bookingId: string,
    transportId: string | undefined,
    type: 'pickup' | 'dropoff',
    driverId: string | null
  ) => {
    const key = `${bookingId}_${type}`;
    const newChanges = new Map(changes);
    newChanges.set(key, {
      bookingId,
      transportId,
      type,
      driverId,
    });
    setChanges(newChanges);

    const updateBooking = (booking: BookingData) => {
      if (booking.id === bookingId) {
        if (type === 'pickup') {
          return {
            ...booking,
            pickup_driver_id: driverId || undefined,
            pickup_driver_name: driverId
              ? drivers.find(d => d.id === driverId)?.name
              : undefined,
          };
        } else {
          return {
            ...booking,
            dropoff_driver_id: driverId || undefined,
            dropoff_driver_name: driverId
              ? drivers.find(d => d.id === driverId)?.name
              : undefined,
          };
        }
      }
      return booking;
    };

    setMorningBookings(prev => prev.map(updateBooking));
    setAfternoonBookings(prev => prev.map(updateBooking));
  };

  const handleCompletedChange = (
    bookingId: string,
    type: 'pickup' | 'dropoff',
    completed: boolean
  ) => {
    const key = `${bookingId}_${type}_completed`;
    const newChanges = new Map(changes);
    newChanges.set(key, {
      bookingId,
      type,
      completed,
    });
    setChanges(newChanges);

    const updateBooking = (booking: BookingData) => {
      if (booking.id === bookingId) {
        if (type === 'pickup') {
          return { ...booking, pickup_completed: completed };
        } else {
          return { ...booking, dropoff_completed: completed };
        }
      }
      return booking;
    };

    setMorningBookings(prev => prev.map(updateBooking));
    setAfternoonBookings(prev => prev.map(updateBooking));
  };

  const saveChanges = async () => {
    if (changes.size === 0) return;

    setSaving(true);
    try {
      for (const [key, change] of changes.entries()) {
        if (key.includes('_completed')) {
          const { bookingId, type, completed } = change;
          const booking = [...morningBookings, ...afternoonBookings].find(b => b.id === bookingId);

          if (booking?.transport_id) {
            await supabase
              .from('booking_transport')
              .update({
                [`${type}_completed`]: completed,
                updated_at: new Date().toISOString(),
              })
              .eq('id', booking.transport_id);
          }
        } else {
          const { bookingId, transportId, type, driverId } = change;

          if (transportId) {
            await supabase
              .from('booking_transport')
              .update({
                [`${type}_driver_id`]: driverId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', transportId);
          } else {
            await supabase.from('booking_transport').insert({
              booking_id: bookingId,
              [`${type}_driver_id`]: driverId,
            });
          }
        }
      }

      setChanges(new Map());
      await loadData();
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filterBookings = (bookings: BookingData[]) => {
    if (!searchTerm) return bookings;

    const term = searchTerm.toLowerCase();
    return bookings.filter(
      b =>
        b.client_name.toLowerCase().includes(term) ||
        b.client_mobile?.toLowerCase().includes(term) ||
        b.client_area?.toLowerCase().includes(term) ||
        b.cleaner_name?.toLowerCase().includes(term)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const quickFilters = [
    { label: 'Today', value: 'today' as QuickFilter },
    { label: 'Tomorrow', value: 'tomorrow' as QuickFilter },
    { label: 'Day After Tomorrow', value: 'dayAfter' as QuickFilter },
    { label: 'Custom Date', value: 'custom' as QuickFilter },
  ];

  const filteredMorning = filterBookings(morningBookings);
  const filteredAfternoon = filterBookings(afternoonBookings);

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logistics Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}
          </p>
        </div>
        <button
          onClick={saveChanges}
          disabled={changes.size === 0 || saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            changes.size === 0 || saving
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : `Save Changes ${changes.size > 0 ? `(${changes.size})` : ''}`}
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
            <label className="text-sm font-medium text-gray-700">Select Date:</label>
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={applyCustomDate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-white rounded-lg p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Table className="w-4 h-4" />
            Table View
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Card View
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Board View
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <h2 className="text-lg font-semibold text-blue-900">
            Morning Shift (6:00 AM - 11:59 AM)
          </h2>
          <p className="text-sm text-blue-600 mt-1">{filteredMorning.length} bookings</p>
        </div>

        {viewMode === 'table' && (
          <TableView
            bookings={filteredMorning}
            drivers={drivers}
            onDriverChange={handleDriverChange}
            onCompletedChange={handleCompletedChange}
          />
        )}

        {viewMode === 'card' && (
          <CardView
            bookings={filteredMorning}
            drivers={drivers}
            onDriverChange={handleDriverChange}
            onCompletedChange={handleCompletedChange}
          />
        )}

        {viewMode === 'board' && (
          <BoardView
            bookings={filteredMorning}
            drivers={drivers}
            onDriverChange={handleDriverChange}
            onCompletedChange={handleCompletedChange}
          />
        )}
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
        <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
          <h2 className="text-lg font-semibold text-orange-900">
            Afternoon Shift (12:00 PM - 8:30 PM)
          </h2>
          <p className="text-sm text-orange-600 mt-1">{filteredAfternoon.length} bookings</p>
        </div>

        {viewMode === 'table' && (
          <TableView
            bookings={filteredAfternoon}
            drivers={drivers}
            onDriverChange={handleDriverChange}
            onCompletedChange={handleCompletedChange}
          />
        )}

        {viewMode === 'card' && (
          <CardView
            bookings={filteredAfternoon}
            drivers={drivers}
            onDriverChange={handleDriverChange}
            onCompletedChange={handleCompletedChange}
          />
        )}

        {viewMode === 'board' && (
          <BoardView
            bookings={filteredAfternoon}
            drivers={drivers}
            onDriverChange={handleDriverChange}
            onCompletedChange={handleCompletedChange}
          />
        )}
      </div>
    </div>
  );
}

function TableView({
  bookings,
  drivers,
  onDriverChange,
  onCompletedChange,
}: {
  bookings: BookingData[];
  drivers: Driver[];
  onDriverChange: (
    bookingId: string,
    transportId: string | undefined,
    type: 'pickup' | 'dropoff',
    driverId: string | null
  ) => void;
  onCompletedChange: (bookingId: string, type: 'pickup' | 'dropoff', completed: boolean) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">No bookings found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cleaner</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materials</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Street</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Building</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickup Driver</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dropoff Driver</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {bookings.map(booking => (
            <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-4 text-sm font-medium text-gray-900">{booking.cleaner_name}</td>
              <td className="px-3 py-4 text-sm text-gray-900">
                {booking.start_time.substring(0, 5)}
              </td>
              <td className="px-3 py-4 text-sm text-gray-900">
                {booking.end_time.substring(0, 5)}
              </td>
              <td className="px-3 py-4 text-sm">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                  {booking.duration_hours} hrs
                </span>
              </td>
              <td className="px-3 py-4 text-sm">
                {booking.with_materials ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium w-fit">
                    <Sparkles className="w-3 h-3" />
                    With
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium w-fit">
                    <Circle className="w-3 h-3" />
                    Without
                  </span>
                )}
              </td>
              <td className="px-3 py-4 text-sm text-gray-900">{booking.client_name}</td>
              <td className="px-3 py-4 text-sm text-gray-600">
                <a 
                  href={`tel:${booking.client_mobile}`}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Phone className="w-3 h-3" />
                  {booking.client_mobile}
                </a>
              </td>
              <td className="px-3 py-4 text-sm text-gray-600">
                <div className="flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{booking.client_area}</p>
                    {booking.client_location_url && (
                      <a
                        href={booking.client_location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Map
                      </a>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 py-4 text-sm text-gray-600">{booking.client_zone || '-'}</td>
              <td className="px-3 py-4 text-sm text-gray-600">{booking.client_street || '-'}</td>
              <td className="px-3 py-4 text-sm text-gray-600">{booking.client_building || '-'}</td>
              <td className="px-3 py-4">
                <div className="flex items-center gap-2">
                  <select
                    value={booking.pickup_driver_id || ''}
                    onChange={e =>
                      onDriverChange(booking.id, booking.transport_id, 'pickup', e.target.value || null)
                    }
                    className={`px-2 py-1.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      booking.pickup_driver_id 
                        ? `${getDriverColor(booking.pickup_driver_name || '').bg} ${getDriverColor(booking.pickup_driver_name || '').text} ${getDriverColor(booking.pickup_driver_name || '').border}`
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                  {booking.pickup_driver_id && (
                    <input
                      type="checkbox"
                      checked={booking.pickup_completed || false}
                      onChange={e => onCompletedChange(booking.id, 'pickup', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      title="Completed"
                    />
                  )}
                </div>
              </td>
              <td className="px-3 py-4">
                <div className="flex items-center gap-2">
                  <select
                    value={booking.dropoff_driver_id || ''}
                    onChange={e =>
                      onDriverChange(booking.id, booking.transport_id, 'dropoff', e.target.value || null)
                    }
                    className={`px-2 py-1.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      booking.dropoff_driver_id 
                        ? `${getDriverColor(booking.dropoff_driver_name || '').bg} ${getDriverColor(booking.dropoff_driver_name || '').text} ${getDriverColor(booking.dropoff_driver_name || '').border}`
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                  {booking.dropoff_driver_id && (
                    <input
                      type="checkbox"
                      checked={booking.dropoff_completed || false}
                      onChange={e => onCompletedChange(booking.id, 'dropoff', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      title="Completed"
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardView({
  bookings,
  drivers,
  onDriverChange,
  onCompletedChange,
}: {
  bookings: BookingData[];
  drivers: Driver[];
  onDriverChange: (
    bookingId: string,
    transportId: string | undefined,
    type: 'pickup' | 'dropoff',
    driverId: string | null
  ) => void;
  onCompletedChange: (bookingId: string, type: 'pickup' | 'dropoff', completed: boolean) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">No bookings found</p>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {bookings.map(booking => (
        <div
          key={booking.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Cleaner</p>
              <p className="text-sm font-semibold text-gray-900">{booking.cleaner_name}</p>
            </div>

            <div className="flex items-center gap-2">
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-sm font-medium text-gray-900">
                  {booking.start_time.substring(0, 5)} → {booking.end_time.substring(0, 5)}
                </p>
              </div>
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                {booking.duration_hours} hrs
              </span>
            </div>

            <div>
              {booking.with_materials ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium w-fit">
                  <Sparkles className="w-3 h-3" />
                  With Materials
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium w-fit">
                  <Circle className="w-3 h-3" />
                  Without Materials
                </span>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">Client</p>
              <p className="text-sm font-medium text-gray-900">{booking.client_name}</p>
              <a 
                href={`tel:${booking.client_mobile}`}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
              >
                <Phone className="w-3 h-3" />
                {booking.client_mobile}
              </a>
            </div>

            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Address
              </p>
              <p className="text-xs text-gray-700">{booking.client_area}</p>
              {booking.client_zone && <p className="text-xs text-gray-600">Zone: {booking.client_zone}</p>}
              {booking.client_street && <p className="text-xs text-gray-600">Street: {booking.client_street}</p>}
              {booking.client_building && <p className="text-xs text-gray-600">Building: {booking.client_building}</p>}
              {booking.client_location_url && (
                <a
                  href={booking.client_location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View on Map
                </a>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-gray-200">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Pickup Driver</label>
                <div className="flex items-center gap-2">
                  <select
                    value={booking.pickup_driver_id || ''}
                    onChange={e =>
                      onDriverChange(booking.id, booking.transport_id, 'pickup', e.target.value || null)
                    }
                    className={`flex-1 px-2 py-1.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      booking.pickup_driver_id 
                        ? `${getDriverColor(booking.pickup_driver_name || '').bg} ${getDriverColor(booking.pickup_driver_name || '').text} ${getDriverColor(booking.pickup_driver_name || '').border}`
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                  {booking.pickup_driver_id && (
                    <input
                      type="checkbox"
                      checked={booking.pickup_completed || false}
                      onChange={e => onCompletedChange(booking.id, 'pickup', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Dropoff Driver</label>
                <div className="flex items-center gap-2">
                  <select
                    value={booking.dropoff_driver_id || ''}
                    onChange={e =>
                      onDriverChange(booking.id, booking.transport_id, 'dropoff', e.target.value || null)
                    }
                    className={`flex-1 px-2 py-1.5 text-sm border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      booking.dropoff_driver_id 
                        ? `${getDriverColor(booking.dropoff_driver_name || '').bg} ${getDriverColor(booking.dropoff_driver_name || '').text} ${getDriverColor(booking.dropoff_driver_name || '').border}`
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                  {booking.dropoff_driver_id && (
                    <input
                      type="checkbox"
                      checked={booking.dropoff_completed || false}
                      onChange={e => onCompletedChange(booking.id, 'dropoff', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardView({
  bookings,
  drivers,
  onDriverChange,
  onCompletedChange,
}: {
  bookings: BookingData[];
  drivers: Driver[];
  onDriverChange: (
    bookingId: string,
    transportId: string | undefined,
    type: 'pickup' | 'dropoff',
    driverId: string | null
  ) => void;
  onCompletedChange: (bookingId: string, type: 'pickup' | 'dropoff', completed: boolean) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">No bookings found</p>
      </div>
    );
  }

  const unassigned: BookingData[] = [];
  const byDriver = new Map<string, BookingData[]>();

  bookings.forEach(booking => {
    if (booking.pickup_driver_id) {
      const driverName = booking.pickup_driver_name || 'Unknown Driver';
      if (!byDriver.has(driverName)) {
        byDriver.set(driverName, []);
      }
      byDriver.get(driverName)!.push(booking);
    } else {
      unassigned.push(booking);
    }
  });

  return (
    <div className="p-6">
      <div className="flex gap-4 overflow-x-auto pb-4">
        <div className="flex-shrink-0 w-80">
          <div className="bg-gray-100 rounded-xl p-4 border-2 border-gray-300">
            <h3 className="font-semibold text-gray-900 mb-3">
              Unassigned ({unassigned.length})
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {unassigned.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  drivers={drivers}
                  onDriverChange={onDriverChange}
                  onCompletedChange={onCompletedChange}
                />
              ))}
            </div>
          </div>
        </div>

        {Array.from(byDriver.entries()).map(([driverName, driverBookings]) => {
          const colors = getDriverColor(driverName);
          
          return (
            <div key={driverName} className="flex-shrink-0 w-80">
              <div className={`${colors.bg} rounded-xl p-4 border-2 ${colors.border}`}>
                <h3 className={`font-semibold ${colors.text} mb-3`}>
                  {driverName} ({driverBookings.length})
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {driverBookings.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      drivers={drivers}
                      onDriverChange={onDriverChange}
                      onCompletedChange={onCompletedChange}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  drivers,
  onDriverChange,
  onCompletedChange,
}: {
  booking: BookingData;
  drivers: Driver[];
  onDriverChange: (
    bookingId: string,
    transportId: string | undefined,
    type: 'pickup' | 'dropoff',
    driverId: string | null
  ) => void;
  onCompletedChange: (bookingId: string, type: 'pickup' | 'dropoff', completed: boolean) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500">Cleaner</p>
          <p className="text-sm font-semibold text-gray-900">{booking.cleaner_name}</p>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-gray-900">
            {booking.start_time.substring(0, 5)} → {booking.end_time.substring(0, 5)}
          </p>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
            {booking.duration_hours}h
          </span>
        </div>

        <div>
          {booking.with_materials ? (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium w-fit">
              <Sparkles className="w-3 h-3" />
              With
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium w-fit">
              <Circle className="w-3 h-3" />
              Without
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-gray-200">
          <p className="font-medium text-sm text-gray-900">{booking.client_name}</p>
          <a 
            href={`tel:${booking.client_mobile}`}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <Phone className="w-3 h-3" />
            {booking.client_mobile}
          </a>
          <p className="text-xs text-gray-600 flex items-start gap-1 mt-1">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{booking.client_area}</span>
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Pickup</label>
            <div className="flex items-center gap-2">
              <select
                value={booking.pickup_driver_id || ''}
                onChange={e =>
                  onDriverChange(booking.id, booking.transport_id, 'pickup', e.target.value || null)
                }
                className={`flex-1 px-2 py-1 text-xs border-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  booking.pickup_driver_id 
                    ? `${getDriverColor(booking.pickup_driver_name || '').bg} ${getDriverColor(booking.pickup_driver_name || '').text} ${getDriverColor(booking.pickup_driver_name || '').border}`
                    : 'border-gray-300'
                }`}
              >
                <option value="">Select</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
              {booking.pickup_driver_id && (
                <input
                  type="checkbox"
                  checked={booking.pickup_completed || false}
                  onChange={e => onCompletedChange(booking.id, 'pickup', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">Dropoff</label>
            <div className="flex items-center gap-2">
              <select
                value={booking.dropoff_driver_id || ''}
                onChange={e =>
                  onDriverChange(booking.id, booking.transport_id, 'dropoff', e.target.value || null)
                }
                className={`flex-1 px-2 py-1 text-xs border-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  booking.dropoff_driver_id 
                    ? `${getDriverColor(booking.dropoff_driver_name || '').bg} ${getDriverColor(booking.dropoff_driver_name || '').text} ${getDriverColor(booking.dropoff_driver_name || '').border}`
                    : 'border-gray-300'
                }`}
              >
                <option value="">Select</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
              {booking.dropoff_driver_id && (
                <input
                  type="checkbox"
                  checked={booking.dropoff_completed || false}
                  onChange={e => onCompletedChange(booking.id, 'dropoff', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}