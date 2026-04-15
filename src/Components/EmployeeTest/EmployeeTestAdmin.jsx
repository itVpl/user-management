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
        className="et-modal-scroll max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rounded-t-3xl bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                <HeaderIcon className="text-white" size={24} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                {subtitle ? <p className="mt-0.5 text-sm text-blue-100">{subtitle}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-2xl font-bold leading-none text-white transition hover:text-gray-200"
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
      <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50/40 px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200/80 bg-white/90 p-8 shadow-lg backdrop-blur">
          <h1 className="text-lg font-bold text-amber-950">Employee test — admin</h1>
          <p className="mt-3 text-sm leading-relaxed text-amber-900/90">
            Only users with the <strong>admin</strong> or <strong>superadmin</strong> role can manage
            tests. Ask your administrator to assign access, or open the public candidate link instead.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-gradient-to-b from-gray-50 to-gray-100/90">
      {/* Full-width page header (not centered narrow column) */}
      <div className="w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8 lg:py-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md">
              <ClipboardList size={28} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Employee test
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-600 sm:text-base">
                Configure assessments, MCQ items (four options each), and review completed candidate
                submissions — same flow style as delivery orders.
              </p>
            </div>
          </div>

          {/* Right column: DeliveryOrder-style primary CTA */}
          <div className="flex w-full flex-col gap-3 lg:w-[min(100%,380px)] lg:shrink-0">
            <button
              type="button"
              onClick={() => loadTests()}
              className="flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw size={18} />
              Refresh list
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-[40px] w-full items-center justify-between gap-4 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
            >
              <span>New test</span>
              <PlusCircle size={20} />
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
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-4 text-lg font-semibold text-orange-800">Test details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm md:col-span-2">
                <span className="font-semibold text-gray-700">Title</span>
                <input
                  required
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. Onboarding knowledge check"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="font-semibold text-gray-700">Disclaimer</span>
                <textarea
                  rows={5}
                  className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Shown to candidates before they accept terms"
                  value={createForm.disclaimerText}
                  onChange={(e) => setCreateForm((f) => ({ ...f, disclaimerText: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-gray-700">Terms version</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={createForm.termsVersion}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, termsVersion: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Test is active (available for new attempts when no testId is sent)
              </label>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="min-w-[100px] rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-w-[120px] rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
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

      {/* Main workspace — full width */}
      <div className="grid w-full grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-8">
        <aside className="flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-4 xl:col-span-3">
          <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Library</p>
            <p className="text-lg font-bold text-gray-900">All tests</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
              </div>
            ) : tests.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No tests yet. Use <span className="font-semibold text-gray-700">New test</span> above.
              </div>
            ) : (
              tests.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => openTest(t)}
                  className={`flex w-full flex-col items-start gap-1 border-b border-gray-50 px-5 py-4 text-left transition hover:bg-blue-50/50 ${
                    selected?._id === t._id ? 'border-l-4 border-l-blue-600 bg-blue-50/70' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <span className="font-semibold text-gray-900">{t.title || '(Untitled)'}</span>
                  <span className="text-xs font-medium text-gray-500">
                    {t.isActive ? (
                      <span className="text-emerald-600">Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}{' '}
                    · Terms v{t.termsVersion ?? '—'}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-8 xl:col-span-9">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <div className="rounded-full bg-gray-100 p-5 text-gray-400">
                <ListChecks size={40} strokeWidth={1.5} />
              </div>
              <p className="text-lg font-semibold text-gray-800">Select a test</p>
              <p className="max-w-md text-sm text-gray-500">
                Choose an assessment from the list to edit settings, questions, or view submissions.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/80 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 lg:hidden"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <h2 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
                    {selected.title}
                  </h2>
                </div>
              </div>
              <div className="flex border-b border-gray-100 bg-white px-2 sm:px-4">
                {['settings', 'questions', 'attempts'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={`relative px-4 py-3 text-sm font-semibold capitalize transition sm:px-5 ${
                      tab === k
                        ? 'text-blue-600 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-blue-600 sm:after:left-4 sm:after:right-4'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {tab === 'settings' && editForm && (
                  <div className="mx-auto max-w-3xl space-y-6">
                    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6">
                      <h3 className="mb-4 text-lg font-semibold text-orange-800">Test configuration</h3>
                      <div className="space-y-4">
                        <label className="block text-sm">
                          <span className="font-semibold text-gray-700">Title</span>
                          <input
                            className="mt-1.5 w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            value={editForm.title}
                            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-semibold text-gray-700">Disclaimer</span>
                          <textarea
                            rows={6}
                            className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            value={editForm.disclaimerText}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, disclaimerText: e.target.value }))
                            }
                          />
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block text-sm">
                            <span className="font-semibold text-gray-700">Terms version</span>
                            <input
                              type="number"
                              min={1}
                              className="mt-1.5 w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              value={editForm.termsVersion}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  termsVersion: Number(e.target.value),
                                }))
                              }
                            />
                          </label>
                          <label className="flex items-center gap-3 self-end rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={editForm.isActive}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                              }
                            />
                            Active
                          </label>
                        </div>
                        <label className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
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
                          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto sm:px-8"
                        >
                          Save changes
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">Public link:</span>{' '}
                      <code className="rounded bg-white px-2 py-0.5 font-mono text-xs text-blue-700 ring-1 ring-gray-200">
                        /employee-test/take?testId={selected._id}
                      </code>
                    </div>
                  </div>
                )}

                {tab === 'questions' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-600">
                        Each question must have <strong>exactly four</strong> options (MCQ).
                      </p>
                      <button
                        type="button"
                        onClick={() => setQDialog('create')}
                        className="flex h-[40px] w-full shrink-0 items-center justify-between gap-4 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 sm:w-[min(100%,280px)]"
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
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-12 text-center text-sm text-gray-500">
                        No questions yet. Use <strong>Add question</strong>.
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {questions
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((q) => (
                            <li
                              key={q._id}
                              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/80 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                                  Q{q.order ?? '—'}
                                </span>
                                <p className="mt-1 text-sm font-medium leading-relaxed text-gray-900">
                                  {q.prompt}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                  {(q.options || []).length} options ·{' '}
                                  {q.isActive === false ? (
                                    <span className="text-amber-700">Inactive</span>
                                  ) : (
                                    <span className="text-emerald-600">Active</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setQDialog({ edit: q })}
                                  className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(q._id)}
                                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </span>
                                </button>
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
                        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
                      </div>
                    ) : attempts.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-12 text-center text-sm text-gray-500">
                        No completed attempts for this test.
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              <tr>
                                <th className="px-4 py-3">Candidate</th>
                                <th className="px-4 py-3">Completed</th>
                                <th className="px-4 py-3">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {attempts.map((row) => (
                                <tr key={row._id} className="hover:bg-gray-50/80">
                                  <td className="px-4 py-3 align-top">
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
                                  <td className="px-4 py-3 align-top text-gray-600">
                                    {formatWhen(row.completedAt || row.updatedAt)}
                                  </td>
                                  <td className="px-4 py-3 align-top text-gray-800">
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
                        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                          <button
                            type="button"
                            disabled={attPage <= 1 || attLoading}
                            onClick={() => loadAttempts(selected._id, attPage - 1)}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <span className="text-gray-500">Page {attPage}</span>
                          <button
                            type="button"
                            disabled={attLoading || !attMeta?.hasNextPage}
                            onClick={() => loadAttempts(selected._id, attPage + 1)}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
        resultTag: (o.resultTag || '').trim() || 'neutral',
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
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-4 text-lg font-semibold text-orange-800">Question</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="font-semibold text-gray-700">Prompt</span>
              <textarea
                required
                rows={4}
                className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter the question text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-gray-700">Display order</span>
              <input
                type="number"
                min={1}
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              />
            </label>
            {mode === 'edit' && (
              <label className="flex items-center gap-3 self-end rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Question is active
              </label>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-1 text-lg font-semibold text-orange-800">Answer options</h3>
          <p className="mb-4 text-xs text-gray-500">Four options required — scoring and tags are saved with each option.</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {options.map((o, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50/80 to-white p-4 shadow-sm"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  Option {i + 1}
                </span>
                <input
                  required
                  placeholder="Option label"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={o.label}
                  onChange={(e) => updateOpt(i, 'label', e.target.value)}
                />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-gray-600">
                    Score
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      value={o.score}
                      onChange={(e) => updateOpt(i, 'score', e.target.value)}
                    />
                  </label>
                  <label className="text-xs font-semibold text-gray-600">
                    Result tag
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="e.g. correct"
                      value={o.resultTag}
                      onChange={(e) => updateOpt(i, 'resultTag', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[100px] rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-w-[120px] rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {mode === 'create' ? 'Add question' : 'Save changes'}
          </button>
        </div>
      </form>
    </EmployeeTestModal>
  );
}

export default EmployeeTestAdmin;
