'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Calendar, 
  Users, 
  UserCircle, 
  Settings, 
  BarChart3, 
  Truck, 
  ShieldCheck, 
  FileText,
  ChevronDown,
  DollarSign,
  Clock,
  UsersRound,
  CreditCard
} from 'lucide-react'

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
    title: 'Settings',
    href: '/settings',
    icon: Settings
  }
]

const reportItems = [
  {
    title: 'Overview',
    href: '/reports',
    icon: BarChart3
  },
  {
    title: 'Sales Reports',
    href: '/reports/sales',
    icon: DollarSign
  },
  {
    title: 'Hours Reports',
    href: '/reports/hours',
    icon: Clock
  },
  {
    title: 'Customer Reports',
    href: '/reports/customers',
    icon: UsersRound
  },
  {
    title: 'Financial Reports',
    href: '/reports/financial',
    icon: CreditCard,
    disabled: true
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith('/reports'))

  const isReportsActive = pathname.startsWith('/reports')

  return (
    <div className="w-64 bg-white border-r h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-gray-800">Dania Maids</h1>
      </div>
      
      <nav className="px-4 py-4">
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

        {/* Reports Section with Dropdown */}
        <div className="mt-1">
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
              isReportsActive
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5" />
              <span>Reports</span>
            </div>
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${
                reportsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {reportsOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
              {reportItems.map((report) => {
                const Icon = report.icon
                const isActive = pathname === report.href
                
                return (
                  <Link
                    key={report.href}
                    href={report.disabled ? '#' : report.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : report.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={(e) => report.disabled && e.preventDefault()}
                  >
                    <Icon className="h-4 w-4" />
                    {report.title}
                    {report.disabled && (
                      <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        Soon
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}