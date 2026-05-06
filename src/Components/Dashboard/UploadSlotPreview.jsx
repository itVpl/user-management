import React, { useEffect, useState } from 'react';

function useObjectURL(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file || !(file instanceof File)) {
      setUrl(null);
      return undefined;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function useObjectURLs(fileList) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const list = Array.isArray(fileList) ? fileList.filter(Boolean) : [];
    if (!list.length) {
      setUrls([]);
      return undefined;
    }
    const u = list.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [fileList]);
  const list = Array.isArray(fileList) ? fileList.filter(Boolean) : [];
  return { list, urls };
}

/**
 * Shows image thumbnail or file icon + name inside upload zone (object URLs revoked on change).
 * Use either `file` (single) or `files` (array for multi-select fields).
 * Optional `onClear` shows a remove (×) button that must stop propagation so the file label does not open.
 */
export function UploadSlotPreview({ file, files, onClear, clearDisabled }) {
  const hasMulti = Array.isArray(files) && files.length > 0;
  const { list, urls } = useObjectURLs(hasMulti ? files : []);
  const singleUrl = useObjectURL(hasMulti ? null : file instanceof File ? file : null);
  const hasContent = hasMulti || file instanceof File;
  const showClear = typeof onClear === 'function' && hasContent;

  let inner = null;
  if (hasMulti) {
    inner = (
      <div className="flex flex-wrap gap-1 justify-center items-center min-h-[3.5rem] max-h-[7rem] overflow-y-auto py-1 px-0.5">
        {list.map((f, i) =>
          f.type?.startsWith('image/') && urls[i] ? (
            <img
              key={`${f.name}-${i}`}
              src={urls[i]}
              alt=""
              className="h-10 w-10 object-cover rounded border border-gray-200/80 shadow-sm pointer-events-none"
            />
          ) : (
            <div
              key={`${f.name}-${i}`}
              className="h-10 w-10 flex flex-col items-center justify-center rounded border border-gray-200 bg-white/90 text-[7px] text-gray-700 p-0.5 text-center leading-tight overflow-hidden pointer-events-none"
              title={f.name}
            >
              <span className="text-sm leading-none">{f.type?.includes('pdf') ? '📄' : '📎'}</span>
            </div>
          )
        )}
      </div>
    );
  } else if (file instanceof File) {
    if (file.type?.startsWith('image/') && singleUrl) {
      inner = (
        <img
          src={singleUrl}
          alt=""
          className="max-h-[5.5rem] w-full object-contain rounded-md mx-auto pointer-events-none select-none"
        />
      );
    } else {
      inner = (
        <div className="flex flex-col items-center justify-center gap-0.5 py-0.5 px-1 pointer-events-none select-none">
          <span className="text-2xl leading-none">{file.type?.includes('pdf') ? '📄' : '📎'}</span>
          <span className="text-[10px] text-gray-700 font-medium truncate max-w-full text-center leading-tight">
            {file.name}
          </span>
        </div>
      );
    }
  }

  if (!inner) return null;

  return (
    <div className="relative w-full">
      {showClear && (
        <button
          type="button"
          disabled={clearDisabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
          className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 shadow-md hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:pointer-events-none"
          title="Remove"
          aria-label="Remove selected file"
        >
          <span className="text-lg leading-none font-bold">×</span>
        </button>
      )}
      {inner}
    </div>
  );
}

export function hasUploadSelection(fileOrFiles) {
  if (Array.isArray(fileOrFiles)) return fileOrFiles.length > 0;
  return !!fileOrFiles;
}
    