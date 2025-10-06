'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Save, RefreshCw } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface ChannelRule {
  id: string
  channel_id: string
  channel_name?: string
  work_start_time: string
  work_end_time: string
  min_advance_hours: number
  max_advance_days: number
  min_shift_hours: number
  max_shift_hours: number
  max_daily_hours_per_cleaner: number
  max_shifts_per_day_per_cleaner: number
  allow_past_booking: boolean
  allow_same_day_booking: boolean
  require_payment_upfront: boolean
  require_manual_confirmation: boolean
  is_active: boolean
}

export function ChannelRulesSettings() {
  const [rules, setRules] = useState<ChannelRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    setLoading(true)
    
    const { data } = await supabase
      .from('channel_business_rules')
      .select(`
        *,
        channels:channel_id (name, code)
      `)
      .order('created_at')
    
    if (data) {
      const formatted = data.map((r: any) => ({
        ...r,
        channel_name: r.channels?.name || 'Unknown'
      }))
      setRules(formatted)
    }
    
    setLoading(false)
  }

  async function handleSave(rule: ChannelRule) {
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('channel_business_rules')
        .update({
          work_start_time: rule.work_start_time,
          work_end_time: rule.work_end_time,
          min_advance_hours: rule.min_advance_hours,
          max_advance_days: rule.max_advance_days,
          min_shift_hours: rule.min_shift_hours,
          max_shift_hours: rule.max_shift_hours,
          max_daily_hours_per_cleaner: rule.max_daily_hours_per_cleaner,
          max_shifts_per_day_per_cleaner: rule.max_shifts_per_day_per_cleaner,
          allow_past_booking: rule.allow_past_booking,
          allow_same_day_booking: rule.allow_same_day_booking,
          require_payment_upfront: rule.require_payment_upfront,
          require_manual_confirmation: rule.require_manual_confirmation,
          is_active: rule.is_active
        })
        .eq('id', rule.id)
      
      if (error) throw error
      
      toast.success('Channel rules updated successfully')
      await loadRules()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rules')
    } finally {
      setSaving(false)
    }
  }

  function updateRule(id: string, field: keyof ChannelRule, value: any) {
    setRules(rules.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ))
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No channel rules found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="space-y-4">
        {rules.map((rule) => (
          <AccordionItem key={rule.id} value={rule.id} className="border rounded-lg px-6">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{rule.channel_name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6 pt-4 pb-2">
                {/* Working Hours */}
                <div>
                  <h4 className="font-medium mb-3">Working Hours</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={rule.work_start_time}
                        onChange={(e) => updateRule(rule.id, 'work_start_time', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={rule.work_end_time}
                        onChange={(e) => updateRule(rule.id, 'work_end_time', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Booking Constraints */}
                <div>
                  <h4 className="font-medium mb-3">Booking Constraints</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Advance Hours</Label>
                      <Input
                        type="number"
                        value={rule.min_advance_hours}
                        onChange={(e) => updateRule(rule.id, 'min_advance_hours', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Max Advance Days</Label>
                      <Input
                        type="number"
                        value={rule.max_advance_days}
                        onChange={(e) => updateRule(rule.id, 'max_advance_days', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Shift Constraints */}
                <div>
                  <h4 className="font-medium mb-3">Shift Constraints</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Shift Hours</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={rule.min_shift_hours}
                        onChange={(e) => updateRule(rule.id, 'min_shift_hours', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Max Shift Hours</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={rule.max_shift_hours}
                        onChange={(e) => updateRule(rule.id, 'max_shift_hours', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Max Daily Hours per Cleaner</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={rule.max_daily_hours_per_cleaner}
                        onChange={(e) => updateRule(rule.id, 'max_daily_hours_per_cleaner', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Max Shifts per Day per Cleaner</Label>
                      <Input
                        type="number"
                        value={rule.max_shifts_per_day_per_cleaner}
                        onChange={(e) => updateRule(rule.id, 'max_shifts_per_day_per_cleaner', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Boolean Settings */}
                <div>
                  <h4 className="font-medium mb-3">Booking Rules</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Allow Past Booking</Label>
                      <Switch
                        checked={rule.allow_past_booking}
                        onCheckedChange={(checked) => updateRule(rule.id, 'allow_past_booking', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Allow Same Day Booking</Label>
                      <Switch
                        checked={rule.allow_same_day_booking}
                        onCheckedChange={(checked) => updateRule(rule.id, 'allow_same_day_booking', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Require Payment Upfront</Label>
                      <Switch
                        checked={rule.require_payment_upfront}
                        onCheckedChange={(checked) => updateRule(rule.id, 'require_payment_upfront', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Require Manual Confirmation</Label>
                      <Switch
                        checked={rule.require_manual_confirmation}
                        onCheckedChange={(checked) => updateRule(rule.id, 'require_manual_confirmation', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Active</Label>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => updateRule(rule.id, 'is_active', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={() => handleSave(rule)} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex justify-end">
        <Button variant="outline" onClick={loadRules}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  )
}