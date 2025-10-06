'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Clock, User } from "lucide-react"

interface TimelineViewProps {
  cleaners: any[]
  selectedDate: Date
  viewFilter: 'all' | 'available' | 'booked'
}

export function TimelineView({ cleaners, selectedDate, viewFilter }: TimelineViewProps) {
  const [schedules, setSchedules] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const hours = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM']

  useEffect(() => {
    loadSchedules()
  }, [selectedDate, cleaners])

  async function loadSchedules() {
    setLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    
    const { data: allBookings } = await supabase
      .from('vw_booking_details')
      .select('*')
      .eq('booking_date', dateStr)
      .neq('status', 'cancelled')
      .order('shift_number')
    
    const schedulesData: Record<string, any> = {}
    
    for (const cleaner of cleaners) {
      const cleanerBookings = allBookings?.filter(b => b.cleaner_id === cleaner.id) || []
      
      schedulesData[cleaner.id] = cleanerBookings.map(booking => {
        const startHour = parseInt(booking.start_time.split(':')[0])
        const endHour = parseInt(booking.end_time.split(':')[0])
        const start = (startHour - 8) / 12 * 7
        const duration = ((endHour - startHour) / 12 * 7)
        
        return {
          ...booking,
          start,
          duration
        }
      })
    }
    
    setSchedules(schedulesData)
    setLoading(false)
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
    const bookings = schedules[cleaner.id] || []
    if (viewFilter === 'available') return bookings.length < 4
    if (viewFilter === 'booked') return bookings.length > 0
    return true
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex mb-4">
        <div className="w-32 flex-shrink-0"></div>
        <div className="flex-1 grid grid-cols-7">
          {hours.map((hour) => (
            <div key={hour} className="text-center text-xs font-semibold text-gray-700 pb-2 border-b border-gray-200">
              {hour}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredCleaners.map((cleaner) => {
          const bookings = schedules[cleaner.id] || []
          
          return (
            <div key={cleaner.id} className="flex items-center">
              <div className="w-32 flex-shrink-0 pr-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                    {cleaner.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-sm">{cleaner.name}</span>
                </div>
              </div>

              <div className="flex-1 relative h-16 bg-gray-50 rounded-lg border border-gray-200">
                <div className="absolute inset-0 grid grid-cols-7">
                  {hours.map((_, i) => (
                    <div key={i} className="border-r border-gray-200 last:border-r-0"></div>
                  ))}
                </div>

                {bookings.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-emerald-600 font-medium">Fully Available</span>
                  </div>
                ) : (
                  bookings.map((booking: any, idx: number) => (
                    <div
                      key={idx}
                      className="absolute h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all group"
                      style={{
                        left: `${(booking.start / 7) * 100}%`,
                        width: `${(booking.duration / 7) * 100}%`,
                        padding: '0.5rem'
                      }}
                    >
                      <div className="text-white text-xs font-medium truncate">
                        <div className="flex items-center gap-1 mb-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{booking.client_name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-90">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(`2000-01-01T${booking.start_time}`), 'h:mm a')}</span>
                        </div>
                      </div>
                      
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        <div className="font-semibold mb-1">{booking.client_name}</div>
                        <div>{format(new Date(`2000-01-01T${booking.start_time}`), 'h:mm a')} - {format(new Date(`2000-01-01T${booking.end_time}`), 'h:mm a')}</div>
                        <div className="text-emerald-300">{booking.final_price} QAR</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 flex gap-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-emerald-100 rounded border border-emerald-300"></div>
          <span className="text-xs text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gradient-to-r from-rose-400 to-rose-500 rounded"></div>
          <span className="text-xs text-gray-600">Booked</span>
        </div>
      </div>
    </div>
  )
}