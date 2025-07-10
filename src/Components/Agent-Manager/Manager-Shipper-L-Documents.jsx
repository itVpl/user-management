import React, { useState } from 'react';

const ManagerShippersLDocuments = () => {
  const [showDetails, setShowDetails] = useState(false);

  const handleViewClick = () => setShowDetails(true);

  return (
    <div className="p-4">
      {/* Main Table View */}
      {!showDetails && (
        <div className="bg-white rounded-xl shadow p-4">
          <table className="w-full text-left">
            <thead>
              <tr className="text-blue-500 font-medium">
                <th>Date - L Doc</th>
                <th>Load ID</th>
                <th>Employee ID</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td>25-06-2025</td>
                <td>L00331</td>
                <td>VPL003</td>
                <td>CMT</td>
                <td><span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Approved</span></td>
                <td>All Docs was correct..</td>
                <td><button onClick={handleViewClick} className="bg-gray-200 rounded px-3 py-1">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Detailed View */}
      {showDetails && (
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <div className="flex justify-between">
            <button onClick={() => setShowDetails(false)} className="text-xl">⬅</button>
            <div className="space-x-3">
              <button className="bg-green-500 text-white px-4 py-1 rounded">Approve</button>
              <button className="bg-red-500 text-white px-4 py-1 rounded">Reject</button>
              <button className="bg-blue-500 text-white px-4 py-1 rounded">Re-submission</button>
            </div>
          </div>

          <div className="text-lg font-semibold">25-06-2025 - Load ID: L00331</div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left Panel */}
            <div className="border rounded-xl p-4">
              <p><strong>Employee ID:</strong> VPL001</p>
              <p><strong>Action Taken:</strong> <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Approved</span></p>
              <p><strong>Name:</strong> Joseph</p>
              <p><strong>Action Date & Time:</strong> 26-06-2025, 12:00:25 AM</p>
              <p><strong>Designation:</strong> Agent</p>
              <p>Docs was ok.</p>
            </div>

            {/* Right Panel */}
            <div className="border rounded-xl p-4">
              <p><strong>Employee ID:</strong> VPL003</p>
              <p><strong>Action Taken:</strong> <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Approved</span></p>
              <p><strong>Name:</strong> Ronin</p>
              <p><strong>Action Date & Time:</strong> 25-06-2025, 10:30:25 PM</p>
              <p><strong>Designation:</strong> CMT</p>
              <p>All Documents provided by shipper was correct.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <label>Customer Name</label>
              <input className="border w-full px-2 py-1 rounded" value="Steve Rogers" readOnly />
            </div>
            <div>
              <label>Shipment No.</label>
              <input className="border w-full px-2 py-1 rounded" value="SP-10549" readOnly />
            </div>
            <div>
              <label>PO No.</label>
              <input className="border w-full px-2 py-1 rounded" value="8753257" readOnly />
            </div>
            <div>
              <label>BOL No.</label>
              <input className="border w-full px-2 py-1 rounded" value="8753257" readOnly />
            </div>
            <div>
              <label>Container No.</label>
              <input className="border w-full px-2 py-1 rounded" value="8753257" readOnly />
            </div>
            <div>
              <label>Rates</label>
              <input className="border w-full px-2 py-1 rounded" value="8753257" readOnly />
            </div>
            <div>
              <label>Load Type</label>
              <input className="border w-full px-2 py-1 rounded" value="OTR" readOnly />
            </div>
            <div>
              <label>From</label>
              <input className="border w-full px-2 py-1 rounded" value="New York" readOnly />
            </div>
            <div>
              <label>To</label>
              <input className="border w-full px-2 py-1 rounded" value="Houston" readOnly />
            </div>
            <div>
              <label>Pickup Date</label>
              <input className="border w-full px-2 py-1 rounded" value="24-06-2025" readOnly />
            </div>
            <div>
              <label>Drop Date</label>
              <input className="border w-full px-2 py-1 rounded" value="30-06-2025" readOnly />
            </div>
            <div>
              <label>Equipment Type</label>
              <input className="border w-full px-2 py-1 rounded" value="Flatbed" readOnly />
            </div>
            <div>
              <label>Weight</label>
              <input className="border w-full px-2 py-1 rounded" value="300 Lbs" readOnly />
            </div>
            <div>
              <label>Size</label>
              <input className="border w-full px-2 py-1 rounded" value="48 ft" readOnly />
            </div>
            <div>
              <label>Commodity</label>
              <input className="border w-full px-2 py-1 rounded" value="Electronics" readOnly />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerShippersLDocuments;
