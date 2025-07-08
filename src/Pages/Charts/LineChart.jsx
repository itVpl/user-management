import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", value: 10 },
  { month: "Feb", value: 30 },
  { month: "Mar", value: 35 },
  { month: "Apr", value: 25 },
  { month: "May", value: 40 },
  { month: "Jun", value: 50 },
  { month: "Jul", value: 30 },
  { month: "Aug", value: 20 },
  { month: "Sep", value: 60 },
  { month: "Oct", value: 70 },
  { month: "Nov", value: 60 },
  { month: "Dec", value: 70 },
];

const LineChartComponent = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#3b82f6" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;