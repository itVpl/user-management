import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, MapPin, Calendar, DollarSign, Search } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function ManagerApprovedBids() {
  const [approvedBids, setApprovedBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBid, setSelectedBid] = useState(null);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch approved bids by manager
  const fetchManagerApprovedBids = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/sales/manager-accepted`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cookie': `token=${token}`
        },
        data: {
          "status": "Approved"
        }
      });

      if (response.data && response.data.success) {
        const transformedBids = response.data.bids.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          loadId: bid.load?._id ? `L-${bid.load._id.slice(-5)}` : 'N/A',
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.origins && bid.origins.length > 0 
            ? `${bid.origins[0].city || bid.origins[0].extractedCity || 'N/A'}, ${bid.origins[0].state || 'N/A'}`
            : bid.load?.origins && bid.load.origins.length > 0
            ? `${bid.load.origins[0].city || bid.load.origins[0].extractedCity || 'N/A'}, ${bid.load.origins[0].state || 'N/A'}`
            : 'N/A, N/A',
          destination: bid.destinations && bid.destinations.length > 0
            ? `${bid.destinations[0].city || bid.destinations[0].extractedCity || 'N/A'}, ${bid.destinations[0].state || 'N/A'}`
            : bid.load?.destinations && bid.load.destinations.length > 0
            ? `${bid.load.destinations[0].city || bid.load.destinations[0].extractedCity || 'N/A'}, ${bid.load.destinations[0].state || 'N/A'}`
            : 'N/A, N/A',
          originalRate: bid.originalRate || bid.originalLoadRate || bid.load?.rateDetails?.totalRates || 0,
          currentRate: bid.currentRate || bid.finalCharges || 0,
          thresholdRate: bid.thresholdRate || 0,
          rateDifference: bid.rateDifference || 0,
          rateDifferencePercentage: bid.rateDifferencePercentage || '0',
          finalRate: bid.currentRate || bid.finalCharges || 0,
          truckerName: bid.carrier?.compName || 'N/A',
          shipperName: bid.shipper?.compName || 'N/A',
          status: 'manager-approved',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          approvedAt: bid.managerApproval?.approvedAt ? new Date(bid.managerApproval.approvedAt).toISOString().split('T')[0] : 'N/A',
          approvedBy: bid.managerApproval?.approvedBy?.empName || bid.approvedByInhouseUser?.empName || 'Manager',
          driverName: bid.driverName || 'N/A',
          driverPhone: bid.driverPhone || 'N/A',
          vehicleNumber: bid.vehicleNumber || 'N/A',
          vehicleType: bid.vehicleType || bid.load?.vehicleType || 'N/A',
          estimatedPickupDate: bid.estimatedPickupDate ? new Date(bid.estimatedPickupDate).toLocaleDateString() : 'N/A',
          estimatedDeliveryDate: bid.estimatedDeliveryDate ? new Date(bid.estimatedDeliveryDate).toLocaleDateString() : 'N/A',
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          carrierInfo: {
            mcDotNo: bid.carrier?.mc_dot_no || 'N/A',
            email: bid.carrier?.email || 'N/A',
            phone: bid.carrier?.phoneNo || 'N/A',
            state: bid.carrier?.state || 'N/A',
            city: bid.carrier?.city || 'N/A'
          },
          shipperInfo: {
            compName: bid.shipper?.compName || 'N/A',
            mc_dot_no: bid.shipper?.mc_dot_no || 'N/A',
            email: bid.shipper?.email || 'N/A',
            phoneNo: bid.shipper?.phoneNo || 'N/A',
            state: bid.shipper?.state || 'N/A',
            city: bid.shipper?.city || 'N/A'
          },
          loadInfo: {
            weight: bid.load?.weight || 0,
            commodity: bid.load?.commodity || 'N/A',
            vehicleType: bid.load?.vehicleType || 'N/A',
            pickupDate: bid.load?.pickupDate || 'N/A',
            deliveryDate: bid.load?.deliveryDate || 'N/A'
          },
          // Internal negotiation data
          internalNegotiation: bid.internalNegotiation || null,
          forwardedToManager: bid.forwardedToManager || null
        }));

        setApprovedBids(transformedBids);
      } else {
        console.error('Manager approved bids API response format error:', response.data);
        setApprovedBids([]);
      }
    } catch (error) {
      console.error('Error fetching manager approved bids:', error);
      alertify.error('Error fetching approved bids');
      setApprovedBids([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerApprovedBids();
  }, []);

  // Filter bids based on search term
  const filteredBids = approvedBids.filter(bid => {
    return bid.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bid.truckerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bid.shipperName && bid.shipperName.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredBids.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBids = filteredBids.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle view bid details
  const handleViewBid = (bid) => {
    setSelectedBid(bid);
    setViewDoc(true);
  };

  // Export to CSV function
  const handleExportToCSV = () => {
    try {
      const dataToExport = filteredBids;
      
      if (dataToExport.length === 0) {
        alertify.warning('No data to export');
        return;
      }

      const headers = [
        'Bid ID',
        'Load ID',
        'Origin',
        'Destination', 
        'Original Rate',
        'Current Rate',
        'Threshold Rate',
        'Rate Difference',
        'Rate Diff %',
        'Shipper',
        'Shipper MC',
        'Carrier',
        'Carrier MC',
        'Driver Name',
        'Driver Phone',
        'Vehicle Number',
        'Vehicle Type',
        'Est. Pickup',
        'Est. Delivery',
        'Status',
        'Approved Date',
        'Approved By'
      ];

      const csvContent = [
        headers.join(','),
        ...dataToExport.map(bid => [
          bid.id || '',
          bid.loadId || '',
          `"${bid.origin || ''}"`,
          `"${bid.destination || ''}"`,
          bid.originalRate || 0,
          bid.currentRate || 0,
          bid.thresholdRate || 0,
          bid.rateDifference || 0,
          `"${bid.rateDifferencePercentage || '0'}%"`,
          `"${bid.shipperName || 'N/A'}"`,
          `"${bid.shipperInfo?.mc_dot_no || 'N/A'}"`,
          `"${bid.truckerName || 'N/A'}"`,
          `"${bid.carrierInfo?.mcDotNo || 'N/A'}"`,
          `"${bid.driverName || 'N/A'}"`,
          `"${bid.driverPhone || 'N/A'}"`,
          `"${bid.vehicleNumber || 'N/A'}"`,
          `"${bid.vehicleType || 'N/A'}"`,
          `"${bid.estimatedPickupDate || 'N/A'}"`,
          `"${bid.estimatedDeliveryDate || 'N/A'}"`,
          `"${bid.status || 'N/A'}"`,
          `"${bid.approvedAt || 'N/A'}"`,
          `"${bid.approvedBy || 'N/A'}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `manager_approved_bids_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alertify.success('Data exported successfully');
    } catch (error) {
      console.error('Export to CSV error:', error);
      alertify.error('Error exporting data');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading manager approved bids...</p>
          </div>
        </div>
      </div>
    );
  }

  // Image preview modal
  if (previewImg) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-4">
          <img src={previewImg} alt="Document Preview" className="max-h-[80vh] rounded-xl shadow-lg" />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute left-4 top-4 bg-white p-2 rounded-full shadow hover:bg-blue-100"
          >
            <FaArrowLeft />
          </button>
        </div>
      </div>
    );
  }

  // Bid details modal
  if (viewDoc && selectedBid) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Manager Approved Bid</h2>
                <p className="text-green-600">Bid ID: {selectedBid.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`${API_CONFIG.BASE_URL}/${selectedBid.docUpload}`}
                target="_blank"
                rel="noreferrer"
                className="hover:scale-110 transition-transform"
              >
                <FaDownload className="text-blue-500 text-2xl cursor-pointer" />
              </a>
              <button
                onClick={() => setViewDoc(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border rounded-2xl p-6 bg-gradient-to-br from-green-50 to-white shadow">
              <div className="flex items-center gap-2 mb-4">
                <Building className="text-green-500" size={20} />
                <h3 className="text-lg font-bold text-green-700">Bid Details</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={16} />
                  <span className="font-medium">Carrier:</span> {selectedBid.truckerName}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText size={16} />
                  <span className="font-medium">MC/DOT:</span> {selectedBid.carrierInfo?.mcDotNo || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={16} />
                  <span className="font-medium">Email:</span> {selectedBid.carrierInfo?.email || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} />
                  <span className="font-medium">Phone:</span> {selectedBid.carrierInfo?.phone || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={16} />
                  <span className="font-medium">Driver:</span> {selectedBid.driverName}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} />
                  <span className="font-medium">Driver Phone:</span> {selectedBid.driverPhone}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText size={16} />
                  <span className="font-medium">Vehicle:</span> {selectedBid.vehicleNumber} ({selectedBid.vehicleType})
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={16} />
                  <span className="font-medium">Origin:</span> {selectedBid.origin}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={16} />
                  <span className="font-medium">Destination:</span> {selectedBid.destination}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign size={16} />
                  <span className="font-medium">Original Rate:</span> ${selectedBid.originalRate.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign size={16} />
                  <span className="font-medium">Current Rate:</span> 
                  <span className="font-bold text-green-600">${selectedBid.currentRate.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign size={16} />
                  <span className="font-medium">Threshold Rate:</span> ${selectedBid.thresholdRate.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText size={16} />
                  <span className="font-medium">Rate Difference:</span> 
                  <span className={`font-bold ${parseFloat(selectedBid.rateDifferencePercentage) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${selectedBid.rateDifference} ({selectedBid.rateDifferencePercentage}%)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={16} />
                  <span className="font-medium">Est. Pickup:</span> {selectedBid.estimatedPickupDate}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={16} />
                  <span className="font-medium">Est. Delivery:</span> {selectedBid.estimatedDeliveryDate}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={16} />
                  <span className="font-medium">Approved Date:</span> {selectedBid.approvedAt}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={16} />
                  <span className="font-medium">Approved By:</span> {selectedBid.approvedBy}
                </div>
                {selectedBid.remarks && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <FileText size={16} className="mt-1" />
                    <div>
                      <span className="font-medium">Remarks:</span>
                      <p className="mt-1">{selectedBid.remarks}</p>
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    <CheckCircle size={14} />
                    Manager Approved
                  </div>
                </div>
              </div>
            </div>
            
            {/* Shipper Information Section */}
            <div className="border rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white shadow">
              <div className="flex items-center gap-2 mb-4">
                <Building className="text-blue-500" size={20} />
                <h3 className="text-lg font-bold text-blue-700">Shipper Information</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Building size={16} />
                  <span className="font-medium">Company:</span> {selectedBid.shipperName}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText size={16} />
                  <span className="font-medium">MC/DOT:</span> {selectedBid.shipperInfo?.mc_dot_no || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={16} />
                  <span className="font-medium">Email:</span> {selectedBid.shipperInfo?.email || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} />
                  <span className="font-medium">Phone:</span> {selectedBid.shipperInfo?.phoneNo || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={16} />
                  <span className="font-medium">Location:</span> {selectedBid.shipperInfo?.city}, {selectedBid.shipperInfo?.state}
                </div>
              </div>
            </div>
            
            {/* Document Section */}
            <div className="flex flex-col items-center justify-center">
              <img
                src={`${API_CONFIG.BASE_URL}/${selectedBid.docUpload}`}
                alt="Uploaded Doc"
                className="rounded-xl shadow-lg max-h-[250px] w-full object-contain border border-green-100 cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedBid.docUpload}`)}
              />
              <div className="text-xs text-gray-400 mt-2">Click image to preview</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Manager Approved Bids</p>
                <p className="text-xl font-bold text-green-600">{approvedBids.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search approved bids..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleExportToCSV}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
          >
            <FaDownload size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-100 to-emerald-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bid ID</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load ID</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-48">Origin</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-48">Destination</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Original Rate</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Current Rate</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate Diff %</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipper</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Driver Info</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Approved Date</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentBids.map((bid, index) => (
                <tr key={bid.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{bid.id}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{bid.loadId}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <span className="font-medium text-gray-700">{bid.origin}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <span className="font-medium text-gray-700">{bid.destination}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-600">${bid.originalRate.toLocaleString()}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-bold text-green-600">${bid.currentRate.toLocaleString()}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`font-bold ${parseFloat(bid.rateDifferencePercentage) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {bid.rateDifferencePercentage}%
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-gray-700">{bid.shipperName}</p>
                      <p className="text-xs text-gray-500">MC: {bid.shipperInfo.mc_dot_no}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-gray-700">{bid.truckerName}</p>
                      <p className="text-xs text-gray-500">MC: {bid.carrierInfo.mcDotNo}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-gray-700">{bid.driverName}</p>
                      <p className="text-xs text-gray-500">Phone: {bid.driverPhone}</p>
                      <p className="text-xs text-gray-500">Vehicle: {bid.vehicleNumber}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-medium text-gray-700">{bid.approvedAt}</p>
                      <p className="text-xs text-gray-500">By: {bid.approvedBy}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleViewBid(bid)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-lg text-sm hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === i + 1
                      ? 'bg-green-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {filteredBids.length === 0 && !loading && (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Manager Approved Bids</h3>
          <p className="text-gray-500">There are no bids approved by manager yet.</p>
        </div>
      )}
    </div>
  );
}