'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save, RefreshCw } from "lucide-react"

interface TimePeriod {
  id: string
  code: string
  name: string
  start_time: string
  end_time: string
  display_order: number
}

export function TimePeriodsSettings() {
  const [periods, setPeriods] = useState<TimePeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPeriods()
  }, [])

  async function loadPeriods() {
    setLoading(true)
    const { data } = await supabase
      .from('time_periods')
      .select('*')
      .order('display_order')
    
    if (data) {
      setPeriods(data)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    
    try {
      for (const period of periods) {
        const { error } = await supabase
          .from('time_periods')
          .update({
            start_time: period.start_time,
            end_time: period.end_time
          })
          .eq('id', period.id)
        
        if (error) throw error
      }
      
      toast.success('Time periods updated successfully')
      await loadPeriods()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update time periods')
    } finally {
      setSaving(false)
    }
  }

  function updatePeriod(id: string, field: 'start_time' | 'end_time', value: string) {
    setPeriods(periods.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {periods.map((period) => (
          <div key={period.id} className="border rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{period.name}</h3>
                <p className="text-sm text-gray-600">Code: {period.code}</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Shift {period.display_order}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${period.id}-start`}>Start Time</Label>
                <Input
                  id={`${period.id}-start`}
                  type="time"
                  step="1"
                  value={period.start_time}
                  onChange={(e) => updatePeriod(period.id, 'start_time', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`${period.id}-end`}>End Time</Label>
                <Input
                  id={`${period.id}-end`}
                  type="time"
                  step="1"
                  value={period.end_time}
                  onChange={(e) => updatePeriod(period.id, 'end_time', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={loadPeriods}
          disabled={saving}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button 
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}