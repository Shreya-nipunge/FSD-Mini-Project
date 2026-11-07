import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, ShieldAlert } from 'lucide-react';

export default function AdminRegister() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 font-sans text-white relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4">
        <button onClick={() => navigate('/get-started')} className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-all mb-8 text-xs uppercase tracking-[0.2em] font-bold">
          <ArrowLeft size={16} /> Back to roles
        </button>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <ShieldAlert size={32} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Administrator access</h2>
          <p className="text-slate-400 text-sm mt-4 leading-relaxed">
            Administrator accounts are provisioned by the system administrator. Public registration cannot grant administrator privileges.
          </p>
          <div className="mt-6 p-4 rounded-xl border border-slate-700 bg-slate-950/50 text-left text-sm text-slate-300 flex gap-3">
            <Building2 className="text-blue-400 shrink-0" size={20} />
            <span>Contact your CrimeMap administrator if you need an account for an agency or department.</span>
          </div>
          <Link to="/login-admin" className="mt-7 inline-flex w-full justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
            Go to administrator sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
