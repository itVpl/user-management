import React, { useState } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  CalendarDays,
  Search,
  XCircle
} from 'lucide-react';

const CarrierDocs = () => {
  const [search, setSearch] = useState('');

  const stats = [
    {
      icon: <Users size={20} className="text-green-500" />,
      label: 'Total Carriers',
      value: 6,
      bg: 'bg-green-100'
    },
    {
      icon: <CheckCircle size={20} className="text-blue-500" />,
      label: 'Approved',
      value: 4,
      bg: 'bg-blue-100'
    },
    {
      icon: <Clock size={20} className="text-yellow-500" />,
      label: 'Pending',
      value: 1,
      bg: 'bg-yellow-100'
    },
    {
      icon: <CalendarDays size={20} className="text-purple-500" />,
      label: 'Today',
      value: 1,
      bg: 'bg-purple-100'
    }
  ];

  const carriers = [
    {
      id: '453063',
      name: 'Company Name',
      location: 'Los Angeles, CA',
      mc: 'MC123456',
      email: 'company@email.com',
      phone: '4654566555',
      carrierType: 'Carrier Type',
      status: 'pending',
      created: '7/30/2025',
      addedBy: 'Prashu'
    },
    {
      id: 'cacf14',
      name: 'VPOWER LOGISTICS COMPANY',
      location: 'Canada, Canada',
      mc: 'L988874PLOUJ',
      email: 'shellygarg687@gmail.com',
      phone: '4546546546546',
      carrierType: 'Owner',
      status: 'approved',
      created: '7/29/2025',
      addedBy: 'Prashu'
    },
    {
      id: '6bbc0f',
      name: 'VPOWER LOGISTICS COMPANY',
      location: 'Canada, Canada',
      mc: '2165165LKJHB',
      email: 'vpower@gmail.com',
      phone: '7847545400',
      carrierType: 'Owner',
      status: 'approved',
      created: '7/24/2025',
      addedBy: 'Prashu'
    },
    {
      id: '4fbbea',
      name: 'ABC Trucking Company',
      location: 'Los Angeles, California',
      mc: 'MC123456',
      email: 'info@abctrucking.com',
      phone: '8452154800',
      carrierType: 'Dry Van',
      status: 'approved',
      created: '7/24/2025',
      addedBy: 'Prashu'
    },
    {
      id: 'c3ae62',
      name: 'Dummy',
      location: 'India, Haryana',
      mc: '15422',
      email: 'Dummy456@gmail.com',
      phone: '9889598087',
      carrierType: 'asd',
      status: 'rejected',
      created: '7/10/2025',
      addedBy: 'Prashu'
    },
    {
      id: 'a00a6d',
      name: 'HPL',
      location: 'Ludhiana, Punjab',
      mc: '7845BNTI',
      email: 'harshpathaksmt@gmail.com',
      phone: '7845251400',
      carrierType: 'Owner Operator',
      status: 'approved',
      created: '6/20/2025',
      addedBy: 'System'
    }
  ];

  const filtered = carriers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-white min-h-screen font-sans">
      {/* Top Cards + Search */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        {/* Stat Cards */}
        <div className="flex flex-wrap gap-4">
          {stats.map((card, i) => (
            <div
              key={i}
              className="w-[160px] bg-white rounded-xl px-4 py-3 text-center shadow"
            >
              <div
                className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-1 ${card.bg}`}
              >
                {card.icon}
              </div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-800">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search carriers..."
            className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-3 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-100 text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-3 text-left">CARRIER ID</th>
              <th className="px-4 py-3 text-left">COMPANY NAME</th>
              <th className="px-4 py-3">MC/DOT NO</th>
              <th className="px-4 py-3">EMAIL</th>
              <th className="px-4 py-3">PHONE</th>
              <th className="px-4 py-3">CARRIER TYPE</th>
              <th className="px-4 py-3">STATUS</th>
              <th className="px-4 py-3">CREATED</th>
              <th className="px-4 py-3">ACTION</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filtered.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3 text-[#3974d0] font-semibold">{c.id}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.location}</div>
                </td>
                <td className="px-4 py-3 text-center">{c.mc}</td>
                <td className="px-4 py-3 text-center">{c.email}</td>
                <td className="px-4 py-3 text-center">{c.phone}</td>
                <td className="px-4 py-3 text-center font-medium">{c.carrierType}</td>
                <td className="px-4 py-3 text-center">
                  {c.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      <CheckCircle size={14} /> approved
                    </span>
                  )}
                  {c.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                      <Clock size={14} /> pending
                    </span>
                  )}
                  {c.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                      <XCircle size={14} /> rejected
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {c.created}
                  <div className="text-xs text-gray-500">by {c.addedBy}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="text-[#3974d0] border border-[#3974d0] hover:bg-[#3974d0] hover:text-white transition-all text-sm px-4 py-1 rounded-full font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CarrierDocs;
