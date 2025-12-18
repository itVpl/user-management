import React, { useEffect, useState } from "react";
import { FaCalendarAlt, FaArrowLeft } from "react-icons/fa";
import axios from "axios";

export default function HrCreateTask() {
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Low",
    assignedTo: "",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(
        "https://vpl-liveproject-1.onrender.com/api/v1/dailytask/my",
        { withCredentials: true }
      );
      setTasks(res.data.tasks || []);

    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  };

  const handleCreateTask = () => setShowForm(true);
  const handleCancel = () => setShowForm(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePrioritySelect = (priority) => {
    setFormData((prev) => ({
      ...prev,
      priority,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/dailytask/assign",
        formData,
        { withCredentials: true }
      );
      alert("Task Assigned Successfully!");
      setShowForm(false);
      setFormData({
        title: "",
        description: "",
        dueDate: "",
        priority: "Low",
        assignedTo: "",
      });
      fetchTasks();
    } catch (error) {
      console.error("Error assigning task:", error);
      alert("Failed to assign task");
    }
  };

  return (
    <div className="p-4">
      {!showForm ? (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-end gap-2 mb-4">
            <button className="bg-blue-500 text-white px-4 py-2 rounded">
              Overdue
            </button>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleCreateTask}
            >
              +Create Task
            </button>
          </div>

          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {[
                  "Task Title",
                  "Date",
                  "Description",
                  "Status",
                  "Priority",
                  "Assignee",
                  "Created by",
                  "Deadline",
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-blue-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr
                  key={idx}
                  className={
                    task.status === "Completed"
                      ? "line-through text-gray-400"
                      : ""
                  }
                >
                  <td className="px-4 py-2">{task.title}</td>
                  <td className="px-4 py-2">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{task.description}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-white text-xs font-medium ${
                        task.status === "Pending"
                          ? "bg-yellow-400 text-black"
                          : task.status === "Overdue"
                          ? "bg-red-600"
                          : "bg-green-600"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        task.priority === "High"
                          ? "bg-red-200 text-red-900"
                          : task.priority === "Medium"
                          ? "bg-pink-100 text-pink-900"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2">{task.assignedTo}</td>
                  <td className="px-4 py-2">{task.createdBy}</td>
                  <td className="px-4 py-2">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex justify-center items-center min-h-screen bg-white">
          <div className="w-full max-w-3xl rounded-3xl shadow-lg bg-white p-6">
            <button
              className="mb-4 text-xl text-gray-700 hover:text-black"
              onClick={handleCancel}
            >
              <FaArrowLeft />
            </button>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                placeholder="Head of Task"
                className="w-full border px-4 py-2 rounded"
                required
              />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Task Details"
                className="w-full border px-4 py-2 rounded h-32"
                required
              />
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleFormChange}
                  className="flex-1 border px-4 py-2 rounded"
                  required
                />
                <FaCalendarAlt className="text-blue-500" />
              </div>

              <div className="flex gap-2">
                {["Low", "Medium", "High"].map((level) => (
                  <span
                    key={level}
                    className={`px-4 py-2 rounded cursor-pointer ${
                      formData.priority === level
                        ? "bg-blue-500 text-white"
                        : level === "High"
                        ? "bg-red-400 text-white"
                        : level === "Medium"
                        ? "bg-pink-200"
                        : "bg-gray-200"
                    }`}
                    onClick={() => handlePrioritySelect(level)}
                  >
                    {level}
                  </span>
                ))}
              </div>

              <input
                type="text"
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleFormChange}
                placeholder="Employee Name"
                className="w-full border px-4 py-2 rounded"
                required
              />

              <div className="flex justify-end gap-4 mt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-6 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
