import { useEffect, useMemo, useState } from "react";
import "./MobileHeader.css";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function MobileHeader({
  user,
  account,
  setAccount,
  balances,
  balance,
  notifications,
  setActivePage,
  openMenu,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
}) {
  const [panel, setPanel] = useState("");
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((item) => !item.read).length;
  const initials = user?.initials || "JM";
  const isReal = account === "real";

  const accountRows = useMemo(
    () => [
      { id: "demo", label: "Demo Account", balance: Number(balances?.demo || 0) },
      { id: "real", label: "Real Account", balance: Number(balances?.real || 0) },
    ],
    [balances]
  );

  useEffect(() => {
    if (!panel) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPanel("");
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [panel]);

  const closePanel = () => setPanel("");

  const handleAccountToggle = () =>
    setPanel((current) => (current === "account" ? "" : "account"));

  const handleNotificationToggle = () =>
    setPanel((current) => (current === "notifications" ? "" : "notifications"));

  const openNotification = (item) => {
    markNotificationRead?.(item.id);
    setPanel("");
    if (item.page) setActivePage(item.page);
  };

  return (
    <div className="mobile-header">
      <div className="mobile-header-inner">
        <button
          type="button"
          className="mobile-header-menu"
          onClick={() => {
            closePanel();
            window.dispatchEvent(new Event("metabinary:close-trade-overlays"));
            openMenu();
          }}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="mobile-header-brand">
          <span className="mobile-header-logo" aria-hidden="true">
            M
          </span>
          <strong>Meta</strong>
        </div>

        <div className="mobile-header-account-wrap">
          <button
            type="button"
            className={`mobile-header-account ${panel === "account" ? "open" : ""}`}
            onClick={handleAccountToggle}
            aria-expanded={panel === "account"}
            aria-haspopup="listbox"
          >
            <span className={`mobile-header-account-icon ${isReal ? "real" : "demo"}`}>
              {isReal ? <span className="mobile-header-flag" /> : "D"}
            </span>
            <span className="mobile-header-account-balance">{money(balance)} USD</span>
            <span className="mobile-header-chevron">⌄</span>
          </button>
        </div>

        <button
          type="button"
          className={`mobile-header-bell ${panel === "notifications" ? "active" : ""}`}
          onClick={handleNotificationToggle}
          aria-label="Notifications"
        >
          <svg viewBox="0 0 32 36" aria-hidden="true">
            <path d="M16 3.5c-5.2 0-9.1 4.2-9.1 9.6v5.2c0 2.3-.8 4.6-2.3 6.4l-1.3 1.6c-.8 1-.1 2.5 1.2 2.5h23c1.3 0 2-1.5 1.2-2.5l-1.3-1.6a10.2 10.2 0 0 1-2.3-6.4v-5.2c0-5.4-3.9-9.6-9.1-9.6Z" />
            <path d="M11.8 30.4c.7 2 2.2 3.1 4.2 3.1s3.5-1.1 4.2-3.1h-8.4Z" />
          </svg>
          {unreadCount > 0 && (
            <span className="mobile-header-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </button>

        <div className="mobile-header-avatar" role="presentation">
          {initials}
          <span className="mobile-header-online" />
        </div>
      </div>

      {panel && <button type="button" className="mobile-header-backdrop" onClick={closePanel} aria-label="Close overlay" />}

      {panel === "account" && (
        <section className="mobile-header-panel mobile-header-account-panel" role="listbox" aria-label="Choose account">
          {accountRows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`mobile-header-panel-row ${account === row.id ? "selected" : ""}`}
              onClick={() => {
                setAccount(row.id);
                closePanel();
              }}
            >
              <span className={`mobile-header-panel-icon ${row.id}`}>
                {row.id === "real" ? <span className="mobile-header-flag" /> : "D"}
              </span>
              <span>
                <strong>{row.label}</strong>
                <small>{money(row.balance)} USD</small>
              </span>
              <span className="mobile-header-panel-check">{account === row.id ? "✓" : ""}</span>
            </button>
          ))}
        </section>
      )}

      {panel === "notifications" && (
        <section className="mobile-header-panel mobile-header-notification-panel">
          <header>
            <span>
              <strong>Notifications</strong>
              <small>{unreadCount} unread</small>
            </span>
            <button type="button" className="mobile-header-mini-button" onClick={closePanel} aria-label="Close notifications">
              ×
            </button>
          </header>

          <div className="mobile-header-notification-list">
            {safeNotifications.length === 0 ? (
              <p className="mobile-header-empty">No new notifications.</p>
            ) : (
              safeNotifications.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="mobile-header-notification-row"
                  onClick={() => openNotification(item)}
                >
                  <span>🔔</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                    <em>{item.time}</em>
                  </span>
                  {!item.read && <span className="mobile-header-unread-dot" />}
                </button>
              ))
            )}
          </div>

          {safeNotifications.length > 0 && (
            <div className="mobile-header-panel-footer">
              <button type="button" onClick={() => { closePanel(); setActivePage("history"); }}>
                View activity
              </button>
              <button type="button" onClick={clearNotifications}>
                Clear
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
