import { Link } from "react-router-dom";
import { 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Snowflake, 
  Zap, 
  BarChart3, 
  Bell, 
  Smartphone, 
  Cpu,
  ShieldCheck
} from "lucide-react";

export default function Home() {
  const features = [
    { title: "Giám sát 24/7", desc: "Theo dõi nhiệt độ, độ ẩm thời gian thực.", icon: Activity, color: "text-blue-500" },
    { title: "Cảnh báo", desc: "Thông báo ngay khi chỉ số vượt ngưỡng.", icon: Bell, color: "text-red-500" },
    // { title: "Báo cáo", desc: "Tự động xuất báo cáo chuẩn HACCP.", icon: BarChart3, color: "text-emerald-500" },
    { title: "Tiết kiệm", desc: "Tối ưu hóa năng lượng tiêu thụ.", icon: Zap, color: "text-amber-500" },
    { title: "Thiết bị", desc: "Quản lý hàng trăm cảm biến IoT.", icon: Cpu, color: "text-purple-500" },
    // { title: "Mobile App", desc: "Truy cập dữ liệu mọi lúc mọi nơi.", icon: Smartphone, color: "text-sky-500" },
  ];

  const steps = [
    { num: "01", title: "Lắp đặt", desc: "Gắn thiết bị vào kho lạnh." },
    { num: "02", title: "Kết nối", desc: "Đồng bộ dữ liệu qua Wi-Fi/4G." },
    { num: "03", title: "Vận hành", desc: "Theo dõi qua Dashboard." },
  ];

  return (
    <div className="space-y-20 pb-12 text-slate-900 dark:text-slate-100">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border border-white/20 p-8 md:p-14 shadow-2xl">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 -left-20 w-72 h-72 rounded-full bg-blue-500/30 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500/20 blur-[100px]" />
        </div>
        
        <div className="relative grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Hệ thống đang trực tuyến
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
              Bảo quản <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">thực phẩm tươi sống</span> thông minh
            </h1>
            
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-md">
              Hệ thống IoT giám sát kho lạnh 24/7, giúp giảm thiểu hư hỏng và tối ưu vận hành.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              {/* <Link to="/dashboard" className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25">
                Vào Dashboard <ArrowRight className="w-4 h-4" />
              </Link> */}
              <Link to="/area" className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold transition-all text-white">
                Khám phá khu vực
              </Link>
            </div>
            
            {/* <div className="flex gap-4 text-xs font-medium text-slate-500">
              {["HACCP-ready", "Real-time", "Cloud Sync"].map((tag) => (
                <span key={tag} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {tag}
                </span>
              ))}
            </div> */}
          </div>

          {/* MOCKUP CARD */}
          <div className="relative group">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-2xl transform group-hover:scale-[1.02] transition-all duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Snowflake className="w-6 h-6 text-blue-500 animate-spin-slow" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cold Room #01</p>
                    <p className="text-base font-bold">Khu A — Hải sản</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Nhiệt độ", value: "-18.2°C", color: "text-blue-500" },
                  { label: "Độ ẩm", value: "85%", color: "text-indigo-500" },
                  { label: "Năng lượng", value: "2.4kW", color: "text-orange-500" },
                  { label: "Cảm biến", value: "8/8", color: "text-emerald-500" },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{s.label}</p>
                    <p className={`text-2xl font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> AUTO-COOLING
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Tính năng vượt trội</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Giải pháp quản lý kho lạnh thông minh dựa trên nền tảng điện toán đám mây.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all group shadow-sm hover:shadow-xl">
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-blue-600 rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Sẵn sàng để bắt đầu?</h2>
          <p className="text-blue-100 text-lg">Mở Dashboard để trải nghiệm quản lý dữ liệu kho lạnh thực tế ngay bây giờ.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/area" className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg">
              Truy cập các khu vực
            </Link>
            {/* <Link to="/devices" className="px-8 py-4 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors border border-blue-500">
              Xem thiết bị IoT
            </Link> */}
          </div>
        </div>
      </section>
      
    </div>
  );
}