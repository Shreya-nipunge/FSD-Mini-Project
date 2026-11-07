import { ShieldAlert, Map, FileWarning, Search, TrendingUp, AlertTriangle, LogOut, FileText, Upload } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userRole = user?.role || 'user';
  const userName = user?.name || 'User';
  const isAdmin = userRole === 'admin';

  const userLinks = [
    { to: "/dashboard/map", icon: <Map size={20} />, label: "Crime Map" },
    { to: "/dashboard/report", icon: <FileWarning size={20} />, label: "Report Incident" },
    { to: "/dashboard/my-reports", icon: <FileText size={20} />, label: "My Reports" },
    { to: "/dashboard/news", icon: <Search size={20} />, label: "Crime News" },
  ];

  const adminLinks = [
    { to: "/admin/analytics", icon: <TrendingUp size={20} />, label: "Analytics" },
    { to: "/admin/complaints", icon: <AlertTriangle size={20} />, label: "Complaints Desk" },
    { to: "/admin/upload", icon: <Upload size={20} />, label: "Data Ingestion" },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex h-screen bg-[#0A1628] text-white font-sans overflow-hidden">
      
      {/* Fixed Sidebar */}
      <aside className="w-64 bg-[#0D1E38] border-r border-slate-800 flex flex-col flex-shrink-0">
        
        {/* Brand Area */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <ShieldAlert size={22} className="text-white drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">CrimeMap</h1>
            <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500 font-semibold mt-0.5">From Crime Data → Crime Intelligence</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            {isAdmin ? "Admin Controls" : "Citizen Intel"}
          </p>
          
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 font-medium text-sm group ${
                  isActive 
                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                }`
              }
            >
              <div className="group-hover:scale-110 transition-transform duration-300">
                {link.icon}
              </div>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout Bottom Fixed */}
        <div className="p-4 border-t border-slate-800 bg-[#0D1E38]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
             <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">{userName}</span>
                <span className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Session
                </span>
             </div>
             <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Logout"
             >
               <LogOut size={16} />
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Outlet) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0A1628] overflow-y-auto">
         <div className="flex-1 p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-500">
           <Outlet />
         </div>
         {/* Minimal sticky footer */}
         <footer className="py-4 px-8 text-center text-[10px] uppercase tracking-widest text-slate-600 border-t border-slate-800/40 mt-auto">
            © 2026 CrimeWatch Intelligence Network
         </footer>
      </main>
      
    </div>
  );
}
