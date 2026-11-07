// frontend/src/pages/UserRegister.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { getApiErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function UserRegister() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      await register(formData.fullName, formData.email, formData.password);
      navigate('/dashboard/map', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 font-sans text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
        <button 
          onClick={() => navigate('/login-user')}
          className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-all mb-8 text-xs uppercase tracking-[0.2em] font-bold group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to login
        </button>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative glow inside card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full"></div>

          <div className="flex flex-col items-center mb-8 relative z-10">
            <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-4 border border-blue-500/20">
              <ShieldAlert size={32} className="text-blue-400" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Register Account</h2>
            <p className="text-blue-400/60 text-sm mt-2 font-medium tracking-wide">Join the CrimeMap platform</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center relative z-10 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 mt-2 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center relative z-10">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <Link to="/login-user" className="text-blue-400 hover:text-blue-300 transition-colors font-bold ml-1">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
