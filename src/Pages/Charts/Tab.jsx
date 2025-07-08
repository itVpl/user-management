import React from "react";

const Tabs = ({ activeTab, setActiveTab }) => {
  const tabList = ["Revenue", "Calling Reports", "Customer Added", "Carrier Added"];

  return (
    <div className="flex gap-4 mb-6">
      {tabList.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)} // ✅ handle click
          className={`px-4 py-1 rounded-full border cursor-pointer transition-all duration-200 ${
            activeTab === tab
              ? "bg-blue-500 text-white"
              : "border-blue-400 text-blue-500"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
    