'use client'

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, User, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export function Header() {
  const { user, userProfile, signOut } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">Overview of your business performance</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Organization:</span>
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1">
            <div className="h-6 w-6 rounded bg-gray-800 text-white flex items-center justify-center text-xs font-bold">
              D
            </div>
            <span className="font-medium">Dania Maids</span>
          </div>
        </div>

        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {userProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {userProfile.full_name?.charAt(0) || userProfile.email.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{userProfile.full_name || 'User'}</div>
                  <div className="text-xs text-gray-500 capitalize">{userProfile.role}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <div className="font-semibold">{userProfile.full_name || userProfile.email}</div>
                  <div className="text-xs text-gray-500 font-normal">{userProfile.email}</div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="h-4 w-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}