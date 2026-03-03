import React from 'react';
import { FileText, Calendar } from 'lucide-react';

export default function DOAndSchedulingReport() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <FileText className="text-indigo-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">DO & Scheduling Report</h1>
            <p className="text-sm text-gray-500">Delivery order and scheduling report</p>
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl p-8 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Report content can be added here.</p>
        </div>
      </div>
    </div>
  );
}
