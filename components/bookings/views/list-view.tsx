'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Clock, Plus, User, Phone, Edit2, X, AlertTriangle } from "lucide-react"
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

interface ListViewProps {
  cleaners: any[]
  selectedDate: Date
  onBookClick: (cleanerId: string, cleanerName: string, date: Date) => void
  viewFilter: 'all' | 'available' | 'booked'
}

export function ListView({ cleaners, selectedDate, onBookClick, viewFilter }: ListViewProps) {
  const [allSlots, setAllSlots] = useState<any[]>([])
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
    loadAllSlots()
  }, [selectedDate, cleaners])

  async function loadAllSlots() {
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    
    const { data: allBookings } = await supabase
      .from('vw_booking_details')
      .select('*')
      .eq('booking_date', dateStr)
      .neq('status', 'cancelled')
      .order('cleaner_name')
      .order('shift_number')
    
    const slots: any[] = []
    
    for (const cleaner of cleaners) {
      const cleanerBookings = allBookings?.filter(b => b.cleaner_id === cleaner.id) || []
      
      for (let shift = 1; shift <= 4; shift++) {
        const booking = cleanerBookings.find(b => b.shift_number === shift)
        
        slots.push({
          cleanerId: cleaner.id,
          cleanerName: cleaner.name,
          shift,
          booking: booking || null
        })
      }
    }
    
    setAllSlots(slots)
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
        loadAllSlots()
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

  const filteredSlots = allSlots.filter(slot => {
    if (viewFilter === 'available') return slot.booking === null
    if (viewFilter === 'booked') return slot.booking !== null
    return true
  })

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Cleaner</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Shift</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Time</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Client</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Price</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSlots.map((slot, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                      {slot.cleanerName.charAt(0)}
                    </div>
                    <span className="font-medium text-sm text-gray-900">{slot.cleanerName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">Shift {slot.shift}</td>
                <td className="px-6 py-4">
                  {slot.booking ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {format(new Date(`2000-01-01T${slot.booking.start_time}`), 'h:mm a')} - {format(new Date(`2000-01-01T${slot.booking.end_time}`), 'h:mm a')}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {slot.booking ? (
                    <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                      <User className="h-4 w-4 text-gray-400" />
                      {slot.booking.client_name}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {slot.booking?.client_mobile ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {slot.booking.client_mobile}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {slot.booking ? (
                    <span className="text-sm font-semibold text-emerald-700">{slot.booking.final_price} QAR</span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`
                    inline-flex px-3 py-1 rounded-full text-xs font-medium
                    ${slot.booking 
                      ? 'bg-rose-100 text-rose-700' 
                      : 'bg-emerald-100 text-emerald-700'
                    }
                  `}>
                    {slot.booking ? 'Booked' : 'Available'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {slot.booking ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => startEdit(slot.booking)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => startCancel(slot.booking)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => onBookClick(slot.cleanerId, slot.cleanerName, selectedDate)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700"
                    >
                      <Plus className="h-3 w-3" />
                      Book
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              You are about to modify this booking.
              <br /><br />
              Booking: <strong>{editingBooking?.booking_number}</strong>
              <br />
              Client: <strong>{editingBooking?.client_name}</strong>
              <br />
              Amount: <strong>{editingBooking?.final_price} QAR</strong>
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
        onSuccess={loadAllSlots}
      />
    </>
  )
}