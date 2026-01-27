import React, { useState } from 'react';
import apiService from '../../services/apiService.js';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const ShipperPaymentRemarkTest = () => {
  const [testDoId, setTestDoId] = useState('');
  const [testStatus, setTestStatus] = useState('ok');
  const [testNotes, setTestNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTest = async () => {
    if (!testDoId.trim()) {
      setError('Please enter a DO ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await apiService.updateShipperPaymentRemark(testDoId, testStatus, testNotes);
      setResult(response);
    } catch (err) {
      setError(err.message || 'Failed to update shipper payment remark');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Shipper Payment Remark API Test</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DO ID
            </label>
            <input
              type="text"
              value={testDoId}
              onChange={(e) => setTestDoId(e.target.value)}
              placeholder="Enter DO ID (e.g., 67979a123456789012345678)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remark Status
            </label>
            <select
              value={testStatus}
              onChange={(e) => setTestStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ok">OK</option>
              <option value="not_okay">Not OK</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={testNotes}
              onChange={(e) => setTestNotes(e.target.value)}
              placeholder="Enter any notes about the remark..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleTest}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Testing...' : 'Test Shipper Payment Remark API'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={20} />
              <span className="font-medium text-red-800">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="text-green-600" size={20} />
              <span className="font-medium text-green-800">Success</span>
            </div>
            <pre className="text-sm text-green-700 bg-green-100 p-3 rounded border overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipperPaymentRemarkTest;