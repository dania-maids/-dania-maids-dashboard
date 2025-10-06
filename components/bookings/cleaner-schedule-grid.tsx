'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Clock, Plus, User, MapPin, DollarSign, Phone, Hash, AlertTriangle, Edit2 } from "lucide-react"
import { EditBookingDialog } from "./edit-booking-dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CleanerScheduleGridProps {
  cleaners: any[]
  selectedDate: Date
  onBookClick: (cleanerId: string, cleanerName: string, date: Date, startTime?: string) => void
  viewFilter: 'all' | 'available' | 'booked'
}

export function CleanerScheduleGrid({ cleaners, selectedDate, onBookClick, viewFilter }: CleanerScheduleGridProps) {
  const [schedules, setSchedules] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editBookingId, setEditBookingId] = useState<string | null>(null)
  
  const [showEditConfirm, setShowEditConfirm] = useState(false)
  const [showEditFinal, setShowEditFinal] = useState(false)
  const [editingBooking, setEditingBooking] = useState<any>(null)
  
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showCancelFinal, setShowCancelFinal] = useState(false)
  const [cancellingBooking, setCancellingBooking] = useState<any>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadSchedules()
  }, [selectedDate, cleaners])

  async function loadSchedules() {
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    
    const { data: allCapacities } = await supabase
      .from('vw_cleaner_daily_capacity')
      .select('*')
      .eq('booking_date', dateStr)
    
    const { data: allBookings } = await supabase
      .from('vw_booking_details')
      .select('*')
      .eq('booking_date', dateStr)
      .neq('status', 'cancelled')
      .order('shift_number')
    
    const schedulesData: Record<string, any> = {}
    
    for (const cleaner of cleaners) {
      schedulesData[cleaner.id] = {
        capacity: allCapacities?.find(c => c.cleaner_id === cleaner.id) || null,
        bookings: allBookings?.filter(b => b.cleaner_id === cleaner.id) || []
      }
    }
    
    setSchedules(schedulesData)
    setLoading(false)
  }

  function startEdit(booking: any) {
    setEditingBooking(booking)
    setShowEditConfirm(true)
  }

  function proceedToFinalEdit() {
    setShowEditConfirm(false)
    setShowEditFinal(true)
  }

  function confirmEdit() {
    setShowEditFinal(false)
    setEditBookingId(editingBooking.id)
    setEditDialogOpen(true)
    setEditingBooking(null)
  }

  function cancelEdit() {
    setShowEditConfirm(false)
    setShowEditFinal(false)
    setEditingBooking(null)
  }

  function startCancel(booking: any) {
    setCancellingBooking(booking)
    setShowCancelConfirm(true)
  }

  function proceedToFinalCancel() {
    setShowCancelConfirm(false)
    setShowCancelFinal(true)
  }

  async function confirmCancel() {
    if (!cancellingBooking) return

    setCancelling(true)
    try {
      const { data, error } = await supabase.rpc('cancel_booking', {
        p_booking_id: cancellingBooking.id,
        p_cancellation_reason: 'Cancelled by staff',
        p_cancelled_by: 'Staff User'
      })
      
      if (data?.success) {
        alert('Booking cancelled successfully')
        setShowCancelFinal(false)
        setCancellingBooking(null)
        loadSchedules()
      } else {
        alert('Failed to cancel booking: ' + (data?.error || error?.message))
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setCancelling(false)
    }
  }

  function cancelCancellation() {
    setShowCancelConfirm(false)
    setShowCancelFinal(false)
    setCancellingBooking(null)
  }

  const cleanerColors = [
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', circle: 'bg-emerald-500' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', circle: 'bg-blue-500' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', circle: 'bg-orange-500' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', circle: 'bg-purple-500' },
    { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', circle: 'bg-pink-500' },
  ]

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-400 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-500">Loading schedules...</p>
        </div>
      )}
      
      {!loading && cleaners.map((cleaner, cleanerIndex) => {
        const schedule = schedules[cleaner.id]
        const capacity = schedule?.capacity
        const bookings = schedule?.bookings || []
        const colors = cleanerColors[cleanerIndex % cleanerColors.length]
        
        const shifts = [1, 2, 3, 4].map(shiftNum => {
          return bookings.find((b: any) => b.shift_number === shiftNum) || null
        })

        // تطبيق الفلتر
        const filteredShifts = shifts.map((booking, index) => {
          if (viewFilter === 'available' && booking !== null) return null
          if (viewFilter === 'booked' && booking === null) return null
          return { booking, index }
        }).filter(item => item !== null)

        // إذا كانت جميع الـ shifts مخفية بسبب الفلتر، لا تعرض هذه العاملة
        if (filteredShifts.length === 0) return null

        return (
          <Card key={cleaner.id} className="p-6 border-gray-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`
                  flex items-center gap-3 px-4 py-2 rounded-full border
                  ${colors.bg} ${colors.border}
                `}>
                  <div className={`
                    h-10 w-10 rounded-full ${colors.circle}
                    text-white flex items-center justify-center font-bold text-lg shadow-sm
                  `}>
                    {cleaner.name.charAt(0)}
                  </div>
                  
                  <div>
                    <h3 className={`font-semibold text-base ${colors.text}`}>
                      {cleaner.name}
                    </h3>
                    {capacity && (
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className="text-emerald-600 font-medium">
                          {capacity.hours_remaining}h remaining
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500">
                          {capacity.shifts_booked}/4 shifts
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {capacity && (
                <Badge 
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${capacity.capacity_status === 'AVAILABLE' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : capacity.capacity_status === 'PARTIALLY_BOOKED' 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }
                  `}
                >
                  {capacity.capacity_status.replace('_', ' ')}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4">
              {shifts.map((booking, index) => {
                // تطبيق الفلتر على كل shift
                if (viewFilter === 'available' && booking !== null) return null
                if (viewFilter === 'booked' && booking === null) return null

                return (
                  <div
                    key={index}
                    className={`
                      rounded-2xl p-5 min-h-[300px] transition-all flex flex-col
                      ${booking 
                        ? 'bg-rose-50 border border-rose-100 shadow-sm' 
                        : 'bg-emerald-50 border border-emerald-100'
                      }
                    `}
                  >
                    <div className="text-center mb-4 pb-3 border-b border-gray-200">
                      <div className="font-semibold text-gray-700 text-sm">Shift {index + 1}</div>
                    </div>

                    {booking ? (
                      <div className="space-y-3 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="font-medium text-rose-700">
                            {format(new Date(`2000-01-01T${booking.start_time}`), 'h:mm a')} - {format(new Date(`2000-01-01T${booking.end_time}`), 'h:mm a')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="font-medium text-gray-700 truncate">{booking.client_name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                          <span>{booking.client_mobile}</span>
                        </div>

                        {booking.client_area && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                            <span className="truncate">{booking.client_area}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                          <DollarSign className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                          <span>{booking.final_price} QAR</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Hash className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                          <span className="truncate font-mono">{booking.booking_number}</span>
                        </div>

                        <div className="pt-2">
                          <Badge 
                            className={`
                              text-xs px-2 py-1 rounded-full font-medium
                              ${booking.status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-blue-100 text-blue-700'
                              }
                            `}
                          >
                            {booking.status}
                          </Badge>
                        </div>

                        <div className="flex gap-2 pt-3 mt-auto border-t border-rose-100">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-9 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => startEdit(booking)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-9 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => startCancel(booking)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
                          <Plus className="h-8 w-8 text-emerald-600" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-medium text-emerald-700 mb-4">Available</p>
                        <Button
                          size="sm"
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => onBookClick(cleaner.id, cleaner.name, selectedDate)}
                        >
                          <Plus className="h-4 w-4 mr-1" strokeWidth={2} />
                          Book Now
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}

      {/* Edit Confirmation - First */}
      <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-500" />
              Edit Booking?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to edit the booking for <strong>{editingBooking?.client_name}</strong>.
              <br /><br />
              Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelEdit}>No, Go Back</AlertDialogCancel>
            <Button onClick={proceedToFinalEdit}>
              Yes, Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Confirmation - Final */}
      <AlertDialog open={showEditFinal} onOpenChange={setShowEditFinal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit2 className="h-5 w-5" />
              Ready to Edit
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to modify this booking. Make sure all changes are correct.
              <br /><br />
              Booking: <strong>{editingBooking?.booking_number}</strong>
              <br />
              Client: <strong>{editingBooking?.client_name}</strong>
              <br />
              Current Amount: <strong>{editingBooking?.final_price} QAR</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelEdit}>Cancel</AlertDialogCancel>
            <Button onClick={confirmEdit}>
              Open Edit Form
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation - First */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cancel Booking?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to cancel the booking for <strong>{cancellingBooking?.client_name}</strong>.
              <br /><br />
              Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCancellation}>No, Keep It</AlertDialogCancel>
            <Button variant="destructive" onClick={proceedToFinalCancel}>
              Yes, Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation - Final */}
      <AlertDialog open={showCancelFinal} onOpenChange={setShowCancelFinal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is your last chance. Cancelling this booking cannot be undone.
              <br /><br />
              Booking: <strong>{cancellingBooking?.booking_number}</strong>
              <br />
              Client: <strong>{cancellingBooking?.client_name}</strong>
              <br />
              Amount: <strong>{cancellingBooking?.final_price} QAR</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCancellation}>Go Back</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={confirmCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditBookingDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        bookingId={editBookingId}
        onSuccess={loadSchedules}
      />
    </div>
  )
}