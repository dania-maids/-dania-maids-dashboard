'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { format, addMinutes, parse } from "date-fns"
import { Clock, AlertCircle } from "lucide-react"

export function StepSelectDateTime({ formData, setFormData }: any) {
  const [cleaners, setCleaners] = useState<any[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [cleanerCapacity, setCleanerCapacity] = useState<any>(null)

  useEffect(() => {
    loadCleaners()
  }, [])

  useEffect(() => {
    if (formData.cleanerName && formData.date && formData.duration) {
      loadAvailableSlots()
      loadCleanerCapacity()
    }
  }, [formData.cleanerName, formData.date, formData.duration])

  async function loadCleaners() {
    const { data } = await supabase
      .from('cleaners')
      .select('*')
      .eq('status', 'active')
      .order('name')
    
    setCleaners(data || [])
  }

  async function loadCleanerCapacity() {
    const { data } = await supabase
      .from('vw_cleaner_daily_capacity')
      .select('*')
      .eq('cleaner_name', formData.cleanerName)
      .eq('booking_date', format(formData.date, 'yyyy-MM-dd'))
      .single()
    
    setCleanerCapacity(data)
  }

  async function loadAvailableSlots() {
    setLoadingSlots(true)
    
    const { data } = await supabase.rpc('get_available_slots', {
      p_cleaner_name: formData.cleanerName,
      p_booking_date: format(formData.date, 'yyyy-MM-dd'),
      p_requested_hours: formData.duration,
      p_channel_code: 'staff'
    })
    
    if (data) {
      const slots = data
        .filter((slot: any) => slot.is_available)
        .map((slot: any) => slot.slot_start)
      
      setAvailableSlots(slots)
    }
    
    setLoadingSlots(false)
  }

  function handleDurationChange(duration: string) {
    const hours = parseFloat(duration)
    setFormData((prev: any) => ({
      ...prev,
      duration: hours,
      startTime: '',
      endTime: ''
    }))
  }

  async function handleStartTimeSelect(startTime: string) {
    const start = parse(startTime, 'HH:mm:ss', new Date())
    const end = addMinutes(start, formData.duration * 60)
    const endTime = format(end, 'HH:mm:ss')
    
    console.log('Time selected:', { startTime, endTime })
    
    // Update formData immediately
    setFormData((prev: any) => ({
      ...prev,
      startTime,
      endTime
    }))

    // Calculate price
    try {
      const { data } = await supabase.rpc('calculate_booking_price', {
        p_channel_code: 'staff',
        p_booking_date: format(formData.date, 'yyyy-MM-dd'),
        p_duration_hours: formData.duration,
        p_number_of_cleaners: 1,
        p_with_materials: formData.withMaterials || false,
        p_area_text: formData.clientArea || null
      })
      
      if (data?.success) {
        // Re-confirm times when updating price
        setFormData((prev: any) => ({
          ...prev,
          startTime,
          endTime,
          price: data.total,
          pricing: data
        }))
      }
    } catch (error) {
      console.error('Price calculation error:', error)
      // Even if price calculation fails, keep the times
      setFormData((prev: any) => ({
        ...prev,
        startTime,
        endTime
      }))
    }
  }

  const durationOptions = Array.from({ length: 11 }, (_, i) => i + 2)

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Select Date</Label>
        <div className="flex justify-center">
          <div className="scale-120 origin-top">
            <Calendar
              mode="single"
              selected={formData.date}
              onSelect={(date) => date && setFormData((prev: any) => ({ 
                ...prev, 
                date,
                startTime: '',
                endTime: ''
              }))}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Cleaner Selection */}
      <div className="mt-16">
        <Label className="text-base font-semibold mb-3 block">Select Cleaner</Label>
        <div className="grid grid-cols-5 gap-3">
          {cleaners.map((cleaner) => (
            <button
              key={cleaner.id}
              onClick={() => setFormData((prev: any) => ({
                ...prev,
                cleanerId: cleaner.id,
                cleanerName: cleaner.name,
                startTime: '',
                endTime: ''
              }))}
              className={`
                px-4 py-3 rounded-lg text-center transition-all font-medium
                ${formData.cleanerId === cleaner.id
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-600'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {cleaner.name}
            </button>
          ))}
        </div>
      </div>

      {/* Cleaner Capacity Info */}
      {cleanerCapacity && formData.cleanerName && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">Capacity for {formData.cleanerName}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Hours remaining:</span>
              <span className="ml-2 font-bold">{cleanerCapacity.hours_remaining}h / 10h</span>
            </div>
            <div>
              <span className="text-gray-600">Shifts remaining:</span>
              <span className="ml-2 font-bold">{cleanerCapacity.shifts_remaining} / 4</span>
            </div>
          </div>
        </div>
      )}

      {/* Duration Selection */}
      {formData.cleanerName && (
        <div>
          <Label className="text-base font-semibold mb-3 block">Duration (Hours)</Label>
          <Select
            value={formData.duration?.toString()}
            onValueChange={handleDurationChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((hours) => (
                <SelectItem key={hours} value={hours.toString()}>
                  {hours} Hour{hours > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Available Time Slots */}
      {formData.duration && formData.cleanerName && (
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Available Time Slots
            {formData.startTime && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                (Selected: {formData.startTime} - {formData.endTime})
              </span>
            )}
          </Label>
          
          {loadingSlots ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              Loading available slots...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              No available slots for {formData.duration}h on this date
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg">
              {availableSlots.map((time, index) => (
                <button
                  key={index}
                  onClick={() => handleStartTimeSelect(time)}
                  className={`
                    p-2 border-2 rounded-lg transition-all text-center text-sm
                    ${formData.startTime === time
                      ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {format(parse(time, 'HH:mm:ss', new Date()), 'h:mm a')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}