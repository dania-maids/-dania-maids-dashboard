'use client'

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { format, parse, addMinutes } from "date-fns"

interface EditBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string | null
  onSuccess: () => void
}

export function EditBookingDialog({ open, onOpenChange, bookingId, onSuccess }: EditBookingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState<any>(null)
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    duration: 4,
    clientNotes: ''
  })

  useEffect(() => {
    if (bookingId && open) {
      loadBooking()
    }
  }, [bookingId, open])

  async function loadBooking() {
    const { data } = await supabase
      .from('vw_booking_details')
      .select('*')
      .eq('id', bookingId)
      .single()
    
    if (data) {
      setBooking(data)
      setFormData({
        startTime: data.start_time,
        endTime: data.end_time,
        duration: data.duration_hours,
        clientNotes: data.client_notes || ''
      })
    }
  }

  function handleDurationChange(duration: string) {
    const hours = parseFloat(duration)
    if (formData.startTime) {
      const start = parse(formData.startTime, 'HH:mm:ss', new Date())
      const end = addMinutes(start, hours * 60)
      const endTime = format(end, 'HH:mm:ss')
      
      setFormData(prev => ({
        ...prev,
        duration: hours,
        endTime
      }))
    } else {
      setFormData(prev => ({ ...prev, duration: hours }))
    }
  }

  async function handleSubmit() {
    setLoading(true)
    
    const { data, error } = await supabase.rpc('update_booking', {
      p_booking_id: bookingId,
      p_new_start_time: formData.startTime,
      p_new_end_time: formData.endTime,
      p_new_date: null,
      p_new_cleaner_name: null,
      p_new_client_notes: formData.clientNotes,
      p_updated_by: 'Staff User'
    })

    setLoading(false)

    if (data?.success) {
      alert('Booking updated successfully!')
      onSuccess()
      onOpenChange(false)
    } else {
      alert('Failed to update: ' + (data?.error || error?.message))
    }
  }

  const durationOptions = Array.from({ length: 11 }, (_, i) => i + 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>

        {booking && (
          <div className="space-y-4">
            {/* Booking Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Booking:</strong> {booking.booking_number}</div>
                <div><strong>Cleaner:</strong> {booking.cleaner_name}</div>
                <div><strong>Client:</strong> {booking.client_name}</div>
                <div><strong>Date:</strong> {format(new Date(booking.booking_date), 'MMM d, yyyy')}</div>
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label>Duration (Hours)</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={handleDurationChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map(h => (
                    <SelectItem key={h} value={h.toString()}>{h} Hours</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => {
                    const start = e.target.value + ':00'
                    const startDate = parse(start, 'HH:mm:ss', new Date())
                    const end = addMinutes(startDate, formData.duration * 60)
                    setFormData(prev => ({
                      ...prev,
                      startTime: start,
                      endTime: format(end, 'HH:mm:ss')
                    }))
                  }}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  disabled
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.clientNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, clientNotes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}