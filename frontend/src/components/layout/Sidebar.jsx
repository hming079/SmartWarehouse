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
import { api } from "../../api";

const menuItems = [
  { label: "Home", path: "/home", icon: Home },
  { label: "Area", path: "/area", icon: MapPinned },
  { label: "Automation", path: "/automation", icon: SlidersHorizontal },
  { label: "Schedules", path: "/schedules", icon: CalendarClock },
  { label: "Create Account", path: "/users", icon: Cog, roles: ["manager"] },
];

const Sidebar = () => {
  const currentUser = JSON.parse(localStorage.getItem("auth_user") || "null");
  const currentRole = (currentUser?.role_name || "").toLowerCase();
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

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (_) {
      // Ignore logout API errors and clear local session anyway
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      navigate("/login", { replace: true });
    }
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
        {menuItems
          .filter((item) => !item.roles || item.roles.includes(currentRole))
          .map(({ label, path, icon: Icon, useDeviceView }) => {
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

      <button
        onClick={handleLogout}
        className="mt-3 rounded-xl border border-white/30 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
      >
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;

