'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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

interface GapRule {
  id: string
  channel_id: string
  channel_name?: string
  min_booking_hours: number
  max_booking_hours: number | null
  gap_minutes: number
  priority: number
  is_active: boolean
}

interface Channel {
  id: string
  name: string
  code: string
}

export function GapRulesSettings() {
  const [rules, setRules] = useState<GapRule[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  
  const [newRule, setNewRule] = useState({
    channel_id: '',
    min_booking_hours: 0,
    max_booking_hours: null as number | null,
    gap_minutes: 30,
    priority: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    const [rulesResult, channelsResult] = await Promise.all([
      supabase
        .from('channel_gap_rules')
        .select(`
          *,
          channels:channel_id (id, name, code)
        `)
        .order('channel_id, priority'),
      supabase.from('channels').select('*').order('name')
    ])
    
    if (rulesResult.data) {
      const formatted = rulesResult.data.map((r: any) => ({
        ...r,
        channel_name: r.channels?.name || 'Unknown'
      }))
      setRules(formatted)
    }
    
    if (channelsResult.data) setChannels(channelsResult.data)
    
    setLoading(false)
  }

  async function handleSave(rule: GapRule) {
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('channel_gap_rules')
        .update({
          min_booking_hours: rule.min_booking_hours,
          max_booking_hours: rule.max_booking_hours,
          gap_minutes: rule.gap_minutes,
          priority: rule.priority,
          is_active: rule.is_active
        })
        .eq('id', rule.id)
      
      if (error) throw error
      
      toast.success('Gap rule updated')
      setEditingId(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update gap rule')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!newRule.channel_id) {
      toast.error('Please select a channel')
      return
    }
    
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('channel_gap_rules')
        .insert({
          ...newRule,
          is_active: true
        })
      
      if (error) throw error
      
      toast.success('Gap rule added')
      setShowAddDialog(false)
      setNewRule({
        channel_id: '',
        min_booking_hours: 0,
        max_booking_hours: null,
        gap_minutes: 30,
        priority: 0
      })
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add gap rule')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this gap rule?')) return
    
    try {
      const { error } = await supabase
        .from('channel_gap_rules')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast.success('Gap rule deleted')
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete gap rule')
    }
  }

  function updateRule(id: string, field: keyof GapRule, value: any) {
    setRules(rules.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ))
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            Configure gap time between bookings based on booking duration
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Gap time helps ensure cleaners have enough time to travel between locations
          </p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Gap Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gap Rule</DialogTitle>
              <DialogDescription>
                Configure gap time between bookings for a specific channel and duration range
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Channel</Label>
                <Select 
                  value={newRule.channel_id} 
                  onValueChange={(value) => setNewRule({...newRule, channel_id: value})}
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Booking Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={newRule.min_booking_hours}
                    onChange={(e) => setNewRule({...newRule, min_booking_hours: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Max Booking Hours (optional)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="No limit"
                    value={newRule.max_booking_hours || ''}
                    onChange={(e) => setNewRule({...newRule, max_booking_hours: e.target.value ? parseFloat(e.target.value) : null})}
                  />
                </div>
              </div>
              
              <div>
                <Label>Gap Minutes</Label>
                <Input
                  type="number"
                  value={newRule.gap_minutes}
                  onChange={(e) => setNewRule({...newRule, gap_minutes: parseInt(e.target.value)})}
                />
              </div>
              
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={newRule.priority}
                  onChange={(e) => setNewRule({...newRule, priority: parseInt(e.target.value)})}
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority rules are applied first</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? 'Adding...' : 'Add Rule'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <p className="text-gray-500">No gap rules configured</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Min Hours</TableHead>
                <TableHead>Max Hours</TableHead>
                <TableHead>Gap (Minutes)</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.channel_name}</TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input
                        type="number"
                        step="0.5"
                        value={rule.min_booking_hours}
                        onChange={(e) => updateRule(rule.id, 'min_booking_hours', parseFloat(e.target.value))}
                        className="w-24"
                      />
                    ) : (
                      `${rule.min_booking_hours}h`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input
                        type="number"
                        step="0.5"
                        value={rule.max_booking_hours || ''}
                        onChange={(e) => updateRule(rule.id, 'max_booking_hours', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-24"
                        placeholder="∞"
                      />
                    ) : (
                      rule.max_booking_hours ? `${rule.max_booking_hours}h` : '∞'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input
                        type="number"
                        value={rule.gap_minutes}
                        onChange={(e) => updateRule(rule.id, 'gap_minutes', parseInt(e.target.value))}
                        className="w-24"
                      />
                    ) : (
                      `${rule.gap_minutes} min`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input
                        type="number"
                        value={rule.priority}
                        onChange={(e) => updateRule(rule.id, 'priority', parseInt(e.target.value))}
                        className="w-20"
                      />
                    ) : (
                      rule.priority
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === rule.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleSave(rule)} disabled={saving}>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(rule.id)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(rule.id)}>
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