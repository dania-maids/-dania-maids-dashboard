'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Save, Trash2, RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface SpecialAreaPricing {
  id: string
  channel_id: string
  channel_name?: string
  area_id: string
  area_name?: string
  hourly_rate_per_cleaner: number
  materials_price_per_cleaner: number | null
  is_active: boolean
  created_at: string
}

interface Channel {
  id: string
  name: string
  code: string
}

interface Area {
  id: string
  name: string
  code: string
}

export function SpecialAreasPricingSettings() {
  const [pricing, setPricing] = useState<SpecialAreaPricing[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  
  const [newItem, setNewItem] = useState({
    channel_id: '',
    area_id: '',
    hourly_rate_per_cleaner: 0,
    materials_price_per_cleaner: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    const [pricingResult, channelsResult, areasResult] = await Promise.all([
      supabase
        .from('special_area_pricing')
        .select(`
          *,
          channels:channel_id (id, name, code),
          special_areas:area_id (id, name, code)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('channels').select('*').order('name'),
      supabase.from('special_areas').select('*').order('name')
    ])
    
    if (pricingResult.data) {
      const formatted = pricingResult.data.map((p: any) => ({
        ...p,
        channel_name: p.channels?.name || 'Unknown',
        area_name: p.special_areas?.name || 'Unknown'
      }))
      setPricing(formatted)
    }
    
    if (channelsResult.data) setChannels(channelsResult.data)
    if (areasResult.data) setAreas(areasResult.data)
    
    setLoading(false)
  }

  async function handleSave(item: SpecialAreaPricing) {
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('special_area_pricing')
        .update({
          hourly_rate_per_cleaner: item.hourly_rate_per_cleaner,
          materials_price_per_cleaner: item.materials_price_per_cleaner,
          is_active: item.is_active
        })
        .eq('id', item.id)
      
      if (error) throw error
      
      toast.success('Special area pricing updated')
      setEditingId(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pricing')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!newItem.channel_id || !newItem.area_id) {
      toast.error('Please select channel and area')
      return
    }
    
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('special_area_pricing')
        .insert({
          channel_id: newItem.channel_id,
          area_id: newItem.area_id,
          hourly_rate_per_cleaner: newItem.hourly_rate_per_cleaner,
          materials_price_per_cleaner: newItem.materials_price_per_cleaner,
          is_active: true
        })
      
      if (error) throw error
      
      toast.success('Special area pricing added')
      setShowAddDialog(false)
      setNewItem({
        channel_id: '',
        area_id: '',
        hourly_rate_per_cleaner: 0,
        materials_price_per_cleaner: 0
      })
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add pricing')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this special area pricing?')) return
    
    try {
      const { error } = await supabase
        .from('special_area_pricing')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast.success('Special area pricing deleted')
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete pricing')
    }
  }

  function updatePricing(id: string, field: keyof SpecialAreaPricing, value: any) {
    setPricing(pricing.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Configure special pricing for specific areas (e.g., Lusail)
        </p>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Special Area Pricing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Special Area Pricing</DialogTitle>
              <DialogDescription>
                Configure custom pricing for a specific area and channel
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Channel</Label>
                <Select 
                  value={newItem.channel_id} 
                  onValueChange={(value) => setNewItem({...newItem, channel_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Special Area</Label>
                <Select 
                  value={newItem.area_id} 
                  onValueChange={(value) => setNewItem({...newItem, area_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Hourly Rate (QAR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.hourly_rate_per_cleaner}
                  onChange={(e) => setNewItem({...newItem, hourly_rate_per_cleaner: parseFloat(e.target.value)})}
                />
              </div>
              
              <div>
                <Label>Materials Cost (QAR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.materials_price_per_cleaner}
                  onChange={(e) => setNewItem({...newItem, materials_price_per_cleaner: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? 'Adding...' : 'Add Pricing'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pricing.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <p className="text-gray-500">No special area pricing configured</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Materials Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.channel_name}</TableCell>
                  <TableCell className="font-medium">{item.area_name}</TableCell>
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
                      `${item.hourly_rate_per_cleaner} QAR`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={item.materials_price_per_cleaner || 0}
                        onChange={(e) => updatePricing(item.id, 'materials_price_per_cleaner', parseFloat(e.target.value))}
                        className="w-32"
                      />
                    ) : (
                      item.materials_price_per_cleaner ? `${item.materials_price_per_cleaner} QAR` : '-'
                    )}
                  </TableCell>
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
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(item.id)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  )
}