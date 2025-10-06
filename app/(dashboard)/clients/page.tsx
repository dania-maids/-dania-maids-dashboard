'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Search, Users, Phone, MapPin, DollarSign, Calendar, Trash2, AlertTriangle, ExternalLink } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Client {
  id: string
  mobile: string
  name: string
  default_address: string | null
  default_address2: string | null
  default_zone: string | null
  default_street: string | null
  default_building: string | null
  default_area: string | null
  default_location_url: string | null
  notes: string | null
  total_bookings: number
  total_spent: number
  created_at: string
  updated_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [showFirstConfirm, setShowFirstConfirm] = useState(false)
  const [showFinalConfirm, setShowFinalConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    default_address: '',
    default_address2: '',
    default_zone: '',
    default_street: '',
    default_building: '',
    default_area: '',
    default_location_url: '',
    notes: ''
  })

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = clients.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile.includes(searchQuery) ||
        (c.default_area && c.default_area.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredClients(filtered)
    } else {
      setFilteredClients(clients)
    }
  }, [searchQuery, clients])

  async function loadClients() {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name')
    
    if (data) {
      setClients(data)
      setFilteredClients(data)
    }
    setLoading(false)
  }

  function getFullAddress(client: Client): string {
    const parts = [
      client.default_building,
      client.default_street,
      client.default_zone,
      client.default_area,
      client.default_address,
      client.default_address2
    ].filter(Boolean)
    
    return parts.length > 0 ? parts.join(', ') : '-'
  }

  async function handleAdd() {
    if (!formData.name || !formData.mobile) {
      toast.error('Please enter name and mobile')
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          mobile: formData.mobile,
          default_address: formData.default_address || null,
          default_address2: formData.default_address2 || null,
          default_zone: formData.default_zone || null,
          default_street: formData.default_street || null,
          default_building: formData.default_building || null,
          default_area: formData.default_area || null,
          default_location_url: formData.default_location_url || null,
          notes: formData.notes || null,
          total_bookings: 0,
          total_spent: 0
        })
      
      if (error) throw error
      
      toast.success('Client added successfully')
      setShowAddDialog(false)
      resetForm()
      await loadClients()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add client')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editingClient || !formData.name || !formData.mobile) {
      toast.error('Please enter name and mobile')
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          mobile: formData.mobile,
          default_address: formData.default_address || null,
          default_address2: formData.default_address2 || null,
          default_zone: formData.default_zone || null,
          default_street: formData.default_street || null,
          default_building: formData.default_building || null,
          default_area: formData.default_area || null,
          default_location_url: formData.default_location_url || null,
          notes: formData.notes || null
        })
        .eq('id', editingClient.id)
      
      if (error) throw error
      
      toast.success('Client updated')
      setEditingClient(null)
      resetForm()
      await loadClients()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  function startDelete(client: Client) {
    setDeletingClient(client)
    setShowFirstConfirm(true)
  }

  function proceedToFinalConfirm() {
    setShowFirstConfirm(false)
    setShowFinalConfirm(true)
    setDeleteConfirmText('')
  }

  async function confirmDelete() {
    if (!deletingClient) return
    
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm')
      return
    }
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', deletingClient.id)
      
      if (error) throw error
      
      toast.success('Client deleted')
      setShowFinalConfirm(false)
      setDeletingClient(null)
      setDeleteConfirmText('')
      await loadClients()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  function cancelDelete() {
    setShowFirstConfirm(false)
    setShowFinalConfirm(false)
    setDeletingClient(null)
    setDeleteConfirmText('')
  }

  function resetForm() {
    setFormData({
      name: '',
      mobile: '',
      default_address: '',
      default_address2: '',
      default_zone: '',
      default_street: '',
      default_building: '',
      default_area: '',
      default_location_url: '',
      notes: ''
    })
  }

  function openEditDialog(client: Client) {
    setEditingClient(client)
    setFormData({
      name: client.name,
      mobile: client.mobile,
      default_address: client.default_address || '',
      default_address2: client.default_address2 || '',
      default_zone: client.default_zone || '',
      default_street: client.default_street || '',
      default_building: client.default_building || '',
      default_area: client.default_area || '',
      default_location_url: client.default_location_url || '',
      notes: client.notes || ''
    })
  }

  const stats = {
    total: clients.length,
    totalSpent: clients.reduce((sum, c) => sum + Number(c.total_spent || 0), 0),
    totalBookings: clients.reduce((sum, c) => sum + (c.total_bookings || 0), 0)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-20">Loading clients...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-gray-600 mt-2">Manage your customer database</p>
        </div>
        
        <Dialog open={showAddDialog || !!editingClient} onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingClient(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              <DialogDescription>
                {editingClient ? 'Update client information' : 'Add a new client to your database'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter client name"
                  />
                </div>
                
                <div>
                  <Label>Mobile *</Label>
                  <Input
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>
              
              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={formData.default_address}
                  onChange={(e) => setFormData({...formData, default_address: e.target.value})}
                  placeholder="Enter primary address"
                />
              </div>
              
              <div>
                <Label>Address Line 2</Label>
                <Input
                  value={formData.default_address2}
                  onChange={(e) => setFormData({...formData, default_address2: e.target.value})}
                  placeholder="Enter secondary address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Zone</Label>
                  <Input
                    value={formData.default_zone}
                    onChange={(e) => setFormData({...formData, default_zone: e.target.value})}
                    placeholder="e.g., Zone 15"
                  />
                </div>
                
                <div>
                  <Label>Street</Label>
                  <Input
                    value={formData.default_street}
                    onChange={(e) => setFormData({...formData, default_street: e.target.value})}
                    placeholder="Street name/number"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Building</Label>
                  <Input
                    value={formData.default_building}
                    onChange={(e) => setFormData({...formData, default_building: e.target.value})}
                    placeholder="Building number"
                  />
                </div>
                
                <div>
                  <Label>Area</Label>
                  <Input
                    value={formData.default_area}
                    onChange={(e) => setFormData({...formData, default_area: e.target.value})}
                    placeholder="e.g., West Bay, Lusail"
                  />
                </div>
              </div>
              
              <div>
                <Label>Location URL</Label>
                <Input
                  value={formData.default_location_url}
                  onChange={(e) => setFormData({...formData, default_location_url: e.target.value})}
                  placeholder="Google Maps link"
                />
              </div>
              
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about the client"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false)
                setEditingClient(null)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button onClick={editingClient ? handleUpdate : handleAdd} disabled={saving}>
                {saving ? 'Saving...' : editingClient ? 'Update' : 'Add Client'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={showFirstConfirm} onOpenChange={setShowFirstConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>{deletingClient?.name}</strong>. This action cannot be undone.
              <br /><br />
              Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
            <Button variant="destructive" onClick={proceedToFinalConfirm}>Yes, Continue</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinalConfirm} onOpenChange={setShowFinalConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is your last chance to cancel. Deleting <strong>{deletingClient?.name}</strong> will permanently remove all their data.
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
            <Button variant="outline" onClick={cancelDelete}>Cancel</Button>
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSpent.toFixed(2)} QAR</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Clients</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, mobile, or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No clients found' : 'No clients yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[130px]">Mobile</TableHead>
                    <TableHead className="min-w-[250px]">Full Address</TableHead>
                    <TableHead className="min-w-[100px]">Location</TableHead>
                    <TableHead className="text-right min-w-[100px]">Bookings</TableHead>
                    <TableHead className="text-right min-w-[120px]">Total Spent</TableHead>
                    <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {client.mobile}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px] truncate">
                          {getFullAddress(client)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.default_location_url ? (
                          <a 
                            href={client.default_location_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Map
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{client.total_bookings || 0}</TableCell>
                      <TableCell className="text-right">{Number(client.total_spent || 0).toFixed(2)} QAR</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(client)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => startDelete(client)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}