'use client'

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="font-semibold mb-2">System Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Currency:</span>
            <span className="font-medium">QAR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Timezone:</span>
            <span className="font-medium">Asia/Qatar</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Max Cleaners per Booking:</span>
            <span className="font-medium">1</span>
          </div>
        </div>
      </div>
      
      <div className="text-center py-8 text-gray-500">
        <p>Additional general settings coming soon</p>
      </div>
    </div>
  )
}