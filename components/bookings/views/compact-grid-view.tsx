'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { Clock, Plus, User, Phone, MapPin, DollarSign, Hash, Check, X, Edit2, AlertTriangle } from "lucide-react"
import { EditBookingDialog } from "../edit-booking-dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CompactGridViewProps {
  cleaners: any[]
  selectedDate: Date
  onBookClick: (cleanerId: string, cleanerName: string, date: Date) => void
  viewFilter: 'all' | 'available' | 'booked'
}

export function CompactGridView({ cleaners, selectedDate, onBookClick, viewFilter }: CompactGridViewProps) {
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-400 border-r-transparent"></div>
        <p className="mt-4 text-sm text-gray-500">Loading schedules...</p>
      </div>
    )
  }

  const filteredCleaners = cleaners.filter(cleaner => {
    const schedule = schedules[cleaner.id]
    const bookings = schedule?.bookings || []
    const shifts = [1, 2, 3, 4].map(shiftNum => bookings.find((b: any) => b.shift_number === shiftNum) || null)
    
    if (viewFilter === 'available') return shifts.some(s => s === null)
    if (viewFilter === 'booked') return shifts.some(s => s !== null)
    return true
  })

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredCleaners.map((cleaner) => {
          const schedule = schedules[cleaner.id]
          const capacity = schedule?.capacity
          const bookings = schedule?.bookings || []
          const shifts = [1, 2, 3, 4].map(shiftNum => bookings.find((b: any) => b.shift_number === shiftNum) || null)

          return (
            <Card key={cleaner.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="mb-4 pb-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                    {cleaner.name.charAt(0)}
                  </div>
                  <h3 className="font-semibold text-sm">{cleaner.name}</h3>
                </div>
                {capacity && (
                  <div className={`
                    text-xs px-2 py-1 rounded-full inline-block font-medium
                    ${capacity.capacity_status === 'AVAILABLE' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : capacity.capacity_status === 'PARTIALLY_BOOKED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                    }
                  `}>
                    {capacity.capacity_status.replace('_', ' ')}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {shifts.map((booking, index) => {
                  if (viewFilter === 'available' && booking !== null) return null
                  if (viewFilter === 'booked' && booking === null) return null

                  return (
                    <div 
                      key={index}
                      className={`
                        p-3 rounded-xl border transition-all
                        ${booking 
                          ? 'bg-rose-50 border-rose-200' 
                          : 'bg-emerald-50 border-emerald-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">
                          Shift {index + 1}
                        </span>
                        {booking ? (
                          <X className="h-3 w-3 text-rose-600" />
                        ) : (
                          <Check className="h-3 w-3 text-emerald-600" />
                        )}
                      </div>
                      
                      {booking ? (
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(`2000-01-01T${booking.start_time}`), 'h:mm a')} - {format(new Date(`2000-01-01T${booking.end_time}`), 'h:mm a')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-700 font-medium">
                            <User className="h-3 w-3" />
                            <span className="truncate">{booking.client_name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                            <DollarSign className="h-3 w-3" />
                            <span>{booking.final_price} QAR</span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => startEdit(booking)}
                              className="flex-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => startCancel(booking)}
                              className="flex-1 px-2 py-1 text-xs bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-emerald-700 font-medium block mb-2">Available</span>
                          <button
                            onClick={() => onBookClick(cleaner.id, cleaner.name, selectedDate)}
                            className="w-full px-2 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Book
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

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
            <Button onClick={proceedToFinalEdit}>Yes, Continue</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Button onClick={confirmEdit}>Open Edit Form</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Button variant="destructive" onClick={proceedToFinalCancel}>Yes, Continue</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelling}>
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
    </>
  )
}