import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaTruck,
  FaBox,
  FaCalendar,
  FaClock,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaSearch,
  FaEdit,
  FaEye,
} from "react-icons/fa";
import API_CONFIG from "../config/api.js";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";

export default function Consignment() {
  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [pickupImages, setPickupImages] = useState(null);
  const [dropImages, setDropImages] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Listen for assignment accepted event to refresh data
  useEffect(() => {
    const handleAssignmentAccepted = () => {
      fetchConsignments();
    };
    window.addEventListener("assignmentAccepted", handleAssignmentAccepted);
    return () => {
      window.removeEventListener(
        "assignmentAccepted",
        handleAssignmentAccepted,
      );
    };
  }, []);

  // Fetch consignments from API
  const fetchConsignments = async () => {
    try {
      setLoading(true);

      // Get authentication token
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken");

      console.log("Token:", token); // Debug token

      if (!token) {
        alertify.error("Authentication required. Please login again.");
        return;
      }

      // Fetch data from the new API endpoint for CMT assigned loads
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/bid/cmt-assigned-loads/${sessionStorage.getItem("empId")}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          // Removed withCredentials to avoid CORS issues
        },
      );

      console.log("API Response:", response); // Debug response
      console.log("Response Data:", response.data); // Debug response data

      // Check if response has data property
      if (response.data && response.data.success) {
        const assignedLoads = response.data.data?.assignedLoads || [];
        console.log("Assigned Loads:", assignedLoads); // Debug assigned loads

        if (Array.isArray(assignedLoads)) {
          // Filter out entries where load is null and transform the rest
          const transformedData = assignedLoads
            .filter(
              (assignedLoad) =>
                assignedLoad.load !== null && assignedLoad.load !== undefined,
            )
            .map((assignedLoad, index) => {
              const load = assignedLoad.load;

              // Find accepted trucker or fallback to first trucker
              const acceptedTrucker =
                load.truckers?.find(
                  (trucker) => trucker.status === "Accepted",
                ) || load.truckers?.[0];

              // Build origin address
              let originAddress = "N/A";
              if (load.origin) {
                if (load.origin.addressLine1) {
                  originAddress =
                    `${load.origin.addressLine1}, ${load.origin.city || ""}, ${load.origin.state || ""}`
                      .trim()
                      .replace(/^,\s*|,\s*$/g, "");
                } else if (load.origin.city) {
                  originAddress =
                    `${load.origin.city}, ${load.origin.state || ""}`
                      .trim()
                      .replace(/^,\s*|,\s*$/g, "");
                }
              }

              // Build destination address
              let destinationAddress = "N/A";
              if (load.destination) {
                if (load.destination.addressLine1) {
                  destinationAddress =
                    `${load.destination.addressLine1}, ${load.destination.city || ""}, ${load.destination.state || ""}`
                      .trim()
                      .replace(/^,\s*|,\s*$/g, "");
                } else if (load.destination.city) {
                  destinationAddress =
                    `${load.destination.city}, ${load.destination.state || ""}`
                      .trim()
                      .replace(/^,\s*|,\s*$/g, "");
                }
              }

              return {
                id: assignedLoad._id || `load-${index}`,
                sNo: index + 1, // Index is already sequential after filter
                shipmentNo: load.shipmentNumber || "N/A",
                shipperName: load.shipper?.compName || "N/A",
                truckerName:
                  acceptedTrucker?.carrier?.compName ||
                  load.carrier?.compName ||
                  load.assignedTo?.compName ||
                  "N/A",
                driverName: acceptedTrucker?.driverName || "N/A",
                vehicleNo: acceptedTrucker?.vehicleNumber || "N/A",
                status: load.status || assignedLoad.overallStatus || "N/A",
                pickupAddress: originAddress,
                deliveryAddress: destinationAddress,
                dropLocationImages: {},
                containerImages: [],
                eirTickets: [],
                emptyTruckImages: [],
                createdAt:
                  assignedLoad.createdAt ||
                  assignedLoad.assignedAt ||
                  new Date().toISOString().split("T")[0],
                // Additional data for detailed view
                loadDetails: {
                  weight: load.weight,
                  commodity: load.commodity,
                  vehicleType: load.vehicleType,
                  pickupDate: load.pickupDate,
                  deliveryDate: load.deliveryDate,
                  rate: load.rate,
                  truckers: load.truckers || [],
                },
              };
            });

          console.log("Transformed Data:", transformedData); // Debug transformed data
          console.log("Transformed Data Count:", transformedData.length); // Debug count

          if (transformedData.length === 0) {
            console.warn("No valid loads found after filtering null loads");
            alertify.warning("No consignments with valid load data found");
          }

          setConsignments(transformedData);
        } else {
          console.log("Assigned Loads is not an array:", assignedLoads);
          alertify.error("API returned data is not in expected format");
        }
      } else {
        console.log("Unexpected response structure:", response.data);
        console.log("Response data type:", typeof response.data);
        console.log("Response data keys:", Object.keys(response.data || {}));
        alertify.error("Unexpected response structure from API");
      }
    } catch (error) {
      console.error("Error fetching loads:", error);
      console.error("Error response:", error.response);
      console.error("Error message:", error.message);

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        alertify.error(
          `Error: ${error.response.data?.message || `HTTP ${error.response.status}`}`,
        );
      } else if (error.request) {
        console.error("Request error:", error.request);
        alertify.error("Network error. Please check your connection.");
      } else {
        console.error("Other error:", error.message);
        alertify.error(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsignments();
  }, []);

  // Fetch images for a specific shipment
  const fetchShipmentImages = async (shipmentNumber) => {
    try {
      setViewLoading(true);

      // Get authentication token
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken");

      if (!token) {
        alertify.error("Authentication required. Please login again.");
        return null;
      }

      console.log("Fetching images for shipment:", shipmentNumber);
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/load/shipment/${shipmentNumber}/images`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("Images API Response:", response.data);

      if (response.data && response.data.success) {
        console.log("Images data:", response.data.images);
        return response.data.images;
      } else {
        console.log("No images found for shipment:", shipmentNumber);
        return null;
      }
    } catch (error) {
      console.error("Error fetching shipment images:", error);
      console.error("Error response:", error.response);
      alertify.error("Failed to fetch images");
      return null;
    } finally {
      setViewLoading(false);
    }
  };

  // Handle view pickup details
  const handleViewPickup = async (consignment) => {
    console.log("Opening pickup view for:", consignment.shipmentNo);
    setSelectedConsignment({
      ...consignment,
      viewType: "pickup",
    });
    setShowViewModal(true);

    // Fetch pickup images
    const images = await fetchShipmentImages(consignment.shipmentNo);
    console.log("Pickup images received:", images);
    if (images) {
      setPickupImages(images);
    }
  };

  // Handle view drop details
  const handleViewDrop = async (consignment) => {
    console.log("Opening drop view for:", consignment.shipmentNo);
    setSelectedConsignment({
      ...consignment,
      viewType: "drop",
    });
    setShowViewModal(true);

    // Fetch drop images
    const images = await fetchShipmentImages(consignment.shipmentNo);
    console.log("Drop images received:", images);
    if (images) {
      setDropImages(images);
    }
  };

  // Filter consignments based on search term and sort by creation date (latest first - LIFO)
  const filteredConsignments = consignments
    .filter(
      (consignment) =>
        consignment.shipmentNo
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        consignment.truckerName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        consignment.driverName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        consignment.vehicleNo
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        consignment.pickupAddress
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        consignment.deliveryAddress
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination calculations
  const totalPages = Math.ceil(filteredConsignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentConsignments = filteredConsignments.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "in_transit":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "delivered":
        return "bg-green-100 text-green-800 border border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-200";
      case "assigned":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border border-green-200";
      case "active":
        return "bg-green-100 text-green-800 border border-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  // Render image gallery
  const renderImageGallery = (images, title) => {
    if (!images || images.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">
            No {title.toLowerCase()} available
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        {images.map((imageUrl, index) => (
          <div key={index} className="relative group">
            {/* Simple direct image display */}
            <div
              className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
              onClick={() => setPreviewImg(imageUrl)}
            >
              <img
                src={imageUrl}
                alt={`${title} ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log("Image error for:", imageUrl);
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div
                className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                style={{ display: "none" }}
              >
                <FaTimesCircle className="mb-1" size={16} />
                <span>Failed to load</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(imageUrl, "_blank");
                  }}
                  className="text-xs text-blue-500 hover:underline mt-1"
                >
                  Open in new tab
                </button>
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                <FaEye
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  size={16}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Individual image component with proper loading states
  const ImageItem = ({ imageUrl, title, index }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
    const [objectUrl, setObjectUrl] = useState(null);

    // Load image as blob to bypass CORS
    const loadImageAsBlob = async (url) => {
      try {
        const token =
          sessionStorage.getItem("authToken") ||
          localStorage.getItem("authToken");
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          mode: "cors",
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          return url;
        }
        throw new Error("Failed to fetch image");
      } catch (error) {
        console.log("Blob loading failed:", error);
        return null;
      }
    };

    const handleImageLoad = () => {
      setImageLoaded(true);
      setIsLoading(false);
      setImageError(false);
    };

    const handleImageError = () => {
      console.log("Image failed to load:", currentImageUrl);
      if (retryCount < 3) {
        if (retryCount === 0) {
          // Try without crossOrigin
          setCurrentImageUrl(imageUrl);
        } else if (retryCount === 1) {
          // Try loading as blob
          loadImageAsBlob(imageUrl).then((blobUrl) => {
            if (blobUrl) {
              setCurrentImageUrl(blobUrl);
              setObjectUrl(blobUrl);
            } else {
              setImageError(true);
              setIsLoading(false);
            }
          });
        } else if (retryCount === 2) {
          // Try direct URL without any restrictions
          setCurrentImageUrl(imageUrl);
        }
        setRetryCount((prev) => prev + 1);
        setIsLoading(true);
        setImageError(false);
      } else {
        setImageError(true);
        setIsLoading(false);
        setImageLoaded(false);
      }
    };

    const retryImage = () => {
      setRetryCount(0);
      setCurrentImageUrl(imageUrl);
      setIsLoading(true);
      setImageError(false);
      setImageLoaded(false);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
    };

    // Cleanup object URL on unmount
    React.useEffect(() => {
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [objectUrl]);

    return (
      <div className="relative group">
        {/* Loading state */}
        {isLoading && (
          <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Image */}
        {retryCount < 2 ? (
          <img
            src={currentImageUrl}
            alt={`${title} ${index + 1}`}
            className={`w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity ${
              imageLoaded ? "block" : "hidden"
            }`}
            onClick={() => window.open(imageUrl, "_blank")}
            onLoad={handleImageLoad}
            onError={handleImageError}
            crossOrigin={retryCount === 0 ? "anonymous" : undefined}
          />
        ) : (
          <div
            className="w-full h-32 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100"
            onClick={() => window.open(imageUrl, "_blank")}
            style={{
              backgroundImage: `url(${currentImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
              <FaEye
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                size={16}
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {imageError && (
          <div className="w-full h-32 bg-red-50 rounded-lg border border-red-200 flex flex-col items-center justify-center text-red-500 text-sm">
            <FaTimesCircle className="mb-1" size={16} />
            <span>Failed to load</span>
            <div className="flex gap-2 mt-2">
              <button
                onClick={retryImage}
                className="text-xs text-blue-500 hover:underline"
              >
                Retry
              </button>
              <button
                onClick={() => window.open(imageUrl, "_blank")}
                className="text-xs text-blue-500 hover:underline"
              >
                Open in new tab
              </button>
            </div>
          </div>
        )}

        {/* Hover overlay */}
        {imageLoaded && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
            <FaEye
              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
              size={16}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xl font-medium mb-3">Total Consignments</p>
              <p className="text-2xl font-bold text-gray-800">
                {consignments.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaBox className="text-blue-600" size={18} />
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xl font-medium mb-3">Assigned</p>
              <p className="text-2xl font-bold text-blue-600">
                {
                  consignments.filter(
                    (c) => c.status?.toLowerCase() === "assigned",
                  ).length
                }
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaTruck className="text-blue-600" size={18} />
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xl font-medium mb-3">In Transit</p>
              <p className="text-2xl font-bold text-orange-600">
                {
                  consignments.filter(
                    (c) => c.status?.toLowerCase() === "in transit",
                  ).length
                }
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <FaTruck className="text-orange-600" size={18} />
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xl font-medium mb-3">Delivered</p>
              <p className="text-2xl font-bold text-green-600">
                {
                  consignments.filter(
                    (c) => c.status?.toLowerCase() === "delivered",
                  ).length
                }
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FaCheckCircle className="text-green-600" size={18} />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="relative">
            <FaSearch
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search consignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-3 text-lg border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Consignments Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1s",
                }}
              ></div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xl font-semibold text-gray-800 mb-2">
                Loading Consignments...
              </p>
              <p className="text-sm text-gray-600">
                Please wait while we fetch the information
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-left border-separate border-spacing-y-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y first:border-l border-gray-200 rounded-l-lg whitespace-nowrap">
                      S.No
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                      Shipment Number
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                      Trucker
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                      Vehicle Number
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                      Origin
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                      Destination
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                      Status
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                      Pickup
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y last:border-r border-gray-200 rounded-r-lg">
                      Drop
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentConsignments.map((consignment, index) => (
                    <tr
                      key={consignment.id}
                      className="bg-white hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 border-y first:border-l border-gray-200 first:rounded-l-lg">
                        <span className="font-medium text-gray-700">
                          {consignment.sNo}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200">
                        <div className="relative group max-w-[90px]">
                          {/* Truncated Shipment Number */}
                          <span className="font-medium text-gray-700 block truncate">
                            {consignment.shipmentNo || "-"}
                          </span>

                          {/* Tooltip */}
                          {consignment.shipmentNo && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[160px]
                      break-words
                      z-50"
                            >
                              {consignment.shipmentNo}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200">
                        <div className="relative group max-w-[90px]">
                          {/* Truncated Name */}
                          <span className="font-medium text-gray-700 block truncate">
                            {consignment.truckerName || "-"}
                          </span>

                          {/* Tooltip */}
                          {consignment.truckerName && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[170px]
                      break-words
                      z-50"
                            >
                              {consignment.truckerName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200">
                        <div className="relative group max-w-[90px]">
                          {/* Truncated Driver Name */}
                          <span className="font-medium text-gray-700 block truncate">
                            {consignment.driverName || "-"}
                          </span>

                          {/* Tooltip */}
                          {consignment.driverName && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[170px]
                      break-words
                      z-50"
                            >
                              {consignment.driverName}
                            </div>
                          )}
                        </div>
                      </td>
                     <td className="px-4 py-4 border-y border-gray-200">
  <div className="relative group max-w-[90px]">

    {/* Truncated Vehicle Number */}
    <span className="font-medium text-gray-700 block truncate">
      {consignment.vehicleNo || "-"}
    </span>

    {/* Tooltip */}
    {consignment.vehicleNo && (
      <div className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[160px]
                      break-words
                      z-50">
        {consignment.vehicleNo}
      </div>
    )}

  </div>
</td>
                      <td className="px-4 py-4 border-y border-gray-200">
                        <div className="relative group max-w-[120px]">
                          {/* Truncated Text */}
                          <span className="font-medium text-gray-700 block truncate">
                            {consignment.pickupAddress || "-"}
                          </span>

                          {/* Tooltip */}
                          {consignment.pickupAddress && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[180px]
                      break-words
                      z-50"
                            >
                              {consignment.pickupAddress}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 border-y border-gray-200">
                        <div className="relative group max-w-[120px]">
                          {/* Truncated Text */}
                          <span className="font-medium text-gray-700 block truncate">
                            {consignment.deliveryAddress || "-"}
                          </span>

                          {/* Tooltip */}
                          {consignment.deliveryAddress && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[180px]
                      break-words
                      z-50"
                            >
                              {consignment.deliveryAddress}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusColor(consignment.status)}`}
                        >
                          {consignment.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200">
                        <button
                          onClick={() => handleViewPickup(consignment)}
                          disabled={viewLoading}
                          className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer ${
                            viewLoading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {viewLoading ? "Loading..." : "View"}
                        </button>
                      </td>
                      <td className="px-4 py-4 border-y last:border-r border-gray-200 last:rounded-r-lg">
                        <button
                          onClick={() => handleViewDrop(consignment)}
                          disabled={viewLoading}
                          className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors cursor-pointer ${
                            viewLoading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {viewLoading ? "Loading..." : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredConsignments.length === 0 && (
              <div className="text-center py-12">
                <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm
                    ? "No consignments found matching your search"
                    : "No consignments found"}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "No consignments available"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredConsignments.length > 0 && (
        <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredConsignments.length)} of{" "}
            {filteredConsignments.length} consignments
            {searchTerm && ` (filtered from ${consignments.length} total)`}
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "border border-gray-900 text-gray-900 bg-white"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedConsignment && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => {
            setShowViewModal(false);
            setPickupImages(null);
            setDropImages(null);
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaEye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedConsignment.viewType === "pickup"
                        ? "Pickup Details"
                        : "Drop Details"}
                    </h2>
                    <p className="text-blue-100">
                      {selectedConsignment.viewType === "pickup"
                        ? "View pickup information"
                        : "View delivery information"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setPickupImages(null);
                    setDropImages(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Images Section */}
              <div className="mt-6">
                {viewLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading images...</p>
                  </div>
                ) : (
                  <>
                    {selectedConsignment.viewType === "pickup" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Pickup Images
                        </h3>
                        {!pickupImages ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">
                              No pickup images available
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* All Pickup Images in one section */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="text-md font-semibold text-gray-700 mb-3">
                                Pickup Images
                              </h4>

                              <div className="grid grid-cols-2 gap-4">
                                {/* Empty Truck Images */}
                                {pickupImages.emptyTruckImages &&
                                  pickupImages.emptyTruckImages.map(
                                    (imageUrl, index) => (
                                      <div
                                        key={`empty-${index}`}
                                        className="relative group"
                                      >
                                        <div
                                          className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
                                          onClick={() =>
                                            setPreviewImg(imageUrl)
                                          }
                                        >
                                          <img
                                            src={imageUrl}
                                            alt={`Empty Truck ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() =>
                                              console.log(
                                                "Image loaded successfully:",
                                                imageUrl,
                                              )
                                            }
                                            onError={(e) => {
                                              console.log(
                                                "Image error for:",
                                                imageUrl,
                                              );
                                              console.log("Error details:", e);
                                              e.target.style.display = "none";
                                              e.target.nextSibling.style.display =
                                                "flex";
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                                            style={{ display: "none" }}
                                          >
                                            <FaTimesCircle
                                              className="mb-1"
                                              size={16}
                                            />
                                            <span>Failed to load</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(imageUrl, "_blank");
                                              }}
                                              className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                              Open in new tab
                                            </button>
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                            <FaEye
                                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              size={16}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                          Empty Truck {index + 1}
                                        </p>
                                      </div>
                                    ),
                                  )}

                                {/* EIR Tickets */}
                                {pickupImages.eirTickets &&
                                  pickupImages.eirTickets.map(
                                    (imageUrl, index) => (
                                      <div
                                        key={`eir-${index}`}
                                        className="relative group"
                                      >
                                        <div
                                          className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
                                          onClick={() =>
                                            setPreviewImg(imageUrl)
                                          }
                                        >
                                          <img
                                            src={`https://cors-anywhere.herokuapp.com/${imageUrl}`}
                                            alt={`EIR Ticket ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() =>
                                              console.log(
                                                "EIR Ticket loaded successfully:",
                                                imageUrl,
                                              )
                                            }
                                            onError={(e) => {
                                              console.log(
                                                "Image error for:",
                                                imageUrl,
                                              );
                                              // Try direct URL as fallback
                                              e.target.src = imageUrl;
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                                            style={{ display: "none" }}
                                          >
                                            <FaTimesCircle
                                              className="mb-1"
                                              size={16}
                                            />
                                            <span>Failed to load</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(imageUrl, "_blank");
                                              }}
                                              className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                              Open in new tab
                                            </button>
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                            <FaEye
                                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              size={16}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                          EIR Ticket {index + 1}
                                        </p>
                                      </div>
                                    ),
                                  )}

                                {/* Container Images */}
                                {pickupImages.containerImages &&
                                  pickupImages.containerImages.map(
                                    (imageUrl, index) => (
                                      <div
                                        key={`container-${index}`}
                                        className="relative group"
                                      >
                                        <div
                                          className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
                                          onClick={() =>
                                            setPreviewImg(imageUrl)
                                          }
                                        >
                                          <img
                                            src={`https://cors-anywhere.herokuapp.com/${imageUrl}`}
                                            alt={`Container ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() =>
                                              console.log(
                                                "Container loaded successfully:",
                                                imageUrl,
                                              )
                                            }
                                            onError={(e) => {
                                              console.log(
                                                "Image error for:",
                                                imageUrl,
                                              );
                                              // Try direct URL as fallback
                                              e.target.src = imageUrl;
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                                            style={{ display: "none" }}
                                          >
                                            <FaTimesCircle
                                              className="mb-1"
                                              size={16}
                                            />
                                            <span>Failed to load</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(imageUrl, "_blank");
                                              }}
                                              className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                              Open in new tab
                                            </button>
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                            <FaEye
                                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              size={16}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                          Container {index + 1}
                                        </p>
                                      </div>
                                    ),
                                  )}

                                {/* Seal Images */}
                                {pickupImages.sealImages &&
                                  pickupImages.sealImages.map(
                                    (imageUrl, index) => (
                                      <div
                                        key={`seal-${index}`}
                                        className="relative group"
                                      >
                                        <div
                                          className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
                                          onClick={() =>
                                            setPreviewImg(imageUrl)
                                          }
                                        >
                                          <img
                                            src={`https://cors-anywhere.herokuapp.com/${imageUrl}`}
                                            alt={`Seal ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() =>
                                              console.log(
                                                "Seal loaded successfully:",
                                                imageUrl,
                                              )
                                            }
                                            onError={(e) => {
                                              console.log(
                                                "Image error for:",
                                                imageUrl,
                                              );
                                              // Try direct URL as fallback
                                              e.target.src = imageUrl;
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                                            style={{ display: "none" }}
                                          >
                                            <FaTimesCircle
                                              className="mb-1"
                                              size={16}
                                            />
                                            <span>Failed to load</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(imageUrl, "_blank");
                                              }}
                                              className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                              Open in new tab
                                            </button>
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                            <FaEye
                                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              size={16}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                          Seal {index + 1}
                                        </p>
                                      </div>
                                    ),
                                  )}
                              </div>
                            </div>

                            {/* Pickup Notes */}
                            {pickupImages.notes && (
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="text-md font-semibold text-blue-800 mb-2">
                                  Pickup Notes
                                </h4>
                                <p className="text-blue-700">
                                  {pickupImages.notes}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {selectedConsignment.viewType === "drop" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Drop Location Images
                        </h3>
                        {!dropImages || !dropImages.dropLocationImages ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">
                              No drop location images available
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* All Drop Images in one section */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="text-md font-semibold text-gray-700 mb-3">
                                Drop Images
                              </h4>

                              <div className="grid grid-cols-2 gap-4">
                                {/* POD Images */}
                                {dropImages.dropLocationImages.podImages &&
                                  dropImages.dropLocationImages.podImages.map(
                                    (imageUrl, index) => (
                                      <div
                                        key={`pod-${index}`}
                                        className="relative group"
                                      >
                                        <div
                                          className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
                                          onClick={() =>
                                            setPreviewImg(imageUrl)
                                          }
                                        >
                                          <img
                                            src={imageUrl}
                                            alt={`POD ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() =>
                                              console.log(
                                                "POD loaded successfully:",
                                                imageUrl,
                                              )
                                            }
                                            onError={(e) => {
                                              console.log(
                                                "Image error for:",
                                                imageUrl,
                                              );
                                              e.target.style.display = "none";
                                              e.target.nextSibling.style.display =
                                                "flex";
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                                            style={{ display: "none" }}
                                          >
                                            <FaTimesCircle
                                              className="mb-1"
                                              size={16}
                                            />
                                            <span>Failed to load</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(imageUrl, "_blank");
                                              }}
                                              className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                              Open in new tab
                                            </button>
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                            <FaEye
                                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              size={16}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                          POD {index + 1}
                                        </p>
                                      </div>
                                    ),
                                  )}

                                {/* Loaded Truck Images */}
                                {dropImages.dropLocationImages
                                  .loadedTruckImages &&
                                  dropImages.dropLocationImages.loadedTruckImages.map(
                                    (imageUrl, index) => (
                                      <div
                                        key={`loaded-${index}`}
                                        className="relative group"
                                      >
                                        <div
                                          className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
                                          onClick={() =>
                                            setPreviewImg(imageUrl)
                                          }
                                        >
                                          <img
                                            src={imageUrl}
                                            alt={`Loaded Truck ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() =>
                                              console.log(
                                                "Loaded Truck loaded successfully:",
                                                imageUrl,
                                              )
                                            }
                                            onError={(e) => {
                                              console.log(
                                                "Image error for:",
                                                imageUrl,
                                              );
                                              e.target.style.display = "none";
                                              e.target.nextSibling.style.display =
                                                "flex";
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                                            style={{ display: "none" }}
                                          >
                                            <FaTimesCircle
                                              className="mb-1"
                                              size={16}
                                            />
                                            <span>Failed to load</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(imageUrl, "_blank");
                                              }}
                                              className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                              Open in new tab
                                            </button>
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                            <FaEye
                                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              size={16}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                          Loaded Truck {index + 1}
                                        </p>
                                      </div>
                                    ),
                                  )}

                                {/* Drop Location Images */}
                                {dropImages.dropLocationImages
                                  .dropLocationImages &&
                                  dropImages.dropLocationImages.dropLocationImages.map(
                                    (imageUrl, index) => (
                                      <div
                                        key={`droploc-${index}`}
                                        className="relative group"
                                      >
                                        <div
                                          className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
                                          onClick={() =>
                                            setPreviewImg(imageUrl)
                                          }
                                        >
                                          <img
                                            src={imageUrl}
                                            alt={`Drop Location ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() =>
                                              console.log(
                                                "Drop Location loaded successfully:",
                                                imageUrl,
                                              )
                                            }
                                            onError={(e) => {
                                              console.log(
                                                "Image error for:",
                                                imageUrl,
                                              );
                                              e.target.style.display = "none";
                                              e.target.nextSibling.style.display =
                                                "flex";
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                                            style={{ display: "none" }}
                                          >
                                            <FaTimesCircle
                                              className="mb-1"
                                              size={16}
                                            />
                                            <span>Failed to load</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(imageUrl, "_blank");
                                              }}
                                              className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                              Open in new tab
                                            </button>
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                            <FaEye
                                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              size={16}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                          Drop Location {index + 1}
                                        </p>
                                      </div>
                                    ),
                                  )}

                                {/* Empty Truck Images */}
                                {dropImages.dropLocationImages
                                  .emptyTruckImages &&
                                  dropImages.dropLocationImages.emptyTruckImages.map(
                                    (imageUrl, index) => (
                                      <div
                                        key={`empty-drop-${index}`}
                                        className="relative group"
                                      >
                                        <div
                                          className="w-full h-40 rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 relative overflow-hidden"
                                          onClick={() =>
                                            setPreviewImg(imageUrl)
                                          }
                                        >
                                          <img
                                            src={imageUrl}
                                            alt={`Empty Truck ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onLoad={() =>
                                              console.log(
                                                "Empty Truck loaded successfully:",
                                                imageUrl,
                                              )
                                            }
                                            onError={(e) => {
                                              console.log(
                                                "Image error for:",
                                                imageUrl,
                                              );
                                              e.target.style.display = "none";
                                              e.target.nextSibling.style.display =
                                                "flex";
                                            }}
                                          />
                                          <div
                                            className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 text-sm h-40"
                                            style={{ display: "none" }}
                                          >
                                            <FaTimesCircle
                                              className="mb-1"
                                              size={16}
                                            />
                                            <span>Failed to load</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(imageUrl, "_blank");
                                              }}
                                              className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                              Open in new tab
                                            </button>
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                            <FaEye
                                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                              size={16}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                          Empty Truck {index + 1}
                                        </p>
                                      </div>
                                    ),
                                  )}
                              </div>
                            </div>

                            {/* Drop Notes */}
                            {dropImages.dropLocationImages.notes && (
                              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h4 className="text-md font-semibold text-green-800 mb-2">
                                  Drop Notes
                                </h4>
                                <p className="text-green-700">
                                  {dropImages.dropLocationImages.notes}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImg}
              alt="Image Preview"
              className="max-h-[80vh] w-full object-contain rounded-xl shadow-lg"
            />
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute left-4 top-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <FaTimesCircle className="text-gray-600" size={20} />
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <button
                onClick={() => window.open(previewImg, "_blank")}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
