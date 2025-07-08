import React, { useState, useEffect } from "react";
import axios from "axios";

const LoadBoard = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedLoadType, setSelectedLoadType] = useState("OTR");
    const [availableLoads, setAvailableLoads] = useState([]);
    const [loading, setLoading] = useState(true);

    const defaultLoadData = {
        weight: "",
        containerNo: "",
        vehicleType: "",
        poNumber: "",
        commodity: "",
        bolNumber: "",
        pickupLocation: "",
        dropLocation: "",
        pickupDate: "",
        dropDate: "",
        expectedPrice: "",
        deliveryDate: "",
        returnDate: "",
        drayageLocation: "",
        returnLocation: "",
    };
    const [loadData, setLoadData] = useState(defaultLoadData);

    useEffect(() => {
        const fetchLoads = async () => {
            setLoading(true);
            try {
                const res = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/load/available");
                setAvailableLoads(res.data.loads || []);
            } catch (err) {
                setAvailableLoads([]);
            }
            setLoading(false);
        };
        fetchLoads();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLoadData((prev) => ({ ...prev, [name]: value }));
    };

    const handleToggle = (type) => {
        setSelectedLoadType(type);
        setLoadData(defaultLoadData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let payload;
        if (selectedLoadType === "Drayage") {
            payload = {
                fromCity: loadData.pickupLocation,
                fromState: "",
                toCity: loadData.dropLocation,
                toState: "",
                weight: Number(loadData.weight),
                commodity: loadData.commodity,
                vehicleType: loadData.vehicleType,
                pickupDate: loadData.pickupDate,
                deliveryDate: loadData.deliveryDate,
                returnDate: loadData.returnDate,
                drayageLocation: loadData.drayageLocation,
                rate: Number(loadData.expectedPrice),
                rateType: "Flat Rate",
                bidDeadline: "",
                loadType: selectedLoadType.toUpperCase(),
                containerNo: loadData.containerNo,
                poNumber: loadData.poNumber,
                bolNumber: loadData.bolNumber,
                returnLocation: loadData.returnLocation,
            };
        } else {
            payload = {
                fromCity: loadData.pickupLocation,
                fromState: "",
                toCity: loadData.dropLocation,
                toState: "",
                weight: Number(loadData.weight),
                commodity: loadData.commodity,
                vehicleType: loadData.vehicleType,
                pickupDate: loadData.pickupDate,
                deliveryDate: loadData.dropDate,
                rate: Number(loadData.expectedPrice),
                rateType: "Flat Rate",
                bidDeadline: "",
                loadType: selectedLoadType.toUpperCase(),
                containerNo: loadData.containerNo,
                poNumber: loadData.poNumber,
                bolNumber: loadData.bolNumber,
            };
        }
        try {
            await axios.post("https://vpl-liveproject-1.onrender.com/api/v1/load/create", payload);
            alert("Load created successfully!");
            setShowModal(false);
        } catch (err) {
            alert("Error creating load");
        }
    };

    return (
        <div className="p-6 relative">
            {/* Top Buttons */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowModal(true)}
                        className="border border-blue-500 text-blue-500 px-4 py-1 rounded-full font-medium hover:bg-blue-100"
                    >
                        Add Load
                    </button>
                    <button className="bg-blue-500 text-white px-6 py-1 rounded-full font-medium shadow hover:bg-blue-600">
                        Loads
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Search Load ID"
                    className="border border-gray-300 rounded-full px-4 py-1 text-sm w-64 focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-gray-50 rounded-2xl shadow-md overflow-auto">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-blue-50 text-gray-700 font-semibold">
                        <tr>
                            <th className="px-4 py-2">Load ID</th>
                            <th className="px-4 py-2">Weight(KG)</th>
                            <th className="px-4 py-2">Pick-up</th>
                            <th className="px-4 py-2">Drop</th>
                            <th className="px-4 py-2">Return</th>
                            <th className="px-4 py-2">Vehicle</th>
                            <th className="px-4 py-2">Bids</th>
                            <th className="px-4 py-2">Commodity</th>
                            <th className="px-4 py-2">Load Type</th>
                            <th className="px-4 py-2">Expected Price($)</th>
                            <th className="px-4 py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800">
                        {loading ? (
                            <tr><td colSpan="11" className="text-center py-8">Loading...</td></tr>
                        ) : availableLoads.length === 0 ? (
                            <tr><td colSpan="11" className="text-center py-8">No loads found</td></tr>
                        ) : (
                            availableLoads.map((item, idx) => (
                                <tr key={item._id || idx} className="border-t hover:bg-blue-50 transition duration-200">
                                    <td className="px-4 py-3">{item._id}</td>
                                    <td className="px-4 py-3">{item.weight}</td>
                                    <td className="px-4 py-3">{item.origin?.city}</td>
                                    <td className="px-4 py-3">{item.destination?.city}</td>
                                    <td className="px-4 py-3">{item.returnLocation || "---"}</td>
                                    <td className="px-4 py-3">{item.vehicleType}</td>
                                    <td className="px-4 py-3">-</td>
                                    <td className="px-4 py-3">{item.commodity}</td>
                                    <td className="px-4 py-3">{item.loadType}</td>
                                    <td className="px-4 py-3">{item.rate}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-lime-300 text-black px-3 py-1 rounded-full text-xs font-semibold">
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
                <div className="relative inline-block w-20">
                    <select className="w-full border border-blue-400 text-black px-4 py-1 rounded-md appearance-none text-center">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                    <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-sm">
                        ▼
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button className="text-gray-400">❮</button>
                    <span className="text-sm">1</span>
                    <button className="text-gray-400">❯</button>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-opacity-20 backdrop-blur-sm flex justify-center items-center z-50">

                    <div className="bg-white rounded-2xl w-full max-w-4xl p-6 relative">
                        <button
                            className="absolute top-3 right-4 text-2xl font-bold text-gray-500 hover:text-red-500"
                            onClick={() => setShowModal(false)}
                        >
                            &times;
                        </button>

                        {/* Load Type Toggle */}
                        <div className="flex justify-center mb-6 mt-4">
                            <div className="inline-flex items-center bg-gray-100 border border-blue-300 rounded-full overflow-hidden shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => handleToggle("OTR")}
                                    className={`w-40 py-2 transition-all duration-300 text-sm font-medium text-center ${selectedLoadType === "OTR"
                                        ? "bg-blue-500 text-white shadow-md"
                                        : "text-gray-700 hover:bg-blue-100"
                                        }`}
                                >
                                    OTR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleToggle("Drayage")}
                                    className={`w-40 py-2 transition-all duration-300 text-sm font-medium text-center ${selectedLoadType === "Drayage"
                                        ? "bg-blue-500 text-white shadow-md"
                                        : "text-gray-700 hover:bg-blue-100"
                                        }`}
                                >
                                    Drayage
                                </button>
                            </div>
                        </div>



                        {/* Modal Form */}
                        <form onSubmit={handleSubmit}>
                            {selectedLoadType === "OTR" ? (
                                <div className="flex flex-col gap-4">
                                    {/* Row 1 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                name="weight"
                                                value={loadData.weight}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="weight"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Weight
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                name="containerNo"
                                                value={loadData.containerNo}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="containerNo"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Container No
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 2 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                name="vehicleType"
                                                value={loadData.vehicleType}
                                                onChange={handleChange}
                                                className="peer w-full border border-black rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="vehicleType"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Vehicle/Equipment Type
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                name="poNumber"
                                                value={loadData.poNumber}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="poNumber"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                PO Number
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 3 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                name="commodity"
                                                value={loadData.commodity}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="commodity"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Commodity
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                name="bolNumber"
                                                value={loadData.bolNumber}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="bolNumber"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                BOL Number
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 4 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                name="pickupLocation"
                                                value={loadData.pickupLocation}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="pickupLocation"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Pick-up Location
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                name="dropLocation"
                                                value={loadData.dropLocation}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="dropLocation"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Drop Location
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 5 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                type="date"
                                                name="pickupDate"
                                                value={loadData.pickupDate}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="pickupDate"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Pick-up Date
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                type="date"
                                                name="dropDate"
                                                value={loadData.dropDate}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="dropDate"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Drop Date
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {/* Row 1 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                name="weight"
                                                value={loadData.weight}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="weight"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Weight
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                name="containerNo"
                                                value={loadData.containerNo}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="containerNo"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Container No
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 2 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                name="vehicleType"
                                                value={loadData.vehicleType}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="vehicleType"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Vehicle/Equipment Type
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                name="poNumber"
                                                value={loadData.poNumber}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="poNumber"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                PO Number
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 3 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                name="commodity"
                                                value={loadData.commodity}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="commodity"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Commodity
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                name="bolNumber"
                                                value={loadData.bolNumber}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="bolNumber"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                BOL Number
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 4 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                name="pickupLocation"
                                                value={loadData.pickupLocation}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="pickupLocation"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Pick-up Location
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                name="dropLocation"
                                                value={loadData.dropLocation}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="dropLocation"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Enter Drop Location
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 5 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                type="date"
                                                name="pickupDate"
                                                value={loadData.pickupDate}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="pickupDate"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Pick-up Date
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                type="date"
                                                name="dropDate"
                                                value={loadData.dropDate}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="dropDate"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Drop Date
                                            </label>
                                        </div>
                                    </div>

                                    {/* Row 6 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                type="date"
                                                name="deliveryDate"
                                                value={loadData.deliveryDate}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="deliveryDate"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Delivery Date
                                            </label>
                                        </div>
                                        <div className="relative w-full">
                                            <input
                                                type="date"
                                                name="returnDate"
                                                value={loadData.returnDate}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="returnDate"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Return Date
                                            </label>
                                        </div>
                                    </div>

                                    

                                    {/* Row 8 */}
                                    <div className="flex gap-4">
                                        <div className="relative w-full">
                                            <input
                                                type="text"
                                                name="returnLocation"
                                                value={loadData.returnLocation}
                                                onChange={handleChange}
                                                className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                            <label
                                                htmlFor="returnLocation"
                                                className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                            >
                                                Return Location
                                            </label>
                                        </div>
                                    </div>

                                </div>
                            )}




                            {/* Expected Price */}
                            <div className="mt-6">
                                <div className="relative w-full">
                                    <input name="expectedPrice" value={loadData.expectedPrice} onChange={handleChange} className="peer w-full border border-gray-300 rounded-md px-4 pt-6 pb-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                    <label
                                        htmlFor="expectedPrice"
                                        className="absolute left-4 top-2 text-sm text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-sm peer-focus:text-blue-500"
                                    >
                                        Expected Price
                                    </label>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-center gap-6 mt-8">
                                <button type="button" onClick={() => setShowModal(false)} className="bg-gray-200 px-8 py-2 rounded-full text-gray-700 hover:bg-gray-300">Cancel</button>
                                <button type="submit" className="bg-blue-500 px-8 py-2 rounded-full text-white hover:bg-blue-600">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoadBoard;
