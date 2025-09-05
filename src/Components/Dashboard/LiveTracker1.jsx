import React, { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RedTruck, Checkcircle, locationMarker, ArrowDown, ArrowUp } from "../../assets/image";

// Custom Flatbed/Container Truck Icon using local image
const createCustomTruckIcon = () => {
  return new L.Icon({
    iconUrl: '/src/assets/Icons super admin/map-truckImage.png',
    iconSize: [50, 30],
    iconAnchor: [25, 15],
    popupAnchor: [0, -20],
    className: 'truck-marker-icon'
  });
};



const originIcon = new L.Icon({
  iconUrl: locationMarker,
  iconSize: [25, 25],
  iconAnchor: [12, 25],
});

const destinationIcon = new L.Icon({
  iconUrl: Checkcircle,
  iconSize: [25, 25],
  iconAnchor: [12, 25],
});

export default function ConsignmentTracker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [consignments, setConsignments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentLocationRoute, setCurrentLocationRoute] = useState([]);
  const [showTruckPopup, setShowTruckPopup] = useState(false);
  const [truckPopupData, setTruckPopupData] = useState(null);
  const [truckPopupPosition, setTruckPopupPosition] = useState({ x: 0, y: 0 });

  const toggleExpand = (item) => {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
    setSelectedShipment(item);
  };

  const handleTruckClick = (e) => {
    if (trackingData) {
      const truckData = {
        driverName: trackingData.driverName || "Sam",
        vehicleNumber: trackingData.vehicleNumber || "WH06AL7844",
        batteryHealth: trackingData.locationData?.deviceInfo?.batteryLevel || 80,
        speed: Math.round((trackingData.locationData?.speed || 0) * 3.6), // Convert m/s to km/h
        address: trackingData.locationData?.address || "Location not available",
        currentLocation: trackingData.currentLocation
      };
      setTruckPopupData(truckData);
      
      // Calculate popup position relative to the map container
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer) {
        const rect = mapContainer.getBoundingClientRect();
        const x = e.containerPoint.x + rect.left;
        const y = e.containerPoint.y + rect.top - 190; // Position at the top of the icon
        setTruckPopupPosition({ x, y });
      }
      
      setShowTruckPopup(true);
    }
  };

  // Function to fetch route from OSRM
  const fetchRoute = async (origin, destination) => {
    try {
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`
      );
      
      if (response.data.routes && response.data.routes.length > 0) {
        const coordinates = response.data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(coordinates);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
      // Fallback to straight line if routing fails
      setRouteCoordinates([
        [origin.lat, origin.lon],
        [destination.lat, destination.lon]
      ]);
    }
  };

  // Function to fetch route from current location to nearest point on main route
  const fetchCurrentLocationRoute = async (currentLocation, routeCoords) => {
    if (!currentLocation || routeCoords.length === 0) return;
    
    try {
      // Find the nearest point on the route to current location
      let nearestPoint = routeCoords[0];
      let minDistance = Infinity;
      
      routeCoords.forEach(point => {
        const distance = Math.sqrt(
          Math.pow(currentLocation.lat - point[0], 2) + 
          Math.pow(currentLocation.lon - point[1], 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      });
      
      // Fetch route from current location to nearest point
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${currentLocation.lon},${currentLocation.lat};${nearestPoint[1]},${nearestPoint[0]}?overview=full&geometries=geojson`
      );
      
      if (response.data.routes && response.data.routes.length > 0) {
        const coordinates = response.data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setCurrentLocationRoute(coordinates);
      }
    } catch (error) {
      console.error("Error fetching current location route:", error);
      // Fallback to straight line
      if (routeCoords.length > 0) {
        setCurrentLocationRoute([
          [currentLocation.lat, currentLocation.lon],
          routeCoords[0]
        ]);
      }
    }
  };

  const fetchConsignments = async () => {
    try {
      let res;

      if (searchTerm.trim()) {
        res = await axios.get(`https://vpl-liveproject-1.onrender.com/api/v1/load/shipment/${searchTerm}`);
      } else {
        res = await axios.get(`https://vpl-liveproject-1.onrender.com/api/v1/load/shipment/`);
      }

      const track = res.data?.tracking;

      if (track) {
        // Store the complete tracking data for polyline
        setTrackingData(track);
        
        // Debug: Log current location
        console.log("Current Location:", track.currentLocation);
        console.log("Origin:", track.originLatLng);
        console.log("Destination:", track.destinationLatLng);
        
        // Fetch the road route if we have origin and destination
        if (track.originLatLng && track.destinationLatLng) {
          fetchRoute(track.originLatLng, track.destinationLatLng);
        }
        
        // Fetch current location route after main route is loaded
        if (track.currentLocation) {
          // Wait a bit for main route to load, then fetch current location route
          setTimeout(() => {
            if (routeCoordinates.length > 0) {
              fetchCurrentLocationRoute(track.currentLocation, routeCoordinates);
            }
          }, 1000);
        }
        
        const consignment = {
          id: track._id,
          number: track.shipmentNumber,
          location: `${track.originName} → ${track.destinationName}`,
          lat: track.originLatLng?.lat,
          lng: track.originLatLng?.lon,
          deliveryProgress:
            track.status === "delivered" ? 100 : track.status === "in_transit" ? 60 : 20,
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
              time: new Date().toLocaleString(),
              done: track.status !== "loading",
            },
            {
              label: "Delivered",
              name: track.driverName || "Driver",
              time: new Date(track.load?.deliveryDate || Date.now()).toLocaleString(),
              done: track.status === "delivered",
            },
          ],
        };
        setConsignments([consignment]);
      } else {
        setConsignments([]);
        setTrackingData(null);
        setRouteCoordinates([]);
        setCurrentLocationRoute([]);
      }
    } catch (err) {
      console.error("Error fetching shipment", err);
      setConsignments([]);
      setTrackingData(null);
      setRouteCoordinates([]);
      setCurrentLocationRoute([]);
    }
  };

  // Initial + 10s interval fetch
  useEffect(() => {
    fetchConsignments();
    // const interval = setInterval(fetchConsignments, 10000); // every 10s
    // return () => clearInterval(interval);
  }, [searchTerm]);

  function RecenterMap({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
      if (lat && lng) {
        map.setView([lat, lng], 7);
      }
    }, [lat, lng]);
    return null;
  }

  // Function to fit map bounds to show all markers
  function FitBounds({ trackingData, routeCoordinates, currentLocationRoute }) {
    const map = useMap();
    
    useEffect(() => {
      if (trackingData && (routeCoordinates.length > 0 || currentLocationRoute.length > 0)) {
        const bounds = L.latLngBounds();
        
        // Add origin and destination
        if (trackingData.originLatLng) {
          bounds.extend([trackingData.originLatLng.lat, trackingData.originLatLng.lon]);
        }
        if (trackingData.destinationLatLng) {
          bounds.extend([trackingData.destinationLatLng.lat, trackingData.destinationLatLng.lon]);
        }
        
        // Add current location
        if (trackingData.currentLocation) {
          bounds.extend([trackingData.currentLocation.lat, trackingData.currentLocation.lon]);
        }
        
        // Add route coordinates
        routeCoordinates.forEach(coord => {
          bounds.extend(coord);
        });
        
        // Add current location route coordinates
        currentLocationRoute.forEach(coord => {
          bounds.extend(coord);
        });
        
        // Fit map to show all markers with some padding
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [trackingData, routeCoordinates, currentLocationRoute]);
    
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Custom CSS for truck icon visibility */}
      <style jsx>{`
        .truck-marker-icon {
          background-color: transparent !important;
          border: none !important;
        }
        .leaflet-marker-icon.truck-marker-icon {
          background-color: transparent !important;
        }
      `}</style>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Sidebar */}
      <div className="w-96 bg-white/90 backdrop-blur-xl p-6 border-r border-white/20 overflow-y-auto shadow-2xl relative z-10">
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        {/* Header */}
        <div className="mb-8">
          {/* <div className="flex items-center gap-4 mb-3">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Live Tracker
              </h2>
              <p className="text-sm text-gray-600 font-medium">🚀 Real-time shipment tracking</p>
            </div>
          </div> */}
          {/* Stats Bar */}
          {/* <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-sm rounded-xl p-3 border border-blue-200/50">
              <div className="text-2xl font-bold text-blue-600">{consignments.length}</div>
              <div className="text-xs text-blue-500 font-medium">Active</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-sm rounded-xl p-3 border border-green-200/50">
              <div className="text-2xl font-bold text-green-600">24/7</div>
              <div className="text-xs text-green-500 font-medium">Tracking</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-sm rounded-xl p-3 border border-purple-200/50">
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-xs text-purple-500 font-medium">Secure</div>
            </div>
          </div> */}
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          {/* Search Icon Container */}
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Input Field */}
          <input
            type="text"
            placeholder="🔍 Search by Shipment Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-16 py-4 border-2 border-white/30 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/60 backdrop-blur-xl shadow-lg hover:shadow-xl hover:bg-white/80"
          />
          
          {/* Clear Button */}
          {searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <button 
                onClick={() => setSearchTerm("")}
                className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Search Button */}
          {!searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <button className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-200 shadow-lg hover:shadow-xl">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Decorative Elements */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full animate-pulse delay-1000"></div>
        </div>

        {/* Shipments List */}
        {consignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No shipment found</p>
            <p className="text-gray-400 text-xs mt-1">Search for a shipment to start tracking</p>
          </div>
        ) : (
          consignments.map((item) => (
            <div
              key={item.id}
              className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5 mb-4 border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
              onClick={() => toggleExpand(item)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{item.number}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.location}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                </div>
                <div className="text-lg transition-transform duration-200">
                  {expandedId === item.id ? (
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <img src={ArrowUp} className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <img src={ArrowDown} className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              {expandedId === item.id && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="space-y-5">
                    {item.status.map((step, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                            step.done ? 'bg-green-500' : 'bg-gray-200'
                          }`}>
                            <img
                              src={step.done ? Checkcircle : locationMarker}
                              alt={step.label}
                              className="w-4 h-4"
                            />
                          </div>
                          {index < item.status.length - 1 && (
                            <div className="w-0.5 h-8 bg-gradient-to-b from-green-400 to-green-200 my-1"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${step.done ? "text-green-600" : "text-gray-700"}`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{step.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{step.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Map Container */}
      <div className="flex-grow relative z-10 top-[26px]">
        {/* Map Header */}
        <div className="absolute top-6 left-6 z-20 bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-white/30">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h3 className="font-black text-gray-800 text-base">🚀 Live Tracking</h3>
              <p className="text-xs text-gray-600 font-medium">Real-time location updates</p>
            </div>
          </div>
        </div>

        {/* Map Legend */}
        <div className="absolute top-6 right-6 z-20 bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-white/30">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">Main Route</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">Current Location</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">Destination</span>
            </div>
          </div>
        </div>

        <MapContainer
          center={[39.8283, -98.5795]}
          zoom={4}
          scrollWheelZoom={true}
          zoomControl={true}
          className="w-full h-full rounded-l-3xl shadow-2xl border-4 border-white/20"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Origin Marker */}
          {trackingData?.originLatLng && (
            <Marker 
              position={[trackingData.originLatLng.lat, trackingData.originLatLng.lon]} 
              icon={originIcon}
            />
          )}
          
          {/* Destination Marker */}
          {trackingData?.destinationLatLng && (
            <Marker 
              position={[trackingData.destinationLatLng.lat, trackingData.destinationLatLng.lon]} 
              icon={destinationIcon}
            />
          )}
          
                     {/* Current Location Truck Marker */}
           {trackingData?.currentLocation && (
             <Marker 
               position={[trackingData.currentLocation.lat, trackingData.currentLocation.lon]} 
               icon={createCustomTruckIcon()}
               eventHandlers={{
                 click: handleTruckClick
               }}
             />
           )}
          
          {/* Main Road Route Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              positions={routeCoordinates}
              color="blue"
              weight={4}
              opacity={0.8}
            />
          )}
          
          {/* Current Location to Route Polyline */}
          {currentLocationRoute.length > 0 && (
            <Polyline
              positions={currentLocationRoute}
              color="red"
              weight={3}
              opacity={0.9}
              dashArray="10, 5"
            />
          )}
          
          {/* Fit map bounds to show all markers */}
          <FitBounds 
            trackingData={trackingData} 
            routeCoordinates={routeCoordinates} 
            currentLocationRoute={currentLocationRoute} 
          />
          
          {selectedShipment && (
            <RecenterMap lat={selectedShipment.lat} lng={selectedShipment.lng} />
          )}
        </MapContainer>
      </div>

      {/* Truck Popup - Map Positioned */}
      {showTruckPopup && truckPopupData && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${truckPopupPosition.x}px`,
            top: `${truckPopupPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[240px] pointer-events-auto">
            {/* Close Button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowTruckPopup(false)}
                className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Driver Name */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Driver: <span className="font-semibold text-gray-800">{truckPopupData.driverName}</span></p>
            </div>

            {/* Vehicle Number */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Vehicle: <span className="font-semibold text-gray-800">{truckPopupData.vehicleNumber}</span></p>
            </div>

            {/* Address */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Location: <span className="font-semibold text-gray-800">{truckPopupData.address}</span></p>
            </div>

            {/* Battery Health */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Battery: <span className="font-semibold text-gray-800">{truckPopupData.batteryHealth}%</span></p>
            </div>

            {/* Speed */}
            <div className="mb-1">
              <p className="text-xs text-gray-600">Speed: <span className="font-semibold text-gray-800">{truckPopupData.speed} km/h</span></p>
            </div>
          </div>
          
          {/* Pointer Triangle */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-white"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
          ></div>
        </div>
      )}
    </div>
  );
}
