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

interface ReminderRule {
  id: string
  reminder_type_id: string
  reminder_type_name?: string
  channel_id: string | null
  channel_name?: string
  trigger_type: string
  hours_before: number | null
  hours_after: number | null
  can_repeat: boolean
  repeat_after_minutes: number | null
  max_repeat_count: number
  send_whatsapp: boolean
  send_email: boolean
  whatsapp_template_name: string | null
  email_subject: string | null
  is_active: boolean
}

interface ReminderType {
  id: string
  code: string
  name: string
}

interface Channel {
  id: string
  name: string
}

export function ReminderTypesSettings() {
  const [rules, setRules] = useState<ReminderRule[]>([])
  const [reminderTypes, setReminderTypes] = useState<ReminderType[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  
  const [newRule, setNewRule] = useState({
    reminder_type_id: '',
    channel_id: '',
    trigger_type: 'before_booking',
    hours_before: 24,
    hours_after: null as number | null,
    can_repeat: false,
    repeat_after_minutes: null as number | null,
    max_repeat_count: 1,
    send_whatsapp: true,
    send_email: false,
    whatsapp_template_name: '',
    email_subject: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    const [rulesResult, typesResult, channelsResult] = await Promise.all([
      supabase
        .from('reminder_rules')
        .select(`
          *,
          reminder_types:reminder_type_id (id, code, name),
          channels:channel_id (id, name)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('reminder_types').select('*').order('name'),
      supabase.from('channels').select('id, name').order('name')
    ])
    
    if (rulesResult.data) {
      const formatted = rulesResult.data.map((r: any) => ({
        ...r,
        reminder_type_name: r.reminder_types?.name || 'Unknown',
        channel_name: r.channels?.name || 'All Channels'
      }))
      setRules(formatted)
    }
    
    if (typesResult.data) setReminderTypes(typesResult.data)
    if (channelsResult.data) setChannels(channelsResult.data)
    
    setLoading(false)
  }

  async function handleSave(rule: ReminderRule) {
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('reminder_rules')
        .update({
          trigger_type: rule.trigger_type,
          hours_before: rule.hours_before,
          hours_after: rule.hours_after,
          can_repeat: rule.can_repeat,
          repeat_after_minutes: rule.repeat_after_minutes,
          max_repeat_count: rule.max_repeat_count,
          send_whatsapp: rule.send_whatsapp,
          send_email: rule.send_email,
          whatsapp_template_name: rule.whatsapp_template_name,
          email_subject: rule.email_subject,
          is_active: rule.is_active
        })
        .eq('id', rule.id)
      
      if (error) throw error
      
      toast.success('Reminder rule updated')
      setEditingId(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update reminder rule')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!newRule.reminder_type_id) {
      toast.error('Please select a reminder type')
      return
    }
    
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('reminder_rules')
        .insert({
          ...newRule,
          channel_id: newRule.channel_id || null
        })
      
      if (error) throw error
      
      toast.success('Reminder rule added')
      setShowAddDialog(false)
      setNewRule({
        reminder_type_id: '',
        channel_id: '',
        trigger_type: 'before_booking',
        hours_before: 24,
        hours_after: null,
        can_repeat: false,
        repeat_after_minutes: null,
        max_repeat_count: 1,
        send_whatsapp: true,
        send_email: false,
        whatsapp_template_name: '',
        email_subject: ''
      })
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add reminder rule')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this reminder rule?')) return
    
    try {
      const { error } = await supabase
        .from('reminder_rules')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast.success('Reminder rule deleted')
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete reminder rule')
    }
  }

  function updateRule(id: string, field: keyof ReminderRule, value: any) {
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
        <p className="text-sm text-gray-600">
          Configure automatic reminder rules for bookings
        </p>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Reminder Rule</DialogTitle>
              <DialogDescription>
                Create a new automatic reminder rule
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reminder Type</Label>
                  <Select 
                    value={newRule.reminder_type_id} 
                    onValueChange={(value) => setNewRule({...newRule, reminder_type_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reminderTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Channel (Optional)</Label>
                  <Select 
                    value={newRule.channel_id} 
                    onValueChange={(value) => setNewRule({...newRule, channel_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Channels</SelectItem>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Trigger Type</Label>
                  <Select 
                    value={newRule.trigger_type} 
                    onValueChange={(value) => setNewRule({...newRule, trigger_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before_booking">Before Booking</SelectItem>
                      <SelectItem value="after_booking">After Booking</SelectItem>
                      <SelectItem value="on_booking">On Booking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Hours Before/After</Label>
                  <Input
                    type="number"
                    value={newRule.hours_before || 0}
                    onChange={(e) => setNewRule({...newRule, hours_before: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Send WhatsApp</Label>
                  <Switch
                    checked={newRule.send_whatsapp}
                    onCheckedChange={(checked) => setNewRule({...newRule, send_whatsapp: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Send Email</Label>
                  <Switch
                    checked={newRule.send_email}
                    onCheckedChange={(checked) => setNewRule({...newRule, send_email: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Can Repeat</Label>
                  <Switch
                    checked={newRule.can_repeat}
                    onCheckedChange={(checked) => setNewRule({...newRule, can_repeat: checked})}
                  />
                </div>
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
          <p className="text-gray-500">No reminder rules configured</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.reminder_type_name}</TableCell>
                  <TableCell>{rule.channel_name}</TableCell>
                  <TableCell className="capitalize">{rule.trigger_type.replace('_', ' ')}</TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input
                        type="number"
                        value={rule.hours_before || rule.hours_after || 0}
                        onChange={(e) => updateRule(rule.id, 'hours_before', parseInt(e.target.value))}
                        className="w-20"
                      />
                    ) : (
                      <>
                        {rule.hours_before && `${rule.hours_before}h before`}
                        {rule.hours_after && `${rule.hours_after}h after`}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {rule.send_whatsapp && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">WhatsApp</span>}
                      {rule.send_email && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Email</span>}
                    </div>
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