// src/pages/DoDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Link as MuiLink,
  TableContainer,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import LaunchIcon from "@mui/icons-material/Launch";
import SummarizeIcon from "@mui/icons-material/Summarize";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaidIcon from "@mui/icons-material/Paid";
import InventoryIcon from "@mui/icons-material/Inventory2";
import API_CONFIG from '../../config/api.js';
const API_URL = `${API_CONFIG.BASE_URL}/api/v1/do/do`;

const chipSx = { height: 22, "& .MuiChip-label": { px: 0.75, fontWeight: 700 } };

function currency(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return d;
  }
}

export default function DODetails() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErr("");
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(API_URL, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        const list = json?.data || [];
        setData(list);
        setFiltered(list);
      } catch (e) {
        setErr(e.message || "Failed to fetch DO list");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  useEffect(() => {
    if (!q) return setFiltered(data);
    const term = q.toLowerCase().trim();
    setFiltered(
      data.filter((item) =>
        (item.customers || []).some((c) => (c.loadNo || "").toLowerCase().includes(term))
      )
    );
  }, [q, data]);

  const totals = useMemo(() => {
    let line = 0, fsc = 0, other = 0, custTotal = 0, carrierFees = 0;
    filtered.forEach((row) => {
      (row.customers || []).forEach((c) => {
        line += Number(c.lineHaul || 0);
        fsc += Number(c.fsc || 0);
        other += Number(c.other || 0);
        custTotal += Number(c.totalAmount || 0);
      });
      carrierFees += Number(row?.carrier?.totalCarrierFees || 0);
    });
    return { line, fsc, other, custTotal, carrierFees };
  }, [filtered]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Gradient header */}
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 2,
          color: "white",
          background: "linear-gradient(135deg, #5B7CFF 0%, #8A5BFF 50%, #FF5BBE 100%)",
          boxShadow: "0 12px 24px rgba(90, 60, 200, 0.35)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="h5" fontWeight={800}>
            Delivery Orders
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search Load No (e.g., L0001)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{
                minWidth: 260,
                "& .MuiOutlinedInput-root": {
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  backdropFilter: "blur(8px)",
                },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
              }}
              InputLabelProps={{ style: { color: "#fff" } }}
            />
            <Tooltip title="Refresh">
              <IconButton
                onClick={() => setRefreshKey((k) => k + 1)}
                sx={{
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.15)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Stat cards (compact) */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg,#E3F2FD 0%,#E8F5E9 100%)", boxShadow: "0 10px 20px rgba(33,150,243,.15)" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack><Typography variant="body2" color="text.secondary">Records</Typography>
                  <Typography variant="h5" fontWeight={800}>{filtered.length}</Typography>
                </Stack>
                <SummarizeIcon />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg,#FFF3E0 0%,#FCE4EC 100%)", boxShadow: "0 10px 20px rgba(255,193,7,.18)" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack><Typography variant="body2" color="text.secondary">Customer Total Σ</Typography>
                  <Typography variant="h5" fontWeight={800}>$ {currency(totals.custTotal)}</Typography>
                </Stack>
                <PaidIcon />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg,#E8EAF6 0%,#E3F2FD 100%)", boxShadow: "0 10px 20px rgba(63,81,181,.18)" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack><Typography variant="body2" color="text.secondary">Carrier Fees Σ</Typography>
                  <Typography variant="h5" fontWeight={800}>$ {currency(totals.carrierFees)}</Typography>
                </Stack>
                <LocalShippingIcon />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg,#E0F7FA 0%,#FFFDE7 100%)", boxShadow: "0 10px 20px rgba(0,188,212,.18)" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack><Typography variant="body2" color="text.secondary">Line/FSC/Other Σ</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    $ {currency(totals.line)} • $ {currency(totals.fsc)} • $ {currency(totals.other)}
                  </Typography>
                </Stack>
                <InventoryIcon />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading / Error */}
      {loading && (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>Loading…</Typography>
        </Stack>
      )}
      {err && !loading && <Alert severity="error">{err}</Alert>}

      {/* Scrollable Table */}
      {!loading && !err && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 3,
            boxShadow: "0 14px 28px rgba(0,0,0,0.08)",
            maxHeight: "70vh",          // vertical scroll limit
            overflow: "auto",           // both scrollbars when needed
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1600 }}> {/* horizontal scroll */}
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontWeight: 700,
                    color: "#000",
                    border: 0,
                    whiteSpace: "nowrap",   // prevent wrapping
                  },
                  background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
                }}
              >
                <TableCell>Load No</TableCell>
                <TableCell>Bill To</TableCell>
                <TableCell>Dispatcher</TableCell>
                <TableCell>Work Order</TableCell>
                <TableCell align="right">Line Haul</TableCell>
                <TableCell align="right">FSC</TableCell>
                <TableCell align="right">Other</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Carrier</TableCell>
                <TableCell>Equip</TableCell>
                <TableCell align="right">Carrier Fees</TableCell>
                <TableCell>Shipper</TableCell>
                <TableCell>Pickup</TableCell>
                <TableCell>Drop</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Files</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={16} align="center">No records found</TableCell>
                </TableRow>
              )}

              {filtered.map((row, idx) => {
                const c = row.customers?.[0] || {};
                const cr = row.carrier || {};
                const sp = row.shipper || {};
                const created = row.createdBySalesUser || {};
                const files = row.uploadedFiles || [];
                const file = files[0];

                return (
                  <TableRow
                    key={row._id}
                    hover
                    sx={{
                      "& td": { whiteSpace: "nowrap" },
                      backgroundColor: idx % 2 ? "rgba(99,102,241,0.03)" : "transparent",
                    }}
                  >
                    <TableCell>
                      <Chip
                        size="small"
                        label={c.loadNo || "-"}
                        sx={{ ...chipSx, bgcolor: "rgba(99,102,241,0.12)", color: "#4F46E5" }}
                      />
                    </TableCell>
                    <TableCell>{c.billTo || "-"}</TableCell>
                    <TableCell>{c.dispatcherName || "-"}</TableCell>
                    <TableCell>{c.workOrderNo || "-"}</TableCell>
                    <TableCell align="right">$ {currency(c.lineHaul)}</TableCell>
                    <TableCell align="right">$ {currency(c.fsc)}</TableCell>
                    <TableCell align="right">$ {currency(c.other)}</TableCell>
                    <TableCell align="right" style={{ fontWeight: 700 }}>
                      $ {currency(c.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {cr.carrierName ? (
                        <Chip size="small" label={cr.carrierName}
                          sx={{ ...chipSx, bgcolor: "rgba(16,185,129,0.12)", color: "#059669" }} />
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {cr.equipmentType ? (
                        <Chip size="small" label={cr.equipmentType}
                          sx={{ ...chipSx, bgcolor: "rgba(14,165,233,0.12)", color: "#0284C7" }} />
                      ) : "-"}
                    </TableCell>
                    <TableCell align="right">$ {currency(cr.totalCarrierFees)}</TableCell>
                    <TableCell>{sp.name || "-"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={fmtDate(sp.pickUpDate)}
                        sx={{ ...chipSx, bgcolor: "rgba(234,179,8,0.12)", color: "#a16207" }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={fmtDate(sp.dropDate)}
                        sx={{ ...chipSx, bgcolor: "rgba(244,114,182,0.12)", color: "#9d174d" }} />
                    </TableCell>
                    <TableCell>
                      {created.employeeName ? (
                        <Chip size="small" label={`${created.employeeName} • ${created.department || "-"}`}
                          sx={{ ...chipSx, bgcolor: "rgba(59,130,246,0.12)", color: "#1D4ED8" }} />
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {files.length ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            size="small"
                            startIcon={<LaunchIcon />}
                            component={MuiLink}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              textTransform: "none",
                              borderRadius: 999,
                              px: 1.2,
                              py: 0.3,
                              bgcolor: "rgba(99,102,241,0.14)",
                              "&:hover": { bgcolor: "rgba(99,102,241,0.22)" },
                            }}
                          >
                            Open
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            {files.length} file{files.length > 1 ? "s" : ""}
                          </Typography>
                        </Stack>
                      ) : (
                        <Chip size="small" label="No files" sx={{ ...chipSx, bgcolor: "#f3f4f6" }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
