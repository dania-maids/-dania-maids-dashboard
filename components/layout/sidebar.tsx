'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, UserCircle, Settings, BarChart3, Truck, ShieldCheck, FileText } from 'lucide-react'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home
  },
  {
    title: 'Bookings',
    href: '/bookings',
    icon: Calendar
  },
  {
    title: 'Clients',
    href: '/clients',
    icon: Users
  },
  {
    title: 'Cleaners',
    href: '/cleaners',
    icon: UserCircle
  },
  {
    title: 'Drivers',
    href: '/drivers',
    icon: Truck
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: FileText
  },
  {
    title: 'Users',
    href: '/users',
    icon: ShieldCheck
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings
  }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r h-screen fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800">Dania Maids</h1>
      </div>
      
      <nav className="px-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}