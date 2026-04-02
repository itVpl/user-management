import axios from "axios";

const BASE = "/api/v1/hourly-checkin";

export async function getHourlyCheckinStatus(params = {}) {
  const res = await axios.get(`${BASE}/status`, { params });
  return res.data;
}

export async function submitHourlyCheckin({ responseText, submittedForTime } = {}) {
  throw new Error("submitHourlyCheckin: use submitHourlyCheckinV2");
}

export async function submitHourlyCheckinV2({
  responseText,
  submittedForTime,
  workStatus = "accept",
  rejectionReason,
  rejectionAttachment,
} = {}) {
  if (workStatus === "reject") {
    const form = new FormData();
    form.append("responseText", responseText || "");
    form.append("workStatus", "reject");
    if (submittedForTime) form.append("submittedForTime", submittedForTime);
    if (rejectionReason) form.append("rejectionReason", rejectionReason);
    if (rejectionAttachment) form.append("rejectionAttachment", rejectionAttachment);

    const res = await axios.post(`${BASE}/submit`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  }

  const payload = { responseText, workStatus: "accept" };
  if (submittedForTime) payload.submittedForTime = submittedForTime;
  const res = await axios.post(`${BASE}/submit`, payload);
  return res.data;
}

export async function getMyHourlyCheckinHistory(params = {}) {
  const res = await axios.get(`${BASE}/my-history`, { params });
  return res.data;
}

export async function getHourlyCheckinReport(params = {}) {
  const res = await axios.get(`${BASE}/report`, { params });
  return res.data;
}

