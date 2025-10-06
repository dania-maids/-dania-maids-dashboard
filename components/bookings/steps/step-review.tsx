'use client'

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar, Clock, User, MapPin, Package, Edit, Truck, CreditCard, Tag, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

export function StepReview({ formData, setFormData }: any) {
  const [manualPriceMode, setManualPriceMode] = useState(false)
  const [manualPrice, setManualPrice] = useState<number>(formData.price || 0)
  const [drivers, setDrivers] = useState<any[]>([])
  const [overtimeInfo, setOvertimeInfo] = useState<{ totalHours: number; overtime: number } | null>(null)
  const [loadingOvertime, setLoadingOvertime] = useState(false)

  useEffect(() => {
    loadDrivers()
  }, [])

  useEffect(() => {
    if (formData.cleanerId && formData.date && formData.duration) {
      calculateOvertime()
    }
  }, [formData.cleanerId, formData.date, formData.duration])

  async function loadDrivers() {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('status', 'active')
      .order('name')
    
    if (data) setDrivers(data)
  }

  async function calculateOvertime() {
    setLoadingOvertime(true)
    try {
      const dateStr = format(formData.date, 'yyyy-MM-dd')
      
      // احصل على مجموع ساعات العاملة في هذا اليوم
      const { data: bookings } = await supabase
        .from('bookings')
        .select('duration_hours')
        .eq('cleaner_id', formData.cleanerId)
        .eq('booking_date', dateStr)
        .neq('status', 'cancelled')
      
      const existingHours = bookings?.reduce((sum, b) => sum + (b.duration_hours || 0), 0) || 0
      const totalHours = existingHours + (formData.duration || 0)
      const overtime = Math.max(totalHours - 8, 0)
      
      setOvertimeInfo({ totalHours, overtime })
    } catch (error) {
      console.error('Failed to calculate overtime:', error)
    } finally {
      setLoadingOvertime(false)
    }
  }

  function handleManualPriceChange(value: string) {
    const price = parseFloat(value) || 0
    setManualPrice(price)
    setFormData((prev: any) => ({ ...prev, price }))
  }

  function togglePriceMode() {
    if (!manualPriceMode) {
      setManualPrice(formData.price || 0)
    }
    setManualPriceMode(!manualPriceMode)
  }

  const finalPrice = (formData.price || 0) - (formData.discount_amount || 0)

  return (
    <div className="space-y-6">
      {/* Overtime Warning */}
      {overtimeInfo && overtimeInfo.overtime > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Overtime Alert</AlertTitle>
          <AlertDescription className="text-amber-700">
            This booking will result in <strong>{overtimeInfo.overtime.toFixed(1)} hours overtime</strong> for{' '}
            <strong>{formData.cleanerName}</strong> on {format(formData.date, 'MMMM d, yyyy')}.
            <br />
            <span className="text-sm">
              Total hours for this day: {overtimeInfo.totalHours.toFixed(1)}h (Regular: 8h, Overtime: {overtimeInfo.overtime.toFixed(1)}h)
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Booking Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Date</div>
              <div className="font-medium">{format(formData.date, 'EEEE, MMMM d, yyyy')}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Time</div>
              <div className="font-medium">{formData.startTime} - {formData.endTime} ({formData.duration} hours)</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Cleaner</div>
              <div className="font-medium">{formData.cleanerName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Client Information</h3>
        
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600">Name</div>
            <div className="font-medium">{formData.clientName}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Mobile</div>
            <div className="font-medium">{formData.clientMobile}</div>
          </div>

          {formData.clientArea && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Address</div>
                <div className="font-medium">
                  {formData.clientArea}
                  {formData.clientZone && `, ${formData.clientZone}`}
                  {formData.clientStreet && `, ${formData.clientStreet}`}
                  {formData.clientBuilding && `, ${formData.clientBuilding}`}
                </div>
              </div>
            </div>
          )}

          {formData.clientNotes && (
            <div>
              <div className="text-sm text-gray-600">Notes</div>
              <div className="text-sm">{formData.clientNotes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Options */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Additional Options</h3>
        
        <div className="space-y-4">
          {/* Customer Type */}
          <div>
            <Label className="mb-3 block">Customer Type</Label>
            <RadioGroup 
              value={formData.customer_type || 'regular'} 
              onValueChange={(v) => setFormData((prev: any) => ({ ...prev, customer_type: v }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="cursor-pointer font-normal">New Customer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="regular" id="regular" />
                <Label htmlFor="regular" className="cursor-pointer font-normal">Regular Customer</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Driver */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4" />
              Driver (Optional)
            </Label>
            <Select 
              value={formData.driver_id || 'none'} 
              onValueChange={(v) => setFormData((prev: any) => ({ 
                ...prev, 
                driver_id: v === 'none' ? '' : v 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No driver assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No driver</SelectItem>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Mode */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4" />
              Payment Mode
            </Label>
            <Select 
              value={formData.payment_mode || 'cash'} 
              onValueChange={(v) => setFormData((prev: any) => ({ ...prev, payment_mode: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Credit Sale */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="credit"
              checked={formData.is_credit_sale || false}
              onCheckedChange={(checked) => setFormData((prev: any) => ({ 
                ...prev, 
                is_credit_sale: checked 
              }))}
            />
            <Label htmlFor="credit" className="cursor-pointer">Credit Sale (Deferred Payment)</Label>
          </div>

          {formData.is_credit_sale && (
            <div>
              <Label>Credit Due Date</Label>
              <Input
                type="date"
                value={formData.credit_due_date || ''}
                onChange={(e) => setFormData((prev: any) => ({ 
                  ...prev, 
                  credit_due_date: e.target.value 
                }))}
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">Pricing</h3>
            {formData.withMaterials && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Package className="h-4 w-4" />
                <span>With materials</span>
              </div>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={togglePriceMode}
          >
            <Edit className="h-3 w-3 mr-1" />
            {manualPriceMode ? 'Auto Price' : 'Manual Price'}
          </Button>
        </div>

        {manualPriceMode ? (
          <div className="space-y-3">
            <div>
              <Label>Custom Price (QAR)</Label>
              <Input
                type="number"
                value={manualPrice}
                onChange={(e) => handleManualPriceChange(e.target.value)}
                className="text-xl font-bold text-green-700 mt-1"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-600">
              Original auto-calculated price: {formData.pricing?.total_price || 0} QAR
            </p>
          </div>
        ) : (
          formData.pricing ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Labor ({formData.duration}h × {formData.pricing.hourly_rate} QAR)</span>
                <span>{formData.pricing.labor_cost} QAR</span>
              </div>
              {formData.withMaterials && (
                <div className="flex justify-between text-sm">
                  <span>Materials</span>
                  <span>{formData.pricing.materials_total} QAR</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Subtotal</span>
                <span>{formData.price} QAR</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">Calculating price...</div>
          )
        )}

        {/* Discount */}
        <div className="mt-4 pt-4 border-t border-green-300">
          <Label className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4" />
            Discount Amount (QAR)
          </Label>
          <Input
            type="number"
            step="0.01"
            value={formData.discount_amount || 0}
            onChange={(e) => setFormData((prev: any) => ({ 
              ...prev, 
              discount_amount: parseFloat(e.target.value) || 0 
            }))}
          />
        </div>

        {/* Final Price */}
        <div className="mt-4 pt-4 border-t-2 border-green-400">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Final Price</span>
            <div className="text-right">
              {formData.discount_amount > 0 && (
                <div className="text-sm text-gray-600 line-through">
                  {formData.price} QAR
                </div>
              )}
              <div className="text-2xl font-bold text-green-700">
                {finalPrice.toFixed(2)} QAR
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}