import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ClipboardList, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ArrowRight, 
  Check,
  ShieldCheck,
  MonitorOff,
  RefreshCcw,
  Wifi,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';
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
  endTime: 'et_endTime',
};

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function persistSession({ attemptId, publicToken, testId, status, testTitle: tt, disclaimerText: dt, endTime }) {
  if (attemptId) sessionStorage.setItem(SESSION.attemptId, attemptId);
  if (publicToken) sessionStorage.setItem(SESSION.publicToken, publicToken);
  if (testId) sessionStorage.setItem(SESSION.testId, testId);
  if (status) sessionStorage.setItem(SESSION.status, status);
  if (tt != null) sessionStorage.setItem(SESSION.testTitle, tt);
  if (dt != null) sessionStorage.setItem(SESSION.disclaimerText, dt);
  if (endTime) sessionStorage.setItem(SESSION.endTime, endTime);
}

function readSession() {
  return {
    attemptId: sessionStorage.getItem(SESSION.attemptId),
    publicToken: sessionStorage.getItem(SESSION.publicToken),
    testId: sessionStorage.getItem(SESSION.testId),
    status: sessionStorage.getItem(SESSION.status) || '',
    testTitle: sessionStorage.getItem(SESSION.testTitle) || '',
    disclaimerText: sessionStorage.getItem(SESSION.disclaimerText) || '',
    endTime: sessionStorage.getItem(SESSION.endTime),
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
  const [profile, setProfile] = useState(initialProfile);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> optionId
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [isTimeOut, setIsTimeOut] = useState(false);
  const warningShown = useRef(false);

  const performSubmit = useCallback(async () => {
    const list = questions.map((q) => ({
      questionId: q._id,
      optionId: answers[q._id],
    }));
    
    setBusy(true);
    setError('');
    try {
      const res = await publicSubmit(attemptId, publicToken, { answers: list });
      const st = res.data?.status || 'completed';
      persistSession({ status: st });
      setResult(res.data?.result ?? res.data);
      setPhase('done');
      toast.dismiss('time-over');
    } catch (e) {
      const msg = e?.message || 'Submit failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [answers, attemptId, publicToken, questions]);

  const handleAutoSubmit = useCallback(async () => {
    setTimerActive(false);
    setIsTimeOut(true);
    toast.info('Time is over! Your assessment is being submitted automatically.', {
      toastId: 'time-over',
      position: "top-center",
      autoClose: false,
      theme: "dark"
    });
    // Call existing submit logic
    await performSubmit();
  }, [performSubmit]);

  /** After "Begin test" until submit — discourage leaving / other tabs (browser cannot fully block). */
  const [tabSwitches, setTabSwitches] = useState(0);

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
        setTabSwitches(prev => prev + 1);
        toast.error(
          'WARNING: You switched away from this tab. Please stay on this assessment until you submit — activity is being logged for review.',
          {
            toastId: "tab-switch-warning",
            position: "top-center",
            autoClose: 8000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            theme: "dark",
            style: { 
              fontWeight: 'bold',
              fontSize: '15px',
              borderRadius: '12px',
              border: '2px solid #ef4444',
              maxWidth: '500px'
            }
          }
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
        
        // Timer recovery
        if (s.endTime) {
          const left = Math.max(0, Math.floor((parseInt(s.endTime) - Date.now()) / 1000));
          if (left <= 0) {
            handleAutoSubmit();
            return;
          }
          setTimeLeft(left);
        } else {
          // Fallback if endTime is missing
          const end = Date.now() + 30 * 60 * 1000;
          persistSession({ endTime: end.toString() });
          setTimeLeft(30 * 60);
        }

        setPhase('quiz');
        setTimerActive(true);
        return;
      } catch (e) {
        if (e.status === 403 || e.status === 400) {
          setPhase(s.status === 'terms_accepted' ? 'terms' : 'profile');
          return;
        }
      }
    }

    if (s.testTitle) setTestTitle(s.testTitle);

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

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAutoSubmit();
            return 0;
          }
          // 2-minute warning
          if (prev === 121 && !warningShown.current) {
            warningShown.current = true;
            toast.warning('Time is running out! 2 minutes remaining.', {
              toastId: 'time-warning',
              position: "top-right",
              autoClose: 5000,
              theme: "colored"
            });
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, handleAutoSubmit]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            toast.warning('Too many saves. Please wait a moment.');
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
      persistSession({
        attemptId: aid,
        publicToken: tok,
        testId: d.testId || testIdFromUrl,
        status: 'draft',
        testTitle: d.testTitle || 'Assessment',
      });
      setPhase('profile');
    } catch (e) {
      const msg = e?.message || 'Could not start test';
      setError(msg);
      if (e.status === 404) toast.error('No active test available.');
      else if (e.status === 429) toast.warning('Too many requests. Try again shortly.');
      else toast.error(msg);
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
      if (e.status === 409) toast.error('This email already completed this test.');
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!termsAccepted) {
      toast.warning('Please accept the terms to continue.');
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
      
      // Start timer: store absolute endTime
      const end = Date.now() + 30 * 60 * 1000;
      persistSession({ status: next, endTime: end.toString() });
      
      setTimeLeft(30 * 60);
      setPhase('quiz');
      setTimerActive(true);
    } catch (e) {
      const msg = e?.message || 'Could not continue';
      setError(msg);
      toast.error(msg);
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
      toast.error('Please answer every question.');
      return;
    }
    setTimerActive(false);
    await performSubmit();
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
    setTimeLeft(30 * 60);
    setTimerActive(false);
    setIsTimeOut(false);
    warningShown.current = false;
  };

  const currentStep = useMemo(() => {
    switch (phase) {
      case 'profile': return 1;
      case 'terms': return 2;
      case 'quiz': return 3;
      case 'done': return 4;
      default: return 0;
    }
  }, [phase]);

  const handleBack = () => {
    if (busy) return;
    if (phase === 'profile') setPhase('start');
    else if (phase === 'terms') setPhase('profile');
    setError('');
  };

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 10) {
      setProfile((p) => ({ ...p, phone: val }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-poppins py-10">
      <main className="mx-auto max-w-[1400px] px-4 sm:px-10 space-y-8">
        {/* Header Section as a Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-100 ring-2 ring-indigo-50">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">Employee Assessment</h1>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                  {phase === 'done' ? 'Completed successfully' : 'Complete all steps to finish'}
                </p>
              </div>
            </div>

            {testInProgress && (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Countdown Timer */}
                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all duration-500 ${
                  timeLeft < 120 ? 'bg-red-50 border-red-200 shadow-lg shadow-red-100' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    timeLeft < 120 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-white'
                  }`}>
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Time Remaining</p>
                    <p className={`text-xl font-black tabular-nums leading-none mt-1 ${
                      timeLeft < 120 ? 'text-red-600' : 'text-slate-900'
                    }`}>
                      {formatTime(timeLeft)}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-4 rounded-2xl border px-5 py-3.5 sm:max-w-md ring-4 transition-all duration-500 ${
                    tabSwitches > 0 
                      ? 'border-red-200 bg-red-50 ring-red-50/50' 
                      : 'border-amber-200 bg-amber-50/50 ring-amber-50/50'
                  }`}
                  role="status"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    tabSwitches > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <AlertCircle className={`h-5 w-5 ${tabSwitches > 0 ? 'animate-bounce' : 'animate-pulse'}`} />
                  </div>
                  <div>
                    <p className={`text-[12px] font-bold leading-relaxed uppercase tracking-tight ${
                      tabSwitches > 0 ? 'text-red-900' : 'text-amber-900'
                    }`}>
                      {tabSwitches > 0 
                        ? `ATTENTION: ${tabSwitches} TAB SWITCH${tabSwitches > 1 ? 'ES' : ''} DETECTED`
                        : 'DO NOT SWITCH TABS'}
                    </p>
                    <p className={`text-[12px] font-medium leading-tight ${
                      tabSwitches > 0 ? 'text-red-700' : 'text-amber-700'
                    }`}>
                      {tabSwitches > 0 
                        ? 'Further violations may result in assessment failure.'
                        : 'Activity is being logged for review.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {['profile', 'terms', 'quiz'].includes(phase) && (
            <div className="mt-10 flex items-center justify-between px-1 max-w-5xl mx-auto">
              {[
                { step: 1, label: 'Profile' },
                { step: 2, label: 'Terms' },
                { step: 3, label: 'Quiz' }
              ].map((s, i) => (
                <React.Fragment key={s.step}>
                  <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                      currentStep > s.step ? 'bg-emerald-500 text-white shadow-md shadow-emerald-50 ring-2 ring-emerald-50' :
                      currentStep === s.step ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-50 scale-105 ring-2 ring-indigo-50' :
                      'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}>
                      {currentStep > s.step ? <Check className="h-4 w-4 stroke-[3]" /> : s.step}
                    </div>
                    <span className={`hidden text-xs font-bold tracking-wide sm:inline ${
                      currentStep >= s.step ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className="h-1 flex-1 rounded-full bg-slate-100 mx-3 overflow-hidden border border-slate-200/50">
                      <div className={`h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out ${
                        currentStep > s.step ? 'w-full' : 'w-0'
                      }`} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {phase === 'init' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
            </div>
            <p className="mt-4 font-medium text-slate-500 animate-pulse">Initializing assessment...</p>
          </div>
        )}

        {phase === 'start' && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all">
            <div className="bg-slate-900 p-8 text-white">
              <h2 className="text-2xl font-bold">Begin Assessment</h2>
              <p className="mt-2 text-slate-400 font-medium">
                {testIdFromUrl
                  ? 'Ready to evaluate your skills with our curated test.'
                  : 'An assessment will be assigned to you automatically.'}
              </p>
            </div>
            <div className="p-8">
              <div className="rounded-2xl bg-slate-50 p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-sm shadow-amber-50">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                      Important Assessment Guidelines
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Please read carefully before starting</p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <MonitorOff className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Single Tab Policy</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">Stay on this tab until you submit. Switching tabs or windows may be flagged for review.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Academic Integrity</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">All responses must be your own work. External resources or unauthorized help is prohibited.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <RefreshCcw className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">No Refresh Policy</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">Do not refresh or go back during the assessment as it may terminate your current session.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Wifi className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Stable Connection</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">Ensure a stable internet connection and sufficient power before beginning the test.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">No Pauses Allowed</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">The test cannot be paused. Ensure you have dedicated time to finish in one sitting.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Final Submission</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">Ensure all questions are answered before final submission for an accurate score.</p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={busy}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                {busy ? 'Starting...' : 'Begin Assessment'}
              </button>
            </div>
          </div>
        )}

        {phase === 'profile' && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{testTitle || 'Personal Information'}</h2>
                <p className="mt-2 text-slate-400 font-medium">Please provide your details to begin the test.</p>
              </div>
              <button 
                onClick={handleBack}
                disabled={busy}
                className="px-4 py-2 text-sm font-bold bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Back
              </button>
            </div>
            <form className="p-8" onSubmit={(e) => {
              e.preventDefault();
              if (!validateEmail(profile.email)) {
                setError('Please enter a valid email address.');
                return;
              }
              if (profile.phone.length < 10) {
                setError('Please enter a valid 10-digit phone number.');
                return;
              }
              handleProfileSubmit(e);
            }}>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      required
                      placeholder="Enter your full name"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                      value={profile.fullName}
                      onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      required
                      type="email"
                      placeholder="your.email@example.com"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      required
                      type="tel"
                      placeholder="10-digit number"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                      value={profile.phone}
                      onChange={handlePhoneChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Date of Joining</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                    <input
                      required
                      type="date"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm font-medium transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                      value={profile.dateOfJoining}
                      onChange={(e) => setProfile((p) => ({ ...p, dateOfJoining: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Gender</label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-medium transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 appearance-none cursor-pointer"
                    value={profile.gender}
                    onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                  >
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="mt-6 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-100">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                {busy ? 'Saving...' : 'Continue to Disclaimer'}
              </button>
            </form>
          </div>
        )}

        {phase === 'terms' && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Disclaimer & Terms</h2>
                <p className="mt-2 text-slate-400 font-medium">Please review the following terms carefully before starting.</p>
              </div>
              <button 
                onClick={handleBack}
                disabled={busy}
                className="px-4 py-2 text-sm font-bold bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Back
              </button>
            </div>
            <div className="p-8">
              <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-8 text-sm leading-relaxed text-slate-600 font-medium">
                <div className="space-y-6">
                  <section>
                    <h4 className="text-slate-900 font-bold uppercase tracking-wider text-xs mb-2">1. General Overview</h4>
                    <p>This professional assessment is designed to evaluate your technical proficiency and aptitude for the designated role. By proceeding, you acknowledge that you are the individual assigned to this test and that all information provided in your profile is accurate, current, and complete.</p>
                  </section>

                  <section>
                    <h4 className="text-slate-900 font-bold uppercase tracking-wider text-xs mb-2">2. Confidentiality & Non-Disclosure</h4>
                    <p>All content within this assessment—including questions, scenarios, logic, and images—is strictly confidential and the intellectual property of the organization. You are strictly prohibited from copying, recording, taking screenshots, or sharing any part of this assessment. Any breach of confidentiality may lead to immediate disqualification and potential legal proceedings.</p>
                  </section>

                  <section>
                    <h4 className="text-slate-900 font-bold uppercase tracking-wider text-xs mb-2">3. Integrity & Anti-Cheating Policy</h4>
                    <p>This assessment must be completed independently. The use of external aids, including search engines, AI assistants, textbooks, or collaboration with others, is strictly forbidden. Your browser activity, including tab-switching and window focus, is actively monitored. Multiple violations will result in an automatic failure and termination of your session.</p>
                  </section>

                  <section>
                    <h4 className="text-slate-900 font-bold uppercase tracking-wider text-xs mb-2">4. Technical Requirements</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Maintain a stable high-speed internet connection throughout the duration.</li>
                      <li>Do not refresh the page or use the "Back" button after starting the quiz.</li>
                      <li>Ensure your device is connected to a reliable power source.</li>
                      <li>Close all unnecessary applications and browser tabs before beginning.</li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-slate-900 font-bold uppercase tracking-wider text-xs mb-2">5. Data Privacy</h4>
                    <p>Your personal data and assessment performance will be processed securely and used solely for recruitment or internal evaluation purposes. By clicking "Start Assessment," you consent to the collection and analysis of your responses in accordance with standard data protection regulations.</p>
                  </section>

                  <section className="pt-4 border-t border-slate-200">
                    <p className="italic text-slate-500 text-xs text-center font-bold">By proceeding, you agree to be bound by the terms and conditions outlined above.</p>
                  </section>
                </div>
              </div>
              
              <label className="mt-8 flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 transition-all hover:bg-slate-100/50">
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-slate-300 transition-all checked:bg-indigo-600 checked:border-indigo-600"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <Check className="absolute h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-700">I have read and accept the terms</span>
                  <p className="mt-1 text-xs text-slate-500 font-medium">By checking this box, you agree to the assessment guidelines and terms of service.</p>
                </div>
              </label>

              {error && (
                <div className="mt-6 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-100">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleAcceptTerms}
                disabled={busy || !termsAccepted}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                {busy ? 'Processing...' : 'Start Assessment'}
              </button>
            </div>
          </div>
        )}

        {phase === 'quiz' && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-8 shadow-sm flex items-center justify-between text-white">
              <div>
                <h2 className="text-2xl font-bold">{testTitle || 'Assessment Questions'}</h2>
                <p className="mt-1 text-sm font-bold text-slate-400 uppercase tracking-wider">{questions.length} Questions Total</p>
              </div>
              <div className="hidden sm:block">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-2 ring-white/20">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {questions
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((q, idx) => (
                <div
                  key={q._id}
                  className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Question</span>
                  </div>
                  <p className="mt-4 text-lg font-bold leading-relaxed text-slate-900">{q.prompt}</p>
                  
                  <div className="mt-8 grid gap-3">
                    {(q.options || [])
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((opt) => {
                        const isSelected = answers[q._id] === opt._id;
                        return (
                          <label
                            key={opt._id}
                            className={`group relative flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50'
                                : 'border-slate-100 bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600'
                                : 'border-slate-300 group-hover:border-slate-400'
                            }`}>
                              {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                            <input
                              type="radio"
                              name={q._id}
                              className="sr-only"
                              checked={isSelected}
                              onChange={() => selectOption(q._id, opt._id)}
                            />
                            <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))}

            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-100">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmitTest}
              disabled={busy}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-5 text-lg font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6 transition-transform group-hover:scale-110" />}
              {busy ? 'Submitting Assessment...' : 'Submit Final Answers'}
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-2xl shadow-slate-200/50 text-center max-w-2xl mx-auto">
            {isTimeOut && (
              <div className="mb-8 rounded-2xl bg-red-50 border border-red-200 p-6 flex items-center gap-4 text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white animate-pulse">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900 leading-tight uppercase tracking-tight">Time Limit Reached!</h3>
                  <p className="text-sm font-medium text-red-700 mt-1">Your assessment was automatically submitted because the 30-minute time limit expired.</p>
                </div>
              </div>
            )}
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-8">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Assessment Submitted!</h2>
            <p className="mt-3 text-slate-500 font-medium">Thank you for completing the evaluation. Your responses have been recorded.</p>
            
            {result && (
              <div className="mt-10 rounded-3xl border border-slate-100 bg-slate-50/50 p-8 text-left transition-all hover:shadow-md">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Results Summary</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.totalScore != null && (
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Score</p>
                      <p className="text-2xl font-black text-indigo-600">{result.totalScore}</p>
                    </div>
                  )}
                  {result.label != null && (
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Label</p>
                      <p className="text-xl font-bold text-slate-900">{result.label}</p>
                    </div>
                  )}
                  {result.summaryKey != null && (
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 sm:col-span-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Summary</p>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed">{result.summaryKey}</p>
                    </div>
                  )}
                  {result.band != null && (
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 sm:col-span-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Performance Band</p>
                      <p className="text-sm font-bold text-slate-700">
                        {typeof result.band === 'object' ? JSON.stringify(result.band) : String(result.band)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleNewAttempt}
              className="mt-10 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-10 py-4 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95 cursor-pointer"
            >
              Close Session
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicEmployeeTest;
