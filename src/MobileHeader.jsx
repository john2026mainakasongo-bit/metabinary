import { useEffect, useMemo, useState } from "react";

function formatMoney(value) {
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
  const isReal = account === "real";
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((item) => !item.read).length;
  const initials = user?.initials || "JM";

  const accountRows = useMemo(
    () => [
      {
        id: "demo",
        label: "Demo Account",
        balance: Number(balances?.demo || 0),
      },
      {
        id: "real",
        label: "Real Account",
        balance: Number(balances?.real || 0),
      },
    ],
    [balances]
  );

  useEffect(() => {
    if (!panel) return undefined;

    const onEscape = (event) => {
      if (event.key === "Escape") setPanel("");
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [panel]);

  function closePanel() {
    setPanel("");
  }

  function openNotification(item) {
    markNotificationRead?.(item.id);
    closePanel();
    if (item.page) setActivePage(item.page);
  }

  return (
    <>
      <div className="mobileHeaderOnlyV265">
        <div className="mobileHeaderBrandV265">
          <button
            type="button"
            className="mobileHeaderMenuV265"
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

          <span className="mobileHeaderLogoV265" aria-hidden="true">M</span>
          <strong>Meta</strong>
        </div>

        <button
          type="button"
          className={`mobileHeaderAccountV265 ${panel === "account" ? "open" : ""}`}
          onClick={() => setPanel((current) => (current === "account" ? "" : "account"))}
          aria-expanded={panel === "account"}
          aria-haspopup="listbox"
          aria-label={`Selected ${isReal ? "real" : "demo"} account, ${formatMoney(balance)} USD`}
        >
          <span className={`mobileHeaderAccountIconV265 ${isReal ? "real" : "demo"}`}>
            {isReal ? <span className="mobileHeaderUsFlagV265" /> : "D"}
          </span>
          <b>{formatMoney(balance)} USD</b>
          <span className="mobileHeaderChevronV265">⌄</span>
        </button>

        <div className="mobileHeaderActionsV265">
          <button
            type="button"
            className={`mobileHeaderBellV265 ${panel === "notifications" ? "active" : ""}`}
            onClick={() =>
              setPanel((current) => (current === "notifications" ? "" : "notifications"))
            }
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={panel === "notifications"}
          >
            <svg
              className="mobileHeaderBellIconV265"
              viewBox="0 0 32 36"
              aria-hidden="true"
            >
              <path
                d="M16 3.5c-5.2 0-9.1 4.2-9.1 9.6v5.2c0 2.3-.8 4.6-2.3 6.4l-1.3 1.6c-.8 1-.1 2.5 1.2 2.5h23c1.3 0 2-1.5 1.2-2.5l-1.3-1.6a10.2 10.2 0 0 1-2.3-6.4v-5.2c0-5.4-3.9-9.6-9.1-9.6Z"
              />
              <path d="M11.8 30.4c.7 2 2.2 3.1 4.2 3.1s3.5-1.1 4.2-3.1h-8.4Z" />
            </svg>
            {unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}
          </button>

          <button
            type="button"
            className="mobileHeaderAvatarV265"
            onClick={() => {
              closePanel();
              setActivePage("profile");
            }}
            aria-label="Open profile"
          >
            {initials}
            <i />
          </button>
        </div>
      </div>

      {panel && (
        <button
          type="button"
          className="mobileHeaderBackdropV265"
          aria-label="Close header popup"
          onClick={closePanel}
        />
      )}

      {panel === "account" && (
        <section className="mobileAccountPanelV265" role="listbox" aria-label="Choose account">
          {accountRows.map((row) => (
            <button
              type="button"
              key={row.id}
              role="option"
              aria-selected={account === row.id}
              className={account === row.id ? "selected" : ""}
              onClick={() => {
                setAccount(row.id);
                closePanel();
              }}
            >
              <span className={`mobileAccountPanelIconV265 ${row.id}`}>
                {row.id === "real" ? <span className="mobileHeaderUsFlagV265" /> : "D"}
              </span>
              <span>
                <strong>{row.label}</strong>
                <small>{formatMoney(row.balance)} USD</small>
              </span>
              <i>{account === row.id ? "✓" : ""}</i>
            </button>
          ))}
        </section>
      )}

      {panel === "notifications" && (
        <section className="mobileNotificationsPanelV265" aria-label="Notifications">
          <header>
            <span>
              <strong>Notifications</strong>
              <small>{unreadCount} unread</small>
            </span>
            <span>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllNotificationsRead}>Read all</button>
              )}
              <button type="button" onClick={closePanel} aria-label="Close">×</button>
            </span>
          </header>

          <div>
            {safeNotifications.length === 0 ? (
              <p>No new notifications.</p>
            ) : (
              safeNotifications.slice(0, 6).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={item.read ? "read" : "unread"}
                  onClick={() => openNotification(item)}
                >
                  <span>🔔</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                    <em>{item.time}</em>
                  </span>
                  {!item.read && <i />}
                </button>
              ))
            )}
          </div>

          {safeNotifications.length > 0 && (
            <footer>
              <button type="button" onClick={() => { closePanel(); setActivePage("history"); }}>
                View activity
              </button>
              <button type="button" onClick={clearNotifications}>Clear</button>
            </footer>
          )}
        </section>
      )}
    </>
  );
}
