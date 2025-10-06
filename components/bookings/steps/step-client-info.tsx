'use client'

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

export function StepClientInfo({ formData, setFormData }: any) {
  const [searchingClient, setSearchingClient] = useState(false)

  useEffect(() => {
    if (formData.date && formData.duration && formData.startTime) {
      calculatePrice()
    }
  }, [formData.withMaterials])

  async function calculatePrice() {
    const { data } = await supabase.rpc('calculate_booking_price', {
      p_channel_code: 'staff',
      p_booking_date: format(formData.date, 'yyyy-MM-dd'),
      p_duration_hours: formData.duration,
      p_number_of_cleaners: 1,
      p_with_materials: formData.withMaterials,
      p_area_text: formData.clientArea || null
    })
    
    if (data?.success) {
      setFormData((prev: any) => ({
        ...prev,
        price: data.total,
        pricing: data
      }))
    }
  }

  async function handleMobileChange(mobile: string) {
    setFormData((prev: any) => ({ ...prev, clientMobile: mobile }))

    if (mobile.length >= 8) {
      setSearchingClient(true)
      const { data } = await supabase.rpc('find_client_by_mobile', {
        p_mobile: mobile
      })

      if (data?.found) {
        setFormData((prev: any) => ({
          ...prev,
          clientName: data.name || '',
          clientAddress: data.default_address || '',
          clientLocationUrl: data.default_location_url || '', // ✅ أضفت هذا السطر
          clientZone: data.default_zone || '',
          clientStreet: data.default_street || '',
          clientBuilding: data.default_building || '',
          clientArea: data.default_area || ''
        }))
      }
      setSearchingClient(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="mobile">Mobile Number *</Label>
          <div className="relative">
            <Input
              id="mobile"
              value={formData.clientMobile}
              onChange={(e) => handleMobileChange(e.target.value)}
              placeholder="555XXXXX"
              className="mt-1"
            />
            {searchingClient && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="name">Client Name *</Label>
          <Input
            id="name"
            value={formData.clientName}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, clientName: e.target.value }))}
            placeholder="Mr. XXX"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="area">Area</Label>
        <Input
          id="area"
          value={formData.clientArea}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, clientArea: e.target.value }))}
          placeholder="Al Rayyan"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="zone">Zone</Label>
          <Input
            id="zone"
            value={formData.clientZone}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, clientZone: e.target.value }))}
            placeholder="Zone 50"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            value={formData.clientStreet}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, clientStreet: e.target.value }))}
            placeholder="Street 10"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="building">Building</Label>
          <Input
            id="building"
            value={formData.clientBuilding}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, clientBuilding: e.target.value }))}
            placeholder="Villa 5"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Full Address</Label>
        <Textarea
          id="address"
          value={formData.clientAddress}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, clientAddress: e.target.value }))}
          placeholder="Full address details..."
          className="mt-1"
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="locationUrl">Location URL (Google Maps)</Label>
        <Input
          id="locationUrl"
          type="url"
          value={formData.clientLocationUrl || ''}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, clientLocationUrl: e.target.value }))}
          placeholder="https://maps.app.goo.gl/xxxxx"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Paste the Google Maps link sent by the client
        </p>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.clientNotes}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, clientNotes: e.target.value }))}
          placeholder="Special instructions..."
          className="mt-1"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <Label htmlFor="materials" className="text-base font-medium">Include Cleaning Materials</Label>
          <p className="text-sm text-gray-600">+40 QAR</p>
        </div>
        <Switch
          id="materials"
          checked={formData.withMaterials}
          onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, withMaterials: checked }))}
        />
      </div>
    </div>
  )
}