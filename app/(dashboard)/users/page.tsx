'use client'

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Plus, Shield, User as UserIcon, Clock, Activity } from "lucide-react"
import { format } from "date-fns"
import { CreateUserDialog } from "@/components/users/create-user-dialog"
import { UserActivityDialog } from "@/components/users/user-activity-dialog"
import { useRouter } from "next/navigation"

export default function UsersPage() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  useEffect(() => {
    // فقط Admins يقدرون يدخلون
    if (userProfile && userProfile.role !== 'admin') {
      router.push('/')
      return
    }
    
    if (userProfile) {
      loadUsers()
    }
  }, [userProfile])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
    setLoading(false)
  }

  async function updateUserRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
    
    if (!error) {
      loadUsers()
    }
  }

  async function updateUserStatus(userId: string, newStatus: string) {
    const { error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', userId)
    
    if (!error) {
      loadUsers()
    }
  }

  function showActivity(user: any) {
    setSelectedUser(user)
    setActivityDialogOpen(true)
  }

  if (loading) {
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
            <p className="text-gray-600">Manage system users and permissions</p>
          </div>
          
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add User
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card key={user.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user.full_name || user.email}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Role</span>
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                    disabled={user.id === userProfile?.id}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <select
                    value={user.status}
                    onChange={(e) => updateUserStatus(user.id, e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                    disabled={user.id === userProfile?.id}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {user.last_login_at && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    Last login: {format(new Date(user.last_login_at), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Badge className={`
                  ${user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-700' 
                    : user.role === 'manager'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                  }
                `}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role}
                </Badge>

                <Badge className={`
                  ${user.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                  }
                `}>
                  {user.status}
                </Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => showActivity(user)}
              >
                <Activity className="h-4 w-4 mr-2" />
                View Activity
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadUsers}
      />

      <UserActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        user={selectedUser}
      />
    </div>
  )
}