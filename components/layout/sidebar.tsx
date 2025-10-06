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
  CreditCard,
  Menu,
  X,
  TruckIcon
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
    title: 'Logistics',
    href: '/logistics',
    icon: TruckIcon
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
    icon: CreditCard
  }
]

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith('/reports'))

  const isReportsActive = pathname.startsWith('/reports')

  return (
    <div 
      className={`bg-white border-r h-screen fixed left-0 top-0 overflow-y-auto transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="p-6 border-b flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-2xl font-bold text-gray-800">Dania Maids</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
        >
          {isCollapsed ? (
            <Menu className="h-5 w-5 text-gray-600" />
          ) : (
            <X className="h-5 w-5 text-gray-600" />
          )}
        </button>
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
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.title : ''}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          )
        })}

        <div className="mt-1">
          <button
            onClick={() => !isCollapsed && setReportsOpen(!reportsOpen)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
              isReportsActive
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Reports' : ''}
          >
            <div className={`flex items-center gap-3 ${isCollapsed ? '' : ''}`}>
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Reports</span>}
            </div>
            {!isCollapsed && (
              <ChevronDown 
                className={`h-4 w-4 transition-transform ${
                  reportsOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {reportsOpen && !isCollapsed && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
              {reportItems.map((report) => {
                const Icon = report.icon
                const isActive = pathname === report.href
                
                return (
                  <Link
                    key={report.href}
                    href={report.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{report.title}</span>
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