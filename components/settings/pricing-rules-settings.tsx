'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Save, RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ChannelPricing {
  id: string
  channel_id: string
  channel_name?: string
  hourly_rate_per_cleaner: number
  materials_price_per_cleaner: number
  tax_rate: number
  currency: string
  is_active: boolean
  effective_from: string
  effective_to: string | null
}

export function PricingRulesSettings() {
  const [pricing, setPricing] = useState<ChannelPricing[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    loadPricing()
  }, [])

  async function loadPricing() {
    setLoading(true)
    
    // Get pricing with channel names
    const { data: pricingData } = await supabase
      .from('channel_pricing_config')
      .select(`
        *,
        channels:channel_id (
          name,
          code
        )
      `)
      .order('effective_from', { ascending: false })
    
    if (pricingData) {
      const formatted = pricingData.map((p: any) => ({
        ...p,
        channel_name: p.channels?.name || p.channels?.code || 'Unknown'
      }))
      setPricing(formatted)
    }
    
    setLoading(false)
  }

  async function handleSave(item: ChannelPricing) {
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('channel_pricing_config')
        .update({
          hourly_rate_per_cleaner: item.hourly_rate_per_cleaner,
          materials_price_per_cleaner: item.materials_price_per_cleaner,
          tax_rate: item.tax_rate
        })
        .eq('id', item.id)
      
      if (error) throw error
      
      toast.success('Pricing updated successfully')
      setEditingId(null)
      await loadPricing()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pricing')
    } finally {
      setSaving(false)
    }
  }

  function updatePricing(id: string, field: keyof ChannelPricing, value: any) {
    setPricing(pricing.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (pricing.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No pricing configuration found</p>
        <p className="text-sm text-gray-400">Add pricing rules in your database table: channel_pricing_config</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Materials Cost</TableHead>
              <TableHead>Tax Rate (%)</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricing.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.channel_name}
                </TableCell>
                <TableCell>
                  {editingId === item.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={item.hourly_rate_per_cleaner}
                      onChange={(e) => updatePricing(item.id, 'hourly_rate_per_cleaner', parseFloat(e.target.value))}
                      className="w-32"
                    />
                  ) : (
                    `${item.hourly_rate_per_cleaner} ${item.currency}`
                  )}
                </TableCell>
                <TableCell>
                  {editingId === item.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={item.materials_price_per_cleaner}
                      onChange={(e) => updatePricing(item.id, 'materials_price_per_cleaner', parseFloat(e.target.value))}
                      className="w-32"
                    />
                  ) : (
                    `${item.materials_price_per_cleaner} ${item.currency}`
                  )}
                </TableCell>
                <TableCell>
                  {editingId === item.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={item.tax_rate}
                      onChange={(e) => updatePricing(item.id, 'tax_rate', parseFloat(e.target.value))}
                      className="w-24"
                    />
                  ) : (
                    `${item.tax_rate}%`
                  )}
                </TableCell>
                <TableCell>{item.currency}</TableCell>
                <TableCell>{new Date(item.effective_from).toLocaleDateString()}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === item.id ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handleSave(item)} disabled={saving}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditingId(item.id)}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={loadPricing}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  )
}