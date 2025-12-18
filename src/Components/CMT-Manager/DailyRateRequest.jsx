// DailyRateRequest.jsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Clock, CheckCircle, Search, Calendar, DollarSign } from 'lucide-react';
import API_CONFIG from '../../config/api.js';


const statusColors = {
  Pending: 'bg-yellow-500',
  PendingApproval: 'bg-blue-600',
  Approved: 'bg-green-500',
  Rejected: 'bg-red-500',
  accepted: 'bg-green-600',
  completed: 'bg-purple-500',
  delivered: 'bg-indigo-500',
};


const fmtMoney = (n) =>
  typeof n === 'number' ? n.toLocaleString() : (Number(n || 0) || 0).toLocaleString();


const toISODate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};


// short id helper
const shortId = (id, prefix) => (id ? `${prefix}-${String(id).slice(-4)}` : '—');


const DailyRateRequest = () => {
  const [date, setDate] = useState(toISODate());
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(true);


  // API state
  const [apiData, setApiData] = useState({
    success: false,
    message: '',
    date: '',
    totalBids: 0,
    additionalStats: {},
    bidsByStatus: {},
    recentBids: [],
  });


  // ---------- Fetch (NEW API ONLY) ----------
  const fetchTodayBids = async (selectedDate) => {

    try {
      setIsFetching(true);


      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        toast.error('Please login to access this resource');
        return;
      }


      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const url = `${API_CONFIG.BASE_URL}/api/v1/bid/today-count?date=${selectedDate}`;


      const t0 = performance.now();
      const res = await axios.get(url, { headers });
      const t1 = performance.now();



      const data = res?.data || {};
      const recentBids = data?.recentBids || [];
      console.log('📦 recentBids (' + recentBids.length + ')');

      setApiData({
        success: !!data.success,
        message: data.message || '',
        date: data.date || selectedDate,
        totalBids: data.totalBids || 0,
        additionalStats: data.additionalStats || {},
        bidsByStatus: data.bidsByStatus || {},
        recentBids,
      });
    } catch (err) {
      console.error('❌ Error fetching today bids:', err);
      toast.error(err?.response?.data?.message || 'Failed to fetch data');
    } finally {
      setIsFetching(false);
    }
  };


  useEffect(() => {

    fetchTodayBids(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);


  // ---------- Map + Filter ----------
  const rows = useMemo(() => {
    const mapped = (apiData.recentBids || []).map((b) => {
      const originCity = b?.load?.origin?.city || '';
      const originState = b?.load?.origin?.state || '';
      const destCity = b?.load?.destination?.city || '';
      const destState = b?.load?.destination?.state || '';
      const placedBy =
        b?.placedByInhouseUser?.employeeName ||
        b?.placedByInhouseUser?.empId ||
        '—';
      const approvedBy =
        b?.approvedByInhouseUser?.empName ||
        b?.approvedByInhouseUser?.empId ||
        '—';


      const fullBidId = b?._id || '';
      const fullLoadId = b?.load?._id || '';


      return {
        // ids
        fullBidId,
        fullLoadId,
        bidIdShort: shortId(fullBidId, 'B'),
        loadIdShort: shortId(fullLoadId, 'L'),


        // fields
        rate: b?.rate ?? 0,
        status: b?.status || '—',
        carrierName: b?.carrier?.compName || '—',
        mcDot: b?.carrier?.mc_dot_no || '—',
        origin:
          originCity && originState
            ? `${originCity}, ${originState}`
            : originCity || originState || '—',
        destination:
          destCity && destState
            ? `${destCity}, ${destState}`
            : destCity || destState || '—',
        weight: b?.load?.weight ?? '—',
        commodity: b?.load?.commodity || '—',
        placedBy,
        approvedBy,
        createdAt: b?.createdAt ? new Date(b.createdAt).toLocaleString() : '—',
      };
    });


    console.log('🧩 mapped rows (' + mapped.length + ')');

    const term = search.trim().toLowerCase();
    const out = !term
      ? mapped
      : mapped.filter((r) => {
        return (
          String(r.fullBidId).toLowerCase().includes(term) ||
          String(r.fullLoadId).toLowerCase().includes(term) ||
          String(r.bidIdShort).toLowerCase().includes(term) ||
          String(r.loadIdShort).toLowerCase().includes(term) ||
          String(r.carrierName).toLowerCase().includes(term) ||
          String(r.mcDot).toLowerCase().includes(term) ||
          String(r.origin).toLowerCase().includes(term) ||
          String(r.destination).toLowerCase().includes(term)
        );
      });

    return out;
  }, [apiData.recentBids, search]);


  const pendingCount = apiData.bidsByStatus?.Pending || 0;
  const pendingApprovalCount = apiData.bidsByStatus?.PendingApproval || 0;
  const totalBids = apiData.totalBids || 0;
  const totalRate = apiData.additionalStats?.totalRate || 0;
  const avgRate = apiData.additionalStats?.avgRate || 0;


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
     
      {/* Top bar: Summary + Controls in one row */}
      <div className="flex items-start justify-between gap-6 mb-6">
        {/* Summary cards */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Total Bids</p>
                <p className="text-xl font-bold text-gray-800">{totalBids}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <DollarSign className="text-purple-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Total Rate</p>
                <p className="text-xl font-bold text-purple-600">${fmtMoney(totalRate)}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <DollarSign className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Avg Rate</p>
                <p className="text-xl font-bold text-blue-600">${fmtMoney(avgRate)}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <Clock className="text-yellow-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <Clock className="text-indigo-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-xl font-bold text-indigo-600">{pendingApprovalCount}</p>
              </div>
            </div>
          </div>
        </div>


        {/* Controls: date + search */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-48 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>


          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by B-/L- id, carrier, MC#, origin/dest..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            />
          </div>
        </div>
      </div>


      {/* Single Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-gray-100">
        {isFetching ? (
          <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xl font-semibold text-gray-800 mb-2">Loading Rate Requests...</p>
              <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
            </div>
          </div>
        ) : (
          <table className="min-w-full table-auto text-sm text-left">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bid ID</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load ID</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">MC / DOT</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Weight</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Commodity</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">User</th>
                {/* <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Approved By</th>
                <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Created At</th> */}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.fullBidId + idx}
                  className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700" title={r.fullBidId}>
                      {r.bidIdShort}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700" title={r.fullLoadId}>
                      {r.loadIdShort}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700">{r.carrierName}</span>
                  </td>
                  <td className="px-4 py-3">{r.mcDot}</td>
                  <td className="px-4 py-3">{r.origin}</td>
                  <td className="px-4 py-3">{r.destination}</td>
                  <td className="px-4 py-3">{r.weight}</td>
                  <td className="px-4 py-3">{r.commodity}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-green-600">${fmtMoney(r.rate)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-white text-xs px-3 py-1 rounded-full font-bold ${statusColors[r.status] || 'bg-gray-500'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.placedBy}</td>
                  {/* <td className="px-4 py-3">{r.approvedBy}</td>
                  <td className="px-4 py-3">{r.createdAt}</td> */}
                </tr>
              ))}


              {rows.length === 0 && (
                <tr>
                  <td colSpan="13" className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                      {search ? 'No bids found for your search' : 'No bids for this date'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {search ? 'Try changing your search terms' : 'Pick another date to see bids'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};


export default DailyRateRequest;



