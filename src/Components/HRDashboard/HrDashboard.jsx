import React, { useEffect, useState } from "react";
import axios from "axios";

// Use token from sessionStorage
axios.defaults.headers.common["Authorization"] = `Bearer ${sessionStorage.getItem("authToken")}`;

const Card = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow p-4 flex flex-col">
    <div>
         <h1 className="text-lg font-bold text-gray-800 mb-2">{title}</h1>
    </div>
    <div>
 {children}
    </div>
   
  </div>
);

const CircleIndicator = ({ percentage, color }) => (
  <div className="relative w-24 h-24">
    <svg className="absolute top-0 left-0 w-full h-full">
      <circle cx="48" cy="48" r="40" strokeWidth="10" fill="none" stroke="#e5e7eb" />
      <circle
        cx="48"
        cy="48"
        r="40"
        strokeWidth="10"
        fill="none"
        stroke={color}
        strokeDasharray={251.2}
        strokeDashoffset={251.2 - (251.2 * percentage) / 100}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
      />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-700">
      {percentage}%
    </div>
  </div>
);

const HRDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, onLeave: 0 });
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [hygienePercentage, setHygienePercentage] = useState(0);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser");
        const empData = empRes.data?.employees || [];
        setEmployees(empData);

        try {
          const leaveRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/leave/all");
          const leaveData = Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data.leaves || [];
          setLeaves(leaveData);
        } catch (err) {
          console.error("Leave API error:", err.response?.data || err.message);
          setLeaves([]);
        }

        const today = new Date().toISOString().split("T")[0];
        await axios.get(`https://vpl-liveproject-1.onrender.com/api/v1/attendance/my?date=${today}`);
        setAttendance({ present: 30, absent: 3, onLeave: 2 });

        const notVerified = empData.filter(e => !e.docVerified);
        setPendingVerifications(notVerified.length);

        const taskRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/dailytask/assign");
        setTasks(taskRes.data.task || []);

        const breakRes = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/break/my-history");
        const lateBreaks = breakRes.data.filter(b =>
          b.duration && parseInt(b.duration.split(":"[0])) > 1
        );
        const hygieneScore = empData.length
          ? Math.round(((empData.length - lateBreaks.length) / empData.length) * 100)
          : 0;
        setHygienePercentage(hygieneScore);

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      }
    };
    fetchData();
  }, []);

  const total = employees.length;
  const active = employees.filter(e => e.status === "active").length;
  const notice = employees.filter(e => e.status === "notice").length;
  const exited = employees.filter(e => e.status === "exited").length;
  const newJoiners = employees.filter(e => e.joiningStatus === "new").length;

  const totalAttendance = attendance.present + attendance.absent + attendance.onLeave;
  const attendancePercentage = totalAttendance ? Math.round((attendance.present / totalAttendance) * 100) : 0;

  return (
    <div className="grid md:grid-cols-3 gap-6 p-6 bg-gray-100 min-h-screen  ">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
      <Card title="Total Employees">
 
        <div className="justify-center items-center  mt-10">
            
        <div className="flex justify-between text-sm text-gray-600 mt-2"><span>Total</span><span>{total}</span></div>
        <div className="flex justify-between text-sm text-gray-600 mt-2"><span>Active</span><span>{active}</span></div>
        <div className="flex justify-between text-sm text-gray-600 mt-2"><span>On-Notice</span><span>{notice}</span></div>
        <div className="flex justify-between text-sm text-gray-600 mt-2"><span>Exited</span><span>{exited}</span></div>
        </div>
  
      </Card>
        </div>


      <Card title="New Joiners">
     
        <div className="flex justify-between items-center mt-6">
          <div><span className="text-3xl font-bold text-gray-800">{newJoiners}</span>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-500 text-xl">⚙️</span>
          </div>
        </div>
        <div >
           <h1></h1> 
        </div>


        
      </Card>

      <Card title="Leave Request">
        <table className="text-xs w-full">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left p-1">Employee ID</th>
              <th className="text-left p-1">Name</th>
              <th className="text-left p-1">Type</th>
              <th className="text-left p-1">Duration</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((entry, idx) => (
              <tr key={idx} className="border-b text-gray-600">
                <td className="p-1">{entry.empId}</td>
                <td className="p-1">{entry.name}</td>
                <td className="p-1">{entry.type}</td>
                <td className="p-1">{entry.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
            <div >
           <h1></h1> 
        </div>
        <button className="mt-2 text-sm text-blue-600 hover:underline ">View all</button>
      </Card>

      <Card title="Today's Attendance">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600">Present: {attendance.present}</div>
            <div className="text-sm text-gray-600">Absent: {attendance.absent}</div>
            <div className="text-sm text-gray-600">On-Leave: {attendance.onLeave}</div>
          </div>
          <CircleIndicator percentage={attendancePercentage} color="#22c55e" />
          
        </div>
            <div >
           <h1></h1> 
        </div>
      </Card>

      <Card title="Pending Verification">
        <div className="flex justify-between items-center flex-col">
          {/* <div className="text-3xl font-bold text-gray-700">{pendingVerifications}</div> */}
          <CircleIndicator percentage={100} color="#22c55e" />
         
        </div>
        <button className="mt-2 text-sm text-blue-600 hover:underline cursor-pointer">View all</button>
            <div >
           <h1></h1> 
        </div>
      </Card>

      <Card title="Hygiene Compliance">
        <div className="flex justify-between items-center">
          <CircleIndicator percentage={hygienePercentage} color="#ef4444" />
          <div className="text-sm text-gray-600">Daily Hygiene Log</div>
        </div>

            <div >
           <h1></h1> 
        </div>
      </Card>

      {/* <Card title="Tasks">
        <div className="text-3xl font-bold text-gray-700">{tasks.length.toString().padStart(2, '0')}</div>
        <div className="text-sm text-gray-600 mt-2">
          {tasks.map((t, i) => (
            <div key={i}>{t.taskTitle || `Task ${i + 1}`}</div>
          ))}
        </div>
        <button className="mt-2 text-sm text-blue-600 hover:underline">View all</button>
      </Card> */}


    </div>
  );

    

};

export default HRDashboard;