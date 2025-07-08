import React from "react";

const ManagerCard = () => {
  return (
    <div className="flex items-center gap-6 bg-white shadow p-4 rounded-xl mt-6">
      <img
        src="https://randomuser.me/api/portraits/men/32.jpg"
        alt="Manager"
        className="w-24 h-24 rounded-full"
      />
      <div>
        <h3 className="text-xl font-semibold">Eastern</h3>
        <p className="text-gray-600">Manager</p>
        <p className="text-2xl font-bold mt-2">$100,000 Revenue</p>
      </div>
    </div>
  );
};

export default ManagerCard;