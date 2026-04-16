import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ClipboardList,
  ListChecks,
} from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import {
  adminListTests,
  adminCreateTest,
  adminPatchTest,
  adminListQuestions,
  adminCreateQuestion,
  adminPatchQuestion,
  adminPatchQuestionOptions,
  adminDeleteQuestion,
  adminListAttempts,
} from '../../services/employeeTestService';

const getUser = () => {
  try {
    const s = localStorage.getItem('user') || sessionStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

const canAccessAdmin = () => {
  const r = (getUser()?.role || '').toString().toLowerCase().replace(/\s+/g, '');
  return r === 'admin' || r === 'superadmin';
};

const defaultOptions = () =>
  [0, 1, 2, 3].map((i) => ({
    label: '',
    order: i,
    score: 0,
    resultTag: '',
  }));

const formatWhen = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
};

const MODAL_SCROLL_STYLE = `
  .et-modal-scroll::-webkit-scrollbar { display: none; }
  .et-modal-scroll { scrollbar-width: none; -ms-overflow-style: none; }
`;

/** Same visual language as Sales / DeliveryOrder “Add Delivery Order” modal */
function EmployeeTestModal({ open, onClose, title, subtitle, icon: Icon, children }) {
  if (!open) return null;
  const HeaderIcon = Icon || PlusCircle;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <style>{MODAL_SCROLL_STYLE}</style>
      <div
        className="et-modal-scroll max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rounded-t-3xl border-b border-slate-800 bg-slate-900 p-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <HeaderIcon className="text-white" size={24} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                {subtitle ? <p className="mt-0.5 text-sm text-slate-200">{subtitle}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl px-3 py-1.5 text-2xl font-bold leading-none text-white transition hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const EmployeeTestAdmin = () => {
  const allowed = useMemo(() => canAccessAdmin(), []);

  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [selected, setSelected] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    disclaimerText: '',
    termsVersion: 1,
    isActive: true,
  });

  const [editForm, setEditForm] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [qLoading, setQLoading] = useState(false);

  const [attempts, setAttempts] = useState([]);
  const [attPage, setAttPage] = useState(1);
  const [attMeta, setAttMeta] = useState(null);
  const [attLoading, setAttLoading] = useState(false);

  const [tab, setTab] = useState('settings'); // settings | questions | attempts

  const [qDialog, setQDialog] = useState(null); // 'create' | { edit: question }

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListTests();
      const list = res.data?.tests ?? res.data ?? [];
      setTests(Array.isArray(list) ? list : []);
    } catch (e) {
      alertify.error(e?.message || 'Failed to load tests');
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    loadTests();
  }, [allowed, loadTests]);

  const loadQuestions = useCallback(async (testId) => {
    if (!testId) return;
    setQLoading(true);
    try {
      const res = await adminListQuestions(testId);
      const list = res.data?.questions ?? res.data ?? [];
      setQuestions(Array.isArray(list) ? list : []);
    } catch (e) {
      alertify.error(e?.message || 'Failed to load questions');
      setQuestions([]);
    } finally {
      setQLoading(false);
    }
  }, []);

  const loadAttempts = useCallback(async (testId, page = 1) => {
    if (!testId) return;
    setAttLoading(true);
    try {
      const res = await adminListAttempts(testId, { page, limit: 15 });
      const list = res.data?.attempts ?? res.data?.items ?? res.data ?? [];
      setAttempts(Array.isArray(list) ? list : []);
      const pag = res.data?.pagination ?? res.pagination ?? null;
      setAttMeta(
        pag || {
          page,
          hasNextPage: Array.isArray(list) && list.length >= 15,
        }
      );
      setAttPage(page);
    } catch (e) {
      alertify.error(e?.message || 'Failed to load attempts');
      setAttempts([]);
    } finally {
      setAttLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected?._id) return;
    if (tab === 'questions') loadQuestions(selected._id);
    if (tab === 'attempts') loadAttempts(selected._id, 1);
  }, [selected, tab, loadQuestions, loadAttempts]);

  const openTest = (t) => {
    setSelected(t);
    setEditForm({
      title: t.title || '',
      disclaimerText: t.disclaimerText || '',
      termsVersion: t.termsVersion ?? 1,
      isActive: !!t.isActive,
      bumpTermsOnDisclaimerChange: false,
    });
    setTab('settings');
  };

  const saveTest = async () => {
    if (!selected?._id || !editForm) return;
    try {
      await adminPatchTest(selected._id, {
        title: editForm.title,
        disclaimerText: editForm.disclaimerText,
        termsVersion: Number(editForm.termsVersion) || 1,
        isActive: editForm.isActive,
        bumpTermsOnDisclaimerChange: !!editForm.bumpTermsOnDisclaimerChange,
      });
      alertify.success('Test updated');
      await loadTests();
      setSelected((prev) => (prev ? { ...prev, ...editForm } : prev));
    } catch (e) {
      alertify.error(e?.message || 'Update failed');
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      await adminCreateTest({
        title: createForm.title,
        disclaimerText: createForm.disclaimerText || '',
        termsVersion: Number(createForm.termsVersion) || 1,
        isActive: !!createForm.isActive,
      });
      alertify.success('Test created');
      setCreateOpen(false);
      setCreateForm({
        title: '',
        disclaimerText: '',
        termsVersion: 1,
        isActive: true,
      });
      await loadTests();
    } catch (e) {
      alertify.error(e?.message || 'Create failed');
    }
  };

  const saveQuestion = async (payload, isEdit) => {
    try {
      if (isEdit && qDialog?.edit?._id) {
        const q = qDialog.edit;
        await adminPatchQuestion(q._id, {
          prompt: payload.prompt,
          order: Number(payload.order) || 1,
          isActive: payload.isActive !== false,
        });
        await adminPatchQuestionOptions(q._id, { options: payload.options });
        alertify.success('Question updated');
      } else if (selected?._id) {
        await adminCreateQuestion(selected._id, {
          prompt: payload.prompt,
          order: Number(payload.order) || 1,
          options: payload.options,
        });
        alertify.success('Question created');
      }
      setQDialog(null);
      await loadQuestions(selected._id);
    } catch (e) {
      alertify.error(e?.message || 'Save question failed');
    }
  };

  const removeQuestion = async (questionId) => {
    if (!window.confirm('Deactivate this question?')) return;
    try {
      await adminDeleteQuestion(questionId);
      alertify.success('Question deactivated');
      await loadQuestions(selected._id);
    } catch (e) {
      alertify.error(e?.message || 'Delete failed');
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 font-poppins py-10">
        <main className="mx-auto max-w-[1400px] px-4 sm:px-10">
          <div className="rounded-3xl bg-white p-10 shadow-sm">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 ring-2 ring-amber-50">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  Employee test — admin
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Only users with the <strong>admin</strong> or <strong>superadmin</strong> role can manage
            tests. Ask your administrator to assign access, or open the public candidate link instead.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 font-poppins py-10">
      <main className="mx-auto max-w-[1400px] px-4 sm:px-10 space-y-8">
        <div className="rounded-3xl bg-white p-10 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-100 ring-2 ring-indigo-50">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  Employee Test Admin
                </h1>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                  Manage tests, questions, and submissions
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => loadTests()}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition-all hover:bg-blue-50 hover:border-blue-200 active:scale-[0.99] sm:w-auto"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
              >
                <PlusCircle size={20} />
                New test
              </button>
            </div>
          </div>
        </div>

      {/* Modals — DeliveryOrder “Add Delivery Order” pattern */}
      <EmployeeTestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        icon={PlusCircle}
        title="New test"
        subtitle="Create a new assessment for candidates"
      >
        <form onSubmit={submitCreate} className="space-y-6 p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-base font-bold text-slate-900 uppercase tracking-wide">Test details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Title</span>
                <input
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="e.g. Onboarding knowledge check"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Disclaimer</span>
                <textarea
                  rows={5}
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Shown to candidates before they accept terms"
                  value={createForm.disclaimerText}
                  onChange={(e) => setCreateForm((f) => ({ ...f, disclaimerText: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-700">Terms version</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  value={createForm.termsVersion}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, termsVersion: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Test is active (available for new attempts when no testId is sent)
              </label>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="min-w-[100px] cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-w-[120px] cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create test
            </button>
          </div>
        </form>
      </EmployeeTestModal>

      {qDialog && (
        <QuestionFormDialog
          key={qDialog === 'create' ? 'create' : qDialog.edit?._id}
          mode={qDialog === 'create' ? 'create' : 'edit'}
          initial={
            qDialog === 'create'
              ? { prompt: '', order: (questions.length || 0) + 1, options: defaultOptions() }
              : (() => {
                  const q = qDialog.edit;
                  const sorted = (q.options || [])
                    .slice()
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                  const opts = [0, 1, 2, 3].map((i) => {
                    const o = sorted[i];
                    return {
                      label: o?.label || '',
                      order: i,
                      score: o?.score ?? 0,
                      resultTag: o?.resultTag || '',
                    };
                  });
                  return {
                    prompt: q.prompt || '',
                    order: q.order ?? 1,
                    isActive: q.isActive !== false,
                    options: opts,
                  };
                })()
          }
          onClose={() => setQDialog(null)}
          onSave={(payload) => saveQuestion(payload, qDialog !== 'create')}
        />
      )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside className="flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-4 xl:col-span-3">
            <div className="border-b border-slate-200 bg-slate-900 px-6 py-6 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Library</p>
              <p className="mt-1 text-xl font-black tracking-tight">All Tests</p>
              <p className="mt-1 text-xs font-semibold text-slate-300">
                Select a test to manage settings, questions, and submissions
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
                </div>
              ) : tests.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">No tests yet</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Use <span className="font-bold text-slate-700">New test</span> to create one.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tests.map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => openTest(t)}
                      className={`w-full cursor-pointer px-6 py-5 text-left transition ${
                        selected?._id === t._id ? 'bg-blue-50' : 'hover:bg-blue-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{t.title || '(Untitled)'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Terms v{t.termsVersion ?? '—'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                            t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-[480px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-8 xl:col-span-9">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                <div className="rounded-2xl bg-slate-100 p-5 text-slate-400">
                  <ListChecks size={40} strokeWidth={1.5} />
                </div>
                <p className="text-lg font-bold text-slate-900">Select a test</p>
                <p className="max-w-md text-sm font-medium text-slate-500">
                  Choose an assessment from the library to edit settings, questions, or view submissions.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 bg-slate-900 px-6 py-6 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 lg:hidden"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </button>
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-black tracking-tight">{selected.title}</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          {selected.isActive ? 'Active' : 'Inactive'} · Terms v{selected.termsVersion ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 bg-white px-4 py-4">
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    {['settings', 'questions', 'attempts'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setTab(k)}
                        className={`cursor-pointer rounded-xl px-5 py-2.5 text-sm font-bold capitalize transition-all ${
                          tab === k
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {tab === 'settings' && editForm && (
                    <div className="space-y-6">
                      <div className="rounded-3xl border border-slate-200 bg-white p-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">
                          Test configuration
                        </h3>
                        <div className="space-y-5">
                          <label className="block text-sm">
                            <span className="font-bold text-slate-700">Title</span>
                            <input
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                              value={editForm.title}
                              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="font-bold text-slate-700">Disclaimer</span>
                            <textarea
                              rows={6}
                              className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                              value={editForm.disclaimerText}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, disclaimerText: e.target.value }))
                              }
                            />
                          </label>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm">
                              <span className="font-bold text-slate-700">Terms version</span>
                              <input
                                type="number"
                                min={1}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                value={editForm.termsVersion}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    termsVersion: Number(e.target.value),
                                  }))
                                }
                              />
                            </label>
                            <label className="flex items-center gap-3 self-end rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-800">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={editForm.isActive}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                                }
                              />
                              Active
                            </label>
                          </div>
                          <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                              checked={editForm.bumpTermsOnDisclaimerChange}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  bumpTermsOnDisclaimerChange: e.target.checked,
                                }))
                              }
                            />
                            Bump terms version if disclaimer text changes
                          </label>
                          <button
                            type="button"
                            onClick={saveTest}
                            className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
                          >
                            Save changes
                          </button>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                              Public link
                            </h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Share this link with candidates for this test
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <code className="block break-all font-mono text-xs font-bold text-indigo-700">
                            /employee-test/take?testId={selected._id}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}

                {tab === 'questions' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-slate-600">
                        Each question must have <strong>exactly four</strong> options (MCQ).
                      </p>
                      <button
                        type="button"
                        onClick={() => setQDialog('create')}
                        className="flex h-12 w-full shrink-0 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 sm:w-[min(100%,280px)]"
                      >
                        <span>Add question</span>
                        <PlusCircle size={20} />
                      </button>
                    </div>
                    {qLoading ? (
                      <div className="flex justify-center py-16">
                        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
                      </div>
                    ) : questions.length === 0 ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50/50 py-12 text-center text-sm text-slate-500">
                        No questions yet. Use <strong>Add question</strong>.
                      </div>
                    ) : (
                      <ul className="space-y-4">
                        {questions
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((q) => (
                            <li
                              key={q._id}
                              className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:bg-blue-50/30"
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                                      {q.order ?? '—'}
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                      Question
                                    </span>
                                    <span
                                      className={`ml-auto rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider sm:ml-0 ${
                                        q.isActive === false
                                          ? 'bg-amber-50 text-amber-700'
                                          : 'bg-emerald-50 text-emerald-700'
                                      }`}
                                    >
                                      {q.isActive === false ? 'Inactive' : 'Active'}
                                    </span>
                                  </div>
                                  <p className="mt-4 text-base font-bold leading-relaxed text-slate-900">
                                    {q.prompt}
                                  </p>
                                  <p className="mt-2 text-xs font-semibold text-slate-500">
                                    {(q.options || []).length} options
                                  </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setQDialog({ edit: q })}
                                    className="cursor-pointer rounded-2xl border-2 border-orange-200 bg-white px-4 py-2 text-sm font-bold text-orange-700 transition hover:bg-orange-50"
                                  >
                                    <span className="inline-flex items-center gap-2">
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeQuestion(q._id)}
                                    className="cursor-pointer rounded-2xl border-2 border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                                  >
                                    <span className="inline-flex items-center gap-2">
                                      <Trash2 className="h-4 w-4" />
                                      Remove
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}

                {tab === 'attempts' && (
                  <div>
                    {attLoading ? (
                      <div className="flex justify-center py-16">
                        <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
                      </div>
                    ) : attempts.length === 0 ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50/50 py-12 text-center text-sm text-slate-500">
                        No completed attempts for this test.
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                          <table className="w-full min-w-[520px] border-separate border-spacing-y-2 text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Candidate</th>
                                <th className="px-4 py-3">Completed</th>
                                <th className="px-4 py-3">Result</th>
                              </tr>
                            </thead>
                            <tbody className="bg-transparent">
                              {attempts.map((row) => (
                                <tr key={row._id} className="group">
                                  <td className="px-4 py-3 align-top bg-white group-hover:bg-blue-50 border-y border-l border-slate-200 rounded-l-xl">
                                    <div className="font-semibold text-gray-900">
                                      {row.candidate?.fullName ||
                                        row.profile?.fullName ||
                                        row.email ||
                                        '—'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {row.candidate?.email || row.profile?.email || ''}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-top text-gray-700 bg-white group-hover:bg-blue-50 border-y border-slate-200">
                                    {formatWhen(row.completedAt || row.updatedAt)}
                                  </td>
                                  <td className="px-4 py-3 align-top text-slate-900 bg-white group-hover:bg-blue-50 border-y border-r border-slate-200 rounded-r-xl">
                                    {row.result ? (
                                      <span>
                                        {row.result.totalScore != null
                                          ? `Score ${row.result.totalScore}`
                                          : ''}
                                        {row.result.label ? ` · ${row.result.label}` : ''}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
                          <button
                            type="button"
                            disabled={attPage <= 1 || attLoading}
                            onClick={() => loadAttempts(selected._id, attPage - 1)}
                            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <span className="text-gray-500">Page {attPage}</span>
                          <button
                            type="button"
                            disabled={attLoading || !attMeta?.hasNextPage}
                            onClick={() => loadAttempts(selected._id, attPage + 1)}
                            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

function QuestionFormDialog({ mode, initial, onClose, onSave }) {
  const [prompt, setPrompt] = useState(initial.prompt);
  const [order, setOrder] = useState(initial.order);
  const [isActive, setIsActive] = useState(initial.isActive !== false);
  const [options, setOptions] = useState(initial.options);

  const updateOpt = (idx, field, value) => {
    setOptions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (options.some((o) => !o.label?.trim())) {
      alertify.error('All four option labels are required.');
      return;
    }
    const payload = {
      prompt: prompt.trim(),
      order: Number(order) || 1,
      isActive,
      options: options.map((o, i) => ({
        label: o.label.trim(),
        order: i,
        score: Number(o.score) || 0,
        resultTag: (o.resultTag || '').trim() || 'wrong',
      })),
    };
    onSave(payload);
  };

  return (
    <EmployeeTestModal
      open
      onClose={onClose}
      icon={ListChecks}
      title={mode === 'create' ? 'Add question' : 'Edit question'}
      subtitle={
        mode === 'create'
          ? 'Define the prompt and exactly four MCQ options'
          : 'Update prompt, order, options, or active state'
      }
    >
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Question
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Write a clear prompt and set the display order.
                </p>
              </div>
              {mode === 'edit' && (
                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-800 sm:mt-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Question is active
                </label>
              )}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-12">
              <label className="block text-sm lg:col-span-9">
                <span className="font-bold text-slate-700">Prompt</span>
                <textarea
                  required
                  rows={5}
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Enter the question text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </label>
              <label className="block text-sm lg:col-span-3">
                <span className="font-bold text-slate-700">Display order</span>
                <input
                  type="number"
                  min={1}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Answer options
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Exactly four options required. Choose score and a tag for each option.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {options.map((o, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Option
                    </span>
                  </div>

                  <label className="mt-4 block text-sm">
                    <span className="font-bold text-slate-700">Label</span>
                    <input
                      required
                      placeholder="Option label"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      value={o.label}
                      onChange={(e) => updateOpt(i, 'label', e.target.value)}
                    />
                  </label>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-bold text-slate-700">Score</span>
                      <select
                        className="mt-2 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        value={String(o.score ?? 0)}
                        onChange={(e) => updateOpt(i, 'score', e.target.value)}
                      >
                        <option value="0">0</option>
                        <option value="2">2</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="font-bold text-slate-700">Result tag</span>
                      <select
                        className="mt-2 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        value={(o.resultTag === 'correct' || o.resultTag === 'wrong' ? o.resultTag : 'wrong').toString()}
                        onChange={(e) => updateOpt(i, 'resultTag', e.target.value)}
                      >
                        <option value="correct">Correct</option>
                        <option value="wrong">Wrong</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[110px] cursor-pointer rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:border-blue-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-w-[150px] cursor-pointer rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0"
            >
              {mode === 'create' ? 'Add question' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </EmployeeTestModal>
  );
}

export default EmployeeTestAdmin;
