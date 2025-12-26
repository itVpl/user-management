import React, { useState, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  X,
  Calendar,
  ChevronDown,
  Trash2,
  Plus,
  Package,
  User,
  FileText,
  ExternalLink,
  CreditCard,
} from "lucide-react";


import API_CONFIG from '../../config/api';

// API Service
const expenseAPI = {
  baseURL: `${API_CONFIG.BASE_URL}/api/v1/expenses`,


  // Helper function to get auth headers
  getHeaders() {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  },


  // Get all expenses
  async getAllExpenses(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await fetch(
        `${this.baseURL}${queryParams ? `?${queryParams}` : ""}`,
        {
          headers: this.getHeaders(),
        }
      );
     
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return await response.json();
    } catch (error) {
      console.error("Error fetching expenses:", error);
      throw error;
    }
  },


  // Create expense
  async createExpense(expenseData) {
    try {
      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(expenseData),
      });
     
      if (!response.ok) throw new Error("Failed to create expense");
      return await response.json();
    } catch (error) {
      console.error("Error creating expense:", error);
      throw error;
    }
  },


  // Update expense
  async updateExpense(id, expenseData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(expenseData),
      });
     
      if (!response.ok) throw new Error("Failed to update expense");
      return await response.json();
    } catch (error) {
      console.error("Error updating expense:", error);
      throw error;
    }
  },


  // Delete expense
  async deleteExpense(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });
     
      if (!response.ok) throw new Error("Failed to delete expense");
      return await response.json();
    } catch (error) {
      console.error("Error deleting expense:", error);
      throw error;
    }
  },


  // Mark as payment
  async markAsPayment(id, paymentData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}/mark-as-payment`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(paymentData),
      });
     
      if (!response.ok) throw new Error("Failed to mark as payment");
      return await response.json();
    } catch (error) {
      console.error("Error marking as payment:", error);
      throw error;
    }
  },
};


// Utility function to transform API data to frontend format
const transformExpenseFromAPI = (apiExpense) => {
  // For single item expenses
  if (apiExpense.items && apiExpense.items.length === 1) {
    const item = apiExpense.items[0];
    return {
      _id: apiExpense._id,
      date: item.date.split('T')[0],
      itemName: item.itemName,
      totalAmount: item.totalAmount,
      status: apiExpense.status === 'paid' ? 'Paid' :
              apiExpense.status === 'draft' ? 'Due' :
              apiExpense.payment?.isPayment ? 'Partial' : 'Due',
      createdBy: apiExpense.createdBy?.employeeName || 'Unknown',
      paymentAddedBy: apiExpense.payment?.markedAsPaymentBy?.employeeName || 'N/A',
      paid: apiExpense.payment?.isPayment ? item.totalAmount : 0,
      due: apiExpense.payment?.isPayment ? 0 : item.totalAmount,
      documents: apiExpense.documents || [],
      attachment: apiExpense.payment?.attachment || '',
      expenseTitle: apiExpense.expenseTitle,
      notes: apiExpense.notes,
      apiData: apiExpense
    };
  }
 
  // For multiple items, use aggregate data
  return {
    _id: apiExpense._id,
    date: apiExpense.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
    itemName: apiExpense.items?.[0]?.itemName || apiExpense.expenseTitle || 'Expense',
    totalAmount: apiExpense.totalAmount,
    status: apiExpense.status === 'paid' ? 'Paid' :
            apiExpense.status === 'draft' ? 'Due' :
            apiExpense.payment?.isPayment ? 'Partial' : 'Due',
    createdBy: apiExpense.createdBy?.employeeName || 'Unknown',
    paymentAddedBy: apiExpense.payment?.markedAsPaymentBy?.employeeName || 'N/A',
    paid: apiExpense.payment?.isPayment ? apiExpense.totalAmount : 0,
    due: apiExpense.payment?.isPayment ? 0 : apiExpense.totalAmount,
    documents: apiExpense.documents || [],
    attachment: apiExpense.payment?.attachment || '',
    expenseTitle: apiExpense.expenseTitle,
    notes: apiExpense.notes,
    apiData: apiExpense
  };
};


// Utility function to transform frontend data to API format
const transformExpenseToAPI = (frontendExpense, isNew = false) => {
  if (isNew) {
    return {
      expenseTitle: frontendExpense.expenseTitle || `Expense - ${new Date().toLocaleDateString()}`,
      items: frontendExpense.items.map(item => ({
        itemName: item.itemName,
        date: item.date,
        totalAmount: parseFloat(item.totalAmount) || 0
      })),
      notes: frontendExpense.notes || ""
    };
  }


  return {
    expenseTitle: frontendExpense.expenseTitle,
    items: [{
      itemName: frontendExpense.itemName,
      date: frontendExpense.date,
      totalAmount: parseFloat(frontendExpense.totalAmount) || 0
    }],
    status: frontendExpense.due === 0 ? 'paid' :
            frontendExpense.paid > 0 ? 'submitted' : 'draft',
    notes: frontendExpense.notes || ""
  };
};




const EditExpenseModal = ({ expense, onEdit, onClose }) => {
  const [formData, setFormData] = useState({
    _id: expense._id,
    date: expense.date,
    itemName: expense.itemName,
    totalAmount: expense.totalAmount.toString(),
    paid: expense.paid.toString(),
    due: expense.due.toString(),
    createdBy: expense.createdBy,
    paymentAddedBy: expense.paymentAddedBy,
    expenseTitle: expense.expenseTitle,
    notes: expense.notes || ""
  });


  const [loading, setLoading] = useState(false);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const calculateDue = (total, paid) => {
    const totalNum = parseFloat(total.toString().replace(/,/g, "")) || 0;
    const paidNum = parseFloat(paid.toString().replace(/,/g, "")) || 0;
    return Math.max(0, (totalNum - paidNum)).toFixed(2);
  };


  const handleTotalAmountChange = (e) => {
    const { value } = e.target;
    const newPaid = formData.paid;
    const newDue = calculateDue(value, newPaid);


    setFormData((prev) => ({
      ...prev,
      totalAmount: value,
      due: newDue,
    }));
  };


  const handlePaidChange = (e) => {
    const { value } = e.target;
    const newTotal = formData.totalAmount;
    const newDue = calculateDue(newTotal, value);


    setFormData((prev) => ({
      ...prev,
      paid: value,
      due: newDue,
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);


    const total = parseFloat(formData.totalAmount.toString().replace(/,/g, "")) || 0;
    const paid = parseFloat(formData.paid.toString().replace(/,/g, "")) || 0;


    if (paid > total) {
      alert("Paid amount cannot be greater than Total Amount.");
      setLoading(false);
      return;
    }


    try {
      const updatedExpense = {
        ...expense,
        _id: formData._id,
        date: formData.date,
        itemName: formData.itemName,
        totalAmount: total,
        paid: paid,
        due: total - paid,
        status: total - paid === 0 ? "Paid" : paid > 0 ? "Partial" : "Due",
        expenseTitle: formData.expenseTitle,
        notes: formData.notes
      };


      const apiData = transformExpenseToAPI(updatedExpense);
      await expenseAPI.updateExpense(expense._id, apiData);
     
      onEdit(updatedExpense);
    } catch (error) {
      alert("Error updating expense: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 p-6 relative rounded-t-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <Package className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Edit Expense Item Details
          </h1>
          <p className="text-white/90 text-sm">{expense.itemName}</p>
        </div>
      </div>


      {/* Form Content */}
      <div className="p-8 bg-white rounded-b-2xl">
        {/* Expense Entry Details Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-blue-600">
              Expense Entry Details
            </h2>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Expense Title */}
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">
                Expense Title *
              </label>
              <input
                type="text"
                name="expenseTitle"
                value={formData.expenseTitle}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>


            {/* Date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date *</label>
              <div className="relative">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>


            {/* Item Name - CHANGED: Dropdown से Text Input में */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter item name"
              />
            </div>


            {/* Created By */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Created by
              </label>
              <input
                type="text"
                value={formData.createdBy}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 outline-none"
              />
            </div>


            {/* Payment Added By */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Payment Added by*
              </label>
              <input
                type="text"
                value={formData.paymentAddedBy}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 outline-none"
              />
            </div>


            {/* Paid */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Paid *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                <input
                  type="number"
                  name="paid"
                  value={formData.paid}
                  onChange={handlePaidChange}
                  required
                  step="0.01"
                  className="w-full pl-6 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-green-700 font-semibold"
                />
              </div>
            </div>


            {/* Due */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Due *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                <input
                  type="text"
                  name="due"
                  value={parseFloat(formData.due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  readOnly
                  className="w-full pl-6 pr-4 py-2 border border-gray-300 rounded-xl bg-red-50 text-red-600 font-semibold outline-none"
                />
              </div>
            </div>


            {/* Total Amount */}
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">
                Total Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                <input
                  type="number"
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleTotalAmountChange}
                  required
                  step="0.01"
                  className="w-full pl-6 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-blue-700 font-bold text-lg"
                />
              </div>
            </div>


            {/* Notes */}
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>


        {/* Document Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-purple-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">
              Documents
            </h2>
          </div>


          {expense.documents && expense.documents.length > 0 ? (
            <div className="space-y-2">
              {expense.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{doc.name || `Document ${index + 1}`}</span>
                  <button type="button" className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No documents uploaded.
            </p>
          )}
        </div>


        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Saving..." : "Save Changes"}
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          </button>
        </div>
      </div>
    </form>
  );
};


/* 💰 Show Payment Details Modal Component */
const ShowPaymentDetailsModal = ({ expense, onClose }) => {
  const [personName, setPersonName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);


  const handleConfirm = async () => {
    if (!personName || !paymentMethod) {
      alert("Please fill in Person Name and select a Payment Method.");
      return;
    }


    setLoading(true);
    try {
      const paymentData = {
        paymentPerson: personName,
        paymentType: paymentMethod.toLowerCase().replace(' ', '_'),
        attachment: ""
      };


      await expenseAPI.markAsPayment(expense._id, paymentData);
      alert("Payment marked successfully!");
      onClose();
    } catch (error) {
      alert("Error marking payment: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 p-6 relative rounded-t-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <CreditCard className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Add Payment Details
          </h1>
          <p className="text-white/90 text-sm">
            Please provide the payment details below for {expense.itemName}
          </p>
        </div>
      </div>


      {/* Form Content */}
      <div className="p-8 bg-white rounded-b-2xl">
        {/* Payment Details Section */}
        <h3 className="text-xl font-semibold text-blue-600 mb-6 border-b pb-3 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Details
        </h3>


        <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mb-8">
          {/* Person Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Person Name *
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Enter Your Name..."
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>


          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <div className="relative">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Select Option</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>


        {/* Uploaded Document Section */}
        <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Uploaded Document
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
          {expense.documents && expense.documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {expense.documents.map((doc, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-2 px-4 text-gray-600 font-medium w-12">
                        {index + 1}
                      </td>
                      <td className="py-2 px-4">
                        <span className="text-gray-800 text-sm">
                          {doc.name || `Document ${index + 1}`}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-2">
              No documents associated with this expense.
            </p>
          )}


          {expense.attachment && (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
              >
                <ExternalLink size={16} />
                View Full Size
              </button>
              <p className="text-xs text-gray-500">{expense.attachment}</p>
            </div>
          )}
        </div>


        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Processing..." : "Confirm Payment"}
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          </button>
        </div>
      </div>
    </div>
  );
};


/* 🗑️ Delete Expense Modal Component */
const DeleteExpenseModal = ({ expense, onDelete, onClose }) => {
  const [loading, setLoading] = useState(false);


  const handleDelete = async () => {
    setLoading(true);
    try {
      await expenseAPI.deleteExpense(expense._id);
      onDelete(expense._id);
    } catch (error) {
      alert("Error deleting expense: " + error.message);
      setLoading(false);
    }
  };


  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 p-6 relative rounded-t-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <Trash2 className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Delete Expense Item</h1>
          <p className="text-white/90 text-sm">{expense.itemName}</p>
        </div>
      </div>


      {/* Content */}
      <div className="p-8 bg-white rounded-b-2xl">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-blue-600">
              Expense Entry Details
            </h2>
          </div>


          <p className="text-red-600 font-semibold mb-4">
            Are you sure you want to delete this expense? This action cannot be
            undone.
          </p>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Date *</p>
              <p className="font-semibold text-gray-800">
                {new Date(expense.date).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Item Name *</p>
              <p className="font-semibold text-gray-800">{expense.itemName}</p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Created by *</p>
              <p className="font-semibold text-gray-800">{expense.createdBy}</p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Amount *</p>
              <p className="font-bold text-lg text-blue-600">
                ₹{expense.totalAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Paid</p>
              <p className="font-bold text-green-600">
                ₹{expense.paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Due</p>
              <p className="font-bold text-orange-600">
                ₹{expense.due.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Deleting..." : "Delete"}
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          </button>
        </div>
      </div>
    </div>
  );
};


/* ✅ View Expense Modal Component */
const ViewExpenseModal = ({ expense }) => {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 p-6 relative rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <Package className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Expense Item Details
            </h1>
            <p className="text-white/90 text-sm">{expense.itemName}</p>
          </div>
        </div>
      </div>


      {/* Content */}
      <div className="p-6">
        {/* Expense Entry Details Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-blue-600">
              Expense Entry Details
            </h2>
          </div>


          <div className="grid grid-cols-3 md:grid-cols-3 gap-6">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="font-semibold text-gray-800">
                  {new Date(expense.date).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>


            {/* Item Name */}
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Package className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Item Name</p>
                <p className="font-semibold text-gray-800">
                  {expense.itemName}
                </p>
              </div>
            </div>


            {/* Created By */}
            <div className="flex items-start gap-3">
              <div className="bg-pink-100 p-2 rounded-lg">
                <User className="text-pink-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Created by</p>
                <p className="font-semibold text-gray-800">
                  {expense.createdBy}
                </p>
              </div>
            </div>


            {/* Payment Added By */}
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <User className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Payment Added by*
                </p>
                <p className="font-semibold text-gray-800">
                  {expense.paymentAddedBy}
                </p>
              </div>
            </div>


            {/* Paid */}
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">P</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Paid</p>
                <p className="font-semibold text-gray-800">
                  ₹
                  {expense.paid.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>


            {/* Due */}
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">D</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Due</p>
                <p className="font-semibold text-gray-800">
                  ₹
                  {expense.due.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>


            {/* Total Amount */}
            <div className="flex items-start gap-3 md:col-span-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">T</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                <p className="font-semibold text-gray-800 text-lg">
                  ₹
                  {expense.totalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>


            {/* Notes */}
            {expense.notes && (
              <div className="flex items-start gap-3 md:col-span-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <FileText className="text-gray-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="font-semibold text-gray-800">
                    {expense.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Uploaded Document Section */}
        {expense.documents && expense.documents.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-purple-600" size={20} />
              <h2 className="text-lg font-semibold text-gray-800">
                Uploaded Document
              </h2>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {expense.documents.map((doc, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-600 font-medium w-12">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-800">
                          {doc.name || `Document ${index + 1}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


            {expense.attachment && (
              <div className="mt-4 flex items-center justify-between">
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                  <ExternalLink size={16} />
                  View Full Size
                </button>
                <p className="text-xs text-gray-500">{expense.attachment}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


/* ✅ Add Expense Form Component */
const AddExpenseForm = ({ onAdd, onClose }) => {
  const [rows, setRows] = useState([
    {
      id: 1,
      date: new Date().toISOString().substring(0, 10),
      itemName: "",
      totalAmount: "",
    },
  ]);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);


  const addNewRow = () => {
    const newRow = {
      id: Date.now(),
      date: new Date().toISOString().substring(0, 10),
      itemName: "",
      totalAmount: "",
    };
    setRows([...rows, newRow]);
  };


  const deleteRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };


  const updateRow = (id, field, value) => {
    setRows(
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };


  const handleSubmit = async () => {
    const isValid = rows.every((row) => row.itemName && row.totalAmount) && expenseTitle;


    if (!isValid) {
      alert("Please fill all required fields including expense title");
      return;
    }


    setLoading(true);
    try {
      const expenseData = {
        expenseTitle: expenseTitle,
        items: rows.map((row) => ({
          itemName: row.itemName,
          date: row.date,
          totalAmount: parseFloat(row.totalAmount.replace(/,/g, "")) || 0,
        })),
        notes: notes,
      };


      const response = await expenseAPI.createExpense(expenseData);
     
      // Transform the API response to frontend format
      const newExpenses = response.data.expense.items.map(item => ({
        _id: item._id,
        date: item.date.split('T')[0],
        itemName: item.itemName,
        totalAmount: item.totalAmount,
        status: 'Due',
        createdBy: response.data.expense.createdBy?.employeeName || 'Current User',
        paymentAddedBy: 'N/A',
        paid: 0,
        due: item.totalAmount,
        documents: [],
        attachment: "",
        expenseTitle: response.data.expense.expenseTitle,
        notes: response.data.expense.notes
      }));


      onAdd(newExpenses);
    } catch (error) {
      alert("Error creating expense: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 p-6 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Add New Expense Item
              </h2>
              <p className="text-white/90 text-sm">
                Please fill in the expense item details below
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Form Content */}
      <div className="p-8 bg-white rounded-b-2xl">
        <h3 className="text-2xl font-semibold text-blue-600 mb-8 border-b pb-3">
          Expense Information
        </h3>


        {/* Expense Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expense Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            placeholder="Enter expense title..."
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>


        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 items-end"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(row.id, "date", e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>


           <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Item Name <span className="text-red-500">*</span>
  </label>


  <input
    type="text"
    value={row.itemName}
    onChange={(e) => updateRow(row.id, "itemName", e.target.value)}
    required
    placeholder="Enter Item Name"
    className="w-full px-4 py-3 border border-gray-300 rounded-xl
               focus:ring-2 focus:ring-blue-500 focus:border-transparent
               outline-none"
  />
</div>




              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={row.totalAmount}
                    onChange={(e) =>
                      updateRow(row.id, "totalAmount", e.target.value)
                    }
                    placeholder="0.00"
                    required
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>


              <div className="flex items-end justify-end md:justify-start">
                <button
                  type="button"
                  onClick={() => deleteRow(row.id)}
                  disabled={rows.length <= 1}
                  className={`w-11 h-11 flex items-center justify-center text-red-500 bg-red-50 rounded-xl transition-all duration-200 ${
                    rows.length > 1
                      ? "hover:bg-red-100"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <Trash2 className="w-7 h-7" />
                </button>
              </div>
            </div>
          ))}


          <div className="flex justify-center items-center py-4">
            <button
              type="button"
              onClick={addNewRow}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add New Item
            </button>
          </div>


          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Additional notes..."
            />
          </div>


          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-8 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Adding..." : "Add Expense"}
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- START: Main OfficeExpenses Component ---


const OfficeExpenses = () => {
  const [search, setSearch] = useState("");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [modalType, setModalType] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Fetch expenses on component mount
  useEffect(() => {
    fetchExpenses();
  }, []);


  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await expenseAPI.getAllExpenses({
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
     
      if (response.success) {
        const transformedExpenses = response.data.expenses.map(transformExpenseFromAPI);
        setExpenses(transformedExpenses);
      } else {
        throw new Error(response.message || "Failed to fetch expenses");
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setError(error.message);
      // No fallback data - empty array
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };


  const filteredExpenses = expenses.filter((item) =>
    item.itemName.toLowerCase().includes(search.toLowerCase()) ||
    (item.expenseTitle && item.expenseTitle.toLowerCase().includes(search.toLowerCase()))
  );


  const totalExpense = expenses.reduce(
    (acc, item) => acc + item.totalAmount,
    0
  );


  const handleModalOpen = (type, expense = null) => {
    setSelectedExpense(expense);
    setModalType(type);
    setActiveDropdown(null);
  };


  const handleModalClose = () => {
    setModalType("");
    setSelectedExpense(null);
    if (modalType !== "view") {
      fetchExpenses();
    }
  };


  const handleDelete = async (id) => {
    try {
      await expenseAPI.deleteExpense(id);
      setExpenses(expenses.filter((e) => e._id !== id));
      handleModalClose();
    } catch (error) {
      alert("Error deleting expense: " + error.message);
    }
  };


  const handleAddExpense = (newExpenses) => {
    setExpenses([...expenses, ...newExpenses]);
    handleModalClose();
  };


  const handleEditExpense = (updatedExpense) => {
    setExpenses(
      expenses.map((exp) =>
        exp._id === updatedExpense._id ? updatedExpense : exp
      )
    );
    handleModalClose();
  };


  const toggleDropdown = (expenseId, e) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === expenseId ? null : expenseId);
  };


  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };


    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);


  if (loading) {
    return (
      <div className="bg-[#EEF3FA] min-h-screen p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-[#EEF3FA] min-h-screen p-6">
      {/* Header Section */}
      <div className="flex flex-row lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        {/* Left Side: Total Expense Card */}
        <div className="bg-white shadow-md p-4 rounded-2xl flex items-center gap-3 min-w-[220px] w-[150px] lg:w-auto">
          <div className="bg-green-100 p-2 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="green"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3v1M21 3v1M3 21v-1M21 21v-1M4 4h16v16H4V4z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Expense</p>
            <p className="text-lg font-semibold text-green-600">
              ₹{totalExpense.toLocaleString()}
            </p>
          </div>
        </div>


        {/* Right Side: Search + Add Expense */}
        <div className="flex flex-row sm:flex-row items-end gap-3 ">
          <div className="relative flex items-center bg-white rounded-xl shadow-sm w-[300px] sm:w-[300px]">
            <FiSearch className="absolute left-3 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search by item name or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl w-full focus:outline-none"
            />
          </div>
          <button
            onClick={() => handleModalOpen("add")}
            className="bg-[#2E90FA] text-white px-5 py-2 rounded-xl shadow hover:bg-[#2573c8] transition w-[200px] sm:w-auto"
          >
            + Add Expense Item
          </button>
        </div>
      </div>


      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p>Error loading expenses: {error}</p>
          <button
            onClick={fetchExpenses}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}


      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow p-4 overflow-x-auto">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {expenses.length === 0 ? (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No expenses found</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first expense item.</p>
                <button
                  onClick={() => handleModalOpen("add")}
                  className="bg-[#2E90FA] text-white px-6 py-2 rounded-xl shadow hover:bg-[#2573c8] transition"
                >
                  + Add Your First Expense
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiSearch className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">No matching expenses</h3>
                <p className="text-gray-500">Try changing your search query.</p>
              </>
            )}
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="text-gray-600 border-b">
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-left py-3 px-4 font-semibold">Item Name</th>
                <th className="text-left py-3 px-4 font-semibold">Title</th>
                <th className="text-left py-3 px-4 font-semibold">
                  Total Amount
                </th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr
                  key={exp._id}
                  className="border-b hover:bg-gray-50 transition-all"
                >
                  <td className="py-3 px-4">
                    {new Date(exp.date).toLocaleDateString("en-GB")}
                  </td>
                  <td className="py-3 px-4">{exp.itemName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {exp.expenseTitle}
                  </td>
                  <td className="py-3 px-4 text-green-600 font-semibold">
                    ₹{exp.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        exp.status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : exp.status === "Partial"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      • {exp.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex items-center gap-3 relative">
                    <button
                      onClick={() => handleModalOpen("payment", exp)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-200"
                    >
                      Add Payment Details
                    </button>


                    {/* Fixed Dropdown Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => toggleDropdown(exp._id, e)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <BsThreeDotsVertical className="text-gray-600" />
                      </button>
                     
                      {activeDropdown === exp._id && (
                        <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg w-32 z-50">
                          <button
                            onClick={() => handleModalOpen("view", exp)}
                            className="block w-full text-left px-4 py-2 hover:bg-blue-500 hover:text-white rounded-t-lg text-sm transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleModalOpen("edit", exp)}
                            className="block w-full text-left px-4 py-2 hover:bg-blue-500 hover:text-white text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleModalOpen("delete", exp)}
                            className="block w-full text-left px-4 py-2 hover:bg-blue-500 hover:text-white rounded-b-lg text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>


      {/* ✅ Modals */}
      {modalType && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleModalClose}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center text-gray-800 bg-white/50 rounded-full p-2 transition hover:bg-white/80"
              style={{
                top: "1rem",
                right: "1rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <X className="w-5 h-5" />
            </button>


            {modalType === "add" && (
              <AddExpenseForm onAdd={handleAddExpense} onClose={handleModalClose} />
            )}


            {modalType === "view" && selectedExpense && (
              <ViewExpenseModal expense={selectedExpense} />
            )}


            {modalType === "edit" && selectedExpense && (
              <EditExpenseModal
                expense={selectedExpense}
                onEdit={handleEditExpense}
                onClose={handleModalClose}
              />
            )}


            {modalType === "delete" && selectedExpense && (
              <DeleteExpenseModal
                expense={selectedExpense}
                onDelete={handleDelete}
                onClose={handleModalClose}
              />
            )}
           
            {modalType === "payment" && selectedExpense && (
              <ShowPaymentDetailsModal
                expense={selectedExpense}
                onClose={handleModalClose}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default OfficeExpenses;



