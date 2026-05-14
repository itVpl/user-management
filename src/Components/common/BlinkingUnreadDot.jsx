export default function BlinkingUnreadDot({ count = 1, className = "", title = "" }) {
  const unreadCount = Number(count);
  if (!Number.isFinite(unreadCount) || unreadCount <= 0) return null;

  const label = title || `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`;

  return (
    <span className={`relative inline-flex h-2.5 w-2.5 shrink-0 ${className}`} title={label} aria-label={label}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-80" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
    </span>
  );
}
