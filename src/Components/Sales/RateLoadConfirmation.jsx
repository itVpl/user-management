import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaDownload } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function RateLoadConfirmation() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setOrders(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  // Generate Rate and Load Confirmation PDF function
  const generateRateLoadConfirmationPDF = (order) => {
    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      
      // Generate the HTML content for the rate and load confirmation
      const confirmationHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rate and Load Confirmation</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.4;
              color: #333;
              background: white;
              font-size: 12px;
            }
            .confirmation-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .logo {
              width: 120px;
              height: 90px;
              object-fit: contain;
            }
            .bill-to {
              text-align: right;
            }
            .bill-to h3 {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .bill-to-content {
              font-size: 12px;
              line-height: 1.4;
            }
            .confirmation-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              text-align: center;
              color: #2c3e50;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .load-number {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
              text-align: center;
              background: #f8f9fa;
              padding: 10px;
              border-radius: 5px;
            }
            .rates-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .rates-table th,
            .rates-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            .rates-table th:nth-child(1),
            .rates-table td:nth-child(1) {
              width: 35%;
            }
            .rates-table th:nth-child(2),
            .rates-table td:nth-child(2) {
              width: 20%;
            }
            .rates-table th:nth-child(3),
            .rates-table td:nth-child(3) {
              width: 15%;
            }
            .rates-table th:nth-child(4),
            .rates-table td:nth-child(4) {
              width: 15%;
            }
            .rates-table th:nth-child(5),
            .rates-table td:nth-child(5) {
              width: 15%;
            }
            .rates-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .rates-table .amount {
              text-align: right;
              font-weight: bold;
            }
            .rates-table .total-row {
              background: #ffffff;
              color: black;
              font-weight: bold;
              font-size: 16px;
            }
            .rates-table .total-row td {
              border-top: 2px solid #000000;
              padding: 15px;
            }
            .rates-table .total-row .amount {
              color: black;
            }
            .divider {
              border-top: 1px solid #333;
              margin: 20px 0;
            }
            .notes-section {
              margin-top: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .notes-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #2c3e50;
            }
            .notes-content {
              font-size: 14px;
              line-height: 1.6;
            }
            @media print {
              body { background: white; }
              .confirmation-container { box-shadow: none; margin: 0; }
              @page {
                margin: 0;
                size: A4;
              }
              @page :first {
                margin-top: 0;
              }
              @page :left {
                margin-left: 0;
              }
              @page :right {
                margin-right: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="confirmation-container">
            <!-- Header -->
            <div class="header">
              <img src="/src/assets/LogoFinal.png" alt="Company Logo" class="logo">
              <div class="bill-to">
                <table style="border-collapse: collapse; width: 100%; font-size: 12px;">
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Bill To</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].billTo || 'N/A') : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">W/O (Ref)</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].workOrderNo || 'N/A') : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Confirmation Date</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Confirmation No</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.doNum || order.customers?.[0]?.loadNo || 'N/A'}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Title -->
            <div class="confirmation-title">Rate and Load Confirmation</div>

            <!-- Load Number -->
            <div class="load-number">LOAD #: ${order.doNum || order.customers?.[0]?.loadNo || 'N/A'}</div>

            <!-- Shipper Information Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Shipper Name</th>
                  <th>Container No</th>
                  <th>Weight</th>
                  <th>Pickup Date</th>
                  <th>Drop Date</th>
                </tr>
              </thead>
              <tbody>
                ${order.shipper ? `
                  <tr>
                    <td>${order.shipper.name || 'N/A'}</td>
                    <td>${order.shipper.containerNo || 'N/A'}</td>
                    <td>${order.shipper.weight || 'N/A'} lbs</td>
                    <td>${order.shipper.pickUpDate ? new Date(order.shipper.pickUpDate).toLocaleDateString() : 'N/A'}</td>
                    <td>${order.shipper.dropDate ? new Date(order.shipper.dropDate).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>

            <!-- Pick Up Location Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Pick Up Location</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip Code</th>
                </tr>
              </thead>
              <tbody>
                ${order.shipper && order.shipper.pickUpLocations && order.shipper.pickUpLocations.length > 0 ? 
                  order.shipper.pickUpLocations.map(location => `
                    <tr>
                      <td>${location.name || 'N/A'}</td>
                      <td>${location.address || 'N/A'}</td>
                      <td>${location.city || 'N/A'}</td>
                      <td>${location.state || 'N/A'}</td>
                      <td>${location.zipCode || 'N/A'}</td>
                    </tr>
                  `).join('') : ''
                }
              </tbody>
            </table>

            <!-- Drop Location Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Drop Location</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip Code</th>
                </tr>
              </thead>
              <tbody>
                ${order.shipper && order.shipper.dropLocations && order.shipper.dropLocations.length > 0 ? 
                  order.shipper.dropLocations.map(location => `
                    <tr>
                      <td>${location.name || 'N/A'}</td>
                      <td>${location.address || 'N/A'}</td>
                      <td>${location.city || 'N/A'}</td>
                      <td>${location.state || 'N/A'}</td>
                      <td>${location.zipCode || 'N/A'}</td>
                    </tr>
                  `).join('') : ''
                }
              </tbody>
            </table>

            <!-- Rate Confirmation Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Rate Details</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.customers && order.customers.length > 0 ? `
                  <tr>
                    <td>Line Haul</td>
                    <td class="amount">$${(order.customers[0].lineHaul || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>FSC (Fuel Surcharge)</td>
                    <td class="amount">$${(order.customers[0].fsc || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Other Charges</td>
                    <td class="amount">$${(order.customers[0].other || 0).toLocaleString()}</td>
                  </tr>
                ` : ''}
                ${order.carrier && order.carrier.carrierFees ? order.carrier.carrierFees.filter(charge => (charge.total || 0) > 0).map(charge => `
                  <tr>
                    <td>${charge.name}</td>
                    <td class="amount">$${(charge.total || 0).toLocaleString()}</td>
                  </tr>
                `).join('') : ''}
                <tr class="total-row">
                  <td><strong>CONFIRMED TOTAL RATE</strong></td>
                  <td class="amount"><strong>$${(() => {
                    const lineHaul = order.customers && order.customers.length > 0 ? (order.customers[0].lineHaul || 0) : 0;
                    const fsc = order.customers && order.customers.length > 0 ? (order.customers[0].fsc || 0) : 0;
                    const other = order.customers && order.customers.length > 0 ? (order.customers[0].other || 0) : 0;
                    const carrierCharges = order.carrier && order.carrier.carrierFees ? order.carrier.carrierFees.reduce((sum, charge) => sum + (charge.total || 0), 0) : 0;
                    return (lineHaul + fsc + other + carrierCharges).toLocaleString();
                  })()} USD</strong></td>
                </tr>
              </tbody>
            </table>

            <!-- Notes Section -->
            <div class="notes-section">
              <h3 class="notes-title">Confirmation Notes:</h3>
              <div class="notes-content">
                This rate and load confirmation is valid for the specified dates and conditions.<br>
                All rates are confirmed and agreed upon by both parties.<br>
                Please contact us for any questions or modifications.<br><br>
                Thank you for choosing V Power Logistics!
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Write the HTML to the new window
      printWindow.document.write(confirmationHTML);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
      };
      
      alertify.success('Rate and Load Confirmation PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alertify.error('Failed to generate PDF. Please try again.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <FaDownload className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Rate and Load Confirmation</h1>
            <p className="text-gray-600">Generate PDF confirmations for rates and loads</p>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map((order, index) => (
            <div key={order._id || index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    Load #: {order.doNum || order.customers?.[0]?.loadNo || 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Bill To: {order.customers && order.customers.length > 0 ? order.customers[0].billTo : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Shipper: {order.shipper?.name || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => generateRateLoadConfirmationPDF(order)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2"
                >
                  <FaDownload className="text-white" size={14} />
                  Generate PDF
                </button>
              </div>
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
