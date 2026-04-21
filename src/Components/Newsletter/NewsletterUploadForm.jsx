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
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-gray-800">Upload Newsletter</h3>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Title *</label>
        <input
          value={formData.title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Monthly newsletter title"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
        <input
          value={formData.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Optional description"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Subject</label>
        <input
          value={formData.subject}
          onChange={(e) => onFieldChange("subject", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Email subject"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Message</label>
        <textarea
          value={formData.message}
          onChange={(e) => onFieldChange("message", e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Enter newsletter message"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Upload file *</label>
        <input
          type="file"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {file ? <p className="mt-1 text-xs text-gray-500">Selected: {file.name}</p> : null}
        {maxSizeMb > 0 ? <p className="mt-1 text-xs text-gray-500">Max size: {maxSizeMb}MB</p> : null}
        {allowed ? <p className="mt-1 text-xs text-gray-500">Allowed: {allowed}</p> : null}
      </div>

      {errors.upload ? <p className="text-xs text-red-600">{errors.upload}</p> : null}

      <button
        type="submit"
        disabled={isUploading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Uploading..." : "Upload Newsletter"}
      </button>
    </form>
  );
};

export default NewsletterUploadForm;
