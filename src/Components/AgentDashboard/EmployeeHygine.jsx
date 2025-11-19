import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  LinearProgress,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  CheckCircle,
  Warning,
  Schedule,
  Refresh,
  Event,
  TrendingUp,
  Person,
  Flag,
} from "@mui/icons-material";
import API_CONFIG from '../../config/api.js';
const API_BASE = `${API_CONFIG.BASE_URL}`;


/* -------------------- Utilities -------------------- */
const getEmpIdFromSession = () => {
  if (typeof window === "undefined") return null;
  const direct = sessionStorage.getItem("empId");
  if (direct) return direct;
  const keys = ["user", "employee", "profile", "authUser"];
  for (const k of keys) {
    const raw = sessionStorage.getItem(k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      if (obj?.empId) return obj.empId;
      if (obj?.employee?.empId) return obj.employee.empId;
    } catch {}
  }
  return null;
};


const pct = (v, t) => (!t ? 0 : Math.round((v / t) * 100));


/* -------------------- Styled Small Card -------------------- */
const CardShell = ({ children }) => (
  <Card
    sx={{
      height: "100%",
      borderRadius: 3,
      boxShadow: 3,
      transition: "transform .2s ease, box-shadow .2s ease",
      "&:hover": { transform: "translateY(-2px)", boxShadow: 6 },
      background: "linear-gradient(180deg,#ffffff, #f7faff)",
      border: "1px solid",
      borderColor: "rgba(2,119,189,0.08)",
    }}
  >
    <CardContent>{children}</CardContent>
  </Card>
);


const StatCard = ({ title, value, total, icon, color = "primary" }) => {
  const percentage = pct(value, total);
  return (
    <CardShell>
      <Box display="flex" alignItems="center" mb={1.5}>
        <Avatar sx={{ bgcolor: `${color}.main`, mr: 1.5, boxShadow: 1 }}>{icon}</Avatar>
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
      </Box>


      <Box display="flex" alignItems="baseline" mb={1}>
        <Typography variant="h3" fontWeight={800} lineHeight={1}>
          {value}
        </Typography>
        {total != null && (
          <Typography variant="h6" color="text.secondary" ml={1}>
            / {total}
          </Typography>
        )}
      </Box>


      {total != null && (
        <>
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 0.75,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { borderRadius: 4 },
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {percentage}% complete
          </Typography>
        </>
      )}
    </CardShell>
  );
};


const PerformanceScore = ({ score, status }) => {
  const getScoreColor = (n) => (n >= 85 ? "success" : n >= 60 ? "warning" : "error");
  const col = getScoreColor(score);
  return (
    <CardShell>
      <Typography variant="h6" fontWeight={800} mb={2}>
        Overall Performance
      </Typography>


      <Box position="relative" display="inline-flex" mb={2}>
        <CircularProgress variant="determinate" value={100} size={140} thickness={5} sx={{ color: "grey.300" }} />
        <CircularProgress
          variant="determinate"
          value={score}
          size={140}
          thickness={5}
          sx={{ position: "absolute", color: `${col}.main` }}
        />
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="h3" fontWeight={900}>
            {score}%
          </Typography>
        </Box>
      </Box>


      <Box>
        <Chip
          label={status || "—"}
          color={col}
          variant="outlined"
          size="medium"
          sx={{ fontWeight: 700, textTransform: "capitalize" }}
        />
      </Box>
    </CardShell>
  );
};


const BreakManagement = ({ overdueBreaks, hasOverdue, overdueDetails }) => {
  return (
    <CardShell>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ bgcolor: "info.main", mr: 1.5 }}>
            <Schedule />
          </Avatar>
          <Typography variant="h6" fontWeight={800}>
            Break Management
          </Typography>
        </Box>
        <Chip
          icon={hasOverdue ? <Warning /> : <CheckCircle />}
          label={hasOverdue ? `${overdueBreaks} overdue` : "On time"}
          color={hasOverdue ? "warning" : "success"}
          size="small"
          sx={{ fontWeight: 700 }}
        />
      </Box>


      <Divider sx={{ my: 1.5 }} />


      {overdueDetails?.length ? (
        <List dense>
          {overdueDetails.slice(0, 3).map((b, i) => (
            <ListItem key={i} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "warning.main", width: 34, height: 34 }}>
                  <Schedule fontSize="small" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ fontWeight: 700 }}
                primary={b?.date || "Unknown date"}
                secondary={`Duration: ${b?.duration || "—"} minutes`}
              />
            </ListItem>
          ))}
          {overdueDetails.length > 3 && (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              +{overdueDetails.length - 3} more overdue breaks
            </Typography>
          )}
        </List>
      ) : (
        <Box textAlign="center" py={3}>
          <CheckCircle sx={{ fontSize: 46, color: "success.main", mb: 1 }} />
          <Typography variant="subtitle1" fontWeight={800}>
            Excellent! All breaks on time
          </Typography>
        </Box>
      )}
    </CardShell>
  );
};


const PerformanceBreakdown = ({ breakdown }) => {
  const items = [
    { label: "Attendance Score", value: breakdown?.attendanceScore || 0 },
    { label: "Target Score", value: breakdown?.targetScore || 0 },
    { label: "Break Score", value: breakdown?.breakScore || 0 },
  ];
  return (
    <CardShell>
      <Box display="flex" alignItems="center" mb={2}>
        <Avatar sx={{ bgcolor: "primary.main", mr: 1.5 }}>
          <TrendingUp />
        </Avatar>
        <Typography variant="h6" fontWeight={800}>
          Performance Breakdown
        </Typography>
      </Box>


      {items.map((it, idx) => (
        <Box key={idx} mb={2}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">{it.label}</Typography>
            <Typography variant="body2" fontWeight={800}>
              {it.value}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={it.value}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": { borderRadius: 4 },
            }}
          />
        </Box>
      ))}
    </CardShell>
  );
};


/* -------------------- Main Component -------------------- */
const EmployeeHygiene = () => {
  const [monthYear, setMonthYear] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);


  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const empId = typeof window !== "undefined" ? getEmpIdFromSession() : null;


  const fetchReport = async () => {
    if (!empId) {
      setError("Employee not found. Please login again.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const [y, m] = monthYear.split("-").map(Number);
      const url = `${API_BASE}/api/v1/inhouseUser/${empId}/monthly-progress`;
      const res = await axios.get(url, {
        params: { month: m, year: y },
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setReport(res?.data?.data || null);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to load monthly progress.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear]);


  // Show loader on initial load
  if (loading && !report) {
    return (
      <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "#f5f9ff" }}>
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Dashboard...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch your performance data</p>
          </div>
        </div>
      </Box>
    );
  }


  // Derived data
  const presentDays = report?.attendanceAnalysis?.presentDays ?? 0;
  const workingDays = report?.period?.workingDaysInMonth ?? 0;
  const completedTargets = report?.targetAnalysis?.completedTargets ?? 0;
  const totalTargets = report?.targetAnalysis?.totalTargets ?? 0;
  const overdueBreaks = report?.breakAnalysis?.overdueBreaksCount ?? 0;
  const hasOverdue = report?.breakAnalysis?.hasOverdueBreaks ?? false;
  const overdueDetails = report?.breakAnalysis?.details || [];
  const scorePct = Math.round(report?.overallProgress?.score ?? 0);
  const statusText = report?.overallProgress?.status ?? "—";


  return (
    <Box sx={{ p: 3, minHeight: "100vh", bgcolor: "linear-gradient(180deg,#f5f9ff,#ffffff)" }}>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          color: "white",
          background: "linear-gradient(135deg, #0ea5e9 0%, #1976d2 60%)",
          boxShadow: 3,
        }}
      >
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          gap={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={900} letterSpacing={0.3} mb={0.5}>
              Employee Performance Dashboard
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95 }}>
              {report?.employeeName || "Employee"} • {report?.department || "Department"}
            </Typography>
            <Typography variant="body2" mt={0.5} sx={{ opacity: 0.9 }}>
              Period: {report?.period?.startDate || "—"} to {report?.period?.endDate || "—"}
            </Typography>
          </Box>


          <Box display="flex" alignItems="center" gap={1.5}>
            <TextField
              type="month"
              size="small"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              sx={{
                minWidth: 220,
                bgcolor: "rgba(255,255,255,0.15)",
                borderRadius: 2,
                backdropFilter: "blur(6px)",
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.35)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.6)" },
                },
                "& input": { color: "white", fontWeight: 700 },
              }}
              InputProps={{
                startAdornment: <Event sx={{ mr: 1, color: "rgba(255,255,255,0.9)" }} />,
              }}
            />
            <Button
              variant="contained"
              onClick={fetchReport}
              startIcon={<Refresh />}
              sx={{
                bgcolor: "rgba(0,0,0,0.2)",
                color: "white",
                borderRadius: 2,
                px: 2.5,
                "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
              }}
            >
              REFRESH
            </Button>
          </Box>
        </Box>
      </Paper>


      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="380px">
          <CircularProgress size={60} />
        </Box>
      )}


      {/* Error */}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" mb={1}>
            {error}
          </Typography>
          <Button variant="contained" onClick={fetchReport} startIcon={<Refresh />}>
            Retry
          </Button>
        </Alert>
      )}


      {/* Empty */}
      {!loading && !error && !report && (
        <CardShell>
          <Typography variant="h6" mb={1.5}>
            No data available
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            We couldn't find a report for this month.
          </Typography>
          <Button variant="outlined" onClick={fetchReport}>
            Refresh
          </Button>
        </CardShell>
      )}


      {/* Content */}
      {!loading && !error && report && (
        <>
          {/* ROW 1: Attendance | Daily Targets | Break Management */}
          <Grid container spacing={2.5} alignItems="stretch" sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Attendance"
                value={presentDays}
                total={workingDays}
                icon={<Person />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Daily Targets"
                value={completedTargets}
                total={totalTargets}
                icon={<Flag />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={12} md={4}>
              <BreakManagement
                overdueBreaks={overdueBreaks}
                hasOverdue={hasOverdue}
                overdueDetails={overdueDetails}
              />
            </Grid>
          </Grid>


          {/* ROW 2: Overall Performance | Performance Breakdown */}
          <Grid container spacing={2.5} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <PerformanceScore score={scorePct} status={statusText} />
            </Grid>
            <Grid item xs={12} md={6}>
              <PerformanceBreakdown breakdown={report?.overallProgress?.breakdown} />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};


export default EmployeeHygiene;



