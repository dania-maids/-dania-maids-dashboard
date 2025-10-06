import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface DashboardStats {
  todaySales: number;
  monthSales: number;
  todayBookings: number;
  todayHours: number;
  avgHourlyRate: number;
  newCustomers: number;
  pendingPayments: number;
  totalDiscounts: number;
}

export interface SalesTrend {
  date: string;
  sales: number;
  bookings: number;
}

export interface CleanerPerformance {
  name: string;
  sales: number;
  hours: number;
}

export interface MaterialsRatio {
  name: string;
  value: number;
}

// Get dashboard KPIs
export async function getDashboardStats(
  startDate?: string,
  endDate?: string
): Promise<DashboardStats> {
  const start = startDate || new Date().toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  // Get all data for the date range
  const { data } = await supabase
    .from('vw_reports_base')
    .select('*')
    .gte('booking_date', start)
    .lte('booking_date', end);

  if (!data || data.length === 0) {
    return {
      todaySales: 0,
      monthSales: 0,
      todayBookings: 0,
      todayHours: 0,
      avgHourlyRate: 0,
      newCustomers: 0,
      pendingPayments: 0,
      totalDiscounts: 0,
    };
  }

  const todaySales = data.reduce((sum, b) => sum + Number(b.final_price), 0);
  const monthSales = todaySales;
  const todayBookings = data.length;
  const todayHours = data.reduce((sum, b) => sum + Number(b.duration_hours), 0);
  const avgHourlyRate = todayHours > 0 ? todaySales / todayHours : 0;
  const newCustomers = data.filter(b => b.customer_type === 'new').length;
  const pendingPayments = data
    .filter(b => b.is_credit_sale && b.payment_status === 'unpaid')
    .reduce((sum, b) => sum + Number(b.final_price), 0);
  const totalDiscounts = data.reduce((sum, b) => sum + Number(b.discount_amount), 0);

  return {
    todaySales,
    monthSales,
    todayBookings,
    todayHours,
    avgHourlyRate,
    newCustomers,
    pendingPayments,
    totalDiscounts,
  };
}

// Get sales trend (last 30 days)
export async function getSalesTrend(days: number = 30): Promise<SalesTrend[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data } = await supabase
    .from('vw_report_daily_sales')
    .select('booking_date, total_sales, total_bookings')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .order('booking_date', { ascending: true });

  return (
    data?.map(d => ({
      date: d.booking_date,
      sales: Number(d.total_sales),
      bookings: Number(d.total_bookings),
    })) || []
  );
}

// Get top cleaners
export async function getTopCleaners(limit: number = 10): Promise<CleanerPerformance[]> {
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('vw_reports_base')
    .select('cleaner_name, final_price, duration_hours')
    .gte('booking_date', firstDayOfMonth)
    .lte('booking_date', today);

  const cleanerMap = new Map<string, { sales: number; hours: number }>();

  data?.forEach(booking => {
    const existing = cleanerMap.get(booking.cleaner_name) || { sales: 0, hours: 0 };
    cleanerMap.set(booking.cleaner_name, {
      sales: existing.sales + Number(booking.final_price),
      hours: existing.hours + Number(booking.duration_hours),
    });
  });

  return Array.from(cleanerMap.entries())
    .map(([name, stats]) => ({
      name,
      sales: stats.sales,
      hours: stats.hours,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

// Get materials ratio
export async function getMaterialsRatio(): Promise<MaterialsRatio[]> {
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const { data } = await supabase
    .from('vw_reports_base')
    .select('with_materials')
    .gte('booking_date', firstDayOfMonth)
    .lte('booking_date', today);

  const withMaterials = data?.filter(b => b.with_materials === true).length || 0;
  const withoutMaterials = data?.filter(b => b.with_materials === false).length || 0;

  return [
    { name: 'With Materials', value: withMaterials },
    { name: 'Without Materials', value: withoutMaterials },
  ];
}