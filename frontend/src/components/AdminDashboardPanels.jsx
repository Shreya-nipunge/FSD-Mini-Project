import { useState, useEffect } from 'react';
import { getAdminInsights, getComplaints, updateComplaintStatus } from '../services/api';
import { TrendingUp, AlertTriangle, ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboardPanels({ stateName, year }) {
  const [insights, setInsights] = useState({ rising_crimes: [], auto_insight: '' });
  const [complaints, setComplaints] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(null); // stores complaint ID
  const [rejectReason, setRejectReason] = useState('Insufficient Data');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = () => {
    getAdminInsights(stateName, year)
      .then(setInsights)
      .catch(console.error);
      
    // include_rejected is handled by the service wrapper for admin lists
    getComplaints(stateName)
      .then(res => setComplaints(res.complaints || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, [stateName, year]);

  const handleUpdateStatus = async (id, status, reason = null) => {
    setIsProcessing(true);
    try {
      await updateComplaintStatus(id, status, reason);
      // Optimistic update
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, rejection_reason: reason } : c));
      setShowRejectModal(null);
    } catch (err) {
      console.error(err);
    }
    setIsProcessing(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full min-h-[400px]">
      {/* Analytics Panel */}
      <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-6 flex flex-col shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
          <TrendingUp className="text-orange-400" size={24} />
          <h2 className="text-lg font-bold text-slate-100 italic tracking-tight uppercase">Smart Analytics & Rising Crimes</h2>
        </div>
        
        <div className="bg-orange-950/20 border border-orange-500/20 rounded-xl p-4 mb-6 shadow-inner">
          <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-1">AI Intelligence Briefing</h3>
          <p className="text-sm text-slate-300 font-medium leading-relaxed">{insights.auto_insight}</p>
        </div>

        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">CRITICAL GROWTH ZONES</h3>
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 no-scrollbar">
          {insights.rising_crimes.map((crime, idx) => (
            <div key={idx} className="group bg-slate-900/40 border border-slate-700 hover:border-orange-500/40 rounded-xl p-4 flex items-center justify-between transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-slate-500 group-hover:text-orange-400 transition-colors">0{idx + 1}</div>
                <div>
                  <p className="font-bold text-slate-200 uppercase tracking-tight italic">{crime.type}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{crime.latest} documented cases</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-orange-400 italic">+{crime.growth_pct}%</span>
                <p className="text-[9px] font-black text-slate-600 uppercase mt-0.5 tracking-widest">Expansion</p>
              </div>
            </div>
          ))}
          {insights.rising_crimes.length === 0 && (
            <p className="text-slate-500 text-sm italic text-center py-10 uppercase tracking-widest font-bold opacity-30">NO SIGNIFICANT ANOMALIES DETECTED</p>
          )}
        </div>
      </div>

      {/* Complaints Review Panel */}
      <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-6 flex flex-col shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
          <AlertTriangle className="text-blue-400" size={24} />
          <h2 className="text-lg font-bold text-slate-100 italic tracking-tight uppercase">Citizen Intelligence Desk</h2>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
          {complaints.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <ShieldCheck size={64} className="mb-4 opacity-10" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Sector Secured</p>
              <p className="text-[10px] uppercase font-bold mt-1">No pending reports for validation</p>
            </div>
          )}
          
          {complaints.map(c => (
            <div key={c.id} className={`bg-slate-900/60 border rounded-2xl p-5 transition-all duration-300 ${c.status === 'rejected' ? 'border-red-500/20 grayscale opacity-60' : 'border-slate-700'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border ${c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : c.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {c.crime_type}
                    </span>
                    {c.status === 'rejected' && <span className="text-[9px] font-black text-red-500/50 uppercase italic">Validation Failed</span>}
                  </div>
                  <p className="text-white font-bold mt-2 uppercase text-sm italic tracking-tight">{c.district} REGION</p>
                </div>
                
                {c.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateStatus(c.id, 'resolved')}
                      disabled={isProcessing}
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-500/20"
                      title="Mark as Verified"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button 
                      onClick={() => setShowRejectModal(c.id)}
                      disabled={isProcessing}
                      className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                      title="Reject Report"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                )}
                {c.status === 'resolved' && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle size={14} /> Verified
                  </div>
                )}
                {c.status === 'rejected' && (
                  <div className="flex items-center gap-1.5 text-red-500/50 text-[10px] font-black uppercase tracking-widest bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                    <XCircle size={14} /> Discarded
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed italic border-l-2 border-slate-700/50 pl-3">{c.description}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/50">
                <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                  <Clock size={12} className="text-slate-600" /> {new Date(c.timestamp).toLocaleDateString()}
                </div>
                <div className="text-[9px] font-black text-slate-600 uppercase italic">SRC: {c.user_email?.split('@')[0]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REJECTION MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0D1E38] border border-slate-700/50 rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-red-500/20">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-center text-white mb-2 uppercase italic tracking-tight">Intelligence Rejection</h3>
            <p className="text-slate-400 text-sm text-center mb-8 font-medium">Are you sure you want to discard this intelligence? This will remove the data from all public monitoring layers.</p>
            
            <div className="space-y-4 mb-8">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Reason for Rejection</label>
              <select 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer font-bold appearance-none italic"
              >
                <option value="Insufficient Data">Insufficient Actionable Data</option>
                <option value="Spam / Misleading">Spam or Misleading Submission</option>
                <option value="Duplicate Report">Duplicate Regional Report</option>
                <option value="Out of Scope">Out of Jurisdictional Scope</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowRejectModal(null)}
                className="flex-1 px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUpdateStatus(showRejectModal, 'rejected', rejectReason)}
                disabled={isProcessing}
                className="flex-1 px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
