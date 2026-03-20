import React, { useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, MapPin, Search } from "lucide-react";
import API_CONFIG from "../../config/api.js";

const LoadByLocation = () => {
  const [showPickupDestinationSection, setShowPickupDestinationSection] = useState(true);

  const [pickupZip, setPickupZip] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [destinationZip, setDestinationZip] = useState("");
  const [destinationCity, setDestinationCity] = useState("");

  const [pickupDestinationLoading, setPickupDestinationLoading] = useState(false);
  const [pickupDestinationError, setPickupDestinationError] = useState("");
  const [pickupDestinationLoads, setPickupDestinationLoads] = useState([]);
  const [pickupDestinationPagination, setPickupDestinationPagination] = useState(null);
  const [pickupDestinationPage, setPickupDestinationPage] = useState(1);
  const [pickupDestinationLimit, setPickupDestinationLimit] = useState(20);

  const getLoadsByPickupDestination = async (page = 1, limit = pickupDestinationLimit) => {
    const hasPickup = (pickupZip && pickupZip.trim()) || (pickupCity && pickupCity.trim());
    const hasDestination =
      (destinationZip && destinationZip.trim()) || (destinationCity && destinationCity.trim());
    if (!hasPickup || !hasDestination) {
      setPickupDestinationError("Pickup (zip or city) and destination (zip or city) are required");
      return;
    }
    setPickupDestinationError("");
    setPickupDestinationLoading(true);
    setPickupDestinationLoads([]);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const params = new URLSearchParams();
      if (pickupZip && pickupZip.trim()) params.set("pickupZip", pickupZip.trim());
      if (pickupCity && pickupCity.trim()) params.set("pickupCity", pickupCity.trim());
      if (destinationZip && destinationZip.trim()) params.set("destinationZip", destinationZip.trim());
      if (destinationCity && destinationCity.trim()) params.set("destinationCity", destinationCity.trim());
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/by-pickup-destination?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });

      const data = res.data;
      if (data && data.success !== false) {
        setPickupDestinationLoads(Array.isArray(data.data) ? data.data : []);
        setPickupDestinationPagination(data.pagination || null);
        setPickupDestinationPage(page);
        setPickupDestinationLimit(Number(data?.pagination?.limit) || Number(limit) || 20);
        setShowPickupDestinationSection(true);
      } else {
        setPickupDestinationLoads([]);
        setPickupDestinationPagination(null);
        setPickupDestinationError(data?.message || "Failed to fetch loads");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to fetch loads";
      setPickupDestinationError(msg);
      setPickupDestinationLoads([]);
      setPickupDestinationPagination(null);
    } finally {
      setPickupDestinationLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowPickupDestinationSection((s) => !s)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin className="text-blue-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-gray-900">Load by Pickup & Destination</h2>
            <span className="text-sm text-gray-500">(Previous loads on lane)</span>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-gray-500 transition-transform ${
              showPickupDestinationSection ? "rotate-90" : ""
            }`}
          />
        </button>

        {showPickupDestinationSection && (
          <div className="px-6 pb-6 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Zip</label>
                <input
                  type="text"
                  placeholder="e.g. 77001"
                  value={pickupZip}
                  onChange={(e) => setPickupZip(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup City</label>
                <input
                  type="text"
                  placeholder="e.g. Houston"
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Zip</label>
                <input
                  type="text"
                  placeholder="e.g. 75201"
                  value={destinationZip}
                  onChange={(e) => setDestinationZip(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination City</label>
                <input
                  type="text"
                  placeholder="e.g. Dallas"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <button
                type="button"
                onClick={() => getLoadsByPickupDestination(1, pickupDestinationLimit)}
                disabled={pickupDestinationLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                {pickupDestinationLoading ? "Searching..." : "Search Previous Loads"}
              </button>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Rows:</label>
                <select
                  value={pickupDestinationLimit}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setPickupDestinationLimit(newLimit);
                    if (pickupDestinationLoads.length > 0) {
                      getLoadsByPickupDestination(1, newLimit);
                    }
                  }}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-gray-500">
                At least one of pickup zip/city and one of destination zip/city required.
              </span>
            </div>

            {pickupDestinationError && (
              <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {pickupDestinationError}
              </div>
            )}

            {pickupDestinationLoads.length > 0 && (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  {pickupDestinationPagination?.total ?? pickupDestinationLoads.length} load(s) found.
                </p>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#F1F4F9]">
                        <th className="text-left py-3 px-4 text-gray-800 font-medium text-sm rounded-l-xl">
                          Origin(s)
                        </th>
                        <th className="text-left py-3 px-4 text-gray-800 font-medium text-sm">
                          Destination(s)
                        </th>
                        <th className="text-left py-3 px-4 text-gray-800 font-medium text-sm">
                          Carrier Rate
                        </th>
                        <th className="text-left py-3 px-4 text-gray-800 font-medium text-sm">
                          Rate Details
                        </th>
                        <th className="text-left py-3 px-4 text-gray-800 font-medium text-sm rounded-r-xl">
                          CMT Agent
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickupDestinationLoads.map((load, index) => {
                        const serialNo = `RR${index + 1}`;
                        const originStr =
                          load.origins && Array.isArray(load.origins) && load.origins.length > 0
                            ? load.origins
                                .map((o) => [o.addressLine1, o.city, o.state, o.zip].filter(Boolean).join(", "))
                                .join(" | ")
                            : "—";
                        const destStr =
                          load.destinations &&
                          Array.isArray(load.destinations) &&
                          load.destinations.length > 0
                            ? load.destinations
                                .map((d) => [d.addressLine1, d.city, d.state, d.zip].filter(Boolean).join(", "))
                                .join(" | ")
                            : "—";

                        const carrierRate =
                          load?.doRate?.carrierRate != null
                            ? load.doRate.carrierRate
                            : load.totalrates != null
                              ? load.totalrates
                              : load.totalRates != null
                                ? load.totalRates
                                : load.rate != null
                                  ? load.rate
                                  : load.rateDetails?.totalRates != null
                                    ? load.rateDetails.totalRates
                                    : null;

                        let rateDetailsStr = "—";
                        if (Array.isArray(load.rates) && load.rates.length > 0) {
                          rateDetailsStr = load.rates
                            .map((r) => {
                              const lineTotal =
                                r.total != null
                                  ? r.total
                                  : r.amount != null && r.quantity != null
                                    ? r.amount * r.quantity
                                    : r.amount ?? 0;
                              const label = r.name || "Item";
                              return `${label}: $${Number(lineTotal).toLocaleString()}`;
                            })
                            .join("; ");
                        } else if (load.rateDetails) {
                          const parts = [];
                          if (load.rateDetails.lineHaul != null)
                            parts.push(`Line: $${Number(load.rateDetails.lineHaul).toLocaleString()}`);
                          if (load.rateDetails.fsc != null)
                            parts.push(`FSC: $${Number(load.rateDetails.fsc).toLocaleString()}`);
                          const other = load.rateDetails.other;
                          if (Array.isArray(other) && other.length > 0) {
                            other.forEach((item) => {
                              const total =
                                item.total ??
                                (item.amount != null && item.quantity != null ? item.amount * item.quantity : 0);
                              const label = item.name || "Other";
                              parts.push(`${label}: $${Number(total).toLocaleString()}`);
                            });
                          }
                          rateDetailsStr = parts.length > 0 ? parts.join("; ") : "—";
                        }

                        return (
                          <tr
                            key={load._id || load.shipmentNumber || `${pickupDestinationPage}-${index}`}
                            className="border-b border-gray-200 hover:bg-gray-50"
                          >
                            <td
                              className="py-3 px-4 text-gray-700 text-sm max-w-[200px] truncate"
                              title={originStr}
                            >
                              {originStr}
                            </td>
                            <td
                              className="py-3 px-4 text-gray-700 text-sm max-w-[200px] truncate"
                              title={destStr}
                            >
                              {destStr}
                            </td>
                            <td className="py-3 px-4 text-gray-900 text-sm font-medium">
                              {carrierRate != null && typeof carrierRate === "number"
                                ? `$${carrierRate.toLocaleString()}`
                                : carrierRate != null
                                  ? `$${carrierRate}`
                                  : <span className="text-gray-500 font-normal">No bid</span>}
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-sm">{rateDetailsStr}</td>
                            <td className="py-3 px-4 text-gray-700 text-sm">{serialNo}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {pickupDestinationPagination && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600">
                      Page {pickupDestinationPage} of {pickupDestinationPagination.totalPages} (
                      {pickupDestinationPagination.total} total)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => getLoadsByPickupDestination(pickupDestinationPage - 1, pickupDestinationLimit)}
                        disabled={pickupDestinationPage <= 1 || pickupDestinationLoading}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4 inline" />
                      </button>
                      <button
                        type="button"
                        onClick={() => getLoadsByPickupDestination(pickupDestinationPage + 1, pickupDestinationLimit)}
                        disabled={
                          pickupDestinationPage >= pickupDestinationPagination.totalPages ||
                          pickupDestinationLoading
                        }
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        <ChevronRight className="w-4 h-4 inline" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {!pickupDestinationLoading &&
              pickupDestinationLoads.length === 0 &&
              pickupDestinationPagination &&
              pickupDestinationPagination.total === 0 && (
                <p className="text-gray-500 text-sm">
                  No previous loads found for this pickup and destination combination.
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadByLocation;
