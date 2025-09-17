import React, { useState, useEffect } from 'react';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

    // US Holidays for the current year - Using exact calculations
    const getUSHolidays = (year) => {
        const holidays = [
            { name: "New Year's Day", date: new Date(year, 0, 1), type: "federal" },
            { name: "Martin Luther King Jr. Day", date: getNthWeekday(year, 0, 1, 3), type: "federal" }, // 3rd Monday of January
            { name: "Presidents' Day", date: getNthWeekday(year, 1, 1, 3), type: "federal" }, // 3rd Monday of February
            { name: "Memorial Day", date: getLastWeekday(year, 4, 1), type: "federal" }, // Last Monday of May
            { name: "Independence Day", date: new Date(year, 6, 4), type: "federal" },
            { name: "Labor Day", date: getNthWeekday(year, 8, 1, 1), type: "federal" }, // 1st Monday of September
            { name: "Columbus Day", date: getNthWeekday(year, 9, 1, 2), type: "federal" }, // 2nd Monday of October
            { name: "Veterans Day", date: new Date(year, 10, 11), type: "federal" },
            { name: "Thanksgiving Day", date: getNthWeekday(year, 10, 4, 4), type: "federal" }, // 4th Thursday of November
            { name: "Christmas Day", date: new Date(year, 11, 25), type: "federal" },
            // Additional popular holidays
            { name: "Valentine's Day", date: new Date(year, 1, 14), type: "observance" },
            { name: "St. Patrick's Day", date: new Date(year, 2, 17), type: "observance" },
            { name: "Easter Sunday", date: getEasterDate(year), type: "religious" },
            { name: "Mother's Day", date: getNthWeekday(year, 4, 0, 2), type: "observance" }, // 2nd Sunday of May
            { name: "Father's Day", date: getNthWeekday(year, 5, 0, 3), type: "observance" }, // 3rd Sunday of June
            { name: "Halloween", date: new Date(year, 9, 31), type: "observance" },
            { name: "Black Friday", date: getDayAfterThanksgiving(year), type: "observance" },
        ];
        return holidays;
    };

    // Helper functions for calculating specific weekdays
    const getNthWeekday = (year, month, targetDay, nth) => {
        // targetDay: 0=Sunday, 1=Monday, 2=Tuesday, etc.
        // nth: which occurrence (1st, 2nd, 3rd, 4th)
        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay();
        
        // Calculate days to add to get to the first occurrence of targetDay
        let daysToAdd = (targetDay - firstDayOfWeek + 7) % 7;
        
        // Add weeks for nth occurrence
        daysToAdd += (nth - 1) * 7;
        
        return new Date(year, month, 1 + daysToAdd);
    };

    const getLastWeekday = (year, month, targetDay) => {
        // targetDay: 0=Sunday, 1=Monday, 2=Tuesday, etc.
        const lastDay = new Date(year, month + 1, 0);
        const lastDayOfWeek = lastDay.getDay();
        
        // Calculate days to subtract to get to the last occurrence of targetDay
        let daysToSubtract = (lastDayOfWeek - targetDay + 7) % 7;
        
        return new Date(year, month, lastDay.getDate() - daysToSubtract);
    };

    const getDayAfterThanksgiving = (year) => {
        const thanksgiving = getNthWeekday(year, 10, 4, 4); // 4th Thursday of November
        return new Date(year, 10, thanksgiving.getDate() + 1);
    };

    // Calculate Easter date (simplified algorithm)
    const getEasterDate = (year) => {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const n = Math.floor((h + l - 7 * m + 114) / 31);
        const p = (h + l - 7 * m + 114) % 31;
        return new Date(year, n - 1, p + 1);
    };

    const holidays = getUSHolidays(currentYear);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getDaysInMonth = (month, year) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month, year) => {
        return new Date(year, month, 1).getDay();
    };

    const isHoliday = (date) => {
        return holidays.some(holiday => 
            holiday.date.getDate() === date.getDate() &&
            holiday.date.getMonth() === date.getMonth() &&
            holiday.date.getFullYear() === date.getFullYear()
        );
    };

    const getHolidayInfo = (date) => {
        return holidays.find(holiday => 
            holiday.date.getDate() === date.getDate() &&
            holiday.date.getMonth() === date.getMonth() &&
            holiday.date.getFullYear() === date.getFullYear()
        );
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const isSelected = (date) => {
        return date.getDate() === selectedDate.getDate() &&
               date.getMonth() === selectedDate.getMonth() &&
               date.getFullYear() === selectedDate.getFullYear();
    };

    const navigateMonth = (direction) => {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
            } else {
                setCurrentMonth(currentMonth - 1);
            }
        } else {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
            } else {
                setCurrentMonth(currentMonth + 1);
            }
        }
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
        setSelectedDate(today);
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`empty-${i}`} className="h-12 w-12"></div>
            );
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const holiday = getHolidayInfo(date);
            const isHolidayDay = isHoliday(date);
            const isTodayDay = isToday(date);
            const isSelectedDay = isSelected(date);

            days.push(
                <div
                    key={day}
                    className={`
                        h-14 w-14 flex items-center justify-center text-sm font-semibold cursor-pointer rounded-2xl transition-all duration-300 relative group transform hover:scale-110
                        ${isTodayDay ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg ring-2 ring-blue-300' : ''}
                        ${isSelectedDay && !isTodayDay ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg ring-2 ring-indigo-300' : ''}
                        ${isHolidayDay && !isTodayDay && !isSelectedDay ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 border border-red-200' : ''}
                        ${!isTodayDay && !isSelectedDay && !isHolidayDay ? 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 text-gray-700 border border-transparent hover:border-indigo-200' : ''}
                    `}
                    onClick={() => setSelectedDate(date)}
                    title={holiday ? holiday.name : ''}
                >
                    <span className="relative z-10">{day}</span>
                    {isHolidayDay && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-md animate-pulse"></div>
                    )}
                    {isTodayDay && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-2xl opacity-20 animate-pulse"></div>
                    )}
                </div>
            );
        }

        return days;
    };

    const getSelectedDateInfo = () => {
        const holiday = getHolidayInfo(selectedDate);
        return {
            date: selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            holiday: holiday
        };
    };

    const selectedDateInfo = getSelectedDateInfo();

    return (
        <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-3xl shadow-2xl border border-indigo-200/50 p-8 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
                            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                            US Calendar {currentYear}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">With Federal & Observance Holidays</p>
                    </div>
                </div>
                <button
                    onClick={goToToday}
                    className="group px-6 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Go to Today</span>
                </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => navigateMonth('prev')}
                    className="group p-3 rounded-2xl bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                    <svg className="w-6 h-6 text-indigo-600 group-hover:text-indigo-700 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        {monthNames[currentMonth]} {currentYear}
                    </h3>
                    <div className="w-16 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mx-auto mt-2"></div>
                </div>
                <button
                    onClick={() => navigateMonth('next')}
                    className="group p-3 rounded-2xl bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                    <svg className="w-6 h-6 text-indigo-600 group-hover:text-indigo-700 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="mb-8">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {dayNames.map(day => (
                        <div key={day} className="h-12 flex items-center justify-center text-sm font-bold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                    {renderCalendar()}
                </div>
            </div>

            {/* Selected Date Info */}
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-indigo-200/50 shadow-lg mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Selected Date</h4>
                </div>
                <p className="text-lg text-gray-700 mb-4 font-medium">{selectedDateInfo.date}</p>
                {selectedDateInfo.holiday && (
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-red-200 shadow-sm">
                        <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></div>
                        <span className="text-red-700 font-bold text-lg">
                            {selectedDateInfo.holiday.name}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                            selectedDateInfo.holiday.type === 'federal' 
                                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300' 
                                : selectedDateInfo.holiday.type === 'religious'
                                ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border border-purple-300'
                                : 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border border-green-300'
                        }`}>
                            {selectedDateInfo.holiday.type}
                        </span>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-6 text-sm mb-6">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-200 shadow-sm">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-md"></div>
                    <span className="text-gray-700 font-semibold">Today</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-200 shadow-sm">
                    <div className="w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-md"></div>
                    <span className="text-gray-700 font-semibold">Selected</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-200 shadow-sm">
                    <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-md animate-pulse"></div>
                    <span className="text-gray-700 font-semibold">Holiday</span>
                </div>
            </div>

            {/* Upcoming Holidays */}
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-indigo-200/50 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h4 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Upcoming Holidays</h4>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                    {holidays
                        .filter(holiday => holiday.date >= new Date())
                        .sort((a, b) => a.date - b.date)
                        .slice(0, 5)
                        .map((holiday, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></div>
                                    <span className="text-gray-700 font-semibold">{holiday.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">
                                        {holiday.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        holiday.type === 'federal' 
                                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300' 
                                            : holiday.type === 'religious'
                                            ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border border-purple-300'
                                            : 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border border-green-300'
                                    }`}>
                                        {holiday.type}
                                    </span>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default Calendar;
