export function readDinnerThaliUser() {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isHrOrSuperadmin(user) {
  const deptRaw = user?.department;
  const dept =
    typeof deptRaw === "string" ? deptRaw : deptRaw?.name != null ? String(deptRaw.name) : "";
  const deptLower = dept.toLowerCase();
  const role = (user?.role || user?.userType || "").toLowerCase();
  return deptLower === "hr" || role === "superadmin";
}

export const DINNER_THALI_CHOICE_LABELS = {
  rice_roti: "Rice + Roti",
  only_roti: "Only rotis",
  no_thali: "No thali",
};
