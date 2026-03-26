import {
  Bell,
  CalendarClock,
  ClipboardList,
  Cog,
  Grid3X3,
  Home,
  LayoutDashboard,
  MapPinned,
  SlidersHorizontal,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const menuItems = [
  { label: "Home", path: "/home", icon: Home },
  { label: "Area", path: "/area", icon: MapPinned },
  { label: "Devices", path: "/devices", icon: Grid3X3 },
  { label: "Automation", path: "/automation", icon: SlidersHorizontal },
  { label: "Alerts", path: "/alerts", icon: Bell },
  { label: "Schedules", path: "/schedules", icon: CalendarClock },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Audit logs", path: "/audit-logs", icon: ClipboardList },
  { label: "Settings", path: "/settings", icon: Cog },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="flex min-h-screen w-[200px] flex-col bg-gradient-to-b from-[#1a0b3b] to-[#2d0b5a] p-3 text-white lg:w-[210px]">
      <div className="mb-6 flex items-center gap-3 rounded-xl px-2 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-sm font-bold">
          SW
        </div>
        <div className="text-xs font-semibold tracking-wide text-white/90">SMART WAREHOUSE</div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {menuItems.map(({ label, path, icon: Icon }) => {
          const active = pathname === path;
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                active ? "bg-purple-500 font-semibold text-white shadow" : "text-white/85 hover:bg-white/10"
              }`}
            >
              <Icon size={20} />
              <span className="text-sm">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

