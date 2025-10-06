'use client'

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AuthProvider } from "@/lib/auth-context"
import { Sidebar } from "./sidebar"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // صفحات بدون Sidebar
  const isAuthPage = pathname === '/login' || 
                     pathname === '/forgot-password' || 
                     pathname.startsWith('/auth/')

  // منع عرض أي شيء حتى يتم تحديد pathname
  if (!mounted) {
    return null
  }

  return (
    <AuthProvider>
      {isAuthPage ? (
        // صفحات Auth بدون Sidebar
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      ) : (
        // باقي الصفحات مع Sidebar
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto ml-64">
            {children}
          </main>
        </div>
      )}
    </AuthProvider>
  )
}