export default function Sidebar({
  items = ["Home", "Area", "Devices", "Automation", "Alerts", "Schedules", "Dashboard", "Audit logs", "Settings"],
  activeItem = "Devices",
  onItemClick
}) {
  return (
    <aside
      className="w-50 md:w-60 flex flex-col gap-8 px-5 py-6 text-white"
      style={{
        background: "linear-gradient(180deg, #2d1b69 0%, #1a0f4d 50%, #2d1b69 100%)"
      }}
    >
      <div className="text-center">
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 font-black border-2 border-purple-300 rounded-2xl text-purple-300 text-2xl">
          ⌂
        </div>
        <div className="text-xs tracking-widest leading-snug text-purple-100 font-semibold">
          SMART WAREHOUSE
        </div>
      </div>

      <nav className="flex flex-col gap-3">
        {items.map((item) => (
          <button
            key={item}
            className={`w-full px-4 py-3 text-[15px] rounded-xl border-0 cursor-pointer text-left transition-all ${
              item === activeItem
                ? "bg-purple-500 text-white font-semibold shadow-lg shadow-purple-900/35"
                : "text-purple-100 hover:text-white hover:bg-purple-600/30"
            }`}
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