'use client'

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Edit2, Trash2, User, AlertTriangle } from "lucide-react"
import { EditDriverDialog } from "./edit-driver-dialog"
import { supabase } from "@/lib/supabase"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DriversListProps {
  drivers: any[]
  loading: boolean
  onRefresh: () => void
}

export function DriversList({ drivers, loading, onRefresh }: DriversListProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<any>(null)
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteFinal, setShowDeleteFinal] = useState(false)
  const [deletingDriver, setDeletingDriver] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  function startEdit(driver: any) {
    setEditingDriver(driver)
    setEditDialogOpen(true)
  }

  function startDelete(driver: any) {
    setDeletingDriver(driver)
    setShowDeleteConfirm(true)
  }

  function proceedToFinalDelete() {
    setShowDeleteConfirm(false)
    setShowDeleteFinal(true)
  }

  async function confirmDelete() {
    if (!deletingDriver) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', deletingDriver.id)
      
      if (error) throw error

      alert('Driver deleted successfully')
      setShowDeleteFinal(false)
      setDeletingDriver(null)
      onRefresh()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  function cancelDelete() {
    setShowDeleteConfirm(false)
    setShowDeleteFinal(false)
    setDeletingDriver(null)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-400 border-r-transparent"></div>
        <p className="mt-4 text-sm text-gray-500">Loading drivers...</p>
      </div>
    )
  }

  if (drivers.length === 0) {
    return (
      <Card className="p-12 text-center">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No drivers yet</h3>
        <p className="text-gray-600">Add your first driver to get started</p>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <Card key={driver.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{driver.name}</h3>
                  <Badge 
                    className={`mt-1 ${
                      driver.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {driver.status}
                  </Badge>
                </div>
              </div>
            </div>

            {driver.mobile && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Phone className="h-4 w-4" />
                <span>{driver.mobile}</span>
              </div>
            )}

            {driver.notes && (
              <div className="text-sm text-gray-600 mb-4 line-clamp-2">
                {driver.notes}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => startEdit(driver)}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 hover:bg-red-50"
                onClick={() => startDelete(driver)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation - First */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Delete Driver?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>{deletingDriver?.name}</strong>.
              <br /><br />
              Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={cancelDelete}>No, Keep It</Button>
            <Button variant="destructive" onClick={proceedToFinalDelete}>
              Yes, Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation - Final */}
      <AlertDialog open={showDeleteFinal} onOpenChange={setShowDeleteFinal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is your last chance. Deleting this driver cannot be undone.
              <br /><br />
              Driver: <strong>{deletingDriver?.name}</strong>
              {deletingDriver?.mobile && (
                <>
                  <br />
                  Mobile: <strong>{deletingDriver.mobile}</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={cancelDelete}>Go Back</Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Yes, Delete Driver'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditDriverDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        driver={editingDriver}
        onSuccess={() => {
          setEditDialogOpen(false)
          onRefresh()
        }}
      />
    </>
  )
}