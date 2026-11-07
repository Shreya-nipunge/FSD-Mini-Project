// frontend/src/pages/dashboard/MyComplaintsPage.jsx
import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, ChevronRight, Calendar, MapPin, XCircle, AlertTriangle, Pencil, Trash2, Save, X } from 'lucide-react';
import { deleteReport, getApiErrorMessage, getMyComplaints, getReport, updateReport } from '../../services/api.js';
import AuthenticatedEvidence from '../../components/AuthenticatedEvidence.jsx';

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchMyComplaints = async () => {
      try {
        const data = await getMyComplaints();
        setComplaints(Array.isArray(data) ? data : data?.complaints || []);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to load your reporting history.'));
      } finally {
        setLoading(false);
      }
    };

    fetchMyComplaints();
  }, []);

  const saveEdit = async (id) => {
    setError(null);
    try {
      const response = await updateReport(id, editData);
      const saved = response.report || response.data?.report;
      setComplaints((items) => items.map((item) => item.id === id ? { ...item, ...saved } : item));
      setEditingId(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update this report.'));
    }
  };

  const removeReport = async (id) => {
    if (!window.confirm('Delete this unreviewed report?')) return;
    setError(null);
    try {
      await deleteReport(id);
      setComplaints((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete this report.'));
    }
  };

  const showReport = async (id) => {
    try {
      const response = await getReport(id);
      setSelectedReport(response.report || response.data?.report);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load report details.'));
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={14} />;
      case 'rejected':
        return <AlertCircle size={14} />;
      case 'pending':
        return <Clock size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic tracking-tight">
            MY MONITORING HISTORY
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">Track the status of your reported regional incidents.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-inner">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending: {complaints.filter(c => ['UNVERIFIED', 'UNDER_REVIEW', 'pending'].includes(c.status)).length}</span>
           </div>
           <div className="w-[1px] h-3 bg-slate-800" />
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved: {complaints.filter(c => ['VERIFIED', 'resolved'].includes(c.status)).length}</span>
           </div>
           <div className="w-[1px] h-3 bg-slate-800" />
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rejected: {complaints.filter(c => ['REJECTED', 'rejected'].includes(c.status)).length}</span>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error && complaints.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
          <AlertCircle size={40} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400 font-medium">{error}</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="py-24 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12">
            <FileText size={32} className="text-slate-600 -rotate-12" />
          </div>
          <h3 className="text-xl font-bold text-slate-300">No reports generated yet</h3>
          <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm">Your intelligence contributions will appear here once you submit a regional complaint.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
          {complaints.map((c) => (
            <div 
              key={c.id} 
              className="group bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5 hover:bg-slate-800/40 hover:border-blue-500/30 transition-all duration-300 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden"
            >
              {/* Status Indicator Bar */}
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${['VERIFIED', 'resolved'].includes(c.status) ? 'bg-emerald-500' : ['REJECTED', 'rejected'].includes(c.status) ? 'bg-red-500' : 'bg-amber-500'}`} />
              
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {['UNVERIFIED', 'pending'].includes(c.status) ? (
                    <span className="flex items-center gap-1.5 text-blue-400 font-bold text-xs"><Clock size={14} className="animate-pulse" /> Analysis in Progress</span>
                  ) : c.status === 'UNDER_REVIEW' ? (
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold text-xs"><AlertTriangle size={14} className="animate-pulse" /> Under Active Review</span>
                  ) : ['VERIFIED', 'resolved'].includes(c.status) ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs"><CheckCircle size={14} /> Intelligence Verified</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-500/60 font-bold text-xs"><XCircle size={14} /> Verification Failed</span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-100 uppercase italic tracking-tight mb-2">{c.crime_type || c.category}</h3>
                {editingId === c.id ? (
                  <div className="space-y-2 mb-4">
                    <input aria-label="Report category" value={editData.category || ''} onChange={(e) => setEditData((value) => ({ ...value, category: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" />
                    <input aria-label="Report location" value={editData.location || ''} onChange={(e) => setEditData((value) => ({ ...value, location: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" />
                    <textarea aria-label="Report description" value={editData.description || ''} onChange={(e) => setEditData((value) => ({ ...value, description: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" />
                    <input aria-label="Incident date" type="date" value={editData.incidentDate || ''} onChange={(e) => setEditData((value) => ({ ...value, incidentDate: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" />
                    <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={Boolean(editData.shareDescription)} onChange={(e) => setEditData((value) => ({ ...value, shareDescription: e.target.checked }))} /> Share description publicly</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(c.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Save size={14} /> Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300"><X size={14} /> Cancel</button>
                    </div>
                  </div>
                ) : (
                <p className="text-sm text-slate-400 line-clamp-2 italic mb-4 border-l border-slate-700 pl-3 leading-relaxed">
                  {c.description}
                </p>
                )}

                {['REJECTED', 'rejected'].includes(c.status) && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 mb-4">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 italic">Administrative Decision</p>
                    <p className="text-xs text-slate-300">This report did not meet our verification criteria. <span className="text-slate-500 font-medium">Reason: {c.admin_notes || c.rejection_reason || 'Insufficient Data'}</span></p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin size={14} className="text-slate-600" />
                    <span className="text-xs font-semibold">{c.district}, {c.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={14} className="text-slate-600" />
                    <span className="text-xs font-semibold">{c.created_at || c.timestamp ? `${new Date(c.created_at || c.timestamp).toLocaleDateString()} at ${new Date(c.created_at || c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Recently Submitted"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                 {c.evidence_url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700">
                       <AuthenticatedEvidence reportId={c.id} alt="Evidence" className="w-full h-full object-cover" />
                    </div>
                 )}
                 <button type="button" aria-label="View report details" onClick={() => showReport(c.id)} className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all">
                    <ChevronRight size={20} />
                 </button>
                 {['UNVERIFIED', 'pending'].includes(c.status) && <>
                   <button type="button" aria-label="Edit report" onClick={() => { setEditingId(c.id); setEditData({ category: c.category || c.crime_type, description: c.description || '', location: c.location, incidentDate: c.incidentDate ? new Date(c.incidentDate).toISOString().slice(0, 10) : '', shareDescription: c.shareDescription ?? c.share_description ?? true }); }} className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-blue-600 hover:text-white"><Pencil size={16} /></button>
                   <button type="button" aria-label="Delete report" onClick={() => removeReport(c.id)} className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-red-600 hover:text-white"><Trash2 size={16} /></button>
                 </>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats footer for demo aesthetic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
         <div className="bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border border-blue-500/10 p-6 rounded-3xl text-center">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Response Rating</p>
            <h4 className="text-2xl font-black text-white italic">HIGH INTEL</h4>
         </div>
         <div className="bg-gradient-to-br from-emerald-600/5 to-teal-600/5 border border-emerald-500/10 p-6 rounded-3xl text-center">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Resolution Rate</p>
            <h4 className="text-2xl font-black text-white italic">Active Verification</h4>
         </div>
         <div className="bg-gradient-to-br from-purple-600/5 to-fuchsia-600/5 border border-purple-500/10 p-6 rounded-3xl text-center">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Citizen Trust Score</p>
            <h4 className="text-2xl font-black text-white italic">PLATINUM</h4>
         </div>
      </div>

      {selectedReport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Report details">
        <div className="max-w-xl w-full rounded-2xl border border-slate-700 bg-[#0D1E38] p-6 text-white space-y-3">
          <div className="flex items-start justify-between gap-4"><h3 className="text-xl font-bold">{selectedReport.category || selectedReport.crime_type}</h3><button onClick={() => setSelectedReport(null)} aria-label="Close report details"><X size={20} /></button></div>
          <p className="text-sm text-slate-300">{selectedReport.description || 'Description is private.'}</p>
          <p className="text-sm text-slate-400">{selectedReport.location} · {selectedReport.district}, {selectedReport.state}</p>
          <p className="text-xs text-slate-500">Status: {selectedReport.status} · Incident: {selectedReport.incidentDate ? new Date(selectedReport.incidentDate).toLocaleDateString() : 'Not specified'}</p>
          {selectedReport.evidence_url && <AuthenticatedEvidence reportId={selectedReport.id} alt="Report evidence" className="max-h-72 rounded-lg object-contain" />}
        </div>
      </div>}
    </div>
  );
}
