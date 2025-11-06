import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { User, Mail, Phone, Building, Search, BarChart3, Globe, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import API_CONFIG from '../config/api.js';

export default function AllLeads() {
  const [leads, setLeads] = useState([]);
  const [statistics, setStatistics] = useState({
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    convertedLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const itemsPerPage = 9;

  useEffect(() => {
    fetchLeads();
  }, [currentPage]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/leads`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        params: {
          page: currentPage,
          limit: itemsPerPage
        }
      });

      if (res.data && res.data.success) {
        const leadsData = res.data.data || [];
        setLeads(leadsData);
        
        // Update pagination
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }

        // Calculate statistics from the actual data
        const newCount = leadsData.filter(l => l.status === 'New').length;
        const contactedCount = leadsData.filter(l => l.status === 'Contacted').length;
        const convertedCount = leadsData.filter(l => l.status === 'Converted').length;

        setStatistics({
          totalLeads: res.data.pagination?.total || leadsData.length,
          newLeads: newCount,
          contactedLeads: contactedCount,
          convertedLeads: convertedCount,
        });
      } else {
        console.error('API response format error:', res.data);
        setLeads([]);
        setStatistics({
          totalLeads: 0,
          newLeads: 0,
          contactedLeads: 0,
          convertedLeads: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setLeads([]);
      setStatistics({
        totalLeads: 0,
        newLeads: 0,
        contactedLeads: 0,
        convertedLeads: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // -------- FILTER + SORT (memoized) --------
  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return (leads || [])
      .filter(lead => {
        // Search filter
        if (!term) return true;

        const name = lead.name?.toLowerCase() || '';
        const email = lead.email?.toLowerCase() || '';
        const phone = lead.phoneNumber?.toLowerCase() || '';
        const company = lead.companyName?.toLowerCase() || '';
        const country = lead.country?.toLowerCase() || '';

        return (
          name.includes(term) ||
          email.includes(term) ||
          phone.includes(term) ||
          company.includes(term) ||
          country.includes(term)
        );
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [leads, searchTerm]);

  // -------- PAGINATION derived from FILTERED list --------
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = filteredLeads.slice(startIndex, endIndex);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      if (filteredLeads.length === 0) {
        alert('No data to export');
        return;
      }

      // Prepare data for export
      const exportData = filteredLeads.map(lead => ({
        'Name': lead.name || 'N/A',
        'Email': lead.email || 'N/A',
        'Phone': lead.phoneNumber || 'N/A',
        'Company': lead.companyName || 'N/A',
        'Country': lead.country || 'N/A',
        'Created Date': lead.createdAt ? formatDate(lead.createdAt) : 'N/A',
        'Created Time': lead.createdAt ? new Date(lead.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 18 }, // Phone
        { wch: 25 }, // Company
        { wch: 12 }, // Country
        { wch: 15 }, // Created Date
        { wch: 15 }  // Created Time
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `Leads_${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      alert(`Excel file exported successfully! (${exportData.length} leads)`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leads...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <User className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-xl font-bold text-gray-800">{statistics.totalLeads}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search + Export */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 hover:shadow-xl"
          >
            <Download size={18} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Table with Sticky Header + Scroll */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="relative max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Name</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Phone</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Country</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody>
              {currentLeads.map((lead, index) => (
                <tr key={lead._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="text-blue-600" size={16} />
                      </div>
                      <span className="font-medium text-gray-700">{lead.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Mail className="text-gray-400" size={14} />
                      <span className="text-sm text-gray-700">{lead.email || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Phone className="text-gray-400" size={14} />
                      <span className="text-sm text-gray-700">{lead.phoneNumber || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Building className="text-gray-400" size={14} />
                      <span className="text-sm text-gray-700">{lead.companyName || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Globe className="text-gray-400" size={14} />
                      <span className="text-sm text-gray-700">{lead.country || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div>
                      <p className="text-sm text-gray-800">{formatDate(lead.createdAt)}</p>
                      <p className="text-xs text-gray-500">{lead.createdAt ? new Date(lead.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No leads found matching your search' : 'No leads found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Leads will appear here once they are created'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredLeads.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {filteredLeads.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} leads
            {searchTerm && ` (filtered from ${leads.length} total)`}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-1">
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="px-2 text-gray-400">...</span>}
                </>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (currentPage <= 4) return page <= 5;
                  if (currentPage >= totalPages - 3) return page >= totalPages - 4;
                  return page >= currentPage - 2 && page <= currentPage + 2;
                })
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === page
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
                  >
                    {page}
                  </button>
                ))}

              {currentPage < totalPages - 2 && totalPages > 7 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

