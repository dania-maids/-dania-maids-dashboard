'use client'

import { useState, useEffect } from "react"
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

interface EditDriverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driver: any
  onSuccess: () => void
}

export function EditDriverDialog({ open, onOpenChange, driver, onSuccess }: EditDriverDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    status: 'active',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (driver) {
      setFormData({
        name: driver.name || '',
        mobile: driver.mobile || '',
        status: driver.status || 'active',
        notes: driver.notes || ''
      })
    }
  }, [driver])

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
        .update({
          name: formData.name.trim(),
          mobile: formData.mobile.trim() || null,
          status: formData.status,
          notes: formData.notes.trim() || null
        })
        .eq('id', driver.id)

      if (error) throw error

      toast.success('Driver updated successfully!')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update driver')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Driver</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Driver Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter driver name"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-mobile">Mobile Number</Label>
            <Input
              id="edit-mobile"
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
                <RadioGroupItem value="active" id="edit-active" />
                <Label htmlFor="edit-active" className="cursor-pointer font-normal">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="edit-inactive" />
                <Label htmlFor="edit-inactive" className="cursor-pointer font-normal">Inactive</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}