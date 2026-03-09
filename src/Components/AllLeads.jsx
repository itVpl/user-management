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
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px]">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {statistics.totalLeads}
              </div>
              <div className="flex-1 text-center">
                <span className="text-gray-700 font-semibold text-lg">Total Leads</span>
              </div>
              <div className="w-12 shrink-0" />
            </div>
          </div>
          {/* <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px]">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {statistics.newLeads}
              </div>
              <div className="flex-1 text-center">
                <span className="text-gray-700 font-semibold">New</span>
              </div>
              <div className="w-12 shrink-0" />
            </div>
          </div> */}
          {/* <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px]">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {statistics.contactedLeads}
              </div>
              <div className="flex-1 text-center">
                <span className="text-gray-700 font-semibold">Contacted</span>
              </div>
              <div className="w-12 shrink-0" />
            </div>
          </div> */}
          {/* <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px]">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {statistics.convertedLeads}
              </div>
              <div className="flex-1 text-center">
                <span className="text-gray-700 font-semibold">Converted</span>
              </div>
              <div className="w-12 shrink-0" />
            </div>
          </div> */}
        </div>
        <div className="flex items-stretch gap-3">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[45px] pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-700 placeholder-gray-400 text-base"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <button
            onClick={handleExportToExcel}
            className="px-5 h-[45px] border border-green-600 text-green-700 bg-white rounded-lg hover:bg-green-600 hover:text-white transition-colors font-medium cursor-pointer flex items-center gap-2"
          >
            <Download size={18} />
            Export to Excel
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-5 py-3 text-gray-600 font-medium first:rounded-l-xl border-y border-gray-200 first:border-l first:border-gray-200">Name</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium border-y border-gray-200">Email</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium border-y border-gray-200">Phone</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium border-y border-gray-200">Company</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium border-y border-gray-200">Country</th>
                <th className="text-left px-5 py-3 text-gray-600 font-medium text-[15px] last:rounded-r-xl border-y border-gray-200 last:border-r last:border-gray-200">Created</th>
              </tr>
            </thead>
            <tbody>
              {currentLeads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 border-y border-gray-200 first:rounded-l-xl first:border-l first:border-gray-200">
                    <div className="flex items-center gap-2">
                      {/* <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="text-blue-600" size={16} />
                      </div> */}
                      <span className="font-medium text-gray-700">{lead.name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 border-y border-gray-200">
                    <div className="flex items-center gap-2">
                      {/* <Mail className="text-gray-400" size={14} /> */}
                      <span className="font-medium text-gray-700">{lead.email || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 border-y border-gray-200">
                    <div className="flex items-center gap-2">
                      {/* <Phone className="text-gray-400" size={14} /> */}
                      <span className="font-medium text-gray-700">{lead.phoneNumber || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 border-y border-gray-200">
                    <div className="flex items-center gap-2">
                      {/* <Building className="text-gray-400" size={14} /> */}
                      <span className="font-medium text-gray-700">{lead.companyName || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 border-y border-gray-200">
                    <div className="flex items-center gap-2">
                      {/* <Globe className="text-gray-400" size={14} /> */}
                      <span className="font-medium text-gray-700">{lead.country || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 border-y border-gray-200 last:rounded-r-xl last:border-r last:border-gray-200">
                    <div>
                      <p className="font-medium text-gray-800">{formatDate(lead.createdAt)}</p>
                      <p className="text-sm text-gray-500">{lead.createdAt ? new Date(lead.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
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
      
      {totalPages > 1 && filteredLeads.length > 0 && (
        <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {filteredLeads.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} leads
            {searchTerm && ` (filtered from ${leads.length} total)`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 h-[36px] text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-1">
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
                    className={`px-3 h-[36px] text-sm font-medium rounded-lg ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
                  >
                    {page}
                  </button>
                ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-3 h-[36px] text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
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

