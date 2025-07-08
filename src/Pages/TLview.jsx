import React from "react";
import Tabs from "../../components/Tabs/Tabs";
import LineChart from "../../components/Chart/LineChart";
import ManagerCard from "../../components/Cards/ManagerCard";
import AgentTable from "../../components/Tables/AgentTable";

const TLView = () => {
  return (
    <div className="p-6">
      <Tabs activeTab="Revenue" />
      <div className="bg-white p-6 shadow rounded-xl">
        <LineChart />
      </div>
      <div className="flex gap-4">
        <ManagerCard />
        <ManagerCard />
      </div>
      <AgentTable />
    </div>
  );
};

export default TLView;