import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const SHADOW_CSS = `
  :host {
    display: block;
    width: 100%;
    height: 68px;
    contain: layout style paint;
  }

  * {
    box-sizing: border-box;
  }

  button {
    font: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  .header {
    position: relative;
    width: 100%;
    height: 68px;
    overflow: visible;
    color: #fff;
    background:
      radial-gradient(circle at 53% 0%, rgba(20, 76, 145, .09), transparent 44%),
      #03111f;
    border-bottom: 1px solid rgba(64, 119, 173, .20);
  }

  .brand {
    position: absolute;
    left: 8px;
    top: 50%;
    width: 106px;
    height: 48px;
    display: flex;
    align-items: center;
    gap: 5px;
    transform: translateY(-50%);
  }

  .menu {
    width: 32px;
    min-width: 32px;
    height: 40px;
    padding: 7px 2px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .menu span {
    width: 27px;
    height: 3px;
    border-radius: 999px;
    background: #aab8ca;
  }

  .logo {
    width: 22px;
    min-width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #147fff;
    background: linear-gradient(145deg, #ff315f, #d317d8);
    font-size: 10px;
    font-weight: 1000;
  }

  .brand strong {
    width: 43px;
    min-width: 43px;
    color: #fff;
    font-size: 15px;
    font-weight: 1000;
    line-height: 1;
    letter-spacing: -.55px;
    white-space: nowrap;
  }

  .account {
    position: absolute;
    left: 116px;
    right: 86px;
    top: 50%;
    width: auto;
    max-width: 166px;
    height: 44px;
    margin: 0 auto;
    padding: 5px 7px;
    display: grid;
    grid-template-columns: 27px minmax(0, 1fr) 11px;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    transform: translateY(-50%);
    color: #fff;
    text-align: left;
    border: 1px solid rgba(25, 111, 225, .46);
    border-radius: 14px;
    background:
      radial-gradient(circle at 18% 0%, rgba(29, 104, 222, .11), transparent 42%),
      linear-gradient(135deg, #071a2e, #04111f);
    box-shadow: inset 0 0 18px rgba(25, 101, 219, .04);
    cursor: pointer;
  }

  .account.open {
    border-color: #147fff;
    box-shadow:
      inset 0 0 20px rgba(25, 101, 219, .08),
      0 0 0 3px rgba(20, 116, 255, .07);
  }

  .accountIcon {
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 50%;
  }

  .accountIcon.real {
    border: 1px solid rgba(255, 255, 255, .14);
    background: #102b50;
  }

  .accountIcon.demo {
    background: linear-gradient(145deg, #6250b5, #32266d);
    font-size: 13px;
    font-weight: 1000;
  }

  .flag {
    position: relative;
    width: 100%;
    height: 100%;
    display: block;
    overflow: hidden;
    border-radius: 50%;
    background:
      linear-gradient(to bottom,
        #b22234 0 7.69%, #fff 7.69% 15.38%,
        #b22234 15.38% 23.07%, #fff 23.07% 30.76%,
        #b22234 30.76% 38.45%, #fff 38.45% 46.14%,
        #b22234 46.14% 53.83%, #fff 53.83% 61.52%,
        #b22234 61.52% 69.21%, #fff 69.21% 76.9%,
        #b22234 76.9% 84.59%, #fff 84.59% 92.28%,
        #b22234 92.28% 100%);
  }

  .flag::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 55%;
    height: 54%;
    background:
      radial-gradient(circle, #fff 0 .85px, transparent 1.05px) 1px 1px / 4px 4px,
      #3c3b6e;
  }

  .account b {
    min-width: 0;
    overflow: hidden;
    font-size: 10px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -.08px;
    text-overflow: clip;
    white-space: nowrap;
  }

  .chevron {
    justify-self: center;
    color: #d5dfeb;
    font-size: 14px;
    line-height: 1;
  }

  .actions {
    position: absolute;
    right: 6px;
    top: 50%;
    width: 76px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    transform: translateY(-50%);
  }

  .bell {
    position: relative;
    width: 33px;
    min-width: 33px;
    height: 42px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .bell svg {
    width: 24px;
    height: 28px;
    fill: #d3dbe6;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .45));
  }

  .badge {
    position: absolute;
    right: -2px;
    top: 1px;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: #fff;
    background: #147fff;
    font-size: 8px;
    font-weight: 1000;
  }

  .avatar {
    position: relative;
    width: 37px;
    min-width: 37px;
    height: 37px;
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    border: 1px solid rgba(151, 177, 206, .24);
    background: rgba(4, 18, 31, .98);
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .online {
    position: absolute;
    right: 0;
    bottom: 1px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #00e889;
    box-shadow: 0 0 7px rgba(0, 232, 137, .50);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    border: 0;
    background: rgba(0, 5, 12, .24);
  }

  .panel {
    position: fixed;
    left: 50%;
    top: 72px;
    z-index: 21;
    width: min(340px, calc(100vw - 14px));
    transform: translateX(-50%);
    overflow: hidden;
    border: 1px solid rgba(39, 113, 224, .38);
    border-radius: 17px;
    background: linear-gradient(145deg, #06182b, #03111f);
    box-shadow: 0 24px 70px rgba(0, 0, 0, .60);
  }

  .accountPanel {
    padding: 8px;
  }

  .accountRow {
    width: 100%;
    min-height: 72px;
    padding: 10px;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) 30px;
    align-items: center;
    gap: 10px;
    color: #fff;
    text-align: left;
    border-radius: 13px;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, .018);
  }

  .accountRow + .accountRow {
    margin-top: 7px;
  }

  .accountRow.selected {
    border-color: rgba(20, 127, 255, .46);
    background: rgba(20, 95, 190, .10);
  }

  .rowIcon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 50%;
    font-weight: 1000;
  }

  .rowIcon.demo {
    background: linear-gradient(145deg, #6250b5, #32266d);
  }

  .rowIcon.real {
    background: #102b50;
  }

  .accountRow strong,
  .accountRow small {
    display: block;
  }

  .accountRow small {
    margin-top: 5px;
    color: #a8b5c8;
  }

  .check {
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #147fff;
    font-style: normal;
  }

  .notifications header {
    min-height: 58px;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
  }

  .notifications header strong,
  .notifications header small {
    display: block;
  }

  .headerButtons {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .miniButton {
    min-height: 30px;
    padding: 0 9px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: rgba(20, 127, 255, .12);
  }

  .notificationList {
    max-height: 330px;
    overflow-y: auto;
  }

  .notificationRow {
    width: 100%;
    min-height: 72px;
    padding: 10px 12px;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 8px;
    align-items: center;
    gap: 9px;
    color: #fff;
    text-align: left;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, .06);
    background: transparent;
  }

  .notificationRow strong,
  .notificationRow small,
  .notificationRow em {
    display: block;
  }

  .notificationRow small,
  .notificationRow em {
    margin-top: 3px;
    color: #9ba9bb;
    font-style: normal;
  }

  .unreadDot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #147fff;
  }

  .empty {
    padding: 25px;
    color: #9ba9bb;
    text-align: center;
  }

  .panelFooter {
    padding: 9px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .panelFooter button {
    min-height: 38px;
    border: 0;
    border-radius: 9px;
    color: #fff;
    background: rgba(20, 127, 255, .13);
  }

  @media (max-width: 390px) {
    .brand {
      left: 5px;
      width: 101px;
      gap: 4px;
    }

    .brand strong {
      font-size: 14px;
    }

    .account {
      left: 108px;
      right: 82px;
      height: 42px;
      max-width: 158px;
      grid-template-columns: 25px minmax(0, 1fr) 10px;
      gap: 4px;
      padding: 5px 6px;
    }

    .accountIcon {
      width: 24px;
      height: 24px;
    }

    .account b {
      font-size: 9.3px;
    }

    .actions {
      right: 3px;
      width: 73px;
      gap: 3px;
    }

    .bell {
      width: 32px;
      min-width: 32px;
    }

    .avatar {
      width: 35px;
      min-width: 35px;
      height: 35px;
    }
  }

  @media (max-width: 360px) {
    .brand {
      width: 98px;
    }

    .menu {
      width: 29px;
      min-width: 29px;
    }

    .menu span {
      width: 25px;
    }

    .brand strong {
      font-size: 13.5px;
    }

    .account {
      left: 103px;
      right: 77px;
      height: 40px;
      max-width: 148px;
      grid-template-columns: 23px minmax(0, 1fr) 9px;
      gap: 4px;
      padding: 4px 5px;
    }

    .accountIcon {
      width: 22px;
      height: 22px;
    }

    .account b {
      font-size: 8.7px;
    }

    .actions {
      right: 2px;
      width: 70px;
    }
  }
`;

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
  const hostRef = useRef(null);
  const [shadowRoot, setShadowRoot] = useState(null);
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
    if (!hostRef.current) return;
    const root = hostRef.current.shadowRoot || hostRef.current.attachShadow({ mode: "open" });
    setShadowRoot(root);
  }, []);

  useEffect(() => {
    if (!panel) return undefined;
    const close = (event) => {
      if (event.key === "Escape") setPanel("");
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [panel]);

  function closePanel() {
    setPanel("");
  }

  function openNotification(item) {
    markNotificationRead?.(item.id);
    closePanel();
    if (item.page) setActivePage(item.page);
  }

  const content = (
    <>
      <style>{SHADOW_CSS}</style>
      <div className="header">
        <div className="brand">
          <button
            type="button"
            className="menu"
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
          <span className="logo" aria-hidden="true">M</span>
          <strong>Meta</strong>
        </div>

        <button
          type="button"
          className={`account ${panel === "account" ? "open" : ""}`}
          onClick={() => setPanel((current) => (current === "account" ? "" : "account"))}
          aria-expanded={panel === "account"}
          aria-haspopup="listbox"
        >
          <span className={`accountIcon ${isReal ? "real" : "demo"}`}>
            {isReal ? <span className="flag" /> : "D"}
          </span>
          <b>{money(balance)} USD</b>
          <span className="chevron">⌄</span>
        </button>

        <div className="actions">
          <button
            type="button"
            className="bell"
            onClick={() =>
              setPanel((current) => (current === "notifications" ? "" : "notifications"))
            }
            aria-label="Notifications"
          >
            <svg viewBox="0 0 32 36" aria-hidden="true">
              <path d="M16 3.5c-5.2 0-9.1 4.2-9.1 9.6v5.2c0 2.3-.8 4.6-2.3 6.4l-1.3 1.6c-.8 1-.1 2.5 1.2 2.5h23c1.3 0 2-1.5 1.2-2.5l-1.3-1.6a10.2 10.2 0 0 1-2.3-6.4v-5.2c0-5.4-3.9-9.6-9.1-9.6Z" />
              <path d="M11.8 30.4c.7 2 2.2 3.1 4.2 3.1s3.5-1.1 4.2-3.1h-8.4Z" />
            </svg>
            {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          <button
            type="button"
            className="avatar"
            onClick={() => {
              closePanel();
              setActivePage("profile");
            }}
            aria-label="Open profile"
          >
            {initials}
            <i className="online" />
          </button>
        </div>
      </div>

      {panel && <button type="button" className="backdrop" onClick={closePanel} aria-label="Close" />}

      {panel === "account" && (
        <section className="panel accountPanel" role="listbox" aria-label="Choose account">
          {accountRows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`accountRow ${account === row.id ? "selected" : ""}`}
              onClick={() => {
                setAccount(row.id);
                closePanel();
              }}
            >
              <span className={`rowIcon ${row.id}`}>
                {row.id === "real" ? <span className="flag" /> : "D"}
              </span>
              <span>
                <strong>{row.label}</strong>
                <small>{money(row.balance)} USD</small>
              </span>
              <i className="check">{account === row.id ? "✓" : ""}</i>
            </button>
          ))}
        </section>
      )}

      {panel === "notifications" && (
        <section className="panel notifications">
          <header>
            <span>
              <strong>Notifications</strong>
              <small>{unreadCount} unread</small>
            </span>
            <span className="headerButtons">
              {unreadCount > 0 && (
                <button type="button" className="miniButton" onClick={markAllNotificationsRead}>
                  Read all
                </button>
              )}
              <button type="button" className="miniButton" onClick={closePanel}>×</button>
            </span>
          </header>

          <div className="notificationList">
            {safeNotifications.length === 0 ? (
              <p className="empty">No new notifications.</p>
            ) : (
              safeNotifications.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="notificationRow"
                  onClick={() => openNotification(item)}
                >
                  <span>🔔</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                    <em>{item.time}</em>
                  </span>
                  {!item.read && <i className="unreadDot" />}
                </button>
              ))
            )}
          </div>

          {safeNotifications.length > 0 && (
            <footer className="panelFooter">
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

  return <div ref={hostRef} style={{ width: "100%", height: "68px" }}>{shadowRoot && createPortal(content, shadowRoot)}</div>;
}
