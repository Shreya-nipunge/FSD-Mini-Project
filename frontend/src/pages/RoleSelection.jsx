// frontend/src/pages/RoleSelection.jsx
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4 font-sans text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none"></div>

      {/* Header */}
      <div className="text-center mb-16 relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col items-center justify-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-2">
            <ShieldAlert size={32} className="text-blue-400" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            CrimeMap
          </h1>
        </div>
        <p className="text-blue-400/80 font-medium tracking-[0.2em] uppercase text-xs">
          Regional Analytics Platform
        </p>
      </div>

      {/* Cards Container */}
      <div className="flex flex-col md:flex-row justify-center gap-8 w-full max-w-4xl relative z-10 px-4">
        {/* User Card */}
        <div
          onClick={() => navigate('/login-user')}
          className="group relative flex-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-blue-500 p-10 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer flex flex-col items-center text-center gap-6 group hover:scale-[1.02]"
        >
            <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700 group-hover:bg-blue-500/10 group-hover:border-blue-500/50 text-slate-400 group-hover:text-blue-400 transition-all duration-300 shadow-inner">
                <User size={40} strokeWidth={1.5} />
            </div>
            <div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">User</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[180px]">Access general analytics and public safety data</p>
            </div>
            
            <div className="absolute inset-0 rounded-[2rem] bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>

        {/* Admin Card */}
        <div
          onClick={() => navigate('/login-admin')}
          className="group relative flex-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 hover:border-blue-500 p-10 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer flex flex-col items-center text-center gap-6 group hover:scale-[1.02]"
        >
            <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700 group-hover:bg-blue-500/10 group-hover:border-blue-500/50 text-slate-400 group-hover:text-blue-400 transition-all duration-300 shadow-inner">
                <ShieldCheck size={40} strokeWidth={1.5} />
            </div>
            <div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Admin</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[180px]">Manage datasets and platform administrative tools</p>
            </div>

            <div className="absolute inset-0 rounded-[2rem] bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-16 flex flex-col items-center gap-4 relative z-10">
        <p className="text-slate-500 text-xs uppercase tracking-[0.3em] font-bold">
            Select your access level to continue
        </p>
        <div className="w-1 h-12 bg-gradient-to-b from-blue-500/50 to-transparent rounded-full opacity-50"></div>
      </div>
    </div>
  );
}
