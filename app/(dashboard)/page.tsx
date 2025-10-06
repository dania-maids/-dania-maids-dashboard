'use client'

import { Header } from "@/components/dashboard/header"
import { StatCard } from "@/components/dashboard/stat-card"
import { Calendar, DollarSign, Users, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    revenue: 0,
    activeCleaners: 0,
    todayShifts: 0
  })

  useEffect(() => {
    async function loadStats() {
      // Get total bookings
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

      // Get revenue
      const { data: revenueData } = await supabase
        .from('bookings')
        .select('final_price')
        .eq('status', 'completed')
      
      const totalRevenue = revenueData?.reduce((sum, b) => sum + Number(b.final_price), 0) || 0

      // Get active cleaners
      const { count: cleanersCount } = await supabase
        .from('cleaners')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Get today's shifts
      const today = new Date().toISOString().split('T')[0]
      const { count: todayCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('booking_date', today)
        .neq('status', 'cancelled')

      setStats({
        totalBookings: bookingsCount || 0,
        revenue: totalRevenue,
        activeCleaners: cleanersCount || 0,
        todayShifts: todayCount || 0
      })
    }

    loadStats()
  }, [])

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your business performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            change="+12.5% from last month"
            icon={Calendar}
            trend="up"
          />
          <StatCard
            title="Revenue"
            value={`${stats.revenue.toFixed(0)} QAR`}
            change="+8.2% from last month"
            icon={DollarSign}
            trend="up"
          />
          <StatCard
            title="Active Cleaners"
            value={stats.activeCleaners}
            icon={Users}
          />
          <StatCard
            title="Today's Shifts"
            value={stats.todayShifts}
            icon={TrendingUp}
          />
        </div>
      </div>
    </div>
  )
}