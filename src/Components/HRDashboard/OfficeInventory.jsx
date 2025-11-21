import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, Building2, FileText, PlusCircle, X, Monitor, Printer, Search, ChevronDown } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const initialForm = {
  itemName: '',
  category: '',
  description: '',
  quantity: '',
  unit: '',
  purchaseDate: '',
  expiryDate: '',
  supplier: {
    name: '',
    contact: '',
    email: ''
  },
  cost: {
    perUnit: ''
  },
  location: '',
  minimumStock: '',
  notes: ''
};

const OfficeInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [todayStats, setTodayStats] = useState({ totalAdded: 0 });
  const [totalStats, setTotalStats] = useState({ totalItems: 0, assignedItems: 0, availableItems: 0 });
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [formValid, setFormValid] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [updateStockForm, setUpdateStockForm] = useState({
    quantity: '',
    action: 'add',
    notes: ''
  });
  const [updateStockLoading, setUpdateStockLoading] = useState(false);
  
  // Searchable dropdown states
  const [dropdownStates, setDropdownStates] = useState({
    category: { isOpen: false, searchTerm: '' },
    unit: { isOpen: false, searchTerm: '' }
  });

  useEffect(() => {
    fetchAllInventory();
    fetchTodayStats();
  }, []);

  useEffect(() => {
    setFormValid(validateForm(formData));
  }, [formData]);

  const validateForm = (data) => {
    return (
      data.itemName.trim() !== '' &&
      data.category.trim() !== '' &&
      data.description.trim() !== '' &&
      data.quantity.trim() !== '' &&
      data.unit.trim() !== '' &&
      data.purchaseDate.trim() !== '' &&
      data.location.trim() !== '' &&
      data.supplier.name.trim() !== '' &&
      data.supplier.contact.trim() !== '' &&
      data.supplier.email.trim() !== '' &&
      data.cost.perUnit.trim() !== '' &&
      data.minimumStock.trim() !== ''
    );
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let errorMsg = '';

    if (value.trim() === '') {
      errorMsg = 'This field is required';
    } else if (name === 'quantity' && (isNaN(value) || parseInt(value) <= 0)) {
      errorMsg = 'Quantity must be a positive number';
    } else if (name === 'minimumStock' && (isNaN(value) || parseInt(value) <= 0)) {
      errorMsg = 'Minimum stock must be a positive number';
    } else if (name === 'cost.perUnit' && (isNaN(value) || parseFloat(value) <= 0)) {
      errorMsg = 'Cost per unit must be a positive number';
    } else if (name === 'supplier.contact' && !/^[0-9]{10}$/.test(value)) {
      errorMsg = 'Contact must be 10 digits';
    } else if (name === 'supplier.email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errorMsg = 'Invalid email format';
    }

    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  // Searchable dropdown functions
  const toggleDropdown = (fieldName) => {
    setDropdownStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isOpen: !prev[fieldName].isOpen,
        searchTerm: ''
      }
    }));
  };

  const handleDropdownSearch = (fieldName, searchTerm) => {
    setDropdownStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        searchTerm
      }
    }));
  };

  const selectOption = (fieldName, value, label) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setDropdownStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isOpen: false,
        searchTerm: ''
      }
    }));
  };

  const renderSearchableSelect = (name, placeholder, options, icon = null, label = null) => {
    const isOpen = dropdownStates[name]?.isOpen || false;
    const searchTerm = dropdownStates[name]?.searchTerm || '';
    
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(option => option.value === formData[name]);

    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">
            {icon}
          </div>
        )}
        
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => toggleDropdown(name)}
          className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-left ${
            icon ? 'pl-10' : ''
          } ${errors[name] ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''} ${
            isOpen ? 'border-blue-500' : ''
          }`}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => handleDropdownSearch(name, e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectOption(name, option.value, option.label)}
                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                      formData[name] === option.value ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {errors[name] && (
          <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors[name]}
          </p>
        )}
      </div>
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setDropdownStates(prev => ({
          category: { ...prev.category, isOpen: false, searchTerm: '' },
          unit: { ...prev.unit, isOpen: false, searchTerm: '' }
        }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllInventory = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/office-inventory/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setInventory(res.data.inventory || res.data.data || []);
        setTotalStats(res.data.statistics || {});
      }
    } catch (error) {
      console.error('❌ Error fetching inventory:', error);
      // For demo purposes, set mock data
      setInventory([
        {
          itemName: 'Blue Ballpoint Pens',
          category: 'stationery',
          description: 'High-quality blue ballpoint pens for office use',
          quantity: 100,
          unit: 'pieces',
          purchaseDate: '2024-01-15',
          expiryDate: '2026-12-31',
          supplier: {
            name: 'ABC Stationery',
            contact: '9876543210',
            email: 'abc@stationery.com'
          },
          cost: {
            perUnit: 5
          },
          location: 'Main Office - Stationery Cabinet',
          minimumStock: 20,
          notes: 'Preferred supplier for quality products'
        },
        {
          itemName: 'A4 Printer Paper',
          category: 'stationery',
          description: 'Premium A4 size printer paper',
          quantity: 500,
          unit: 'pieces',
          purchaseDate: '2024-01-10',
          expiryDate: '2027-12-31',
          supplier: {
            name: 'PaperCo Ltd',
            contact: '9876543211',
            email: 'info@paperco.com'
          },
          cost: {
            perUnit: 0.5
          },
          location: 'Storage Room A',
          minimumStock: 100,
          notes: 'Standard office paper'
        }
      ]);
      setTotalStats({ totalItems: 2, assignedItems: 0, availableItems: 2 });
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/office-inventory/today-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setTodayStats(res.data.todayStats || {});
      }
    } catch (error) {
      console.error("❌ Error fetching today's stats:", error);
      setTodayStats({ totalAdded: 0 });
    }
  };

  const handleOpen = () => setOpen(true);
     const handleClose = () => {
     setOpen(false);
     setFormData(initialForm);
     setErrors({});
   };

   const handleViewItem = async (item) => {
     try {
       setViewLoading(true);
       setSelectedItem(item);
       setViewModalOpen(true);
       
       // Fetch detailed item information from API
       const token = sessionStorage.getItem('token') || localStorage.getItem('authToken');
       const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/office-inventory/inventory/${item._id || item.id}`, {
         headers: { Authorization: `Bearer ${token}` },
       });
       
       if (res.data.success) {
         setSelectedItem(res.data.data);
       } else {
         toast.error('Failed to fetch item details');
       }
     } catch (error) {
       console.error('❌ Error fetching item details:', error);
       toast.error('Failed to fetch item details');
     } finally {
       setViewLoading(false);
     }
   };

       const handleCloseViewModal = () => {
      setViewModalOpen(false);
      setSelectedItem(null);
      setUpdateStockForm({
        quantity: '',
        action: 'add',
        notes: ''
      });
    };

    const handleUpdateStockChange = (e) => {
      const { name, value } = e.target;
      setUpdateStockForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateStock = async (e) => {
      e.preventDefault();
      
      if (!updateStockForm.quantity || updateStockForm.quantity <= 0) {
        toast.error('Please enter a valid quantity');
        return;
      }

      const token = sessionStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        toast.error('Token not found. Please login again.');
        return;
      }

      try {
        setUpdateStockLoading(true);
        
        const updateData = {
          quantity: parseInt(updateStockForm.quantity),
          action: updateStockForm.action,
          notes: updateStockForm.notes.trim() || null
        };

        console.log('🔄 Updating Stock:', updateData);

        const res = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/office-inventory/inventory/${selectedItem._id || selectedItem.id}/stock`,
          updateData,
          { 
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            } 
          }
        );

        if (res.data.success) {
          toast.success(`✅ Stock ${updateStockForm.action === 'add' ? 'added' : 'removed'} successfully!`);
          setUpdateStockForm({
            quantity: '',
            action: 'add',
            notes: ''
          });
          // Refresh the item details
          handleViewItem(selectedItem);
        } else {
          toast.error('❌ Failed: ' + (res.data.message || 'Unknown error'));
        }
      } catch (error) {
        console.error("❌ Error updating stock:", error?.response?.data || error.message);
        toast.error("❌ Failed: " + (error?.response?.data?.message || 'Unexpected error'));
      } finally {
        setUpdateStockLoading(false);
      }
    };

    // Function to format notes for display
    const formatNotes = (notes) => {
      if (!notes) return null;
      
      // If notes is a string, try to parse it as JSON or return as is
      if (typeof notes === 'string') {
        try {
          // Check if it contains timestamp patterns
          if (notes.includes('T') && notes.includes('Z')) {
            // Split by timestamps and format each part
            const parts = notes.split(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
            const formattedParts = [];
            
            for (let i = 0; i < parts.length; i += 2) {
              if (parts[i] && parts[i + 1]) {
                const text = parts[i].replace(/^:\s*/, '').trim();
                const timestamp = parts[i + 1];
                if (text) {
                  const date = new Date(timestamp);
                  const formattedDate = date.toLocaleString();
                  formattedParts.push(`${text} (${formattedDate})`);
                }
              }
            }
            
            return formattedParts.length > 0 ? formattedParts.join('\n') : notes;
          }
          
          // Try to parse as JSON
          const parsed = JSON.parse(notes);
          if (Array.isArray(parsed)) {
            return parsed.map(item => {
              if (typeof item === 'object' && item.timestamp && item.note) {
                const date = new Date(item.timestamp);
                return `${item.note} (${date.toLocaleString()})`;
              }
              return item;
            }).join('\n');
          }
          return parsed;
        } catch (e) {
          // If not JSON, return as is
          return notes;
        }
      }
      
      return notes;
    };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested object updates for supplier and cost
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formValid) {
      toast.error('Please fill all required fields correctly!');
      return;
    }

    const token = sessionStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      toast.error('Token not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare data according to the API structure
      const submitData = {
        itemName: formData.itemName.trim(),
        category: formData.category,
        description: formData.description.trim(),
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        purchaseDate: formData.purchaseDate,
        expiryDate: formData.expiryDate || null,
        supplier: {
          name: formData.supplier.name.trim(),
          contact: formData.supplier.contact.trim(),
          email: formData.supplier.email.trim()
        },
        cost: {
          perUnit: parseFloat(formData.cost.perUnit)
        },
        location: formData.location.trim(),
        minimumStock: parseInt(formData.minimumStock),
        notes: formData.notes.trim() || null
      };

      console.log('🚀 Submitting Inventory Data:', submitData);

      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/office-inventory/inventory`,
        submitData,
        { 
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          } 
        }
      );

      if (res.data.success) {
        toast.success('✅ Inventory item added successfully!');
        handleClose();
        fetchAllInventory();
        fetchTodayStats();
      } else {
        toast.error('❌ Failed: ' + (res.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error("❌ Error in Add Inventory:", error?.response?.data || error.message);
      toast.error("❌ Failed: " + (error?.response?.data?.message || 'Unexpected error'));
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (name, placeholder, type = 'text', icon = null, label = null) => (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      {icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
          icon ? 'pl-10' : ''
        } ${errors[name] ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
      />
      {errors[name] && (
        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errors[name]}
        </p>
      )}
    </div>
  );



  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Office Inventory...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
             {/* Top Stats */}
       <div className="flex gap-4 mb-6 flex-wrap items-center justify-between">
         <div className="flex gap-4 flex-wrap">
           <div className="bg-white w-[250px] shadow-md rounded-2xl px-4 py-3 flex items-center space-x-4">
             <div className="bg-green-100 p-2 rounded-lg">
               <Package className="w-6 h-6 text-green-600" />
             </div>
             <div>
               <h2 className="text-sm font-medium text-gray-600">Total Items</h2>
                               <p className="text-xl font-bold text-green-600">
                  {inventory.length}
                </p>
             </div>
           </div>
         </div>

        {/* Add Button */}
        <button
          onClick={handleOpen}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition flex items-center gap-2 mt-4 sm:mt-0"
        >
          <PlusCircle className="w-5 h-5" />
          Add Inventory Item
        </button>
      </div>

             {/* Table */}
       <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
               <tr>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Item Name</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Category</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Quantity</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Unit</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Location</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Supplier</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Cost/Unit</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Purchase Date</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Expiry Date</th>
                 <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
               </tr>
             </thead>
             <tbody>
               {inventory.map((item, index) => (
                 <tr key={index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700">{item.itemName}</span>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700 capitalize">{item.category}</span>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-mono text-base font-semibold text-gray-700">{item.quantity}</span>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700 capitalize">{item.unit}</span>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700">{item.location}</span>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700">{item.supplier?.name || 'N/A'}</span>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700">₹{item.cost?.perUnit || 'N/A'}</span>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700">
                       {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}
                     </span>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700">
                       {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                     </span>
                   </td>
                   <td className="py-2 px-3">
                     <div className="flex gap-2">
                       <button
                         onClick={() => handleViewItem(item)}
                         className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                       >
                         View
                       </button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
         {inventory.length === 0 && (
           <div className="text-center py-12">
             <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
             <p className="text-gray-500 text-lg">No inventory data available</p>
             <p className="text-gray-400 text-sm">Add your first inventory item to get started</p>
           </div>
         )}
       </div>

      {/* Enhanced Modal */}
      {open && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-transparent p-4"
          onClick={handleClose}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Package className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Add New Inventory Item</h2>
                    <p className="text-blue-100">Enter inventory item information below</p>
                  </div>
                </div>
                <button 
                  onClick={handleClose} 
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                    <input
                      type="text"
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter item name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    {renderSearchableSelect('category', 'Select Category', [
                      { value: 'stationery', label: 'Stationery' },
                      { value: 'cleaning', label: 'Cleaning' },
                      { value: 'electronics', label: 'Electronics' },
                      { value: 'furniture', label: 'Furniture' },
                      { value: 'kitchen', label: 'Kitchen' },
                      { value: 'other', label: 'Other' }
                    ])}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter description"
                    />
                  </div>
                </div>
              </div>

              {/* Quantity & Unit Details Section */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Quantity & Unit Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                    {renderSearchableSelect('unit', 'Select Unit', [
                      { value: 'pieces', label: 'Pieces' },
                      { value: 'boxes', label: 'Boxes' },
                      { value: 'packs', label: 'Packs' },
                      { value: 'bottles', label: 'Bottles' },
                      { value: 'liters', label: 'Liters' },
                      { value: 'kg', label: 'Kilograms' },
                      { value: 'units', label: 'Units' }
                    ])}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date *</label>
                    <input
                      type="date"
                      name="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Cost Section */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Location & Cost</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location/Storage *</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cost Per Unit (₹) *</label>
                    <input
                      type="number"
                      name="cost.perUnit"
                      value={formData.cost.perUnit}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter cost per unit"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Stock *</label>
                    <input
                      type="number"
                      name="minimumStock"
                      value={formData.minimumStock}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter minimum stock"
                    />
                  </div>
                </div>
              </div>

              {/* Important Dates Section */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">Important Dates</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Information Section */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-indigo-800 mb-4">Supplier Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name *</label>
                    <input
                      type="text"
                      name="supplier.name"
                      value={formData.supplier.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter supplier name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Contact *</label>
                    <input
                      type="tel"
                      name="supplier.contact"
                      value={formData.supplier.contact}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter 10-digit contact"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Email *</label>
                    <input
                      type="email"
                      name="supplier.email"
                      value={formData.supplier.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter supplier email"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Notes</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter additional notes"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className={`px-6 py-3 border border-gray-300 rounded-lg transition-colors ${loading
                      ? 'opacity-50 cursor-not-allowed text-gray-400'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formValid || loading}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors ${formValid && !loading
                      ? 'hover:from-blue-600 hover:to-blue-700'
                      : 'opacity-50 cursor-not-allowed'
                    }`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </div>
                  ) : (
                    'Add Inventory Item'
                  )}
                </button>
              </div>
            </form>
          </div>
                 </div>
       )}

       {/* View Item Modal */}
       {viewModalOpen && (
         <>
           {viewLoading && (
             <div 
               className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center"
               onClick={() => setViewLoading(false)}
             >
               <div 
                 className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4"
                 onClick={(e) => e.stopPropagation()}
               >
                 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-lg font-semibold text-gray-800">Loading Item Details...</p>
                 <p className="text-sm text-gray-600">Please wait while we fetch the complete data</p>
               </div>
             </div>
           )}
           <div 
             className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
             onClick={handleCloseViewModal}
           >
             <div 
               className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
               style={{
                 scrollbarWidth: 'none',
                 msOverflowStyle: 'none',
               }}
               onClick={(e) => e.stopPropagation()}
             >
               {/* Header */}
               <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                       <Package className="text-white" size={24} />
                     </div>
                     <div>
                       <h2 className="text-xl font-bold">Inventory Item Details</h2>
                       <p className="text-blue-100">
                         {viewLoading ? 'Loading details...' : selectedItem?.itemName}
                       </p>
                     </div>
                   </div>
                   <button
                     onClick={handleCloseViewModal}
                     className="text-white hover:text-gray-200 text-2xl font-bold"
                   >
                     ×
                   </button>
                 </div>
               </div>

               {/* Content */}
               <div className="p-6 space-y-6">
                 {viewLoading ? (
                   <div className="flex items-center justify-center py-12">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                     <span className="ml-3 text-gray-600">Loading item details...</span>
                   </div>
                 ) : selectedItem ? (
                   <>
                     {/* Basic Information */}
                     <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                       <div className="flex items-center gap-2 mb-4">
                         <Package className="text-blue-600" size={20} />
                         <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                             <Package className="text-blue-600" size={16} />
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Item Name</p>
                             <p className="font-semibold text-gray-800">{selectedItem.itemName}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                             <FileText className="text-green-600" size={16} />
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Category</p>
                             <p className="font-semibold text-gray-800 capitalize">{selectedItem.category}</p>
                           </div>
                         </div>
                         <div className="col-span-2">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                               <FileText className="text-purple-600" size={16} />
                             </div>
                             <div className="flex-1">
                               <p className="text-sm text-gray-600">Description</p>
                               <p className="font-semibold text-gray-800">{selectedItem.description}</p>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Quantity & Stock Information */}
                     <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                       <div className="flex items-center gap-2 mb-4">
                         <Building2 className="text-green-600" size={20} />
                         <h3 className="text-lg font-bold text-gray-800">Quantity & Stock Information</h3>
                       </div>
                       <div className="grid grid-cols-3 gap-6">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                             <span className="text-green-600 font-bold text-sm">#</span>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Quantity</p>
                             <p className="font-semibold text-gray-800">{selectedItem.quantity}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                             <span className="text-blue-600 font-bold text-sm">U</span>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Unit</p>
                             <p className="font-semibold text-gray-800 capitalize">{selectedItem.unit}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                             <span className="text-orange-600 font-bold text-sm">M</span>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Minimum Stock</p>
                             <p className="font-semibold text-gray-800">{selectedItem.minimumStock}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                             <span className="text-green-600 font-bold text-sm">S</span>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Stock Status</p>
                             <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                               selectedItem.stockStatus === 'In Stock' 
                                 ? 'bg-green-100 text-green-800' 
                                 : 'bg-red-100 text-red-800'
                             }`}>
                               {selectedItem.stockStatus}
                             </span>
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                             <span className="text-red-600 font-bold text-sm">D</span>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Days Until Expiry</p>
                             <p className={`font-semibold ${
                               selectedItem.daysUntilExpiry < 30 ? 'text-red-600' : 'text-gray-800'
                             }`}>
                               {selectedItem.daysUntilExpiry} days
                             </p>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Location & Cost */}
                     <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                       <div className="flex items-center gap-2 mb-4">
                         <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                         </svg>
                         <h3 className="text-lg font-bold text-gray-800">Location & Cost</h3>
                       </div>
                                               <div className="grid grid-cols-3 gap-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Location</p>
                              <p className="font-semibold text-gray-800">{selectedItem.location}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 font-bold text-sm">₹</span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Cost Per Unit</p>
                              <p className="font-semibold text-gray-800">₹{selectedItem.cost?.perUnit}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-sm">T</span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Total Cost</p>
                              <p className="font-semibold text-gray-800">₹{selectedItem.cost?.total}</p>
                            </div>
                          </div>
                        </div>
                     </div>

                     {/* Important Dates */}
                     <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                       <div className="flex items-center gap-2 mb-4">
                         <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                         <h3 className="text-lg font-bold text-gray-800">Important Dates</h3>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Purchase Date</p>
                             <p className="font-semibold text-gray-800">
                               {selectedItem.purchaseDate ? new Date(selectedItem.purchaseDate).toLocaleDateString() : 'N/A'}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Expiry Date</p>
                             <p className="font-semibold text-gray-800">
                               {selectedItem.expiryDate ? new Date(selectedItem.expiryDate).toLocaleDateString() : 'N/A'}
                             </p>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Supplier Information */}
                     <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6">
                       <div className="flex items-center gap-2 mb-4">
                         <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                         </svg>
                         <h3 className="text-lg font-bold text-gray-800">Supplier Information</h3>
                       </div>
                       <div className="grid grid-cols-3 gap-6">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Supplier Name</p>
                             <p className="font-semibold text-gray-800">{selectedItem.supplier?.name}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Contact</p>
                             <p className="font-semibold text-gray-800">{selectedItem.supplier?.contact}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                             </svg>
                           </div>
                           <div>
                             <p className="text-sm text-gray-600">Email</p>
                             <p className="font-semibold text-gray-800">{selectedItem.supplier?.email}</p>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Additional Information */}
                     <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                       <div className="flex items-center gap-2 mb-4">
                         <FileText className="text-gray-600" size={20} />
                         <h3 className="text-lg font-bold text-gray-800">Additional Information</h3>
                       </div>
                                                                       <div className="space-y-4">
                          {selectedItem.notes && (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <p className="text-sm text-gray-600 mb-2">Notes</p>
                              <div className="text-gray-800 whitespace-pre-line">
                                {formatNotes(selectedItem.notes)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Update Stock Quantity Form */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                          <h3 className="text-lg font-bold text-gray-800">Update Stock Quantity</h3>
                        </div>
                        
                        <form onSubmit={handleUpdateStock} className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                              <input
                                type="number"
                                name="quantity"
                                value={updateStockForm.quantity}
                                onChange={handleUpdateStockChange}
                                required
                                min="1"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter quantity"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Action *</label>
                              <select
                                name="action"
                                value={updateStockForm.action}
                                onChange={handleUpdateStockChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="add">Add Stock</option>
                                <option value="remove">Remove Stock</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                              <input
                                type="text"
                                name="notes"
                                value={updateStockForm.notes}
                                onChange={handleUpdateStockChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Used by HR department"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={updateStockLoading || !updateStockForm.quantity}
                              className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors ${
                                updateStockLoading || !updateStockForm.quantity
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:from-blue-600 hover:to-blue-700'
                              }`}
                            >
                              {updateStockLoading ? (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Updating...
                                </div>
                              ) : (
                                `Update Stock (${updateStockForm.action === 'add' ? '+' : '-'}${updateStockForm.quantity})`
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No item details available
                    </div>
                  )}
                </div>
             </div>
           </div>
         </>
       )}

       {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default OfficeInventory;


