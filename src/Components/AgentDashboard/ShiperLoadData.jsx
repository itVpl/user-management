import React, { useEffect, useState } from 'react';
const ShiperLoadData = () => {
  const [Loading, setLoading] = useState(true);
  useEffect(() => {
    // Simulate data fetch delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // 1 second delay


    return () => clearTimeout(timer);
  }, []);
  const shipmentData = [
    { id: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed', from: 'Jaipur', to: 'Himachal', pickupDate: 'Flatbed', status: 'Pending' },
    { id: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed', from: 'Norway', to: 'Edenberg', pickupDate: 'Flatbed', status: 'Assigned' },
    { id: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed', from: 'Sri Lanka', to: 'Nepal', pickupDate: 'Flatbed', status: 'Posted' },
    { id: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed', from: 'Nepal', to: 'Srinagar', pickupDate: 'Flatbed', status: 'In-Route' },
    { id: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed', from: 'Zibi', to: 'Delhi', pickupDate: 'Flatbed', status: 'Delivered' },
    { id: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed', from: 'Kolkata', to: 'Gurugram', pickupDate: 'Flatbed', status: 'Delivered' },
    { id: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed', from: 'Chandigarh', to: 'Toronto', pickupDate: 'Flatbed', status: 'Delivered' },
    { id: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed', from: 'Edenberg', to: 'Nepal', pickupDate: 'Flatbed', status: 'Delivered' },
  ];


  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-300 text-yellow-800';
      case 'Assigned': return 'bg-green-500 text-white';
      case 'Posted': return 'bg-yellow-300 text-yellow-800';
      case 'In-Route': return 'bg-green-400 text-white';
      case 'Delivered': return 'bg-green-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };
   
if (Loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg px-12">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Shipper Data...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the load information</p>
          </div>
        </div>
      </div>
    );
  }






  return (
    <div className="flex h-screen bg-gray-50 font-sans">




      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Table */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-600  tracking-wider">Shipper ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-600  tracking-wider">Load ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-600  tracking-wider">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-600  tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-600  tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-600  tracking-wider">To</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-600  tracking-wider">Pick-up Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-blue-600  tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shipmentData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.loadId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.weight}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.vehicle}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.from}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.to}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.pickupDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ShiperLoadData;