import React, { useState } from 'react';
import { toast } from 'react-toastify';

const FoodPreferenceModal = ({ onClose, user }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!selectedOption) {
      toast.error("Please select an option.");
      return;
    }

    setLoading(true);

    // Simulate API call or just save to localStorage
    const today = new Date().toISOString().split('T')[0];
    const empId = user?.empId || user?.employeeId || 'unknown';
    localStorage.setItem(`food_preference_${empId}_${today}`, selectedOption);

    setTimeout(() => {
      setLoading(false);
      toast.success("Food preference saved successfully!");
      if (onClose) onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Today's Food Preference
        </h2>

        <div className="space-y-4">
          <label 
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedOption === 'With Rice' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-200'
            }`}
          >
            <input 
              type="radio" 
              name="food" 
              value="With Rice" 
              checked={selectedOption === 'With Rice'}
              onChange={() => setSelectedOption('With Rice')}
              className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-3 font-medium text-gray-700">Food with Rice</span>
          </label>

          <label 
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedOption === 'No Rice' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-200'
            }`}
          >
            <input 
              type="radio" 
              name="food" 
              value="No Rice" 
              checked={selectedOption === 'No Rice'}
              onChange={() => setSelectedOption('No Rice')}
              className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-3 font-medium text-gray-700">Food with No Rice</span>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedOption || loading}
          className={`mt-8 w-full py-3 px-4 rounded-lg text-white font-semibold text-lg transition-colors ${
            !selectedOption || loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {loading ? 'Submitting...' : 'Submit Preference'}
        </button>
      </div>
    </div>
  );
};

export default FoodPreferenceModal;
