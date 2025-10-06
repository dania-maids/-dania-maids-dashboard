'use client'

import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/dashboard/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { User, Mail, Phone, Shield, Clock, Activity } from "lucide-react"

export default function ProfilePage() {
  const { user, userProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  })

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || ''
      })
      loadActivities()
    }
  }, [userProfile])

  async function loadActivities() {
    if (!user) return
    
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (data) setActivities(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profile updated successfully!')
      setEditing(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600">Manage your account information</p>
          </div>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl">
                  {userProfile.full_name?.charAt(0) || userProfile.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {userProfile.full_name || userProfile.email}
                  </h2>
                  {userProfile.full_name && (
                    <p className="text-gray-600 text-sm">{userProfile.email}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-blue-100 text-blue-700 capitalize">
                      <Shield className="h-3 w-3 mr-1" />
                      {userProfile.role}
                    </Badge>
                    <Badge className={`${
                      userProfile.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {userProfile.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {!editing && (
                <Button onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="555XXXXX"
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium">{userProfile.email}</div>
                  </div>
                </div>

                {userProfile.phone && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="font-medium">{userProfile.phone}</div>
                    </div>
                  </div>
                )}

                {userProfile.last_login_at && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Last Login</div>
                      <div className="font-medium">
                        {format(new Date(userProfile.last_login_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-gray-700" />
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>

            {activities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{activity.action}</div>
                      <div className="text-xs text-gray-500">{activity.entity_type}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}