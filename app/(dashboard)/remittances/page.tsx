'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { DollarSign, User, Calendar, CheckCircle, AlertCircle, Download, Plus, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Driver {
  id: string;
  name: string;
  mobile: string;
}

interface Remittance {
  id: string;
  driver_id: string;
  driver_name: string;
  remittance_date: string;
  submitted_amount: number;
  received_by_name: string;
  payment_method: string;
  receipt_number: string;
  notes: string;
  verified: boolean;
  created_at: string;
}

export default function RemittancesPage() {
  const [loading, setLoading] = useState(true);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    submitted_amount: '',
    received_by_name: '',
    payment_method: 'cash',
    receipt_number: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load drivers
      const { data: driversData } = await supabase
        .from('drivers')
        .select('id, name, mobile')
        .eq('status', 'active')
        .order('name');

      if (driversData) setDrivers(driversData);

      // Load remittances
      const { data: remittancesData } = await supabase
        .from('driver_remittances')
        .select(`
          id,
          driver_id,
          remittance_date,
          submitted_amount,
          received_by_name,
          payment_method,
          receipt_number,
          notes,
          verified,
          created_at
        `)
        .order('remittance_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (remittancesData) {
        // Get driver names
        const driverIds = [...new Set(remittancesData.map(r => r.driver_id))];
        const { data: driverNames } = await supabase
          .from('drivers')
          .select('id, name')
          .in('id', driverIds);

        const driverMap = new Map(driverNames?.map(d => [d.id, d.name]));

        const processedRemittances: Remittance[] = remittancesData.map(r => ({
          ...r,
          driver_name: driverMap.get(r.driver_id) || 'Unknown',
        }));

        setRemittances(processedRemittances);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.driver_id || !formData.submitted_amount || !formData.received_by_name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('driver_remittances').insert({
        driver_id: formData.driver_id,
        submitted_amount: parseFloat(formData.submitted_amount),
        received_by_name: formData.received_by_name,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      alert('Remittance recorded successfully!');
      setShowAddForm(false);
      setFormData({
        driver_id: '',
        submitted_amount: '',
        received_by_name: '',
        payment_method: 'cash',
        receipt_number: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Error adding remittance:', error);
      alert('Error recording remittance. Please try again.');
    }
  };

  const exportToExcel = () => {
    const dataToExport = remittances.map(r => ({
      'Date': format(parseISO(r.remittance_date), 'MMM dd, yyyy HH:mm'),
      'Driver': r.driver_name,
      'Amount': r.submitted_amount.toFixed(2),
      'Received By': r.received_by_name,
      'Payment Method': r.payment_method,
      'Receipt #': r.receipt_number || '-',
      'Verified': r.verified ? 'Yes' : 'No',
      'Notes': r.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Remittances');
    XLSX.writeFile(workbook, `Driver_Remittances_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalSubmitted = remittances.reduce((sum, r) => sum + r.submitted_amount, 0);
  const totalVerified = remittances.filter(r => r.verified).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Driver Remittances</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage driver cash submissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Remittance
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-sm border border-blue-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Remittances</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{remittances.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-green-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Submitted</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalSubmitted)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalVerified}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-orange-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Submission</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(remittances.length > 0 ? totalSubmitted / remittances.length : 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Remittance Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">New Remittance</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.driver_id}
                  onChange={e => setFormData({ ...formData, driver_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submitted Amount (QAR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.submitted_amount}
                  onChange={e => setFormData({ ...formData, submitted_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.received_by_name}
                  onChange={e => setFormData({ ...formData, received_by_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Name of person receiving the money"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={formData.receipt_number}
                  onChange={e => setFormData({ ...formData, receipt_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Save Remittance
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remittances List */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Remittances</h2>
        </div>

        {remittances.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No remittances recorded yet</p>
            <p className="text-sm mt-2">Click "New Remittance" to record a cash submission</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {remittances.map(remittance => (
                  <tr key={remittance.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {format(parseISO(remittance.remittance_date), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{remittance.driver_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(remittance.submitted_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{remittance.received_by_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="capitalize">{remittance.payment_method.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {remittance.receipt_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {remittance.verified ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertCircle className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {remittance.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}