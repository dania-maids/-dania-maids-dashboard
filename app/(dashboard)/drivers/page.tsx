'use client'

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { DriversList } from "@/components/drivers/drivers-list"
import { CreateDriverDialog } from "@/components/drivers/create-driver-dialog"

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadDrivers()
  }, [])

  async function loadDrivers() {
    setLoading(true)
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .order('name')
    
    if (data) setDrivers(data)
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-600 mt-1">Manage your delivery drivers</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Add Driver
        </Button>
      </div>

      <DriversList 
        drivers={drivers} 
        loading={loading} 
        onRefresh={loadDrivers} 
      />

      <CreateDriverDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadDrivers}
      />
    </div>
  )
}