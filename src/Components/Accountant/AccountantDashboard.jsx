import React from 'react';

const AccountantDashboard = () => {
  const billings = [
    { invoice: 'INV-1123', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$25,000' },
    { invoice: 'INV-1153', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$34,000' },
    { invoice: 'INV-4568', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$5,000' },
    { invoice: 'INV-7896', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$14,000' },
    { invoice: 'INV-8523', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$55,000' },
  ];

  const summary = [
    { label: 'Total Billing', value: 500, icon: '💰' },
    { label: 'Pending Bills', value: '05', icon: '⛔' },
    { label: 'Attendance', value: 20, icon: '🗓️' },
    { label: 'Tasks', value: 300, icon: '✅' },
    { label: 'Personal Hygiene', value: 500, icon: '📈' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      {/* Summary Cards */}
      <div className="grid grid-cols-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {summary.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 shadow-md flex flex-col items-center">
            <div className="text-4xl mb-2">{item.icon}</div>
            <div className="text-gray-700 text-sm font-semibold">{item.label}</div>
            <div className="text-2xl font-bold">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Billings and Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Billings Table */}
        <div className="bg-white rounded-xl p-4 shadow-md md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Billings</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-2">Invoice No.</th>
                <th className="pb-2">Shipper</th>
                <th className="pb-2">Date</th>
                <th className="pb-2">Amt</th>
              </tr>
            </thead>
            <tbody>
              {billings.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2">{item.invoice}</td>
                  <td>{item.shipper}</td>
                  <td>{item.date}</td>
                  <td>{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-center mt-4">
            <button className="bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-600">View all</button>
          </div>
        </div>

        {/* Calendar */}
        {/* <div className="bg-white rounded-xl p-4 shadow-md">
          <h2 className="text-lg font-semibold mb-4">Upcoming Due Dates</h2>
          <div className="text-sm text-gray-700">June 2025</div>
          <div className="grid grid-cols-7 gap-1 mt-2 text-center text-xs">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className={`py-1 rounded-full ${i === 15 ? 'bg-blue-500 text-white' : 'text-gray-700'}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default AccountantDashboard;
