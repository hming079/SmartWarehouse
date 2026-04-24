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
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const menuItems = [
  { label: "Home", path: "/home", icon: Home },
  { label: "Area", path: "/area", icon: MapPinned },
  { label: "Devices", path: "/devices", icon: Grid3X3, useDeviceView: true },
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
  const [searchParams] = useSearchParams();
  const shouldPreserveSelection = (path) => path === "/area";

  const handleNavigate = (path, useDeviceView = false) => {
    let fullPath = path;

    // For Devices page, include saved view preference (card/list)
    if (useDeviceView) {
      try {
        const savedView = typeof window !== "undefined" 
          ? window.localStorage.getItem("smartwarehouse.device-view-preference") || "card"
          : "card";
        fullPath = `${path}/${savedView}`;
      } catch (_) {
        fullPath = `${path}/card`;
      }
    }

    // Only Area page keeps selection context; other sidebar pages show global summary.
    if (shouldPreserveSelection(path)) {
      const queryString = searchParams.toString();
      fullPath = queryString ? `${fullPath}?${queryString}` : fullPath;
    }

    navigate(fullPath);
  };

  return (
    <aside className="sticky top-0 flex h-screen w-[200px] shrink-0 flex-col overflow-y-auto bg-gradient-to-b from-[#1a0b3b] to-[#2d0b5a] p-3 text-white lg:w-[210px]">
      <div className="mb-6 flex items-center gap-3 rounded-xl px-2 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-sm font-bold">
          SW
        </div>
        <div className="text-xs font-semibold tracking-wide text-white/90">SMART WAREHOUSE</div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {menuItems.map(({ label, path, icon: Icon, useDeviceView }) => {
          const active = pathname === path || pathname.startsWith(`${path}/`);
          return (
            <button
              key={label}
              onClick={() => handleNavigate(path, useDeviceView)}
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

