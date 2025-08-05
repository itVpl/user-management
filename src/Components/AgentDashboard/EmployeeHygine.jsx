import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Button,
  TextField,
  LinearProgress,
  CircularProgress,
  Stack,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Skeleton,
  Fade,
  Grow,
} from "@mui/material";
import {
  CheckCircleRounded,
  ReportProblemRounded,
  EventRounded,
  FlagRounded,
  DirectionsWalkRounded,
  ScheduleRounded,
  RefreshRounded,
  InfoRounded,
} from "@mui/icons-material";

const API_BASE = "https://vpl-liveproject-1.onrender.com";

/* -------------------------- utils -------------------------- */
function getEmpIdFromSession() {
  if (typeof window === "undefined") return null;
  const direct = sessionStorage.getItem("empId");
  if (direct) return direct;

  const candidates = ["user", "employee", "profile", "authUser"];
  for (const key of candidates) {
    const raw = sessionStorage.getItem(key);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      if (obj?.empId) return obj.empId;
      if (obj?.employee?.empId) return obj.employee.empId;
    } catch {}
  }
  return null;
}
const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const safePct = (num, den) => (den ? clampPct((num / den) * 100) : 0);

/* ----------------------- UI subcomponents ----------------------- */
const StatCard = ({
  title,
  value,
  total,
  icon,
  helper,
  gradient = "blue",
  hint,
  delay = 0,
}) => {
  const showBar = typeof total === "number";
  const pct = showBar ? safePct(value, total) : 0;

  const gradients = {
    blue: "linear-gradient(135deg,#f9fafb,#eef2ff)",
    green: "linear-gradient(135deg,#f9fafb,#ecfdf5)",
    orange: "linear-gradient(135deg,#f9fafb,#fff7ed)",
    gray: "linear-gradient(135deg,#f9fafb,#f3f4f6)",
  };
  const barGradient = {
    blue: "linear-gradient(90deg,#3b82f6,#06b6d4)",
    green: "linear-gradient(90deg,#22c55e,#14b8a6)",
    orange: "linear-gradient(90deg,#f59e0b,#f97316)",
    gray: "linear-gradient(90deg,#9ca3af,#6b7280)",
  }[gradient];

  const avatarStyle = {
    blue: { bg: "rgba(59,130,246,.15)", fg: "#2563eb" },
    green: { bg: "rgba(34,197,94,.15)", fg: "#16a34a" },
    orange: { bg: "rgba(245,158,11,.15)", fg: "#c2410c" },
    gray: { bg: "rgba(107,114,128,.15)", fg: "#374151" },
  }[gradient];

  return (
    <Grow in timeout={500} style={{ transformOrigin: "0 0 0", transitionDelay: `${delay}ms` }}>
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 2.5,
          height: "100%",
          background: gradients[gradient],
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
          transition: "all .25s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} mb={1}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: avatarStyle.bg,
              color: avatarStyle.fg,
              width: 46,
              height: 46,
            }}
          >
            {icon}
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }} color="text.secondary">
                {title}
              </Typography>
              {hint && (
                <Tooltip title={hint}>
                  <InfoRounded fontSize="small" color="disabled" />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
              {value}
              {typeof total === "number" && (
                <Typography component="span" sx={{ ml: 0.5 }} color="text.secondary">
                  / {total}
                </Typography>
              )}
            </Typography>
          </Box>
        </Stack>

        {showBar && (
          <>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 10,
                borderRadius: 3,
                bgcolor: "#e5e7eb",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 3,
                  background: barGradient,
                },
              }}
            />
            <Stack direction="row" justifyContent="space-between" mt={0.75}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" fontWeight={700}>
                {pct}%
              </Typography>
            </Stack>
          </>
        )}

        {helper && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            {helper}
          </Typography>
        )}
      </Card>
    </Grow>
  );
};

const ScoreRing = ({ score = 0, status = "—", delay = 200 }) => {
  const pct = clampPct(score);
  const ringColor = pct >= 85 ? "#16a34a" : pct >= 60 ? "#f59e0b" : "#dc2626";
  const chipColor = pct >= 85 ? "success" : pct >= 60 ? "warning" : "error";

  return (
    <Grow in timeout={600} style={{ transformOrigin: "50% 0", transitionDelay: `${delay}ms` }}>
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          textAlign: "center",
          background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 8px 28px rgba(0,0,0,.08)",
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Total Score
        </Typography>

        <Box sx={{ position: "relative", display: "inline-flex", mb: 1 }}>
          <CircularProgress variant="determinate" value={100} thickness={7} size={168} sx={{ color: "#e5e7eb" }} />
          <CircularProgress
            variant="determinate"
            value={pct}
            thickness={7}
            size={168}
            sx={{
              position: "absolute",
              left: 0,
              color: ringColor,
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,.15))",
              transition: "all .4s ease",
            }}
          />
          <Box
            sx={{
              inset: 0,
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <Typography variant="h4" fontWeight={900}>
              {pct}%
            </Typography>
            <Chip label={status} color={chipColor} size="small" sx={{ mt: 0.6, fontWeight: 800 }} />
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Aim for <strong>&gt; 85%</strong> to stay in green.
        </Typography>
      </Card>
    </Grow>
  );
};

const SummaryRow = ({ label, value = 0 }) => {
  const pct = clampPct(value);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={800}>
          {pct}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 9,
          borderRadius: 2,
          mt: 0.75,
          bgcolor: "#eef2f7",
          "& .MuiLinearProgress-bar": { borderRadius: 2, background: "linear-gradient(90deg,#60a5fa,#34d399)" },
        }}
      />
    </Box>
  );
};

/* -------------------------- main -------------------------- */
const EmployeeHygiene = () => {
  const today = useMemo(() => new Date(), []);
  const [monthYear, setMonthYear] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
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

  const onMonthChange = (e) => setMonthYear(e.target.value);

  // derived metrics (safe)
  const presentDays = report?.attendanceAnalysis?.presentDays ?? 0;
  const workingDays = report?.period?.workingDaysInMonth ?? 0;

  const overdueBreaks = report?.breakAnalysis?.overdueBreaksCount ?? 0;
  const hasOverdue = report?.breakAnalysis?.hasOverdueBreaks ?? false;
  const overdueDetails = report?.breakAnalysis?.details || [];

  const completedTargets = report?.targetAnalysis?.completedTargets ?? 0;
  const totalTargets = report?.targetAnalysis?.totalTargets ?? 0;

  const statusText = (report?.overallProgress?.status ?? "—").toUpperCase();
  const scorePct = clampPct(report?.overallProgress?.score ?? 0);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
        bgcolor: (t) => (t.palette.mode === "light" ? "grey.50" : "background.default"),
      }}
    >
      {/* Header */}
      <Fade in timeout={500}>
        <Box
          sx={{
            borderRadius: 5,
            p: { xs: 3, md: 4 },
            mb: 4,
            background:
              "linear-gradient(135deg, rgba(59,130,246,.12) 0%, rgba(16,185,129,.12) 100%)",
            border: "1px solid",
            borderColor: "divider",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 12px 36px rgba(0,0,0,.06)",
            backdropFilter: "saturate(180%) blur(2px)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(700px 200px at 100% -20%, rgba(59,130,246,.10), transparent 60%), radial-gradient(700px 200px at -10% 100%, rgba(16,185,129,.10), transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={2}
            sx={{ position: "relative" }}
          >
            <Box>
              <Typography variant="h4" fontWeight={900} gutterBottom>
                ✨ Personal Hygiene Summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {report?.employeeName ?? "—"} • {report?.department ?? "—"} •{" "}
                Period: {report?.period?.startDate ?? "—"} → {report?.period?.endDate ?? "—"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.25} alignItems="center">
              <TextField
                type="month"
                size="small"
                value={monthYear}
                onChange={onMonthChange}
                InputProps={{
                  startAdornment: (
                    <EventRounded fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={fetchReport}
                startIcon={<RefreshRounded />}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Fade>

      {/* Loading */}
      {loading && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Skeleton variant="rounded" height={150} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Skeleton variant="rounded" height={150} />
              </Grid>
              <Grid item xs={12}>
                <Skeleton variant="rounded" height={190} />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rounded" height={290} />
            <Box mt={3}>
              <Skeleton variant="rounded" height={200} />
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Error */}
      {!loading && error && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            p: 3,
            textAlign: "center",
            background: "linear-gradient(135deg,#fff1f2,#fee2e2)",
          }}
        >
          <Typography color="error" fontWeight={800} gutterBottom>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Please try again or pick another month.
          </Typography>
          <Button variant="contained" onClick={fetchReport} startIcon={<RefreshRounded />}>
            Retry
          </Button>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && !report && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            p: 4,
            textAlign: "center",
            background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
          }}
        >
          <Typography fontWeight={900} gutterBottom>
            No data available
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            We couldn't find a report for this month.
          </Typography>
          <Button variant="outlined" onClick={fetchReport}>
            Refresh
          </Button>
        </Card>
      )}

      {/* Content */}
      {!loading && !error && report && (
        <Grid container spacing={3}>
          {/* Left column */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <StatCard
                  title="Attendance (Present / Working Days)"
                  value={presentDays}
                  total={workingDays}
                  icon={<DirectionsWalkRounded />}
                  helper={`Attendance Rate: ${safePct(presentDays, workingDays)}%`}
                  hint="Days marked present over working days."
                  gradient="green"
                  delay={0}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <StatCard
                  title="Daily Targets (Completed / Total)"
                  value={completedTargets}
                  total={totalTargets}
                  icon={<FlagRounded />}
                  helper={`Completion: ${safePct(completedTargets, totalTargets)}%`}
                  hint="Completed tasks vs assigned tasks."
                  gradient="orange"
                  delay={80}
                />
              </Grid>

              <Grid item xs={12}>
                <Grow in timeout={600} style={{ transitionDelay: "120ms", transformOrigin: "0 0" }}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 4,
                      border: "1px solid",
                      borderColor: "divider",
                      background: "linear-gradient(135deg,#ffffff,#f8fafc)",
                      boxShadow: "0 6px 24px rgba(0,0,0,.06)",
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={1.5}
                      >
                        <Typography variant="subtitle1" fontWeight={900}>
                          Breaks
                        </Typography>
                        <Chip
                          size="small"
                          color={hasOverdue ? "warning" : "success"}
                          icon={hasOverdue ? <ReportProblemRounded /> : <CheckCircleRounded />}
                          label={hasOverdue ? `${overdueBreaks} overdue` : "No overdue breaks"}
                          sx={{ fontWeight: 800 }}
                        />
                      </Stack>

                      <Divider sx={{ mb: 2 }} />

                      {overdueDetails.length > 0 ? (
                        <List dense disablePadding>
                          {overdueDetails.map((b, idx) => (
                            <ListItem
                              key={`${b?.date}-${idx}`}
                              sx={{
                                px: 0,
                                "&:not(:last-of-type)": {
                                  borderBottom: "1px dashed",
                                  borderColor: "divider",
                                },
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: "warning.light", color: "warning.dark" }}>
                                  <ScheduleRounded />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" fontWeight={800}>
                                      {b?.date ?? "—"}
                                    </Typography>
                                    <Chip size="small" color="warning" variant="outlined" label="Overdue" />
                                  </Stack>
                                }
                                secondary={
                                  <Typography variant="body2" color="text.secondary">
                                    Duration: {b?.duration ?? "—"} min
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Great! No overdue breaks recorded this month.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Grid>

          {/* Right column */}
          <Grid item xs={12} md={4}>
            <ScoreRing score={scorePct} status={statusText} />

            <Grow in timeout={600} style={{ transitionDelay: "220ms", transformOrigin: "0 0" }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "divider",
                  mt: 3,
                  background: "linear-gradient(135deg,#f9fafb,#eef2ff)",
                  boxShadow: "0 6px 24px rgba(0,0,0,.06)",
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Summary
                  </Typography>
                  <Stack spacing={1.25}>
                    <SummaryRow
                      label="Attendance Score"
                      value={report?.overallProgress?.breakdown?.attendanceScore}
                    />
                    <SummaryRow
                      label="Target Score"
                      value={report?.overallProgress?.breakdown?.targetScore}
                    />
                    <SummaryRow
                      label="Break Score"
                      value={report?.overallProgress?.breakdown?.breakScore}
                    />
                  </Stack>

                  {report?.overallProgress?.statusMessage && (
                    <Tooltip title="From backend assessment">
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Note: {report.overallProgress.statusMessage}
                      </Typography>
                    </Tooltip>
                  )}
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default EmployeeHygiene;
