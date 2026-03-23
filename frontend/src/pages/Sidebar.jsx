const DEFAULT_NAV_ITEMS = [
  "Home",
  "Area",
  "Devices",
  "Automation",
  "Alerts",
  "Schedules",
  "Dashboard",
  "Audit logs",
  "Settings"
];

export default function Sidebar({
  items = DEFAULT_NAV_ITEMS,
  activeItem = "Devices",
  onItemClick
}) {
  return (
    <aside className="sw-sidebar">
      <div className="sw-logo">
        <div className="sw-logo-mark">⌂</div>
        <div className="sw-logo-text">SMART WAREHOUSE</div>
      </div>

      <nav className="sw-nav">
        {items.map((item) => (
          <button
            key={item}
            className={"sw-nav-item" + (item === activeItem ? " active" : "")}
            type="button"
            onClick={() => onItemClick?.(item)}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}