import React from 'react';
import {
  Group23, Group22, CardBoard, Deliver, Group26, Group20,
  Group30, Group28, Group27, CancelIcon, localShipping,
  Group29, AutoTowing, NewUSerImage, USA
} from '../../assets/image';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const shipments = [
  { id: 'FEX123456789US', status: 'Pre-Loading', time: '2hrs 15min' },
  { id: 'UPSIZ999AAI0123456784', status: 'Loading', time: '0hrs 15min' },
  { id: 'DHL0003456789', status: 'In-Transit', time: '1hrs 30min' },
  { id: 'TNT9843215670', status: 'Arrived', time: '0hrs' },
];

const containers = [
  { id: 'CNUI1234567', customer: 'Global Trader', port: 'New York, US', date: '3-6-2025' },
  { id: 'MSC2345678', customer: 'Oceanic Exports', port: 'Jebel Ali, AE', date: '3-6-2025' },
  { id: 'HLC3456789', customer: 'Alpha Impex', port: 'Rotterdam, NL', date: '3-6-2025' },
  { id: 'MAE4567890', customer: 'Nova Logistics', port: 'Singapore, SG', date: '3-6-2025' },
];

const activities = [
  { time: '4th June, 8:00AM', activity: 'Container Booked', color: 'bg-green-300', desc: 'CNUI1234567...' },
  { time: '4th June, 9:00AM', activity: 'Delivered', color: 'bg-green-600', desc: 'MSC2345678...' },
  { time: '4th June, 10:30AM', activity: 'Loading', color: 'bg-yellow-300', desc: 'ZIMO123456...' },
  { time: '4th June, 12:30PM', activity: 'Booking cancelled', color: 'bg-red-400', desc: 'SIT8901234...' },
];

const revenueData = [
  { name: 'A', value: 68.2 },
  { name: 'B', value: 9.8 },
  { name: 'C', value: 5 },
  { name: 'D', value: 10 },
  { name: 'E', value: 7 },
];

const COLORS = ['#4186EC', '#2D9CDB', '#B5E48C', '#52B788', '#FF6B6B'];

const statusColor = {
  'Pre-Loading': 'bg-blue-400',
  'Loading': 'bg-blue-500',
  'In-Transit': 'bg-blue-600',
  'Arrived': 'bg-green-700',
};

function Dashboard() {
  return (
    <div className="pt-6 px-6">
      {/* Cards Row 1 */}
      <div className="DashbaordCard">
        <div className="side1">
          <div className="rowCard">
            <div className="CardItem">
              <div className="cartIcon">
                <img src={Group23} alt="icon" /> <span className="title">Total Shipment Today</span>
              </div>
              <div className="cartIconBottom">
                <span className="Value">6000</span>
                <img src={CardBoard} alt="cardBoard" />
              </div>
            </div>
            <div className="CardItem">
              <div className="cartIcon">
                <img src={Group22} alt="icon" /> <span className="title">Pending Docs</span>
              </div>
              <div className="cartIconBottom">
                <span className="Value">50</span>
                <img src={Deliver} alt="deliver" />
              </div>
            </div>
          </div>

          <div className="rowCard">
            <div className="CardItem1">
              <div className="cartIcon">
                <img src={Group26} alt="icon" /> <span className="title">Active Consignments</span>
              </div>
              <div className="cartIconBottom1">
                <img src={Group20} alt="active" />
                <span className="Value">5000</span>
              </div>
            </div>
            <div className="CardItem1">
              <div className="cartIcon">
                <img src={Group22} alt="icon" /> <span className="title">Delayed</span>
              </div>
              <div className="cartIconBottom1">
                <img src={Group30} alt="delayed" />
                <span className="Value">6000</span>
              </div>
            </div>
          </div>
        </div>

        <div className="side2">
          <div className="CartMap">
            <img src={USA} alt="USA Map" className="w-full h-64 object-contain" />
            <button className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition">
              Track Shipment In Real-Time
            </button>
          </div>
        </div>
      </div>

      {/* Cards Row 2 */}
      <div className="rowCard">
        <div className="CardItem">
          <div className="cartIcon">
            <img src={Group28} alt="icon" /> <span className="title">Custom Clearances</span>
          </div>
          <div className="cartIconBottom">
            <span className="Value">1000</span>
            <img src={Group27} alt="icon" />
          </div>
        </div>
        <div className="CardItem">
          <div className="cartIcon">
            <img src={CancelIcon} alt="icon" /> <span className="title">Cancelled</span>
          </div>
          <div className="cartIconBottom">
            <span className="Value">10</span>
            <img src={localShipping} alt="icon" />
          </div>
        </div>
        <div className="CardItem">
          <div className="cartIcon">
            <img src={Group29} alt="icon" /> <span className="title">Return Orders</span>
          </div>
          <div className="cartIconBottom">
            <span className="Value">50</span>
            <img src={AutoTowing} alt="icon" />
          </div>
        </div>
      </div>

      {/* Shipment + Table */}
      <div className="flex  lg:flex-row gap-6 p-2">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full lg:w-1/2 font-poppins">
          <h2 className="text-2xl font-semibold mb-4">Shipment Overview</h2>
          <div className="grid grid-cols-3 text-gray-400 font-semibold mb-2">
            <span>Shipment No</span>
            <span>Status</span>
            <span>Time</span>
          </div>
          {shipments.map((ship, index) => (
            <div key={index} className="grid grid-cols-3 items-center py-2">
              <span className="text-sm">{ship.id}</span>
              <span>
                <span className={`text-white px-3 py-1 rounded-md text-sm ${statusColor[ship.status]}`}>
                  {ship.status}
                </span>
              </span>
              <span className="text-sm">{ship.time}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6 w-full font-poppins">
          <h2 className="text-2xl font-semibold mb-4">Containers Order & Status</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-800">
              <thead>
                <tr className="text-blue-600 text-sm">
                  <th className="py-3 px-4">Container ID</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Destination Port</th>
                  <th className="py-3 px-4">Order Date</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c, index) => (
                  <tr key={index} className="bg-white even:bg-[#f9f9f9] hover:bg-[#e6f0ff]">
                    <td className="py-3 px-4">{c.id}</td>
                    <td className="py-3 px-4">{c.customer}</td>
                    <td className="py-3 px-4">{c.port}</td>
                    <td className="py-3 px-4">{c.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex  lg:flex-row gap-6 p-2">
        {/* New Users */}
        <div className="bg-white rounded-xl shadow-xl p-6 w-full lg:w-1/3 text-center">
          <h2 className="text-xl font-semibold mb-4">New Sign-ups</h2>
          <div className="flex justify-center mb-4">
            <div className="flex -space-x-3">
              <img src={NewUSerImage} className="w-60 h-30 rounded-full border-2 border-white" alt="" />
            </div>
          </div>
          <h3 className="text-4xl font-bold text-blue-500 mb-2">500k</h3>
          <p className="text-blue-500 font-medium mb-4">New Users</p>
          <div className="flex justify-center gap-4">
            <button className="border-2 border-blue-500 px-4 py-2 rounded-full text-sm text-blue-500">10%<br />Monthly</button>
            <button className="border-2 border-blue-500 px-4 py-2 rounded-full text-sm text-blue-500">80%<br />Yearly</button>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl shadow-xl p-6 w-full lg:w-1/3 text-center">
          <h2 className="text-xl font-semibold mb-4">Total Revenue</h2>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <button className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600">
            View all
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md font-poppins">
          <h2 className="text-xl font-semibold mb-4 text-center">Recent Activity</h2>
          <div className="grid grid-cols-3 text-sm font-semibold text-blue-600 px-2 mb-2">
            <span>Date/Time</span>
            <span>Activity</span>
            <span>Description</span>
          </div>
          <div className="space-y-2">
            {activities.map((item, index) => (
              <div key={index} className="grid grid-cols-3 items-center text-sm px-2 py-2 rounded-lg bg-[#EAF4FC]">
                <span>{item.time}</span>
                <span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.color}`}>
                    {item.activity}
                  </span>
                </span>
                <span>{item.desc}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <button className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600">
              View all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
