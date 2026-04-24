import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

const GMAIL_POPUP_REF_KEY = "__gmailDesktopWindowRef";
const GMAIL_ACCOUNTS_STORAGE_KEY = "__gmailDesktopAccounts";
const ACCOUNT_LABELS_STORAGE_KEY = "__gmailDesktopAccountLabels";
const DEFAULT_ACCOUNT_WINDOWS = [
  { id: "acc1", label: "Account 1", mailU: 0 },
  { id: "acc2", label: "Account 2", mailU: 1 },
  { id: "acc3", label: "Account 3", mailU: 2 },
];

const normalizeAccounts = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_ACCOUNT_WINDOWS;
  return raw.map((item, index) => {
    const label = typeof item?.label === "string" ? item.label.trim() : "";
    return {
      id: item?.id || `acc${index + 1}`,
      label: label || `Account ${index + 1}`,
      mailU: Number.isInteger(item?.mailU) ? item.mailU : index,
    };
  });
};

const getInitialAccounts = () => {
  if (typeof window === "undefined") {
    return DEFAULT_ACCOUNT_WINDOWS;
  }

  try {
    const savedAccounts = window.localStorage.getItem(GMAIL_ACCOUNTS_STORAGE_KEY);
    if (savedAccounts) {
      return normalizeAccounts(JSON.parse(savedAccounts));
    }
    const legacyLabels = JSON.parse(window.localStorage.getItem(ACCOUNT_LABELS_STORAGE_KEY) || "{}");
    return DEFAULT_ACCOUNT_WINDOWS.map((slot) => ({
      ...slot,
      label: typeof legacyLabels?.[slot.id] === "string" ? legacyLabels[slot.id].trim() || slot.label : slot.label,
    }));
  } catch {
    return DEFAULT_ACCOUNT_WINDOWS;
  }
};

const InAppBrowser = () => {
  const hasAutoOpened = useRef(false);
  const hasShownBlockToastRef = useRef(false);
  const popupRef = useRef({});
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const [accounts, setAccounts] = useState(() => getInitialAccounts());
  const [selectedAccount, setSelectedAccount] = useState(() => getInitialAccounts()?.[0]?.id || "acc1");

  const getWindowName = (accountId) => `gmailDesktopWindow_${accountId}`;
  const getAccountLabel = (accountId) =>
    accounts.find((a) => a.id === accountId)?.label || "Account";
  const gmailUrlForSlot = (accountId) => {
    const slot = accounts.find((a) => a.id === accountId);
    const u = Number.isInteger(slot?.mailU) ? slot.mailU : 0;
    return `https://mail.google.com/mail/u/${u}/#inbox`;
  };

  const closeWebPopup = (accountId) => {
    const popupMap = window[GMAIL_POPUP_REF_KEY] || {};
    const popup = popupRef.current[accountId] || popupMap[accountId];
    if (popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // Ignore close failures.
      }
    }
    popupRef.current[accountId] = null;
    if (!window[GMAIL_POPUP_REF_KEY]) window[GMAIL_POPUP_REF_KEY] = {};
    window[GMAIL_POPUP_REF_KEY][accountId] = null;
  };

  const openInWebPopup = (accountId) => {
    const popupMap = window[GMAIL_POPUP_REF_KEY] || {};
    const existingPopup = popupRef.current[accountId] || popupMap[accountId];
    if (existingPopup && !existingPopup.closed) {
      existingPopup.focus();
      setIsPopupBlocked(false);
      return;
    }

    const features = [
      "popup=yes",
      "resizable=yes",
      "scrollbars=yes",
      "width=1520",
      "height=720",
      "left=330",
      "top=225",
    ].join(",");

    const popup = window.open(gmailUrlForSlot(accountId), getWindowName(accountId), features);
    if (popup) {
      popupRef.current[accountId] = popup;
      if (!window[GMAIL_POPUP_REF_KEY]) window[GMAIL_POPUP_REF_KEY] = {};
      window[GMAIL_POPUP_REF_KEY][accountId] = popup;
      popup.focus();
      setIsPopupBlocked(false);
      return;
    }

    setIsPopupBlocked(true);
    if (!hasShownBlockToastRef.current) {
      toast.warn("Popup blocked. Please allow popups for this site and try again.");
      hasShownBlockToastRef.current = true;
    }
  };

  const openGmailWindow = (accountId = selectedAccount) => {
    openInWebPopup(accountId);
  };

  useEffect(() => {
    if (hasAutoOpened.current) return;
    if (!accounts.length) return;
    hasAutoOpened.current = true;
    openGmailWindow(selectedAccount || accounts[0].id);

    return () => {
      accounts.forEach(({ id }) => closeWebPopup(id));
    };
  }, [accounts, selectedAccount]);

  useEffect(() => {
    const syncAccounts = () => setAccounts(getInitialAccounts());
    syncAccounts();
    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, []);

  useEffect(() => {
    if (!accounts.some((a) => a.id === selectedAccount)) {
      setSelectedAccount(accounts[0]?.id || "");
    }
  }, [accounts, selectedAccount]);

  return (
    <div className="min-h-[80vh] p-4 md:p-6 flex justify-center">
      <div className="h-[700px] w-[1200px] max-w-full overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-lg font-semibold text-gray-800">Gmail opens in a separate window</p>
          <p className="mt-2 max-w-xl text-sm text-gray-600">
            Each button uses a different <span className="font-mono text-xs">window.open</span>{" "}
            <em>name</em> so the browser keeps a separate window per account, and Gmail opens at{" "}
            <span className="font-mono text-xs">/mail/u/0</span>, <span className="font-mono text-xs">u/1</span>,{" "}
            <span className="font-mono text-xs">u/2</span> when you have multiple accounts in the same
            browser profile.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedAccount(account.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  selectedAccount === account.id
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {getAccountLabel(account.id)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Accounts are managed from Sidebar Gmail dropdown edit mode.
          </p>
          {isPopupBlocked && (
            <p className="mt-3 text-sm font-medium text-amber-700">
              Popup blocked by browser settings.
            </p>
          )}
          <button
            type="button"
            onClick={() => openGmailWindow(selectedAccount)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Open {getAccountLabel(selectedAccount)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InAppBrowser;
