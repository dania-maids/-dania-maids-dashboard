'use client'

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft, Check } from "lucide-react"
import { StepSelectDateTime } from "./steps/step-select-datetime"
import { StepClientInfo } from "./steps/step-client-info"
import { StepReview } from "./steps/step-review"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"

interface CreateBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedSlot?: {
    cleanerId: string
    cleanerName: string
    date: Date
    startTime?: string
  } | null
  onSuccess: () => void
}

export function CreateBookingDialog({ 
  open, 
  onOpenChange, 
  preselectedSlot,
  onSuccess 
}: CreateBookingDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  
  // Use ref to persist data across re-renders
  const savedTimesRef = useRef<{ startTime: string; endTime: string }>({ 
    startTime: '', 
    endTime: '' 
  })
  
  const [formData, setFormData] = useState<any>({
    date: preselectedSlot?.date || new Date(),
    cleanerId: preselectedSlot?.cleanerId || '',
    cleanerName: preselectedSlot?.cleanerName || '',
    startTime: preselectedSlot?.startTime || '',
    endTime: '',
    duration: 4,
    clientMobile: '',
    clientName: '',
    clientAddress: '',
    clientLocationUrl: '',
    clientZone: '',
    clientStreet: '',
    clientBuilding: '',
    clientArea: '',
    clientNotes: '',
    withMaterials: false,
    numberOfCleaners: 1,
    price: 0,
    pricing: null,
    driver_id: '',
    discount_amount: 0,
    payment_mode: 'cash',
    is_credit_sale: false,
    credit_due_date: '',
    customer_type: 'regular'
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (preselectedSlot) {
      setFormData((prev: any) => ({
        ...prev,
        date: preselectedSlot.date,
        cleanerId: preselectedSlot.cleanerId,
        cleanerName: preselectedSlot.cleanerName,
        startTime: preselectedSlot.startTime || '',
      }))
    }
  }, [preselectedSlot])

  // Save times to ref whenever they change
  useEffect(() => {
    if (formData.startTime) {
      savedTimesRef.current = {
        startTime: formData.startTime,
        endTime: formData.endTime
      }
      console.log('💾 Saved times to ref:', savedTimesRef.current)
    }
  }, [formData.startTime, formData.endTime])

  const steps = [
    { number: 1, title: 'Date & Time', description: 'Select cleaner and slot' },
    { number: 2, title: 'Client Info', description: 'Enter client details' },
    { number: 3, title: 'Review', description: 'Confirm booking' }
  ]

  async function handleNext() {
    if (currentStep === 1) {
      if (!formData.cleanerId || !formData.startTime) {
        toast.error('Please select cleaner and time slot')
        console.log('❌ Validation failed at Step 1:', {
          cleanerId: formData.cleanerId,
          startTime: formData.startTime,
          endTime: formData.endTime,
          duration: formData.duration
        })
        return
      }
      
      // Force save times to ref before moving
      savedTimesRef.current = {
        startTime: formData.startTime,
        endTime: formData.endTime
      }
      
      console.log('✅ Moving to Step 2. Saved to ref:', savedTimesRef.current)
      setCurrentStep(2)
      
    } else if (currentStep === 2) {
      if (!formData.clientMobile || !formData.clientName) {
        toast.error('Please enter client mobile and name')
        return
      }
      
      console.log('✅ Moving to Step 3. Ref still has:', savedTimesRef.current)
      setCurrentStep(3)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    
    // Restore times from ref if lost
    const startTime = formData.startTime || savedTimesRef.current.startTime
    const savedEndTime = formData.endTime || savedTimesRef.current.endTime
    
    console.log('📋 Submit - checking times:', {
      fromFormData: { startTime: formData.startTime, endTime: formData.endTime },
      fromRef: savedTimesRef.current,
      using: { startTime, endTime: savedEndTime }
    })
    
    try {
      if (!startTime || startTime === '') {
        console.error('❌ startTime is still empty even after ref check!')
        toast.error('Time information is missing. Please go back to Step 1.')
        setLoading(false)
        return
      }
      
      let endTime = savedEndTime
      
      if (!endTime || endTime === '' || !endTime.includes(':')) {
        console.log('🔄 Recalculating endTime from:', startTime, 'duration:', formData.duration)
        
        const timeParts = startTime.split(':')
        const startHours = parseInt(timeParts[0])
        const startMinutes = parseInt(timeParts[1])
        
        const totalMinutes = (startHours * 60) + startMinutes + (formData.duration * 60)
        const endHours = Math.floor(totalMinutes / 60)
        const endMinutes = totalMinutes % 60
        
        endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`
        console.log('✅ Calculated endTime:', endTime)
      }
      
      if (!endTime || endTime === '::' || endTime === '::00') {
        toast.error('Failed to calculate end time.')
        setLoading(false)
        return
      }

      console.log('📤 Sending to database:', {
        startTime,
        endTime,
        duration: formData.duration,
        date: format(formData.date, 'yyyy-MM-dd'),
        cleaner: formData.cleanerName
      })

      const { data, error } = await supabase.rpc('create_booking', {
        p_channel_code: 'staff',
        p_cleaner_name: formData.cleanerName,
        p_booking_date: format(formData.date, 'yyyy-MM-dd'),
        p_start_time: startTime,
        p_end_time: endTime,
        p_client_mobile: formData.clientMobile,
        p_client_name: formData.clientName,
        p_client_address: formData.clientAddress || null,
        p_client_address2: null,
        p_client_zone: formData.clientZone || null,
        p_client_street: formData.clientStreet || null,
        p_client_building: formData.clientBuilding || null,
        p_client_area: formData.clientArea || null,
        p_client_location_url: formData.clientLocationUrl || null,
        p_client_notes: formData.clientNotes || null,
        p_number_of_cleaners: 1,
        p_with_materials: formData.withMaterials,
        p_booked_by_name: 'Staff User',
        p_booked_by_user_id: null,
        p_pricing_mode: 'auto',
        p_manual_price: null,
        p_manual_price_reason: null
      })

      if (error) throw error

      if (data?.success && data?.booking_id) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            driver_id: formData.driver_id || null,
            discount_amount: formData.discount_amount || 0,
            payment_mode: formData.payment_mode || 'cash',
            is_credit_sale: formData.is_credit_sale || false,
            credit_due_date: formData.credit_due_date || null,
            customer_type: formData.customer_type || 'regular',
            notes: formData.clientNotes || null
          })
          .eq('id', data.booking_id)

        if (updateError) {
          console.error('Failed to update extra fields:', updateError)
        }

        toast.success('Booking created successfully!')
        onSuccess()
        resetForm()
        onOpenChange(false)
      } else {
        toast.error(data?.error || 'Failed to create booking')
      }
    } catch (error: any) {
      console.error('❌ Submit error:', error)
      toast.error(error.message || 'Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setCurrentStep(1)
    savedTimesRef.current = { startTime: '', endTime: '' }
    setFormData({
      date: new Date(),
      cleanerId: '',
      cleanerName: '',
      startTime: '',
      endTime: '',
      duration: 4,
      clientMobile: '',
      clientName: '',
      clientAddress: '',
      clientLocationUrl: '',
      clientZone: '',
      clientStreet: '',
      clientBuilding: '',
      clientArea: '',
      clientNotes: '',
      withMaterials: false,
      numberOfCleaners: 1,
      price: 0,
      pricing: null,
      driver_id: '',
      discount_amount: 0,
      payment_mode: 'cash',
      is_credit_sale: false,
      credit_due_date: '',
      customer_type: 'regular'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-8 pt-6 pb-4 border-b bg-white">
          <DialogTitle className="text-2xl">Create New Booking</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">Fill in the details to create a new booking</p>
        </DialogHeader>



        <div className="flex-1 overflow-y-auto px-8 pb-6">
          {currentStep === 1 && (
            <StepSelectDateTime 
              formData={formData} 
              setFormData={setFormData}
            />
          )}
          
          {currentStep === 2 && (
            <StepClientInfo 
              formData={formData} 
              setFormData={setFormData}
            />
          )}
          
          {currentStep === 3 && (
            <StepReview formData={formData} setFormData={setFormData} />
          )}
        </div>

        <div className="flex justify-between p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1)
              } else {
                onOpenChange(false)
              }
            }}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 3 ? (
            <Button size="lg" onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button size="lg" onClick={handleSubmit} disabled={loading}>
              <Check className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}