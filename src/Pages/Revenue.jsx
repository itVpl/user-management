import React,{useState} from 'react'
import ManagerView from './ManagerView';
import TeamLeaderDashboard from './Teamlead';
import AgentView from './AgentView'; // ✅ import Agent View
import RoleSwitcher from './RollSwitcher';

function Revenue() {
     const [activeRole, setActiveRole] = useState("Agents");
  return (
    <div>
           {/* <AgentView /> */}
      <RoleSwitcher activeRole={activeRole} setActiveRole={setActiveRole} /> 
   
      {activeRole === "Manager" && (
              <div className="bg-white p-6 shadow rounded-xl mt-6">
                <ManagerView />
              </div>
            )}
      
            {activeRole === "Team Leaders" && (
              <div className="bg-white p-6 shadow rounded-xl mt-6">
                <TeamLeaderDashboard />
              </div>
            )}
      
            {activeRole === "Agents" && (
              <div className="bg-white p-6 shadow rounded-xl mt-6">
                <AgentView />
              </div>
            )}
       
    </div>
  )
}

export default Revenue
