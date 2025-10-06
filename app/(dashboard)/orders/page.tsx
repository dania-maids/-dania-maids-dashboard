'use client'

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { 
  Calendar as CalendarIcon, 
  Search, 
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import * as XLSX from 'xlsx'

export default function OrdersPage() {
  const { userProfile } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [filteredBookings, setFilteredBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')

  useEffect(() => {
    loadBookings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [bookings, searchQuery, statusFilter, paymentFilter, selectedDate, selectedMonth, selectedYear])

  async function loadBookings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('vw_booking_details')
      .select('*')
      .order('booking_date', { ascending: false })
    
    if (error) {
      console.error('Error loading bookings:', error)
      toast.error('Failed to load bookings')
    } else {
      setBookings(data || [])
    }
    setLoading(false)
  }

  function applyFilters() {
    let filtered = [...bookings]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(b => 
        b.booking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.client_mobile?.includes(searchQuery)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter)
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(b => b.payment_status === paymentFilter)
    }

    // Date filter
    if (selectedDate) {
      filtered = filtered.filter(b => {
        const bookingDate = format(new Date(b.booking_date), 'yyyy-MM-dd')
        const filterDate = format(selectedDate, 'yyyy-MM-dd')
        return bookingDate === filterDate
      })
    }

    // Month filter
    if (selectedMonth && selectedMonth !== 'all') {
      filtered = filtered.filter(b => {
        const bookingMonth = format(new Date(b.booking_date), 'MM')
        return bookingMonth === selectedMonth
      })
    }

    // Year filter
    if (selectedYear && selectedYear !== 'all') {
      filtered = filtered.filter(b => {
        const bookingYear = format(new Date(b.booking_date), 'yyyy')
        return bookingYear === selectedYear
      })
    }

    setFilteredBookings(filtered)
  }

  async function markAsPaid(bookingId: string) {
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'manager') {
      toast.error('You do not have permission to update payment status')
      return
    }

    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating payment status:', error)
      toast.error('Failed to update payment status')
    } else {
      toast.success('Payment marked as paid')
      loadBookings()
    }
  }

  function exportToExcel() {
    const exportData = filteredBookings.map(b => ({
      'Booking Number': b.booking_number,
      'Date': format(new Date(b.booking_date), 'MMM d, yyyy'),
      'Client Name': b.client_name,
      'Mobile': b.client_mobile,
      'Cleaner': b.cleaner_name,
      'Time': `${format(new Date(`2000-01-01T${b.start_time}`), 'h:mm a')} - ${format(new Date(`2000-01-01T${b.end_time}`), 'h:mm a')}`,
      'Duration': `${b.duration_hours} hours`,
      'Price': b.final_price,
      'Payment Mode': b.payment_mode,
      'Payment Status': b.payment_status,
      'Status': b.status,
      'Area': b.client_area
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, `orders_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    
    toast.success('Excel file downloaded successfully')
  }

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setPaymentFilter('all')
    setSelectedDate(undefined)
    setSelectedMonth('all')
    setSelectedYear('all')
  }

  const years = Array.from(new Array(5), (_, i) => new Date().getFullYear() - i)
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ]

  return (
    <div className="flex flex-col h-full">
      <Header />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Orders Archive</h1>
          <p className="text-gray-600">View and manage all bookings and payments</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by booking #, client name, mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Filter */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Payments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Export Button */}
            <Button onClick={exportToExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>

          {/* Month & Year Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{filteredBookings.length}</p>
              </div>
              <Filter className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredBookings.filter(b => b.payment_status === 'paid').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unpaid</p>
                <p className="text-2xl font-bold text-amber-600">
                  {filteredBookings.filter(b => b.payment_status === 'unpaid').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {filteredBookings.reduce((sum, b) => sum + (b.final_price || 0), 0).toFixed(2)} QAR
                </p>
              </div>
              <Download className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Booking #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cleaner</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Payment Mode</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Payment Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{booking.booking_number}</td>
                      <td className="px-4 py-3 text-sm">{format(new Date(booking.booking_date), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>{booking.client_name}</div>
                        <div className="text-xs text-gray-500">{booking.client_mobile}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{booking.cleaner_name}</td>
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(`2000-01-01T${booking.start_time}`), 'h:mm a')} - 
                        {format(new Date(`2000-01-01T${booking.end_time}`), 'h:mm a')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{booking.final_price} QAR</td>
                      <td className="px-4 py-3 text-sm capitalize">{booking.payment_mode}</td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant={
                            booking.payment_status === 'paid' 
                            ? 'default' 
                            : booking.payment_status === 'refunded'
                            ? 'secondary'
                            : 'outline'
                          }
                          className={`
                            ${booking.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-700' 
                              : booking.payment_status === 'refunded'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                            }
                          `}
                        >
                          {booking.payment_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant={
                            booking.status === 'completed' 
                            ? 'default' 
                            : booking.status === 'cancelled'
                            ? 'secondary'
                            : 'outline'
                          }
                          className={`
                            ${booking.status === 'completed' 
                              ? 'bg-blue-100 text-blue-700' 
                              : booking.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                            }
                          `}
                        >
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {booking.payment_status === 'unpaid' && 
                         booking.payment_mode !== 'online' &&
                         (userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsPaid(booking.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}