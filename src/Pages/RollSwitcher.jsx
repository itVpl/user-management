import React from "react";

const RoleSwitcher = ({ activeRole, setActiveRole }) => {
  const roles = ["Agents", "Manager", "Team Leaders"];

  return (
    <div className="flex lg:w-1/4  w-full mt-6 bg-gradient-to-b from-blue-500 to-blue-700 rounded-xl text-white p-4 items-center gap-4">
      {roles.map((role) => (
        <button
          key={role}
          onClick={() => setActiveRole(role)}
          className={`px-4 py-2 m-[3px] rounded-full font-semibold w-[30%] ${
            activeRole === role
              ? "bg-white text-blue-700"
              : "bg-blue-400 text-white"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
};

export default RoleSwitcher;