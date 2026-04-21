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

/** Text-only upload (no file): API requires non-empty message (description removed from UI). */
const hasTextOnlyBody = (fd) => Boolean(fd?.message?.trim());

const Newsletter = () => {
  const [uploadConfig, setUploadConfig] = useState({
    maxFileSizeBytes: FALLBACK_MAX_SIZE,
    allowedExtensions: FALLBACK_ALLOWED_EXTENSIONS,
  });
  const [formData, setFormData] = useState({
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
  const [whatsappMeta, setWhatsappMeta] = useState(null);
  const [sendWhatsappSandbox, setSendWhatsappSandbox] = useState({
    active: false,
    notice: "",
  });

  const messageTrim = () => (formData.message || "").trim();

  const deriveNewsletterTitle = () => {
    const msg = messageTrim();
    if (msg) {
      return msg.length > 120 ? `${msg.slice(0, 117)}...` : msg;
    }
    if (file?.name) {
      const base = file.name.replace(/\.[^.]+$/, "");
      const t = base.trim().slice(0, 120);
      return t || "Newsletter";
    }
    return "Newsletter";
  };

  const deriveEmailSubject = () => {
    const msg = messageTrim();
    if (msg) {
      return msg.length > 200 ? `${msg.slice(0, 197)}...` : msg;
    }
    return deriveNewsletterTitle();
  };

  /** Allow send without prior upload when there is an attachment or message to create/save a draft. */
  const textOnlySendReady = useMemo(() => {
    if (newsletterId) return false;
    return Boolean(file) || hasTextOnlyBody(formData);
  }, [newsletterId, file, formData.message]);

  const sendPanelDisabled = useMemo(
    () =>
      (!newsletterId && !textOnlySendReady) ||
      selectedRecipientIds.length === 0 ||
      !sendType,
    [newsletterId, textOnlySendReady, selectedRecipientIds.length, sendType]
  );

  const whatsappChannelSelected = useMemo(
    () => Boolean(channels.whatsapp || sendType === "whatsapp" || sendType === "both"),
    [channels.whatsapp, sendType]
  );

  const whatsappSandboxBanner = useMemo(() => {
    const sandboxOn =
      Boolean(whatsappMeta?.whatsappSandboxMode) || Boolean(sendWhatsappSandbox.active);
    if (!sandboxOn || !whatsappChannelSelected) {
      return { show: false, notice: "", senderDisplay: "" };
    }
    const noticeFromSend =
      sendWhatsappSandbox.active && sendWhatsappSandbox.notice?.trim()
        ? sendWhatsappSandbox.notice.trim()
        : "";
    const noticeFromMeta = whatsappMeta?.whatsappSandboxNotice?.trim() || "";
    const notice =
      noticeFromSend ||
      noticeFromMeta ||
      "Twilio Sandbox is active. Recipients may need to join the sandbox before receiving WhatsApp messages.";
    const senderDisplay =
      whatsappMeta?.whatsappSenderDisplay || senderDetails?.whatsappSenderNumber || "";
    return { show: true, notice, senderDisplay };
  }, [
    whatsappMeta,
    sendWhatsappSandbox,
    whatsappChannelSelected,
    senderDetails?.whatsappSenderNumber,
  ]);

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
    const loadWhatsappMeta = async () => {
      try {
        const data = await newsletterService.getWhatsappConfig();
        setWhatsappMeta(data);
      } catch (error) {
        console.error("Failed to load WhatsApp newsletter config:", error);
        setWhatsappMeta(null);
      }
    };
    loadWhatsappMeta();
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

  const buildUploadFormData = (includeFile) => {
    const body = new FormData();
    if (includeFile && file) {
      body.append("file", file);
    }
    body.append("title", deriveNewsletterTitle());
    const msg = messageTrim();
    if (msg) {
      body.append("message", msg);
    }
    const subject = deriveEmailSubject();
    if (subject) {
      body.append("subject", subject);
    }
    body.append("sendType", sendType || "both");
    return body;
  };

  const persistNewsletterFromResponse = (data, uploadedId) => {
    if (uploadedId) {
      setNewsletterId(uploadedId);
      setHistoryFilters((prev) => ({ ...prev, newsletterId: uploadedId || prev.newsletterId }));
    }
    setNewsletters((prev) => {
      const created = data?.newsletter;
      if (!created?._id) return prev;
      return [created, ...prev.filter((item) => item?._id !== created._id)];
    });
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setErrors((prev) => ({ ...prev, upload: "" }));

    if (file) {
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
    } else if (!hasTextOnlyBody(formData)) {
      setErrors((prev) => ({
        ...prev,
        upload: "Without a file, enter a message (text-only newsletter).",
      }));
      return;
    }

    try {
      setIsUploading(true);
      const body = buildUploadFormData(Boolean(file));
      const data = await newsletterService.uploadNewsletter(body);
      const uploadedId = data?.newsletter?._id || "";
      persistNewsletterFromResponse(data, uploadedId);
      toast.success(file ? "Newsletter uploaded successfully." : "Text newsletter saved.");
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
    if (!newsletterId && !file && !hasTextOnlyBody(formData)) {
      setErrors((prev) => ({
        ...prev,
        send: "Add a file or enter a message before sending.",
      }));
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
      let activeNewsletterId = newsletterId;
      if (!activeNewsletterId) {
        const body = buildUploadFormData(Boolean(file));
        const uploadData = await newsletterService.uploadNewsletter(body);
        activeNewsletterId = uploadData?.newsletter?._id || "";
        if (!activeNewsletterId) {
          throw new Error(
            "Could not save newsletter without a file. Your server may require an attachment—try uploading a file."
          );
        }
        persistNewsletterFromResponse(uploadData, activeNewsletterId);
      }

      const payload = {
        newsletterId: activeNewsletterId,
        recipientIds: validRecipients.map((person) => person?._id || person?.userId || person?.id),
        sendType,
        subject: deriveEmailSubject(),
        message: messageTrim(),
      };
      const data = await newsletterService.sendNewsletter(payload);
      setSendSummary(data?.summary || null);
      setSendResults(Array.isArray(data?.results) ? data.results : []);
      setSenderDetails(data?.senderDetails || null);
      setSendWhatsappSandbox({
        active: Boolean(data?.whatsappSandboxActive),
        notice: data?.whatsappSandboxNotice || "",
      });
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
      setSendWhatsappSandbox({
        active: Boolean(data?.whatsappSandboxActive),
        notice: data?.whatsappSandboxNotice || "",
      });
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

  const handleTwilioStatusFetch = async (messageSid) =>
    newsletterService.getTwilioMessageStatus(messageSid);

  const recipientLookup = useMemo(() => {
    const map = {};
    (recipients || []).forEach((r) => {
      const id = r?._id || r?.userId || r?.id;
      if (!id) return;
      const name = (r.personName || "Unnamed").trim();
      const contact = [r.email, r.whatsappNumber, r.contactNumber].find((x) => x && String(x).trim());
      const label = contact ? `${name} · ${String(contact).trim()}` : name;
      map[id] = label;
      map[String(id)] = label;
    });
    return map;
  }, [recipients]);

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-slate-100/90 via-slate-50/80 to-slate-100/60 pb-12 pt-1">
      <div className="mx-auto max-w-6xl space-y-8 px-3 sm:px-4 lg:px-6">
        <header className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-5 py-6 shadow-sm ring-1 ring-slate-900/5 sm:px-8 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Bulk messaging</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Newsletter</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Compose your message, choose who receives it, pick Email and/or WhatsApp, then send. Delivery history and
            Twilio status (when the API returns a valid message SID) stay on this page.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
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
          <RecipientSelector
            recipients={recipients}
            selectedRecipientIds={selectedRecipientIds}
            onChange={setSelectedRecipientIds}
            error={errors.recipients}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SendChannelSelector channels={channels} onChange={handleChannelChange} error={errors.channels} />
          <NewsletterSendPanel
            onSend={handleSend}
            onRetryFailed={handleRetryFailed}
            onTwilioStatusFetch={handleTwilioStatusFetch}
            isSending={isSending}
            canSend={!sendPanelDisabled}
            summary={sendSummary}
            results={sendResults}
            senderDetails={senderDetails}
            error={errors.send}
            whatsappSandboxBanner={whatsappSandboxBanner}
            recipientLookup={recipientLookup}
          />
        </section>

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
    </div>
  );
};

export default Newsletter;
