import React, { useState } from 'react';
import axios from 'axios';
import { FaTrash, FaUpload } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';

const MS = {
  primaryBtn: 'bg-[#0078D4] hover:bg-[#106EBE] focus:ring-2 focus:ring-[#9CCCF5] text-white',
  disabledBtn: 'bg-[#C8C6C4] text-white cursor-not-allowed',
  subtleBtn: 'bg-white border border-[#D6D6D6] hover:bg-[#F5F5F5]',
};

const SOFT = {
  cardBlue: 'p-4 rounded-2xl border bg-[#EEF4FF] border-[#C9D5FF]',
  insetWhite: 'p-3 rounded-xl border bg-white',
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleString();
};

const MAX_SIZE_MB = 20;
const MAX_FILES = 20;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];

/**
 * Reupload photos/documents for accountant (separate from Load Reference Images UI).
 * POST /api/v1/do/:doId/accountant-images/forward
 */
export default function AccountantReuploadForAccountant({
  doMongoId,
  cmtEmpId,
  accountantImageForward: initialSnapshot,
  onSuccess,
}) {
  const [files, setFiles] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localSnapshot, setLocalSnapshot] = useState(null);

  const snapshot = localSnapshot || initialSnapshot || null;

  const onPick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setFiles((prev) => {
      const next = [...prev];
      for (const f of picked) {
        if (next.length >= MAX_FILES) {
          alertify.error(`Maximum ${MAX_FILES} files allowed`);
          break;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
          alertify.error(`${f.name}: exceeds ${MAX_SIZE_MB}MB`);
          continue;
        }
        if (!ALLOWED.includes(f.type)) {
          alertify.error(`${f.name}: use JPG, PNG, WEBP, or PDF`);
          continue;
        }
        next.push(f);
      }
      return next;
    });
    e.target.value = '';
  };

  const removeAt = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!doMongoId) {
      alertify.error('Missing DO ID');
      return;
    }
    if (!files.length) {
      alertify.error('Select at least one photo or document');
      return;
    }
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      alertify.error('Authentication required');
      return;
    }

    const form = new FormData();
    form.append('selectedExistingImages', JSON.stringify([]));
    form.append('remarks', (remarks || '').trim().slice(0, 500));
    files.forEach((f) => form.append('files[]', f));

    const url = `${API_CONFIG.BASE_URL}/api/v1/do/${encodeURIComponent(doMongoId)}/accountant-images/forward`;

    setUploading(true);
    setProgress(0);
    try {
      const res = await axios.post(url, form, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (pe) => {
          if (pe?.total) setProgress(Math.round((pe.loaded * 100) / pe.total));
        },
      });

      if (res?.data?.ok || res?.data?.success) {
        const data = res?.data?.data || {};
        setLocalSnapshot({
          forwardedAt: data?.forwardedAt || new Date().toISOString(),
          forwardedBy: data?.forwardedBy || null,
          totalImages: data?.totalImages ?? files.length,
          mode: data?.mode || 'overwrite',
        });
        setFiles([]);
        setRemarks('');
        setProgress(0);
        alertify.success(res?.data?.message || 'Uploaded and forwarded to accountant');
        onSuccess?.();
      } else {
        alertify.error(res?.data?.message || 'Upload failed');
      }
    } catch (e) {
      if (e?.response?.status === 413) {
        alertify.error(e?.response?.data?.message || `File size exceeds ${MAX_SIZE_MB}MB limit`);
      } else {
        alertify.error(e?.response?.data?.message || e?.message || 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={`${SOFT.cardBlue} md:col-span-2`}>
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Reupload Documents</h3>
      <p className="text-xs text-gray-600 mb-3">
        Upload photos or documents here to forward to the accountant. This is separate from load reference images above.
      </p>
      <div className="p-4 bg-white border rounded-xl">
        <div className="text-sm text-gray-600 mb-3">
          DO: <span className="font-medium">{doMongoId ? String(doMongoId).slice(-8) : '—'}</span>
          {cmtEmpId ? (
            <>
              {' '}
              • CMT: <span className="font-medium">{cmtEmpId}</span>
            </>
          ) : null}
        </div>

        <label className="text-sm font-medium text-gray-700 mb-2 block">Photos / documents</label>
        <label className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${MS.subtleBtn}`}>
          <FaUpload />
          <span>Select files</span>
          <input
            type="file"
            className="hidden"
            multiple
            onChange={onPick}
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">
          JPG, PNG, WEBP, PDF • max {MAX_FILES} files • {MAX_SIZE_MB}MB each
        </p>

        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((f, idx) => (
              <div key={`${f.name}-${idx}`} className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50">
                <span className="text-sm truncate max-w-[220px]" title={f.name}>
                  {f.name}
                </span>
                <button type="button" onClick={() => removeAt(idx)} className="text-red-600 hover:text-red-700" title="Remove">
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Remarks (optional)</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Notes for accountant (max 500 characters)"
          />
        </div>

        {uploading && (
          <div className="mt-4">
            <div className="w-full h-2 bg-gray-200 rounded">
              <div className="h-2 bg-[#0078D4] rounded" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-gray-600 mt-1">{progress}%</div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={uploading || !files.length}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${uploading || !files.length ? MS.disabledBtn : MS.primaryBtn}`}
          >
            {uploading ? 'Uploading…' : 'Forward to Accountant'}
          </button>
        </div>

        {snapshot && (
          <div className={`${SOFT.insetWhite} mt-3 border-l-4 border-green-500 bg-green-50`}>
            <div className="text-xs text-green-700">
              <div className="font-semibold mb-1">Last forward to accountant</div>
              At: <span className="font-medium">{fmtDate(snapshot.forwardedAt)}</span>
              <br />
              By:{' '}
              <span className="font-medium">
                {snapshot.forwardedBy?.employeeName || '—'} ({snapshot.forwardedBy?.empId || '—'})
              </span>
              <br />
              Files: <span className="font-medium">{snapshot.totalImages ?? snapshot.images?.length ?? '—'}</span>
              {snapshot.mode ? (
                <>
                  <br />
                  Mode: <span className="font-medium">{snapshot.mode}</span>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
