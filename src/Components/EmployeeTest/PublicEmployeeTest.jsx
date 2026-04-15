import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import {
  publicStartAttempt,
  publicPatchProfile,
  publicAcceptTerms,
  publicGetQuestions,
  publicPutAnswers,
  publicSubmit,
  publicGetResult,
} from '../../services/employeeTestService';

const SESSION = {
  attemptId: 'et_attemptId',
  publicToken: 'et_publicToken',
  testId: 'et_testId',
  status: 'et_status',
  testTitle: 'et_testTitle',
  disclaimerText: 'et_disclaimerText',
};

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function persistSession({ attemptId, publicToken, testId, status, testTitle: tt, disclaimerText: dt }) {
  if (attemptId) sessionStorage.setItem(SESSION.attemptId, attemptId);
  if (publicToken) sessionStorage.setItem(SESSION.publicToken, publicToken);
  if (testId) sessionStorage.setItem(SESSION.testId, testId);
  if (status) sessionStorage.setItem(SESSION.status, status);
  if (tt != null) sessionStorage.setItem(SESSION.testTitle, tt);
  if (dt != null) sessionStorage.setItem(SESSION.disclaimerText, dt);
}

function readSession() {
  return {
    attemptId: sessionStorage.getItem(SESSION.attemptId),
    publicToken: sessionStorage.getItem(SESSION.publicToken),
    testId: sessionStorage.getItem(SESSION.testId),
    status: sessionStorage.getItem(SESSION.status) || '',
    testTitle: sessionStorage.getItem(SESSION.testTitle) || '',
    disclaimerText: sessionStorage.getItem(SESSION.disclaimerText) || '',
  };
}

function clearSession() {
  Object.values(SESSION).forEach((k) => sessionStorage.removeItem(k));
}

const initialProfile = {
  fullName: '',
  email: '',
  phone: '',
  dateOfJoining: '',
  gender: 'prefer_not_to_say',
};

const PublicEmployeeTest = () => {
  const [searchParams] = useSearchParams();
  const testIdFromUrl = searchParams.get('testId') || '';

  const [phase, setPhase] = useState('init'); // init | start | profile | terms | quiz | done
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [attemptId, setAttemptId] = useState('');
  const [publicToken, setPublicToken] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [disclaimerText, setDisclaimerText] = useState('');
  const [profile, setProfile] = useState(initialProfile);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> optionId
  const [result, setResult] = useState(null);

  /** After "Begin test" until submit — discourage leaving / other tabs (browser cannot fully block). */
  const testInProgress = useMemo(
    () => ['profile', 'terms', 'quiz'].includes(phase),
    [phase]
  );
  const leftTabDuringAttempt = useRef(false);

  useEffect(() => {
    if (!testInProgress) {
      leftTabDuringAttempt.current = false;
      return;
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        leftTabDuringAttempt.current = true;
      } else if (leftTabDuringAttempt.current) {
        leftTabDuringAttempt.current = false;
        alertify.warning(
          'You switched away from this tab. Please stay on this assessment until you submit — switching tabs may be logged for review.'
        );
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [testInProgress]);

  useEffect(() => {
    if (!testInProgress) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [testInProgress]);

  /** With BrowserRouter, useBlocker is unavailable — intercept same-origin <a> clicks (e.g. sidebar). */
  useEffect(() => {
    if (!testInProgress) return;
    const onClickCapture = (e) => {
      const a = e.target?.closest?.('a[href]');
      if (!a) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.getAttribute('rel') === 'external') return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      let pathWithQuery = href;
      try {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          const u = new URL(href);
          if (u.origin !== window.location.origin) return;
          pathWithQuery = `${u.pathname}${u.search}`;
        }
      } catch {
        return;
      }
      const here = `${window.location.pathname}${window.location.search}`;
      if (pathWithQuery === here) return;
      const leave = window.confirm(
        'Assessment is in progress. If you leave now, use the same browser tab to return and finish. Leave this page?'
      );
      if (!leave) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [testInProgress]);

  const resumeFromStorage = useCallback(async () => {
    const s = readSession();
    if (!s.attemptId || !s.publicToken) {
      setPhase('start');
      return;
    }
    setAttemptId(s.attemptId);
    setPublicToken(s.publicToken);

    if (s.status === 'completed') {
      try {
        const res = await publicGetResult(s.attemptId, s.publicToken);
        setResult(res.data?.result ?? res.data);
        setPhase('done');
      } catch {
        clearSession();
        setPhase('start');
      }
      return;
    }

    if (['terms_accepted', 'in_progress'].includes(s.status)) {
      try {
        const res = await publicGetQuestions(s.attemptId, s.publicToken);
        const qs = res.data?.questions || [];
        setQuestions(qs);
        const nextStatus = res.data?.status || 'in_progress';
        persistSession({ status: nextStatus });
        setPhase('quiz');
        return;
      } catch (e) {
        if (e.status === 403 || e.status === 400) {
          setPhase(s.status === 'terms_accepted' ? 'terms' : 'profile');
          return;
        }
      }
    }

    if (s.testTitle) setTestTitle(s.testTitle);
    if (s.disclaimerText) setDisclaimerText(s.disclaimerText);

    if (s.status === 'profile_complete') {
      setPhase('terms');
      return;
    }
    if (s.status === 'draft' || !s.status) {
      setPhase('profile');
      return;
    }
    setPhase('start');
  }, []);

  useEffect(() => {
    resumeFromStorage();
  }, [resumeFromStorage]);

  const autosave = useMemo(() => {
    let t;
    return (nextAnswers) => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const attempt = readSession().attemptId;
        const tok = readSession().publicToken;
        if (!attempt || !tok) return;
        const list = Object.entries(nextAnswers).map(([questionId, optionId]) => ({
          questionId,
          optionId,
        }));
        if (!list.length) return;
        try {
          await publicPutAnswers(attempt, tok, { answers: list });
        } catch (e) {
          if (e.status === 429) {
            alertify.warning('Too many saves. Please wait a moment.');
          }
        }
      }, 900);
    };
  }, []);

  const handleStart = async () => {
    setError('');
    setBusy(true);
    try {
      const body = testIdFromUrl ? { testId: testIdFromUrl } : {};
      const res = await publicStartAttempt(body);
      const d = res.data || {};
      const aid = d.attemptId;
      const tok = d.publicToken;
      if (!aid || !tok) throw new Error('Invalid start response');
      setAttemptId(aid);
      setPublicToken(tok);
      setTestTitle(d.testTitle || 'Assessment');
      setDisclaimerText(d.disclaimerText || '');
      persistSession({
        attemptId: aid,
        publicToken: tok,
        testId: d.testId || testIdFromUrl,
        status: 'draft',
        testTitle: d.testTitle || 'Assessment',
        disclaimerText: d.disclaimerText || '',
      });
      setPhase('profile');
    } catch (e) {
      const msg = e?.message || 'Could not start test';
      setError(msg);
      if (e.status === 404) alertify.error('No active test available.');
      else if (e.status === 429) alertify.warning('Too many requests. Try again shortly.');
      else alertify.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await publicPatchProfile(attemptId, publicToken, {
        ...profile,
        // HTML date input is YYYY-MM-DD — matches API example (e.g. 2024-06-01)
        dateOfJoining: profile.dateOfJoining || undefined,
      });
      const st = res.data?.status || 'profile_complete';
      persistSession({ status: st });
      setPhase('terms');
    } catch (e) {
      const msg = e?.message || 'Profile save failed';
      setError(msg);
      if (e.status === 409) alertify.error('This email already completed this test.');
      else alertify.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!termsAccepted) {
      alertify.warning('Please accept the terms to continue.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await publicAcceptTerms(attemptId, publicToken, { accept: true });
      const st = res.data?.status || 'terms_accepted';
      persistSession({ status: st });
      const qres = await publicGetQuestions(attemptId, publicToken);
      setQuestions(qres.data?.questions || []);
      const next = qres.data?.status || 'in_progress';
      persistSession({ status: next });
      setPhase('quiz');
    } catch (e) {
      const msg = e?.message || 'Could not continue';
      setError(msg);
      alertify.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const selectOption = (questionId, optionId) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: optionId };
      autosave(next);
      return next;
    });
  };

  const handleSubmitTest = async () => {
    const list = questions.map((q) => ({
      questionId: q._id,
      optionId: answers[q._id],
    }));
    const missing = list.some((x) => !x.optionId);
    if (missing) {
      alertify.error('Please answer every question.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await publicSubmit(attemptId, publicToken, { answers: list });
      const st = res.data?.status || 'completed';
      persistSession({ status: st });
      setResult(res.data?.result ?? res.data);
      setPhase('done');
    } catch (e) {
      const msg = e?.message || 'Submit failed';
      setError(msg);
      alertify.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleNewAttempt = () => {
    clearSession();
    setAttemptId('');
    setPublicToken('');
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setProfile(initialProfile);
    setTermsAccepted(false);
    setPhase('start');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 shrink-0 text-indigo-600" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Employee assessment</h1>
              <p className="text-sm text-slate-500">Complete all steps in order</p>
            </div>
          </div>
          {testInProgress && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 sm:max-w-xs sm:text-right"
              role="status"
            >
              Test in progress — do not close this tab or switch to another site until you submit.
              Refresh / back may prompt you to confirm.
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {phase === 'init' && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        )}

        {phase === 'start' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Start</h2>
            <p className="mt-2 text-slate-600">
              {testIdFromUrl
                ? 'You will begin the test selected for this link.'
                : 'The server will assign an active test if available.'}
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              After you begin: stay on this tab until you submit — you will get warnings if you switch tabs
              or try to open another page in this window.
            </p>
            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Begin test
            </button>
          </div>
        )}

        {phase === 'profile' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold">{testTitle || 'Your details'}</h2>
            <form className="mt-6 grid gap-4" onSubmit={handleProfileSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Full name</span>
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={profile.fullName}
                  onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  required
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Phone</span>
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date of joining</span>
                <input
                  required
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={profile.dateOfJoining}
                  onChange={(e) => setProfile((p) => ({ ...p, dateOfJoining: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Gender</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={profile.gender}
                  onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                >
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue
              </button>
            </form>
          </div>
        )}

        {phase === 'terms' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold">Disclaimer & terms</h2>
            <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {disclaimerText || 'Please confirm you understand and accept the terms for this assessment.'}
            </div>
            <label className="mt-6 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>I have read and accept the terms.</span>
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleAcceptTerms}
              disabled={busy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue to questions
            </button>
          </div>
        )}

        {phase === 'quiz' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">{testTitle}</h2>
              <p className="text-sm text-slate-500">{questions.length} questions</p>
            </div>
            {questions
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((q, idx) => (
                <div
                  key={q._id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-medium text-indigo-600">Question {idx + 1}</p>
                  <p className="mt-2 text-slate-900">{q.prompt}</p>
                  <div className="mt-4 space-y-2">
                    {(q.options || [])
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((opt) => (
                        <label
                          key={opt._id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                            answers[q._id] === opt._id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q._id}
                            checked={answers[q._id] === opt._id}
                            onChange={() => selectOption(q._id, opt._id)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleSubmitTest}
              disabled={busy}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? 'Submitting…' : 'Submit answers'}
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h2 className="mt-4 text-xl font-semibold">Submitted</h2>
            {result && (
              <div className="mt-6 text-left text-sm text-slate-700 space-y-1">
                {result.totalScore != null && (
                  <p>
                    <span className="font-medium">Score:</span> {result.totalScore}
                  </p>
                )}
                {result.label != null && (
                  <p>
                    <span className="font-medium">Label:</span> {result.label}
                  </p>
                )}
                {result.summaryKey != null && (
                  <p>
                    <span className="font-medium">Summary:</span> {result.summaryKey}
                  </p>
                )}
                {result.band != null && (
                  <p>
                    <span className="font-medium">Band:</span>{' '}
                    {typeof result.band === 'object' ? JSON.stringify(result.band) : String(result.band)}
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleNewAttempt}
              className="mt-8 rounded-xl border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close session
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicEmployeeTest;
