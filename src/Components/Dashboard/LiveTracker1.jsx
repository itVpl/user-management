import React, { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker,useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RedTruck, Checkcircle, locationMarker,ArrowDown,ArrowUp } from "../../assets/image";

const truckIcon = new L.Icon({
  iconUrl: RedTruck,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

export default function ConsignmentTracker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [consignments, setConsignments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);

const toggleExpand = (item) => {
  setExpandedId((prev) => (prev === item.id ? null : item.id));
  setSelectedShipment(item); // ⬅️ this is important
};

  const fetchConsignments = async () => {
    try {
      const res = await axios.get(
        `https://vpl-liveproject-1.onrender.com/api/v1/load/shipment/${searchTerm.toUpperCase() || "SHP1806022"}`
      );
      if (res.data?.tracking) {
        const track = res.data.tracking;
        setConsignments([
          {
            id: track._id,
            number: track.shipmentNumber,
            location: `${track.load.origin.city}, ${track.load.origin.state} → ${track.load.destination.city}, ${track.load.destination.state}`,
            lat: track.currentLocation.lat,
            lng: track.currentLocation.lon,
            deliveryProgress:
              track.status === "delivered"
                ? 100
                : track.status === "in_transit"
                ? 60
                : 20,
            status: [
              {
                label: "Loading",
                name: track.driverName || "Driver",
                time: new Date(track.startedAt).toLocaleString(),
                done: true,
              },
              {
                label: "In-Transit",
                name: track.driverName || "Driver",
                time: new Date(track.currentLocation.updatedAt).toLocaleString(),
                done: track.status !== "loading",
              },
              {
                label: "Delivered",
                name: track.driverName || "Driver",
                time: new Date(track.load?.deliveryDate || Date.now()).toLocaleString(),
                done: track.status === "delivered",
              },
            ],
          },
        ]);
      } else {
        setConsignments([]);
      }
    } catch (err) {
      console.error("Error fetching data", err);
      setConsignments([]);
    }
  };

  useEffect(() => {
    fetchConsignments(); // initial load
    const interval = setInterval(fetchConsignments, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [searchTerm]);

  const filteredConsignments = consignments.filter((item) =>
    item.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 7);
    }
  }, [lat, lng]);
  return null;
}

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 bg-white  p-4 border-r overflow-y-auto rounded-r-2xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Consignment</h2>

        <input
          type="text"
          placeholder="Search by Shipment Number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 mb-4 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {filteredConsignments.map((item) => (
          <div key={item.id} className="bg-gray-50 shadow rounded-lg p-4 mb-3" onClick={() => toggleExpand(item)}>
            <div key={item.id}
              className="flex justify-between items-center cursor-pointer"

            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 flex items-center justify-center rounded-full">📦</div>
                <div>
                  <p className="font-medium text-sm">{item.number}</p>
                  <p className="text-xs text-gray-500">{item.location}</p>
                </div>
              </div>
              <div className="text-lg">{expandedId === item.id ? <img src={ArrowUp}/> : <img src={ArrowDown}/>}</div>
            </div>

            {expandedId === item.id && (
              <div className="mt-4">
                <div className="space-y-4">
                  {item.status.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-green-600">
                          <img
                            src={step.done ? Checkcircle : locationMarker}
                            alt={step.label}
                            className="w-5 h-5"
                          />
                        </span>
                        {index < item.status.length - 1 && (
                          <div className="w-1 h-6 bg-green-400 my-1"></div>
                        )}
                      </div>
                      <div>
                        <p className={`font-semibold ${step.done ? "text-green-600" : "text-gray-800"}`}>{step.label}</p>
                        <p className="text-sm">{step.name}</p>
                        <p className="text-xs text-gray-500">{step.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="flex-grow relative z-10 top-[26px]">
  <MapContainer
    center={[39.8283, -98.5795]}
    zoom={4}
    scrollWheelZoom={true}
    zoomControl={true}
    className="w-full h-full"
  >
    <TileLayer
      attribution='&copy; OpenStreetMap contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {filteredConsignments.map((truck) => (
      <Marker key={truck.id} position={[truck.lat, truck.lng]} icon={truckIcon} />
    ))}
    {selectedShipment && (
      <RecenterMap lat={selectedShipment.lat} lng={selectedShipment.lng} />
    )}
  </MapContainer>
</div>

      
    </div>
  );
}
