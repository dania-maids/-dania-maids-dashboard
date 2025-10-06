'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Plus, Save, Trash2, RefreshCw, X } from "lucide-react"
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

interface SpecialArea {
  id: string
  code: string
  name: string
  search_keywords: string[]
  is_active: boolean
  created_at: string
}

export function SpecialAreasSettings() {
  const [areas, setAreas] = useState<SpecialArea[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  
  const [newArea, setNewArea] = useState({
    code: '',
    name: '',
    search_keywords: [] as string[],
    keyword_input: ''
  })

  useEffect(() => {
    loadAreas()
  }, [])

  async function loadAreas() {
    setLoading(true)
    const { data } = await supabase.from('special_areas').select('*').order('name')
    if (data) setAreas(data)
    setLoading(false)
  }

  async function handleSave(area: SpecialArea) {
    setSaving(true)
    try {
      const { error } = await supabase.from('special_areas').update({
        name: area.name,
        search_keywords: area.search_keywords,
        is_active: area.is_active
      }).eq('id', area.id)
      if (error) throw error
      toast.success('Area updated')
      setEditingId(null)
      await loadAreas()
    } catch (error: any) {
      toast.error(error.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!newArea.code || !newArea.name) {
      toast.error('Fill code and name')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('special_areas').insert({
        code: newArea.code,
        name: newArea.name,
        search_keywords: newArea.search_keywords,
        is_active: true
      })
      if (error) throw error
      toast.success('Area added')
      setShowAddDialog(false)
      setNewArea({ code: '', name: '', search_keywords: [], keyword_input: '' })
      await loadAreas()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete?')) return
    try {
      await supabase.from('special_areas').delete().eq('id', id)
      toast.success('Deleted')
      await loadAreas()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  function updateArea(id: string, field: keyof SpecialArea, value: any) {
    setAreas(areas.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  if (loading) return <div className="text-center py-8">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <p className="text-sm text-gray-600">Manage areas with keywords</p>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Area</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Code</Label><Input value={newArea.code} onChange={(e) => setNewArea({...newArea, code: e.target.value})} /></div>
              <div><Label>Name</Label><Input value={newArea.name} onChange={(e) => setNewArea({...newArea, name: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAdd}>{saving ? 'Adding...' : 'Add'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {areas.length === 0 ? (
        <div className="text-center py-8 border rounded-lg"><p className="text-gray-500">No areas</p></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.map((area) => (
              <TableRow key={area.id}>
                <TableCell className="font-mono">{area.code}</TableCell>
                <TableCell>
                  {editingId === area.id ? (
                    <Input value={area.name} onChange={(e) => updateArea(area.id, 'name', e.target.value)} />
                  ) : area.name}
                </TableCell>
                <TableCell>
                  {editingId === area.id ? (
                    <Switch checked={area.is_active} onCheckedChange={(c) => updateArea(area.id, 'is_active', c)} />
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs ${area.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                      {area.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === area.id ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handleSave(area)}><Save className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(area.id)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(area.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}