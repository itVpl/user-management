import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import alertify from "alertifyjs";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  RATE_REQUEST_DOCUMENT_ACCEPT,
  RATE_REQUEST_DOCUMENT_MAX_BYTES,
  deleteRateRequestDocument,
  fetchRateRequestDocumentChecklist,
  fetchRateRequestDocumentFile,
  resolveDocumentApiUrl,
  uploadRateRequestDocument,
} from "../../services/rateRequestDocumentsService.js";

function buildAuthHeaders(extraHeaders = {}) {
  const token =
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

function normalizeProgress(raw) {
  const uploaded = Number(raw?.uploaded ?? raw?.uploadedCount ?? 0);
  const total = Number(raw?.total ?? raw?.totalRequired ?? raw?.required ?? 43);
  const percent = Number.isFinite(Number(raw?.percent))
    ? Math.round(Number(raw.percent))
    : total > 0
      ? Math.round((uploaded / total) * 100)
      : 0;
  return {
    uploaded: Number.isFinite(uploaded) ? uploaded : 0,
    total: Number.isFinite(total) ? total : 43,
    percent: Math.min(100, Math.max(0, percent)),
  };
}

export function formatDocumentProgressLabel(progress) {
  if (!progress || typeof progress !== "object") return null;
  const normalized = normalizeProgress(progress);
  return `${normalized.uploaded}/${normalized.total} (${normalized.percent}%)`;
}

function normalizeUpload(upload) {
  if (!upload || typeof upload !== "object") return null;
  const fileId = upload.fileId || upload._id || upload.id;
  if (!fileId && !upload.downloadUrl && !upload.previewUrl) return null;
  return {
    fileId,
    downloadUrl: upload.downloadUrl || null,
    previewUrl: upload.previewUrl || null,
    originalName: upload.originalName ?? upload.fileName ?? upload.name,
    version: upload.version,
    size: upload.size,
  };
}

function normalizeSections(payload) {
  const list = payload?.sections ?? payload?.checklist ?? payload?.catalog ?? [];
  if (!Array.isArray(list)) return [];
  return list.map((section, sectionIndex) => {
    const sectionId = section?.sectionId ?? section?.id ?? sectionIndex + 1;
    const items = Array.isArray(section?.items)
      ? section.items
      : Array.isArray(section?.documents)
        ? section.documents
        : [];
    return {
      sectionId,
      title: section?.title || section?.name || `Section ${sectionId}`,
      items: items.map((item) => {
        const upload =
          normalizeUpload(item?.upload) ||
          normalizeUpload(item?.file) ||
          (item?.fileId || item?.downloadUrl || item?.previewUrl
            ? normalizeUpload(item)
            : null);
        const uploaded = Boolean(upload);
        return {
          documentTypeId: item?.documentTypeId || item?.id || item?.typeId,
          label: item?.label || item?.name || item?.documentTypeId || "Document",
          uploaded,
          upload,
          version: upload?.version,
          originalName: upload?.originalName,
        };
      }),
    };
  });
}

function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "document";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function fetchBlobFromUrl(url, headers) {
  const fullUrl = resolveDocumentApiUrl(url);
  const res = await axios.get(fullUrl, {
    headers: buildAuthHeaders(headers),
    responseType: "blob",
    withCredentials: true,
  });
  return res.data;
}

function DocumentRow({
  item,
  sectionId,
  readOnly,
  isUploading,
  isDeleting,
  onUpload,
  onPreview,
  onDownload,
  onDelete,
}) {
  const upload = item.upload;
  const fileId = upload?.fileId;
  const canView = item.uploaded && (upload?.previewUrl || fileId);
  const canDownload = item.uploaded && (upload?.downloadUrl || fileId);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {item.uploaded ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  item.uploaded
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {item.uploaded ? "Uploaded" : "Pending"}
              </span>
            </div>
            {item.uploaded && (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {item.originalName || fileId}
                {item.version != null ? ` · v${item.version}` : ""}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && !item.uploaded && (
          <button
            type="button"
            disabled={isUploading || isDeleting}
            onClick={() => onUpload(sectionId, item.documentTypeId)}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
          >
            {isUploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            Upload
          </button>
        )}
        {!readOnly && item.uploaded && (
          <button
            type="button"
            disabled={isUploading || isDeleting}
            onClick={() => onUpload(sectionId, item.documentTypeId, true)}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
          >
            {isUploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            Replace
          </button>
        )}
        {canView && (
          <button
            type="button"
            onClick={() => onPreview(item)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Eye size={13} />
            View
          </button>
        )}
        {canDownload && (
          <button
            type="button"
            onClick={() => onDownload(item)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download size={13} />
            Download
          </button>
        )}
        {!readOnly && item.uploaded && (
          <button
            type="button"
            disabled={isDeleting || isUploading}
            onClick={() => onDelete(item.documentTypeId)}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Remove
          </button>
        )}
      </div>
    </li>
  );
}

export default function RateRequestDocumentsPanel({
  requestIdentifier,
  authHeaders,
  readOnly = false,
  onProgressChange,
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState(() => normalizeProgress(null));
  const [uploadingTypeId, setUploadingTypeId] = useState("");
  const [deletingTypeId, setDeletingTypeId] = useState("");
  const fileInputRef = useRef(null);
  const pendingUploadRef = useRef(null);

  const identifier = String(requestIdentifier || "").trim();

  const loadChecklist = useCallback(
    async ({ silent = false } = {}) => {
      if (!identifier) {
        setSections([]);
        setProgress(normalizeProgress(null));
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const data = await fetchRateRequestDocumentChecklist(identifier, authHeaders);
        const nextProgress = normalizeProgress(data?.progress ?? data?.documentProgress);
        setSections(normalizeSections(data));
        setProgress(nextProgress);
        onProgressChange?.(data?.progress ?? data?.documentProgress ?? nextProgress);
      } catch (err) {
        if (!silent) {
          alertify.error(err.response?.data?.message || "Failed to load document checklist");
        }
        setSections([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [identifier, authHeaders, onProgressChange],
  );

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const pendingItems = useMemo(() => flatItems.filter((item) => !item.uploaded), [flatItems]);
  const uploadedItems = useMemo(() => flatItems.filter((item) => item.uploaded), [flatItems]);

  const openFilePicker = (sectionId, documentTypeId, replacing = false) => {
    pendingUploadRef.current = { sectionId, documentTypeId, replacing };
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const pending = pendingUploadRef.current;
    pendingUploadRef.current = null;
    if (!file || !pending || !identifier) return;
    if (file.size > RATE_REQUEST_DOCUMENT_MAX_BYTES) {
      alertify.error(`File must be ${formatFileSize(RATE_REQUEST_DOCUMENT_MAX_BYTES)} or smaller`);
      return;
    }
    setUploadingTypeId(pending.documentTypeId);
    try {
      const result = await uploadRateRequestDocument(
        identifier,
        {
          sectionId: pending.sectionId,
          documentTypeId: pending.documentTypeId,
          file,
        },
        authHeaders,
      );
      if (result?.progress) {
        const nextProgress = normalizeProgress(result.progress);
        setProgress(nextProgress);
        onProgressChange?.(result.progress);
      }
      alertify.success(
        result?.message || (pending.replacing ? "Document replaced" : "Document uploaded"),
      );
      await loadChecklist({ silent: true });
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to upload document");
    } finally {
      setUploadingTypeId("");
    }
  };

  const handleDelete = async (documentTypeId) => {
    if (!identifier || !documentTypeId) return;
    if (!window.confirm("Remove this uploaded document from the checklist?")) return;
    setDeletingTypeId(documentTypeId);
    try {
      const result = await deleteRateRequestDocument(identifier, documentTypeId, authHeaders);
      if (result?.progress) {
        const nextProgress = normalizeProgress(result.progress);
        setProgress(nextProgress);
        onProgressChange?.(result.progress);
      }
      alertify.success(result?.message || "Document removed");
      await loadChecklist({ silent: true });
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to remove document");
    } finally {
      setDeletingTypeId("");
    }
  };

  const handlePreview = async (item) => {
    const upload = item?.upload;
    const fileId = upload?.fileId;
    if (!identifier || !upload) return;
    try {
      if (upload.previewUrl) {
        const blob = await fetchBlobFromUrl(upload.previewUrl, authHeaders);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
      if (!fileId) return;
      const res = await fetchRateRequestDocumentFile(
        identifier,
        fileId,
        { disposition: "inline" },
        authHeaders,
      );
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to preview document");
    }
  };

  const handleDownload = async (item) => {
    const upload = item?.upload;
    const fileId = upload?.fileId;
    if (!identifier || !upload) return;
    try {
      if (upload.downloadUrl) {
        const blob = await fetchBlobFromUrl(upload.downloadUrl, authHeaders);
        triggerBlobDownload(blob, item.originalName || "document");
        return;
      }
      if (!fileId) return;
      const res = await fetchRateRequestDocumentFile(identifier, fileId, { disposition: "attachment" }, authHeaders);
      triggerBlobDownload(res.data, item.originalName || "document");
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to download document");
    }
  };

  if (!identifier) {
    return <p className="text-sm text-slate-500">Missing request identifier for documents.</p>;
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
            <FileText size={18} className="text-indigo-600" />
            Rate request documents
          </h4>
          <p className="mt-1 text-xs text-indigo-700/80">
            {readOnly
              ? "Pending and uploaded checklist for this request."
              : `Upload, replace, or remove documents (max ${formatFileSize(RATE_REQUEST_DOCUMENT_MAX_BYTES)} per file). Re-upload replaces the existing file.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadChecklist({ silent: true })}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{pendingItems.length}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Uploaded</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{uploadedItems.length}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Progress</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">
            {progress.uploaded}/{progress.total || flatItems.length || 43}
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-indigo-100 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-slate-800">Overall completion</span>
          <span className="text-slate-600">{progress.percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {!readOnly && (
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={RATE_REQUEST_DOCUMENT_ACCEPT}
          onChange={(e) => void handleFileSelected(e)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600">
          <RefreshCw size={18} className="animate-spin text-indigo-500" />
          Loading checklist…
        </div>
      ) : sections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-indigo-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-600">
          No document checklist returned for this request.
        </p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const sectionPending = section.items.filter((item) => !item.uploaded);
            const sectionUploaded = section.items.filter((item) => item.uploaded);
            return (
              <div key={String(section.sectionId)} className="overflow-hidden rounded-xl border border-indigo-100 bg-white">
                <div className="border-b border-indigo-50 bg-indigo-50/60 px-4 py-3">
                  <p className="text-sm font-semibold text-indigo-950">{section.title}</p>
                  <p className="text-xs text-indigo-700/70">
                    {sectionUploaded.length} uploaded · {sectionPending.length} pending
                  </p>
                </div>

                {sectionPending.length > 0 && (
                  <div className="border-b border-slate-100">
                    <p className="bg-amber-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Pending documents
                    </p>
                    <ul className="divide-y divide-slate-100">
                      {sectionPending.map((item) => (
                        <DocumentRow
                          key={`pending-${item.documentTypeId}`}
                          item={item}
                          sectionId={section.sectionId}
                          readOnly={readOnly}
                          isUploading={uploadingTypeId === item.documentTypeId}
                          isDeleting={deletingTypeId === item.documentTypeId}
                          onUpload={openFilePicker}
                          onPreview={handlePreview}
                          onDownload={handleDownload}
                          onDelete={handleDelete}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {sectionUploaded.length > 0 && (
                  <div>
                    <p className="bg-green-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-green-800">
                      Uploaded documents
                    </p>
                    <ul className="divide-y divide-slate-100">
                      {sectionUploaded.map((item) => (
                        <DocumentRow
                          key={`uploaded-${item.documentTypeId}`}
                          item={item}
                          sectionId={section.sectionId}
                          readOnly={readOnly}
                          isUploading={uploadingTypeId === item.documentTypeId}
                          isDeleting={deletingTypeId === item.documentTypeId}
                          onUpload={openFilePicker}
                          onPreview={handlePreview}
                          onDownload={handleDownload}
                          onDelete={handleDelete}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
