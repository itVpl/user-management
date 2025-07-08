import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", revenue: 5000 },
  { month: "Feb", revenue: 8000 },
  { month: "Mar", revenue: 12000 },
  { month: "Apr", revenue: 18000 },
  { month: "May", revenue: 25000 },
  { month: "Jun", revenue: 30000 },
  { month: "Jul", revenue: 37000 },
  { month: "Aug", revenue: 45000 },
  { month: "Sep", revenue: 52000 },
  { month: "Oct", revenue: 60000 },
  { month: "Nov", revenue: 65000 },
  { month: "Dec", revenue: 70000 },
];

const RevenueBarChart = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="revenue" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RevenueBarChart;