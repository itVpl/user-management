import React from "react";

const NewsletterUploadForm = ({
  formData,
  file,
  uploadConfig,
  onFieldChange,
  onFileChange,
  onUpload,
  isUploading,
  errors,
}) => {
  const maxSizeMb = Math.round((uploadConfig?.maxFileSizeBytes || 0) / (1024 * 1024));
  const allowed = uploadConfig?.allowedExtensions?.join(", ") || "";

  return (
    <form
      onSubmit={onUpload}
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            1
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900">Compose</h3>
            <p className="text-xs text-slate-500">Message and optional attachment</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Message
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => onFieldChange("message", e.target.value)}
            rows={5}
            className="min-h-[120px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            placeholder="Write what recipients should read (required if you are not attaching a file)"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Attachment <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 transition hover:border-blue-300 hover:bg-blue-50/30">
            <input type="file" onChange={(e) => onFileChange(e.target.files?.[0] || null)} className="sr-only" />
            <span className="text-sm font-medium text-slate-700">
              {file ? file.name : "Click to choose a file"}
            </span>
            <span className="mt-1 text-center text-[11px] text-slate-500">
              {maxSizeMb > 0 ? `Up to ${maxSizeMb} MB` : ""}
              {allowed ? ` · ${allowed}` : ""}
            </span>
          </label>
          {!file ? (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Sending text only? Leave this empty and use a non-empty message above.
            </p>
          ) : null}
        </div>

        {errors.upload ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {errors.upload}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isUploading}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px] sm:px-6"
        >
          {isUploading ? "Saving…" : file ? "Upload to server" : "Save text draft"}
        </button>
      </div>
    </form>
  );
};

export default NewsletterUploadForm;
