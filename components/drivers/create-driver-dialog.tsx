'use client'

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface CreateDriverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateDriverDialog({ open, onOpenChange, onSuccess }: CreateDriverDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    status: 'active',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Driver name is required')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('drivers')
        .insert([{
          name: formData.name.trim(),
          mobile: formData.mobile.trim() || null,
          status: formData.status,
          notes: formData.notes.trim() || null
        }])

      if (error) throw error

      toast.success('Driver added successfully!')
      onSuccess()
      resetForm()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to add driver')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      mobile: '',
      status: 'active',
      notes: ''
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Driver</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Driver Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter driver name"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              value={formData.mobile}
              onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
              placeholder="Enter mobile number"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="mb-3 block">Status</Label>
            <RadioGroup 
              value={formData.status} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="cursor-pointer font-normal">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="inactive" />
                <Label htmlFor="inactive" className="cursor-pointer font-normal">Inactive</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about the driver"
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Adding...' : 'Add Driver'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}