import React, { useState } from "react";
import Tabs from "../../Pages/Charts/Tab";
import Revenue from "../../Pages/Revenue";
import CustomerAdded from "../../Pages/CustomerAdded";
import CarrierAdded from "../../Pages/CarrierAddes";
import CallingReport from "../../Pages/CallingReport";

const AnalyticsReport = () => {
const [activeTab, setActiveTab] = useState("Revenue");

  return (
    <>
   <div className="p-6">
      {/* Tabs */}
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Conditional Tab Rendering */}
      {activeTab === "Revenue" && <Revenue />}
      {activeTab === "Calling Reports" && <CustomerAdded />}
      {activeTab === "Customer Added" && <CallingReport />}
      {activeTab === "Carrier Added" && <CarrierAdded />}
    </div>
         
         {/* <AgentView/> */}
</>


  );
};

export default AnalyticsReport;
