import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import NewsletterUploadForm from "../Components/Newsletter/NewsletterUploadForm";
import RecipientSelector from "../Components/Newsletter/RecipientSelector";
import SendChannelSelector from "../Components/Newsletter/SendChannelSelector";
import NewsletterSendPanel from "../Components/Newsletter/NewsletterSendPanel";
import NewsletterHistoryTable from "../Components/Newsletter/NewsletterHistoryTable";
import newsletterService from "../services/newsletterService";

const FALLBACK_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".zip",
  ".rar",
];

const FALLBACK_MAX_SIZE = 50 * 1024 * 1024;

const getSendTypeFromChannels = (channels) => {
  if (channels.email && channels.whatsapp) return "both";
  if (channels.email) return "email";
  if (channels.whatsapp) return "whatsapp";
  return "";
};

const Newsletter = () => {
  const [uploadConfig, setUploadConfig] = useState({
    maxFileSizeBytes: FALLBACK_MAX_SIZE,
    allowedExtensions: FALLBACK_ALLOWED_EXTENSIONS,
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    message: "",
  });
  const [file, setFile] = useState(null);
  const [newsletterId, setNewsletterId] = useState("");
  const [channels, setChannels] = useState({ email: false, whatsapp: false });
  const [sendType, setSendType] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [newsletters, setNewsletters] = useState([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSummary, setSendSummary] = useState(null);
  const [sendResults, setSendResults] = useState([]);
  const [senderDetails, setSenderDetails] = useState(null);
  const [lastSendPayload, setLastSendPayload] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyFilters, setHistoryFilters] = useState({
    status: "",
    channel: "",
    newsletterId: "",
  });
  const [errors, setErrors] = useState({
    upload: "",
    recipients: "",
    channels: "",
    send: "",
  });

  const sendPanelDisabled = useMemo(
    () => !newsletterId || selectedRecipientIds.length === 0 || !sendType,
    [newsletterId, selectedRecipientIds.length, sendType]
  );

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await newsletterService.getUploadConfig();
        if (data?.upload) {
          setUploadConfig({
            maxFileSizeBytes: data.upload.maxFileSizeBytes || FALLBACK_MAX_SIZE,
            allowedExtensions: data.upload.allowedExtensions?.length
              ? data.upload.allowedExtensions
              : FALLBACK_ALLOWED_EXTENSIONS,
          });
        }
      } catch (error) {
        console.error("Failed to load upload config:", error);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    const loadNewsletters = async () => {
      try {
        const data = await newsletterService.listNewsletters();
        const list = data?.data?.newsletters || data?.newsletters || [];
        setNewsletters(list);
      } catch (error) {
        console.error("Failed to fetch newsletters:", error);
      }
    };
    loadNewsletters();
  }, []);

  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        const data = await newsletterService.getRecipients({ page: 1, limit: 500 });
        const list = data?.recipients || data?.data?.recipients || [];
        setRecipients(Array.isArray(list) ? list : []);
        setErrors((prev) => ({ ...prev, recipients: "" }));
      } catch (error) {
        console.error("Failed to fetch recipients:", error);
        setErrors((prev) => ({
          ...prev,
          recipients:
            error?.message?.toLowerCase().includes("403") ||
            error?.message?.toLowerCase().includes("forbidden")
              ? "You do not have permission to view recipients."
              : "Failed to load recipients.",
        }));
      }
    };
    fetchRecipients();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await newsletterService.getHistory({
          newsletterId: historyFilters.newsletterId,
          status: historyFilters.status,
          channel: historyFilters.channel,
          page: historyPage,
          limit: 20,
        });

        const rows = data?.data?.rows || data?.rows || data?.history || [];
        const pagination = data?.data?.pagination || data?.pagination || {};
        setHistoryRows(rows);
        setHistoryTotalPages(Math.max(1, pagination.totalPages || 1));
      } catch (error) {
        console.error("Failed to fetch history:", error);
        setHistoryRows([]);
      }
    };
    fetchHistory();
  }, [historyFilters, historyPage]);

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setErrors((prev) => ({ ...prev, upload: "" }));

    if (!formData.title.trim()) {
      setErrors((prev) => ({ ...prev, upload: "Title is required." }));
      return;
    }

    if (!file) {
      setErrors((prev) => ({ ...prev, upload: "File is required for upload." }));
      return;
    }

    const allowedExtensions = uploadConfig.allowedExtensions || FALLBACK_ALLOWED_EXTENSIONS;
    const maxSize = uploadConfig.maxFileSizeBytes || FALLBACK_MAX_SIZE;
    const dotIndex = file.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? file.name.substring(dotIndex).toLowerCase() : "";

    if (!allowedExtensions.map((item) => item.toLowerCase()).includes(extension)) {
      setErrors((prev) => ({
        ...prev,
        upload: `Invalid file type. Allowed: ${allowedExtensions.join(", ")}`,
      }));
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({ ...prev, upload: "File exceeds max size limit (50MB)." }));
      return;
    }

    try {
      setIsUploading(true);
      const body = new FormData();
      body.append("file", file);
      body.append("title", formData.title.trim());
      if (formData.description) body.append("description", formData.description);
      if (formData.subject) body.append("subject", formData.subject);
      if (formData.message) body.append("message", formData.message);
      body.append("sendType", sendType || "both");

      const data = await newsletterService.uploadNewsletter(body);
      const uploadedId = data?.newsletter?._id;
      setNewsletterId(uploadedId || "");
      setHistoryFilters((prev) => ({ ...prev, newsletterId: uploadedId || prev.newsletterId }));
      setNewsletters((prev) => {
        const created = data?.newsletter;
        if (!created?._id) return prev;
        return [created, ...prev.filter((item) => item?._id !== created._id)];
      });
      toast.success("Newsletter uploaded successfully.");
    } catch (error) {
      setErrors((prev) => ({ ...prev, upload: error.message || "Upload failed." }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    setErrors((prev) => ({ ...prev, recipients: "", channels: "", send: "" }));

    if (!selectedRecipientIds.length) {
      setErrors((prev) => ({ ...prev, recipients: "At least one recipient is required." }));
      return;
    }
    if (!sendType) {
      setErrors((prev) => ({ ...prev, channels: "At least one channel is required." }));
      return;
    }
    if (!newsletterId) {
      setErrors((prev) => ({ ...prev, send: "Upload newsletter before sending." }));
      return;
    }

    const selectedRecipientSet = new Set(selectedRecipientIds);
    const selectedRecipients = recipients.filter((item) =>
      selectedRecipientSet.has(item?._id || item?.userId || item?.id)
    );

    const hasEmail = (person) => Boolean(person?.email?.trim());
    const hasWhatsapp = (person) => Boolean((person?.whatsappNumber || person?.contactNumber || "").trim());

    const validRecipients = selectedRecipients.filter((person) => {
      if (sendType === "email") return hasEmail(person);
      if (sendType === "whatsapp") return hasWhatsapp(person);
      return hasEmail(person) || hasWhatsapp(person);
    });

    if (!validRecipients.length) {
      setErrors((prev) => ({
        ...prev,
        send:
          sendType === "email"
            ? "No selected recipients have email."
            : sendType === "whatsapp"
            ? "No selected recipients have WhatsApp number."
            : "Selected recipients do not have email or WhatsApp numbers.",
      }));
      return;
    }

    try {
      setIsSending(true);
      const payload = {
        newsletterId,
        recipientIds: validRecipients.map((person) => person?._id || person?.userId || person?.id),
        sendType,
        subject: formData.subject || formData.title,
        message: formData.message || "",
      };
      const data = await newsletterService.sendNewsletter(payload);
      setSendSummary(data?.summary || null);
      setSendResults(Array.isArray(data?.results) ? data.results : []);
      setSenderDetails(data?.senderDetails || null);
      setLastSendPayload(payload);
      toast.success("Newsletter send process completed.");
      setHistoryPage(1);
    } catch (error) {
      setErrors((prev) => ({ ...prev, send: error.message || "Send failed." }));
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryFailed = async () => {
    const failedRecipientIds = Array.from(
      new Set(
        (sendResults || [])
          .filter((row) => row?.status === "failed" && row?.recipientId)
          .map((row) => row.recipientId)
      )
    );

    if (!failedRecipientIds.length || !lastSendPayload) {
      return;
    }

    try {
      setIsSending(true);
      setErrors((prev) => ({ ...prev, send: "" }));
      const data = await newsletterService.sendNewsletter({
        ...lastSendPayload,
        recipientIds: failedRecipientIds,
      });
      setSendSummary(data?.summary || null);
      setSendResults(Array.isArray(data?.results) ? data.results : []);
      setSenderDetails(data?.senderDetails || null);
      toast.success("Retried failed deliveries.");
      setHistoryPage(1);
    } catch (error) {
      setErrors((prev) => ({ ...prev, send: error.message || "Retry failed." }));
    } finally {
      setIsSending(false);
    }
  };

  const handleChannelChange = (nextChannels, nextSendType) => {
    setChannels(nextChannels);
    setSendType(nextSendType || getSendTypeFromChannels(nextChannels));
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Newsletter</h2>
        <p className="text-sm text-gray-500">
          Upload file, select AgentCustomer recipients, choose Email/WhatsApp, send in bulk, and track delivery history.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <NewsletterUploadForm
          formData={formData}
          file={file}
          uploadConfig={uploadConfig}
          onFieldChange={handleFieldChange}
          onFileChange={setFile}
          onUpload={handleUpload}
          isUploading={isUploading}
          errors={errors}
        />

        <div className="space-y-5">
          <SendChannelSelector channels={channels} onChange={handleChannelChange} error={errors.channels} />
          <NewsletterSendPanel
            onSend={handleSend}
            onRetryFailed={handleRetryFailed}
            isSending={isSending}
            canSend={!sendPanelDisabled}
            summary={sendSummary}
            results={sendResults}
            senderDetails={senderDetails}
            error={errors.send}
          />
        </div>
      </div>

      <RecipientSelector
        recipients={recipients}
        selectedRecipientIds={selectedRecipientIds}
        onChange={setSelectedRecipientIds}
        error={errors.recipients}
      />

      <NewsletterHistoryTable
        rows={historyRows}
        newsletters={newsletters}
        filters={historyFilters}
        onFilterChange={(key, value) => {
          setHistoryFilters((prev) => ({ ...prev, [key]: value }));
          setHistoryPage(1);
        }}
        page={historyPage}
        onPageChange={setHistoryPage}
        totalPages={historyTotalPages}
      />
    </div>
  );
};

export default Newsletter;
