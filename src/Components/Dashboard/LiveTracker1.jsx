import React, { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RedTruck, Checkcircle, locationMarker, ArrowDown, ArrowUp } from "../../assets/image";
import truckImg from '../../assets/Icons super admin/map-truckImage.png';
import API_CONFIG from '../../config/api.js';


// Custom Flatbed/Container Truck Icon using local image
const createCustomTruckIcon = () => {
  return new L.Icon({
    iconUrl: truckImg,
    iconSize: [70, 40],
    iconAnchor: [35, 20],
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

// --- Utils: date + status colors ---
const formatDDMMYYYY = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// loading / in-transit / delivered timeline color mapping
const getStepColor = (label) => {
  const L = String(label || '').toLowerCase();
  if (L.includes('loading')) return { dot: 'bg-yellow-500', line: 'from-yellow-400 to-yellow-200', text: 'text-yellow-700' };
  if (L.includes('in-transit')) return { dot: 'bg-blue-600', line: 'from-blue-500 to-blue-200', text: 'text-blue-700' };
  if (L.includes('delivered')) return { dot: 'bg-green-700', line: 'from-green-600 to-green-300', text: 'text-green-700' };
  return { dot: 'bg-gray-300', line: 'from-gray-300 to-gray-200', text: 'text-gray-700' };
};
// --- Step icons (hourglass, truck, check) ---
const StepIcon = ({ label, size = 24, className = "" }) => {
  const L = String(label || "").toLowerCase();

  if (L.includes("loading")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <path d="M6 3h12v4l-6 4-6-4V3z" />
        <path d="M6 21v-4l6-4 6 4v4H6z" />
      </svg>
    );
  }

  if (L.includes("in-transit") || L.includes("in transit")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
        <rect x="3" y="8" width="11" height="6" rx="1" />
        <path d="M14 10h3l2 3v1h-5v-4z" />
        <circle cx="7" cy="16.5" r="1.7" />
        <circle cx="17" cy="16.5" r="1.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4 10-10" />
    </svg>
  );
};


// active/inactive badge color
const getActivity = (track) => {
  const isInactive = String(track?.status || '').toLowerCase() === 'inactive';
  return {
    label: isInactive ? 'Inactive' : 'Active',
    dotClass: isInactive ? 'bg-gray-400' : 'bg-green-500',
    textClass: isInactive ? 'text-gray-600' : 'text-green-600'
  };
};

// map polyline color by status
const getRouteColorByStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered') return '#15803d'; // dark green
  if (s === 'in_transit') return '#2563eb'; // blue
  if (s === 'loading') return '#f59e0b'; // yellow
  return '#94a3b8'; // slate/gray fallback
};


export default function ConsignmentTracker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
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
        driverName: trackingData.driverName || "Driver Not Assigned",
        vehicleNumber: trackingData.vehicleNumber || "Vehicle Not Assigned",
        batteryHealth: trackingData.locationData?.deviceInfo?.batteryLevel || "N/A",
        speed: trackingData.locationData?.speed ? Math.round(trackingData.locationData.speed * 3.6) : "N/A", // Convert m/s to km/h
        address: trackingData.locationData?.address || "Location not available",
        currentLocation: trackingData.currentLocation,
        // Add additional info from the new API structure
        shipperName: trackingData.load?.shipper?.compName || "N/A",
        truckerName: trackingData.truckerName || "N/A",
        commodity: trackingData.load?.commodity || "N/A",
        weight: trackingData.load?.weight || "N/A"
      };
      setTruckPopupData(truckData);

      // Zoom to truck location
      if (trackingData.currentLocation && 
          trackingData.currentLocation.lat != null && 
          trackingData.currentLocation.lon != null) {
        const map = e.target._map;
        if (map) {
          map.setView(
            [trackingData.currentLocation.lat, trackingData.currentLocation.lon],
            15, // Zoom level (15 is a good close-up view)
            { animate: true, duration: 1 } // Smooth animation
          );
        }
      }

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
    // Validate origin and destination have valid coordinates
    if (!origin || !destination ||
        origin.lat == null || origin.lon == null ||
        destination.lat == null || destination.lon == null) {
      console.warn("Invalid coordinates for route fetching");
      return;
    }

    // Use overview=full to get detailed route geometry (not simplified)
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&alternatives=false`;
    console.log("🛣️ Fetching route from OSRM:", url);

    try {
      // Use fetch API instead of axios to avoid CORS issues with credentials
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors', // Explicitly set CORS mode
        credentials: 'omit', // Don't send credentials
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ OSRM Response:", data);

      // Check for successful response
      if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Check if geometry exists and has coordinates
        if (route.geometry && route.geometry.coordinates && route.geometry.coordinates.length > 0) {
          // Convert GeoJSON coordinates [lon, lat] to Leaflet format [lat, lon]
          const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          
          // Ensure we have at least 2 points (start and end)
          if (coordinates.length >= 2) {
            console.log("✅ Route coordinates set:", coordinates.length, "points");
            console.log("✅ Route distance:", route.distance, "meters");
            console.log("✅ Route duration:", route.duration, "seconds");
            setRouteCoordinates(coordinates);
            return; // Successfully set route, exit function
          } else {
            console.warn("⚠️ Route has insufficient coordinates:", coordinates.length);
          }
        } else {
          console.warn("⚠️ Route geometry is missing or empty");
        }
      } else {
        // Check if there's an error code
        if (data && data.code) {
          console.warn("⚠️ OSRM returned error code:", data.code, data.message || '');
        } else {
          console.warn("⚠️ No valid routes found in OSRM response:", data);
        }
      }
      
      // If we reach here, OSRM didn't provide a valid route
      // Try alternative: use simplified route or fallback
      console.warn("⚠️ Falling back to simplified route request");
      try {
        const simplifiedUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=simplified&geometries=geojson`;
        
        const simplifiedController = new AbortController();
        const simplifiedTimeoutId = setTimeout(() => simplifiedController.abort(), 10000);
        
        const simplifiedResponse = await fetch(simplifiedUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'application/json'
          },
          signal: simplifiedController.signal
        });

        clearTimeout(simplifiedTimeoutId);

        if (simplifiedResponse.ok) {
          const simplifiedData = await simplifiedResponse.json();
          
          if (simplifiedData && simplifiedData.routes && simplifiedData.routes.length > 0) {
            const route = simplifiedData.routes[0];
            if (route.geometry && route.geometry.coordinates && route.geometry.coordinates.length > 0) {
              const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
              console.log("✅ Simplified route coordinates set:", coordinates.length, "points");
              setRouteCoordinates(coordinates);
              return;
            }
          }
        }
      } catch (simplifiedError) {
        console.warn("⚠️ Simplified route also failed:", simplifiedError);
      }
      
      // Last resort: straight line fallback
      console.warn("📏 Using straight line fallback as last resort");
      setRouteCoordinates([
        [origin.lat, origin.lon],
        [destination.lat, destination.lon]
      ]);
      
    } catch (error) {
      console.error("❌ Error fetching route:", error);
      console.error("❌ Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      // Only use fallback if it's a network error, not if coordinates are invalid
      if (origin.lat != null && origin.lon != null &&
          destination.lat != null && destination.lon != null) {
        console.warn("⚠️ OSRM API error - using straight line fallback");
        setRouteCoordinates([
          [origin.lat, origin.lon],
          [destination.lat, destination.lon]
        ]);
      }
    }
  };

  // Function to fetch route from current location to nearest point on main route
  const fetchCurrentLocationRoute = async (currentLocation, routeCoords) => {
    // Validate current location has valid coordinates
    if (!currentLocation || 
        currentLocation.lat == null || 
        currentLocation.lon == null || 
        routeCoords.length === 0) {
      return;
    }

    try {
      // Find the nearest point on the route to current location
      let nearestPoint = routeCoords[0];
      let minDistance = Infinity;

      routeCoords.forEach(point => {
        if (point && point.length === 2 && point[0] != null && point[1] != null) {
          const distance = Math.sqrt(
            Math.pow(currentLocation.lat - point[0], 2) +
            Math.pow(currentLocation.lon - point[1], 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = point;
          }
        }
      });

      // Validate nearest point before making API call
      if (!nearestPoint || nearestPoint.length !== 2 || 
          nearestPoint[0] == null || nearestPoint[1] == null) {
        return;
      }

      // Fetch route from current location to nearest point
      const currentLocationUrl = `https://router.project-osrm.org/route/v1/driving/${currentLocation.lon},${currentLocation.lat};${nearestPoint[1]},${nearestPoint[0]}?overview=full&geometries=geojson`;
      
      const currentLocationController = new AbortController();
      const currentLocationTimeoutId = setTimeout(() => currentLocationController.abort(), 10000);
      
      const response = await fetch(currentLocationUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/json'
        },
        signal: currentLocationController.signal
      });

      clearTimeout(currentLocationTimeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setCurrentLocationRoute(coordinates);
        }
      }
    } catch (error) {
      console.error("Error fetching current location route:", error);
      // Fallback to straight line only if coordinates are valid
      if (routeCoords.length > 0 && 
          currentLocation.lat != null && 
          currentLocation.lon != null &&
          routeCoords[0] && 
          routeCoords[0].length === 2) {
        setCurrentLocationRoute([
          [currentLocation.lat, currentLocation.lon],
          routeCoords[0]
        ]);
      }
    }
  };

  const fetchConsignments = async () => {
    try {
      // Clear previous route coordinates at the start
      setRouteCoordinates([]);
      setCurrentLocationRoute([]);
      
      let res;

      // Get auth token for API call
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (debouncedSearchTerm.trim()) {
        res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/shipment/${debouncedSearchTerm}`, {
          headers: headers
        });
      } else {
        res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/shipment/`, {
          headers: headers
        });
      }

      // Check if response is successful
      if (!res.data || !res.data.success) {
        console.error("API Error: Response not successful", res.data);
        setConsignments([]);
        setTrackingData(null);
        return;
      }

      const track = res.data?.tracking;

      if (track) {
        // Extract location data from the API structure
        // origins and destinations are directly on tracking, not on track.load
        // Use the LAST origin (final pickup) and FIRST destination (first delivery)
        const originsArray = track.origins || [];
        const destinationsArray = track.destinations || [];
        const originData = originsArray.length > 0 ? originsArray[originsArray.length - 1] : null; // Last origin
        const destinationData = destinationsArray.length > 0 ? destinationsArray[0] : null; // First destination
        
        // Create proper location names
        const originName = originData ? `${originData.city}, ${originData.state}` : (track.originName || "Origin Location");
        const destinationName = destinationData ? `${destinationData.city}, ${destinationData.state}` : (track.destinationName || "Destination Location");
        
        // Extract coordinates from origins/destinations array or use existing originLatLng/destinationLatLng
        let originLatLng = null;
        let destinationLatLng = null;
        
        if (originData && typeof originData.lat === 'number' && typeof originData.lon === 'number' && 
            originData.lat !== 0 && originData.lon !== 0) {
          originLatLng = { lat: originData.lat, lon: originData.lon };
        } else if (track.originLatLng && track.originLatLng.lat !== 0) {
          originLatLng = track.originLatLng;
        }
        
        if (destinationData && typeof destinationData.lat === 'number' && typeof destinationData.lon === 'number' && 
            destinationData.lat !== 0 && destinationData.lon !== 0) {
          destinationLatLng = { lat: destinationData.lat, lon: destinationData.lon };
        } else if (track.destinationLatLng && track.destinationLatLng.lat !== 0) {
          destinationLatLng = track.destinationLatLng;
        }
        
        // Debug logging
        console.log("📍 Origins array:", originsArray.length, "items");
        console.log("📍 Destinations array:", destinationsArray.length, "items");
        console.log("📍 Selected Origin:", originData);
        console.log("📍 Selected Destination:", destinationData);
        console.log("📍 Origin LatLng:", originLatLng);
        console.log("📍 Destination LatLng:", destinationLatLng);
        
        // Check if origin and destination are the same (would cause routing issues)
        if (originLatLng && destinationLatLng && 
            originLatLng.lat === destinationLatLng.lat && 
            originLatLng.lon === destinationLatLng.lon) {
          console.warn("⚠️ Origin and destination are the same - cannot create route");
        }
        
        // Create enhanced tracking data with proper location info
        const enhancedTrack = {
          ...track,
          originName,
          destinationName,
          originLatLng,
          destinationLatLng,
          // Use proper driver name
          driverName: track.driverName && track.driverName !== "na" ? track.driverName : "Driver Not Assigned",
          // Use proper vehicle number
          vehicleNumber: track.vehicleNumber && track.vehicleNumber !== "naaa" ? track.vehicleNumber : "Vehicle Not Assigned"
        };

        // Store the enhanced tracking data for polyline
        setTrackingData(enhancedTrack);

        // Debug: Log current location




        // Fetch the road route if we have valid origin and destination coordinates
        if (originLatLng && destinationLatLng) {
          // Check if origin and destination are exactly the same (within very small threshold)
          const latDiff = Math.abs(originLatLng.lat - destinationLatLng.lat);
          const lonDiff = Math.abs(originLatLng.lon - destinationLatLng.lon);
          const isSameLocation = latDiff < 0.0001 && lonDiff < 0.0001; // Very small threshold (about 11 meters)
          
          if (isSameLocation) {
            console.warn("⚠️ Origin and destination are too close - skipping route fetch");
            setRouteCoordinates([]);
          } else {
            console.log("🛣️ Fetching route with:", { origin: originLatLng, destination: destinationLatLng });
            fetchRoute(originLatLng, destinationLatLng);
          }
        } else {
          console.warn("❌ Invalid coordinates - cannot fetch route", { originLatLng, destinationLatLng });
          setRouteCoordinates([]);
        }

        // Fetch current location route after main route is loaded
        if (enhancedTrack.currentLocation && 
            enhancedTrack.currentLocation.lat != null && 
            enhancedTrack.currentLocation.lon != null) {
          // Wait a bit for main route to load, then fetch current location route
          setTimeout(() => {
            if (routeCoordinates.length > 0) {
              fetchCurrentLocationRoute(enhancedTrack.currentLocation, routeCoordinates);
            }
          }, 1000);
        }

        const activity = getActivity(enhancedTrack);

        const consignment = {
          id: enhancedTrack._id,
          number: enhancedTrack.shipmentNumber,
          location: `${originName} → ${destinationName}`,
          lat: enhancedTrack.originLatLng?.lat || 0,
          lng: enhancedTrack.originLatLng?.lon || 0,
          activity, // {label, dotClass, textClass}
          deliveryProgress:
            enhancedTrack.status === "delivered" ? 100
              : enhancedTrack.status === "in_transit" ? 60
                : 20,
          status: [
            {
              label: "Loading",
              name: enhancedTrack.driverName,
              time: formatDDMMYYYY(enhancedTrack.startedAt),
              done: true,
            },
            {
              label: "In-Transit",
              name: enhancedTrack.driverName,
              time: formatDDMMYYYY(Date.now()),
              done: String(enhancedTrack.status).toLowerCase() !== "loading",
            },
            {
              label: "Delivered",
              name: enhancedTrack.driverName,
              time: formatDDMMYYYY(enhancedTrack.load?.deliveryDate || Date.now()),
              done: String(enhancedTrack.status).toLowerCase() === "delivered",
            },
          ],
          mapLineColor: getRouteColorByStatus(enhancedTrack.status),
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
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      setConsignments([]);
      setTrackingData(null);
      setRouteCoordinates([]);
      setCurrentLocationRoute([]);
    }
  };

  // Debounce searchTerm to prevent multiple API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial + 10s interval fetch - use debouncedSearchTerm
  useEffect(() => {
    fetchConsignments();
    const interval = setInterval(fetchConsignments, 30000); // every 30s (reduced from 10s to prevent 429 errors)
    return () => clearInterval(interval);
  }, [debouncedSearchTerm]);

  // Debug: Log route coordinates changes
  useEffect(() => {
    if (routeCoordinates.length > 0) {
      console.log("🗺️ Route coordinates updated:", routeCoordinates.length, "points");
      console.log("🗺️ First point:", routeCoordinates[0]);
      console.log("🗺️ Last point:", routeCoordinates[routeCoordinates.length - 1]);
    } else {
      console.log("🗺️ Route coordinates cleared");
    }
  }, [routeCoordinates]);

  function RecenterMap({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
      if (lat != null && lng != null && typeof lat === 'number' && typeof lng === 'number') {
        map.setView([lat, lng], 7);
      }
    }, [lat, lng, map]);
    return null;
  }

  // Function to fit map bounds to show all markers (only on initial load)
  function FitBounds({ trackingData, routeCoordinates, currentLocationRoute }) {
    const map = useMap();
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
      // Only fit bounds once when data first loads, not on every update
      if (!hasInitialized && trackingData && (routeCoordinates.length > 0 || currentLocationRoute.length > 0)) {
        const bounds = L.latLngBounds();

        // Add origin and destination with validation
        if (trackingData.originLatLng && 
            trackingData.originLatLng.lat != null && 
            trackingData.originLatLng.lon != null) {
          bounds.extend([trackingData.originLatLng.lat, trackingData.originLatLng.lon]);
        }
        if (trackingData.destinationLatLng && 
            trackingData.destinationLatLng.lat != null && 
            trackingData.destinationLatLng.lon != null) {
          bounds.extend([trackingData.destinationLatLng.lat, trackingData.destinationLatLng.lon]);
        }

        // Add current location with validation
        if (trackingData.currentLocation && 
            trackingData.currentLocation.lat != null && 
            trackingData.currentLocation.lon != null) {
          bounds.extend([trackingData.currentLocation.lat, trackingData.currentLocation.lon]);
        }

        // Add route coordinates
        routeCoordinates.forEach(coord => {
          if (coord && coord.length === 2 && coord[0] != null && coord[1] != null) {
            bounds.extend(coord);
          }
        });

        // Add current location route coordinates
        currentLocationRoute.forEach(coord => {
          if (coord && coord.length === 2 && coord[0] != null && coord[1] != null) {
            bounds.extend(coord);
          }
        });

        // Only fit bounds if we have valid coordinates
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
          setHasInitialized(true);
        }
      }
    }, [trackingData, routeCoordinates, currentLocationRoute, map, hasInitialized]);

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
        <form
          className="relative mb-8"
          onSubmit={(e) => { 
            e.preventDefault(); 
            setDebouncedSearchTerm(searchTerm); // Update immediately on submit
          }}
        >
          {/* Input Field (LEFT ICON REMOVED) */}
          <input
            type="text"
            placeholder="Search by Shipment Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter') { 
                e.preventDefault(); 
                setDebouncedSearchTerm(searchTerm); // Update immediately on Enter
              } 
            }}
            className="w-full pl-5 pr-16 py-4 border-2 border-white/30 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/60 backdrop-blur-xl shadow-lg hover:shadow-xl hover:bg-white/80"
          />

          {/* Clear / Search Buttons on right */}
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
            {searchTerm && (
              <button
                type="button"
                onClick={() => { 
                  setSearchTerm(''); 
                  setDebouncedSearchTerm(''); // Clear debounced term immediately
                }}
                className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Clear"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Search"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>


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
                      <div className={`w-2 h-2 rounded-full ${item.activity.dotClass} ${item.activity.label === 'Active' ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-xs font-medium ${item.activity.textClass}`}>{item.activity.label}</span>
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
                          {(() => {
                            const c = getStepColor(step.label);
                            return (
                              <>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${c.dot}`}>
                                  <StepIcon label={step.label} className="text-white" />

                                </div>
                                {index < item.status.length - 1 && (
                                  <div className={`w-0.5 h-8 bg-gradient-to-b ${c.line} my-1`}></div>
                                )}
                              </>
                            );
                          })()}

                        </div>
                        <div className="flex-1">
                          {(() => {
                            const c = getStepColor(step.label);
                            return (
                              <p className={`font-semibold text-sm ${c.text}`}>
                                {step.label}
                              </p>
                            );
                          })()}

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
              <img src={truckImg} alt="Truck" className="w-6 h-4 object-contain" />
              <span className="text-xs font-medium text-gray-700">Current Location</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">Route</span>
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
          {trackingData?.originLatLng && 
           trackingData.originLatLng.lat != null && 
           trackingData.originLatLng.lon != null && (
            <Marker
              position={[trackingData.originLatLng.lat, trackingData.originLatLng.lon]}
              icon={originIcon}
            />
          )}

          {/* Destination Marker */}
          {trackingData?.destinationLatLng && 
           trackingData.destinationLatLng.lat != null && 
           trackingData.destinationLatLng.lon != null && (
            <Marker
              position={[trackingData.destinationLatLng.lat, trackingData.destinationLatLng.lon]}
              icon={destinationIcon}
            />
          )}

          {/* Current Location Truck Marker */}
          {trackingData?.currentLocation && 
           trackingData.currentLocation.lat != null && 
           trackingData.currentLocation.lon != null && (
            <Marker
              position={[trackingData.currentLocation.lat, trackingData.currentLocation.lon]}
              icon={createCustomTruckIcon()}
              eventHandlers={{
                click: handleTruckClick
              }}
            />
          )}

          {/* Main Road Route Polyline */}
          {routeCoordinates.length > 0 && trackingData && (
            <Polyline
              key={`route-${routeCoordinates.length}-${trackingData._id || trackingData.shipmentNumber}`}
              positions={routeCoordinates}
              color={getRouteColorByStatus(trackingData?.status)}
              weight={5}
              opacity={0.8}
              smoothFactor={1}
            />
          )}

          {/* Current Location to Route Polyline - Removed to prevent visual issues */}

          {/* Fit map bounds to show all markers */}
          <FitBounds
            trackingData={trackingData}
            routeCoordinates={routeCoordinates}
            currentLocationRoute={currentLocationRoute}
          />

          {/* RecenterMap removed - FitBounds handles initial view, user controls zoom after */}
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
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[280px] pointer-events-auto">
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

            {/* Shipper */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Shipper: <span className="font-semibold text-gray-800">{truckPopupData.shipperName}</span></p>
            </div>

            {/* Trucker */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Trucker: <span className="font-semibold text-gray-800">{truckPopupData.truckerName}</span></p>
            </div>

            {/* Commodity */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Commodity: <span className="font-semibold text-gray-800">{truckPopupData.commodity}</span></p>
            </div>

            {/* Weight */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Weight: <span className="font-semibold text-gray-800">{truckPopupData.weight} lbs</span></p>
            </div>

            {/* Address */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Location: <span className="font-semibold text-gray-800">{truckPopupData.address}</span></p>
            </div>

            {/* Battery Health */}
            <div className="mb-2">
              <p className="text-xs text-gray-600">Battery: <span className="font-semibold text-gray-800">{truckPopupData.batteryHealth}{typeof truckPopupData.batteryHealth === 'number' ? '%' : ''}</span></p>
            </div>

            {/* Speed */} 
            <div className="mb-1">
              <p className="text-xs text-gray-600">Speed: <span className="font-semibold text-gray-800">{truckPopupData.speed}{typeof truckPopupData.speed === 'number' ? ' km/h' : ''}</span></p>
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
