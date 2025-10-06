'use client'

import { Header } from "@/components/dashboard/header"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Plus, ChevronLeft, ChevronRight, Filter, LayoutGrid, List, BarChart3 } from "lucide-react"
import { format, addDays } from "date-fns"
import { CreateBookingDialog } from "@/components/bookings/create-booking-dialog"
import { CleanerScheduleGrid } from "@/components/bookings/cleaner-schedule-grid"
import { CompactGridView } from "@/components/bookings/views/compact-grid-view"
import { ListView } from "@/components/bookings/views/list-view"
import { TimelineView } from "@/components/bookings/views/timeline-view"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ViewMode = 'large-grid' | 'compact-grid' | 'list' | 'timeline'

export default function BookingsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [cleaners, setCleaners] = useState<any[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    cleanerId: string
    cleanerName: string
    date: Date
    startTime?: string
  } | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [viewFilter, setViewFilter] = useState<'all' | 'available' | 'booked'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('large-grid')

  useEffect(() => {
    const dates = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i))
    setWeekDates(dates)
    loadCleaners()
  }, [])

  async function loadCleaners() {
    const { data } = await supabase
      .from('cleaners')
      .select('*')
      .eq('status', 'active')
      .order('name')
    
    setCleaners(data || [])
  }

  function handleBookClick(cleanerId: string, cleanerName: string, date: Date, startTime?: string) {
    setSelectedSlot({ cleanerId, cleanerName, date, startTime })
    setCreateDialogOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-600">Manage and create new bookings</p>
          </div>
          
          <div className="flex gap-3">
            <Select value={viewFilter} onValueChange={(v: any) => setViewFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show All</SelectItem>
                <SelectItem value="available">Available Only</SelectItem>
                <SelectItem value="booked">Booked Only</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('large-grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'large-grid' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Large Grid"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('compact-grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'compact-grid' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Compact Grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List View"
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Timeline View"
              >
                <BarChart3 className="h-5 w-5" />
              </button>
            </div>

            <Button 
              size="lg"
              onClick={() => {
                setSelectedSlot(null)
                setCreateDialogOpen(true)
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              New Booking
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border mb-6">
          <div className="flex gap-3 overflow-x-auto mb-4 pb-2" style={{ paddingLeft: '4px', paddingRight: '4px' }}>
            {weekDates.map((date, i) => {
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    flex flex-col items-center px-6 py-4 rounded-2xl min-w-[90px] transition-all flex-shrink-0 border
                    ${isSelected 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                    }
                    ${isToday && !isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                  `}
                >
                  <span className="text-xs font-medium mb-1">{format(date, 'EEE')}</span>
                  <span className="text-2xl font-bold my-1">{format(date, 'd')}</span>
                  <span className="text-xs mt-1">{format(date, 'MMM')}</span>
                </button>
              )
            })}
          </div>

          <div className="flex justify-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-full"
              onClick={() => {
                const newDates = weekDates.map(d => addDays(d, -7))
                setWeekDates(newDates)
                setSelectedDate(newDates[0])
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Week
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              className="rounded-full"
              onClick={() => {
                const newDates = weekDates.map(d => addDays(d, 7))
                setWeekDates(newDates)
                setSelectedDate(newDates[0])
              }}
            >
              Next Week
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            Daily Schedule - {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>

        {viewMode === 'large-grid' && (
          <CleanerScheduleGrid
            key={refreshTrigger}
            cleaners={cleaners}
            selectedDate={selectedDate}
            onBookClick={handleBookClick}
            viewFilter={viewFilter}
          />
        )}

        {viewMode === 'compact-grid' && (
          <CompactGridView
            key={refreshTrigger}
            cleaners={cleaners}
            selectedDate={selectedDate}
            onBookClick={handleBookClick}
            viewFilter={viewFilter}
          />
        )}

        {viewMode === 'list' && (
          <ListView
            key={refreshTrigger}
            cleaners={cleaners}
            selectedDate={selectedDate}
            onBookClick={handleBookClick}
            viewFilter={viewFilter}
          />
        )}

        {viewMode === 'timeline' && (
          <TimelineView
            key={refreshTrigger}
            cleaners={cleaners}
            selectedDate={selectedDate}
            viewFilter={viewFilter}
          />
        )}
      </div>

      <CreateBookingDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        preselectedSlot={selectedSlot}
        onSuccess={() => {
          setCreateDialogOpen(false)
          setRefreshTrigger(prev => prev + 1)
        }}
      />
    </div>
  )
}