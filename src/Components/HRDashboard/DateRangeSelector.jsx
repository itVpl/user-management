import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css"; // ✅ main style file
import "react-date-range/dist/theme/default.css"; // ✅ theme css file

// --- Helper: Format date for API ---
const formatDate = (date) => format(date, "yyyy-MM-dd");

// --- Helper: Calculate Preset Ranges ---
const calculateDateRange = (key) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let startDate = new Date(now);
  let endDate = new Date(now);

  switch (key) {
    case "Today":
      break;
    case "Yesterday":
      startDate.setDate(now.getDate() - 1);
      endDate = new Date(startDate);
      break;
    case "Last7Days":
      startDate.setDate(now.getDate() - 6);
      break;
    case "Last30Days":
      startDate.setDate(now.getDate() - 29);
      break;
    case "ThisMonth":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "LastMonth":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case "AllTime":
      return { startDate: null, endDate: null };
    default:
      return null;
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

const dateOptions = [
  { label: "All Time", key: "AllTime" },
  { label: "Today", key: "Today" },
  { label: "Yesterday", key: "Yesterday" },
  { label: "Last 7 Days", key: "Last7Days" },
  { label: "Last 30 Days", key: "Last30Days" },
  { label: "This Month", key: "ThisMonth" },
  { label: "Last Month", key: "LastMonth" },
  { label: "Custom Range", key: "CustomRange" },
];

const DateRangeSelector = ({ dateRange, setDateRange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [range, setRange] = useState([
    {
      startDate: new Date(dateRange.startDate || new Date()),
      endDate: new Date(dateRange.endDate || new Date()),
      key: "selection",
    },
  ]);

  const dropdownRef = useRef(null);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsCustom(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDisplayText = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return "All Time";
    }
    const start = new Date(dateRange.startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const end = new Date(dateRange.endDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} - ${end}`;
  };

  const handleSelect = (key) => {
    if (key === "CustomRange") {
      setIsCustom(true);
      setIsOpen(false);
    } else {
      const newRange = calculateDateRange(key);
      if (newRange) setDateRange(newRange);
      setIsCustom(false);
      setIsOpen(false);
    }
  };

  const handleApplyCustom = () => {
    const selected = range[0];
    setDateRange({
      startDate: formatDate(selected.startDate),
      endDate: formatDate(selected.endDate),
    });
    setIsCustom(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* --- Trigger Button --- */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsCustom(false);
        }}
        className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-base w-56 bg-white shadow-sm hover:border-blue-500 transition"
      >
        <span className="flex items-center gap-2 truncate">
          <Calendar size={20} className="text-gray-500" />
          {getDisplayText()}
        </span>
        <ChevronDown
          size={20}
          className={`ml-2 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {/* --- Preset Dropdown --- */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-56 bg-white border border-black rounded-lg shadow-xl right-0">
          <ul className="py-1">
            {dateOptions.map((option) => (
              <li
                key={option.key}
                onClick={() => handleSelect(option.key)}
                className={`px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 ${
                  option.key === "CustomRange" ? "border-t border-gray-300 mt-1 pt-2" : ""
                }`}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Custom Date Picker --- */}
      {isCustom && (
        <div className="absolute z-30 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 right-0">
          <DateRange
            editableDateInputs={true}
            onChange={(item) => setRange([item.selection])}
            moveRangeOnFirstSelection={false}
            ranges={range}
            maxDate={new Date()}
            rangeColors={["#4F46E5"]}
          />
          <button
            onClick={handleApplyCustom}
            className="w-full text-center text-base font-medium text-indigo-600 hover:text-indigo-800 pt-2 border-t mt-2"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default DateRangeSelector;
