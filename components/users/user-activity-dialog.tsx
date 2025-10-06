'use client'

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Clock, User, FileText } from "lucide-react"

interface UserActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
}

export function UserActivityDialog({ open, onOpenChange, user }: UserActivityDialogProps) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && user) {
      loadActivities()
    }
  }, [open, user])

  async function loadActivities() {
    setLoading(true)
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) setActivities(data)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Activity Log - {user?.full_name || user?.email}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No activity recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-sm">{activity.action}</span>
                      <span className="text-xs text-gray-500">on {activity.entity_type}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  
                  {activity.details && (
                    <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto mt-2">
                      {JSON.stringify(activity.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}