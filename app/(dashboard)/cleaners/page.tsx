'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Plus, Search, UserCircle, Calendar, Phone, FileText, Globe, Trash2, AlertTriangle } from "lucide-react"
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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Cleaner {
  id: string
  name: string
  mobile: string | null
  status: string
  residence_id: string | null
  nationality: string | null
  date_of_birth: string | null
  created_at: string
  updated_at: string
}

export default function CleanersPage() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [filteredCleaners, setFilteredCleaners] = useState<Cleaner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingCleaner, setEditingCleaner] = useState<Cleaner | null>(null)
  const [deletingCleaner, setDeletingCleaner] = useState<Cleaner | null>(null)
  const [showFirstConfirm, setShowFirstConfirm] = useState(false)
  const [showFinalConfirm, setShowFinalConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    residence_id: '',
    nationality: '',
    date_of_birth: ''
  })

  useEffect(() => {
    loadCleaners()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = cleaners.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.mobile && c.mobile.includes(searchQuery)) ||
        (c.residence_id && c.residence_id.includes(searchQuery))
      )
      setFilteredCleaners(filtered)
    } else {
      setFilteredCleaners(cleaners)
    }
  }, [searchQuery, cleaners])

  async function loadCleaners() {
    setLoading(true)
    const { data } = await supabase
      .from('cleaners')
      .select('*')
      .order('name')
    
    if (data) {
      setCleaners(data)
      setFilteredCleaners(data)
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!formData.name) {
      toast.error('Please enter cleaner name')
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('cleaners')
        .insert({
          name: formData.name,
          mobile: formData.mobile || null,
          residence_id: formData.residence_id || null,
          nationality: formData.nationality || null,
          date_of_birth: formData.date_of_birth || null,
          status: 'active'
        })
      
      if (error) throw error
      
      toast.success('Cleaner added successfully')
      setShowAddDialog(false)
      resetForm()
      await loadCleaners()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add cleaner')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editingCleaner || !formData.name) {
      toast.error('Please enter cleaner name')
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('cleaners')
        .update({
          name: formData.name,
          mobile: formData.mobile || null,
          residence_id: formData.residence_id || null,
          nationality: formData.nationality || null,
          date_of_birth: formData.date_of_birth || null
        })
        .eq('id', editingCleaner.id)
      
      if (error) throw error
      
      toast.success('Cleaner updated')
      setEditingCleaner(null)
      resetForm()
      await loadCleaners()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(cleaner: Cleaner) {
    const newStatus = cleaner.status === 'active' ? 'inactive' : 'active'
    
    try {
      const { error } = await supabase
        .from('cleaners')
        .update({ status: newStatus })
        .eq('id', cleaner.id)
      
      if (error) throw error
      
      toast.success(`Cleaner ${newStatus}`)
      await loadCleaners()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  function startDelete(cleaner: Cleaner) {
    setDeletingCleaner(cleaner)
    setShowFirstConfirm(true)
  }

  function proceedToFinalConfirm() {
    setShowFirstConfirm(false)
    setShowFinalConfirm(true)
    setDeleteConfirmText('')
  }

  async function confirmDelete() {
    if (!deletingCleaner) return
    
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm')
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('cleaners')
        .delete()
        .eq('id', deletingCleaner.id)
      
      if (error) throw error
      
      toast.success('Cleaner deleted')
      setShowFinalConfirm(false)
      setDeletingCleaner(null)
      setDeleteConfirmText('')
      await loadCleaners()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  function cancelDelete() {
    setShowFirstConfirm(false)
    setShowFinalConfirm(false)
    setDeletingCleaner(null)
    setDeleteConfirmText('')
  }

  function resetForm() {
    setFormData({
      name: '',
      mobile: '',
      residence_id: '',
      nationality: '',
      date_of_birth: ''
    })
  }

  function openEditDialog(cleaner: Cleaner) {
    setEditingCleaner(cleaner)
    setFormData({
      name: cleaner.name,
      mobile: cleaner.mobile || '',
      residence_id: cleaner.residence_id || '',
      nationality: cleaner.nationality || '',
      date_of_birth: cleaner.date_of_birth || ''
    })
  }

  const stats = {
    total: cleaners.length,
    active: cleaners.filter(c => c.status === 'active').length,
    inactive: cleaners.filter(c => c.status === 'inactive').length
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-20">Loading cleaners...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cleaners</h1>
          <p className="text-gray-600 mt-2">Manage your cleaning staff</p>
        </div>
        
        <Dialog open={showAddDialog || !!editingCleaner} onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingCleaner(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cleaner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCleaner ? 'Edit Cleaner' : 'Add New Cleaner'}</DialogTitle>
              <DialogDescription>
                {editingCleaner ? 'Update cleaner information' : 'Add a new cleaner to your team'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter cleaner name"
                />
              </div>
              
              <div>
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  placeholder="Enter mobile number"
                />
              </div>
              
              <div>
                <Label>Residence ID</Label>
                <Input
                  value={formData.residence_id}
                  onChange={(e) => setFormData({...formData, residence_id: e.target.value})}
                  placeholder="Enter residence ID"
                />
              </div>
              
              <div>
                <Label>Nationality</Label>
                <Input
                  value={formData.nationality}
                  onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                  placeholder="Enter nationality"
                />
              </div>
              
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false)
                setEditingCleaner(null)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button onClick={editingCleaner ? handleUpdate : handleAdd} disabled={saving}>
                {saving ? 'Saving...' : editingCleaner ? 'Update' : 'Add Cleaner'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* First Confirmation Dialog */}
      <AlertDialog open={showFirstConfirm} onOpenChange={setShowFirstConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>{deletingCleaner?.name}</strong>. This action cannot be undone.
              <br /><br />
              Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={proceedToFinalConfirm}>
              Yes, Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Confirmation Dialog */}
      <AlertDialog open={showFinalConfirm} onOpenChange={setShowFinalConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is your last chance to cancel. Deleting <strong>{deletingCleaner?.name}</strong> will permanently remove all their data.
              <br /><br />
              Type <strong className="text-red-600">DELETE</strong> below to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="text-center font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteConfirmText !== 'DELETE' || saving}
            >
              {saving ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Cleaners</CardTitle>
            <UserCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Inactive</CardTitle>
            <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Cleaners</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, mobile, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCleaners.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No cleaners found' : 'No cleaners yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Residence ID</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCleaners.map((cleaner) => (
                  <TableRow key={cleaner.id}>
                    <TableCell className="font-medium">{cleaner.name}</TableCell>
                    <TableCell>
                      {cleaner.mobile ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {cleaner.mobile}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {cleaner.residence_id ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-gray-400" />
                          {cleaner.residence_id}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {cleaner.nationality ? (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3 text-gray-400" />
                          {cleaner.nationality}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {cleaner.date_of_birth ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {new Date(cleaner.date_of_birth).toLocaleDateString()}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={cleaner.status === 'active'}
                        onCheckedChange={() => toggleStatus(cleaner)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(cleaner)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => startDelete(cleaner)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}