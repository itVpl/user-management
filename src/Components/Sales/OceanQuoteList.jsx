import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Ship, ChevronLeft, ChevronRight, RefreshCw, User, Users, Eye, Search } from 'lucide-react';

import { format } from 'date-fns';

import { listOceanQuotes } from '../../services/oceanQuoteService.js';

import Loader from '../common/Loader.jsx';

import { toast } from 'react-toastify';



const LIMIT = 20;



/** Row spacing + borders (same pattern as Sales day workspace tables). */

/** No `do-report-scroll-x` here — that class forces always-visible horizontal scrollbars. */
const OQ_TABLE_SHELL = 'overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 p-3';

const OQ_TABLE = 'min-w-full border-separate border-spacing-y-2.5 text-base font-sans';

const OQ_HEAD = 'text-left';

const OQ_TH =

  'px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap bg-white border-y border-gray-200';

const OQ_TD = 'px-4 py-3 text-base font-medium text-gray-800 align-middle bg-white border-y border-gray-200';

const OQ_CELL_START = 'rounded-l-xl border-l border-gray-200';

const OQ_CELL_END = 'rounded-r-xl border-r border-gray-200';

const BTN_SECONDARY =

  'cursor-pointer inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none';

const BTN_TOGGLE_ACTIVE = 'cursor-pointer bg-blue-600 text-white';

const BTN_TOGGLE_IDLE = 'cursor-pointer text-gray-600 hover:bg-gray-50';

const BTN_VIEW =

  'cursor-pointer inline-flex items-center gap-1.5 rounded-xl border-1 border-blue-600 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-1';



function rowMatchesQuery(row, q) {

  if (!q.trim()) return true;

  const needle = q.trim().toLowerCase();

  const haystack = [

    row.name,

    row.email,

    row.phoneNumber,

    row.originPort,

    row.destinationPort,

    row.cargoType,

    row.containerType,

    row.assignedTo?.employeeName,

    row.assignedTo?.empId != null ? String(row.assignedTo.empId) : '',

  ]

    .filter(Boolean)

    .join(' ')

    .toLowerCase();

  return haystack.includes(needle);

}



export default function OceanQuoteList() {

  const navigate = useNavigate();

  const [items, setItems] = useState([]);

  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, totalItems: 0, totalPages: 1 });

  const [loading, setLoading] = useState(true);

  const [mineOnly, setMineOnly] = useState(true);

  const [accessError, setAccessError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');



  const fetchPage = useCallback(

    async (page) => {

      setLoading(true);

      setAccessError(null);

      try {

        const res = await listOceanQuotes({ page, limit: LIMIT, mine: mineOnly });

        if (res.data?.success) {

          setItems(Array.isArray(res.data.data) ? res.data.data : []);

          const p = res.data.pagination || {};

          setPagination({

            page: p.page ?? page,

            limit: p.limit ?? LIMIT,

            totalItems: p.totalItems ?? 0,

            totalPages: Math.max(p.totalPages ?? 1, 1),

          });

        } else {

          setItems([]);

          toast.error(res.data?.message || 'Failed to load quotes');

        }

      } catch (err) {

        console.error(err);

        const status = err?.response?.status;

        const msg = err?.response?.data?.message || err?.message || 'Failed to load quotes';

        if (status === 403) {

          setAccessError(msg);

        } else {

          toast.error(msg);

        }

        setItems([]);

      } finally {

        setLoading(false);

      }

    },

    [mineOnly],

  );



  useEffect(() => {

    fetchPage(1);

  }, [fetchPage]);



  const filteredItems = useMemo(

    () => items.filter((row) => rowMatchesQuery(row, searchQuery)),

    [items, searchQuery],

  );



  const goPage = (next) => {

    const p = pagination.page + next;

    if (p < 1 || p > pagination.totalPages) return;

    fetchPage(p);

  };



  const formatWhen = (d) => {

    if (!d) return '—';

    try {

      return format(new Date(d), 'dd MMM yyyy, HH:mm');

    } catch {

      return '—';

    }

  };



  const searchTrim = searchQuery.trim();



  return (

    <div className="min-h-screen bg-gray-50 p-4 md:p-6">

      <div className="mx-auto max-w-7xl">

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">

              <Ship className="h-5 w-5" aria-hidden />

            </div>

            <div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Quote request</h1>

              <p className="text-base text-gray-500">Ocean quote leads (round-robin assignment)</p>

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">

              <button

                type="button"

                onClick={() => setMineOnly(true)}

                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${mineOnly ? BTN_TOGGLE_ACTIVE : BTN_TOGGLE_IDLE}`}

              >

                <User size={18} aria-hidden /> My queue

              </button>

              <button

                type="button"

                onClick={() => setMineOnly(false)}

                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${!mineOnly ? BTN_TOGGLE_ACTIVE : BTN_TOGGLE_IDLE}`}

              >

                <Users size={18} aria-hidden /> Team inbox

              </button>

            </div>

          </div>

        </div>



        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">

            <div className="relative min-w-0 flex-1">

              <label htmlFor="ocean-quote-search" className="sr-only">

                Search quotes

              </label>

              <Search

                className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"

                aria-hidden

              />

              <input

                id="ocean-quote-search"

                type="search"

                placeholder="Search this page — name, email, phone, lanes, cargo, assignee…"

                value={searchQuery}

                onChange={(e) => setSearchQuery(e.target.value)}

                className="w-full cursor-text rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"

                autoComplete="off"

              />

            </div>

            <button

              type="button"

              onClick={() => fetchPage(pagination.page)}

              className={`${BTN_SECONDARY} shrink-0 justify-center sm:w-auto`}

            >

              <RefreshCw size={18} aria-hidden /> Refresh

            </button>

          </div>

          {searchTrim ? (

            <p className="mt-2 text-sm text-gray-500">

              Showing {filteredItems.length} match{filteredItems.length === 1 ? '' : 'es'} on page {pagination.page} (

              filtered from this page only).

            </p>

          ) : null}

        </div>



        {accessError && (

          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900">

            {accessError}

          </div>

        )}



        <div className="overflow-hidden rounded-2xl bg-white">

          {loading ? (

            <Loader message="Loading quotes…" />

          ) : items.length === 0 ? (

            <div className="p-10 text-center text-base text-gray-500">No ocean quotes yet for this view.</div>

          ) : filteredItems.length === 0 ? (

            <div className="p-10 text-center text-base text-gray-600">

              No rows match “{searchTrim}”. Try another term or clear the search.

            </div>

          ) : (

            <div className="p-0 sm:p-1">

              <div className={OQ_TABLE_SHELL}>

                <table className={OQ_TABLE}>

                  <thead className={OQ_HEAD}>

                    <tr>

                      <th scope="col" className={`${OQ_TH} ${OQ_CELL_START}`}>

                        Submitted

                      </th>

                      <th scope="col" className={OQ_TH}>

                        Customer

                      </th>

                      <th scope="col" className={OQ_TH}>

                        Lane

                      </th>

                      <th scope="col" className={OQ_TH}>

                        Cargo

                      </th>

                      <th scope="col" className={OQ_TH}>

                        Assigned

                      </th>

                      <th scope="col" className={`${OQ_TH} ${OQ_CELL_END} text-right`}>

                        Actions

                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredItems.map((row) => (

                      <tr key={row._id} className="bg-white">

                        <td className={`${OQ_TD} whitespace-nowrap text-gray-700 ${OQ_CELL_START}`}>

                          {formatWhen(row.createdAt)}

                        </td>

                        <td className={OQ_TD}>

                          <div className="font-semibold text-gray-900">{row.name || '—'}</div>

                          <div className="text-sm font-normal text-gray-500">{row.email || '—'}</div>

                          {row.phoneNumber ? (

                            <div className="text-sm font-normal text-gray-500">{row.phoneNumber}</div>

                          ) : null}

                        </td>

                        <td className={`${OQ_TD} max-w-[220px]`}>

                          <div className="truncate font-medium text-gray-800" title={row.originPort}>

                            {row.originPort || '—'}

                          </div>

                          <div className="truncate text-sm font-normal text-gray-500" title={row.destinationPort}>

                            → {row.destinationPort || '—'}

                          </div>

                        </td>

                        <td className={`${OQ_TD} max-w-[200px]`}>

                          <div className="truncate font-medium text-gray-800" title={row.cargoType}>

                            {row.cargoType || '—'}

                          </div>

                          {row.containerType ? (

                            <div className="text-sm font-normal text-gray-500">{row.containerType}</div>

                          ) : null}

                        </td>

                        <td className={`${OQ_TD} whitespace-nowrap text-gray-800`}>

                          {row.assignedTo?.employeeName || (

                            <span className="font-normal text-gray-400">Unassigned</span>

                          )}

                          {row.assignedTo?.empId ? (

                            <span className="ml-1 text-sm font-normal text-gray-500">

                              ({row.assignedTo.empId})

                            </span>

                          ) : null}

                        </td>

                        <td className={`${OQ_TD} whitespace-nowrap text-right ${OQ_CELL_END}`}>

                          <button

                            type="button"

                            onClick={() => navigate(`/quote-request/${row._id}`)}

                            className={BTN_VIEW}

                            aria-label={`View customer details for ${row.name || 'quote'}`}

                          >

                            {/* <Eye size={16} aria-hidden /> */}

                            View

                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          )}



          {!loading && pagination.totalPages > 1 && (

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-base text-gray-600">

              <span>

                Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)

              </span>

              <div className="flex gap-2">

                <button

                  type="button"

                  disabled={pagination.page <= 1}

                  onClick={() => goPage(-1)}

                  className={BTN_SECONDARY}

                >

                  <ChevronLeft size={18} aria-hidden /> Previous

                </button>

                <button

                  type="button"

                  disabled={pagination.page >= pagination.totalPages}

                  onClick={() => goPage(1)}

                  className={BTN_SECONDARY}

                >

                  Next <ChevronRight size={18} aria-hidden />

                </button>

              </div>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}


