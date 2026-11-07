import { useState, useEffect } from 'react';
import { getComplaints, updateComplaintStatus } from '../../services/api.js';
import { getApiErrorMessage } from '../../services/api.js';
import AuthenticatedEvidence from '../../components/AuthenticatedEvidence.jsx';
import { CheckCircle, AlertTriangle, Eye, Image as ImageIcon, MapPin, Search, XCircle } from 'lucide-react';

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
  return "just now";
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('UNVERIFIED'); // 'all', 'UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'
  const [search, setSearch] = useState('');
  
  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // {id, status}
  const [rejectReason, setRejectReason] = useState('Insufficient Data');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const fetchComplaints = async () => {
    try {
      const db = await getComplaints(null, null, true);
      // Ensure we sort by date descending
      const sorted = (db.complaints || []).sort((a,b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
      setComplaints(sorted);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to load reports.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleStatusUpdate = async (id, status, reason = null) => {
    setIsProcessing(true);
    try {
      const response = await updateComplaintStatus(id, status, reason);
      const updated = response?.report || response?.data?.report;
      const savedStatus = updated?.status || (status === 'resolved' ? 'VERIFIED' : status === 'rejected' ? 'REJECTED' : status);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...updated, status: savedStatus, rejection_reason: reason } : c));
      setConfirmAction(null);
      if (selectedComplaint?.id === id) {
         setSelectedComplaint(prev => ({...prev, ...updated, status: savedStatus, rejection_reason: reason}));
      }
    } catch (e) {
       setError(getApiErrorMessage(e, 'Unable to update this report.'));
    }
    setIsProcessing(false);
  };

  const pendingCount = complaints.filter(c => c.status === 'UNVERIFIED' || c.status === 'pending').length;

  const filteredComplaints = complaints.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || 
             (c.location || '').toLowerCase().includes(q) || 
             (c.crime_type || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-3">
             Citizen Intelligence Desk
             {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_-3px_rgba(239,68,68,1)]">
                   {pendingCount} New
                </span>
             )}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Review and process intelligence reports submitted by the public.</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-[#132240] p-4 rounded-xl border border-slate-700/50">
         <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
           {['all', 'UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                 {f.replace('_', ' ')}
              </button>
           ))}
         </div>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search Name, Location, Crime..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200" 
            />
         </div>
      </div>

      {/* Table Area */}
      <div className="bg-[#132240] border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm text-slate-400">
             <thead className="bg-[#0D1E38] text-xs uppercase font-semibold text-slate-500 border-b border-slate-700/50">
               <tr>
                 <th className="px-6 py-4">Reporter</th>
                 <th className="px-6 py-4">Intelligence Type</th>
                 <th className="px-6 py-4">Location Focus</th>
                 <th className="px-6 py-4">Timestamp</th>
                 <th className="px-6 py-4">Status</th>
                 <th className="px-6 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-700/30">
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {loading ? (
                 <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                       <div className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                          Decrypting Database...
                       </div>
                    </td>
                 </tr>
               ) : filteredComplaints.length === 0 ? (
                 <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                       {search ? "No records matched your search parameters." : "No reports logged in the registry yet."}
                    </td>
                 </tr>
               ) : (
                 filteredComplaints.map(comp => (
                   <tr key={comp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                         <div className="font-bold text-slate-200">{comp.name || 'Anonymous Viewer'}</div>
                         <div className="text-xs text-slate-500">{comp.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-medium text-xs border border-blue-500/20">
                           {comp.crime_type}
                           {comp.evidence_url && <ImageIcon size={12} className="text-blue-300" />}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="max-w-[150px] truncate" title={comp.location}>{comp.location}</div>
                         <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 uppercase"><MapPin size={10} /> {comp.district}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         {['UNVERIFIED', 'pending', 'UNDER_REVIEW'].includes(comp.status) ? (
                            <div className="flex flex-col">
                               <span className="text-orange-400 font-bold tracking-wide">Pending for {timeAgo(comp.created_at || comp.timestamp).replace(' ago', '')}</span>
                               <span className="text-[10px] text-slate-500 mt-0.5">Reported: {new Date(comp.created_at || comp.timestamp).toLocaleDateString()}</span>
                            </div>
                         ) : (
                            <span className="text-slate-300 font-medium">Reported {timeAgo(comp.created_at || comp.timestamp)}</span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                         {comp.status === 'UNVERIFIED' || comp.status === 'pending' ? (
                            <span className="flex items-center gap-1.5 text-purple-400 font-bold text-xs"><AlertTriangle size={14} /> Unverified</span>
                         ) : comp.status === 'UNDER_REVIEW' ? (
                            <span className="flex items-center gap-1.5 text-blue-400 font-bold text-xs"><Eye size={14} /> Under Review</span>
                         ) : comp.status === 'VERIFIED' || comp.status === 'resolved' ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs"><CheckCircle size={14} /> Verified</span>
                         ) : (
                            <span className="flex items-center gap-1.5 text-red-500 font-bold text-xs"><XCircle size={14} /> Rejected</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                            <button 
                               onClick={() => setSelectedComplaint(comp)}
                               className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-md transition-colors"
                               title="View Details"
                            ><Eye size={16} /></button>
                            
                            {['UNVERIFIED', 'pending', 'UNDER_REVIEW'].includes(comp.status) && (
                               <>
                               {comp.status !== 'UNDER_REVIEW' && (
                                 <button 
                                    onClick={() => handleStatusUpdate(comp.id, 'UNDER_REVIEW')}
                                    className="px-2 py-1.5 flex items-center gap-1.5 bg-slate-800 hover:bg-blue-500 border border-slate-700 hover:border-blue-400 hover:text-white text-slate-400 rounded-md transition-colors text-xs font-semibold"
                                    title="Mark Under Review (Optional)"
                                 ><Eye size={14} /> Review (Intermediate)</button>
                               )}
                               <button 
                                  onClick={() => handleStatusUpdate(comp.id, 'VERIFIED')}
                                  className="px-3 py-1.5 flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500 border border-transparent hover:border-emerald-400 hover:text-white text-emerald-500 rounded-md transition-colors text-xs font-bold"
                                  title="Finalize Verification"
                               ><CheckCircle size={14} /> Verify (Final)</button>
                               <button 
                                  onClick={() => setConfirmAction({id: comp.id, status: 'REJECTED'})}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500 border border-transparent hover:border-red-400 hover:text-white text-red-500 rounded-md transition-colors"
                                  title="Reject Complaint"
                               ><XCircle size={16} /></button>
                               </>
                            )}
                         </div>
                      </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-[#0D1E38] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
              
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10">
                 <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      Intelligence Briefing
                      {['UNVERIFIED', 'pending'].includes(selectedComplaint.status) ? (
                        <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-purple-500/20">Unverified</span>
                      ) : selectedComplaint.status === 'UNDER_REVIEW' ? (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-blue-500/20">Under Review</span>
                      ) : ['VERIFIED', 'resolved'].includes(selectedComplaint.status) ? (
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-emerald-500/20">Verified</span>
                      ) : (
                        <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-red-500/20">Rejected</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Logged {new Date(selectedComplaint.created_at || selectedComplaint.timestamp).toLocaleString()}</p>
                 </div>
                 <button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-white">
                    ✕
                 </button>
              </div>

              <div className="p-6 space-y-6">
                 
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-[#132240] p-4 rounded-xl border border-slate-700/50">
                       <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Location</span>
                       <span className="text-slate-200 font-medium">{selectedComplaint.location}</span>
                       <div className="text-xs text-slate-400 mt-1">GPS: {Number(selectedComplaint.lat ?? selectedComplaint.latitude ?? 0).toFixed(4)}, {Number(selectedComplaint.lng ?? selectedComplaint.longitude ?? 0).toFixed(4)}</div>
                    </div>
                    <div className="bg-[#132240] p-4 rounded-xl border border-slate-700/50">
                       <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Human Source</span>
                       <span className="text-slate-200 font-medium">{selectedComplaint.name || 'Anonymous Viewer'}</span>
                       <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {selectedComplaint.phone || 'No Phone'} {selectedComplaint.email ? `• ${selectedComplaint.email}` : ''}
                       </div>
                    </div>
                 </div>

                 <div className="bg-[#132240] p-5 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classification</span>
                       <span className="px-2 py-1 bg-red-500/10 text-red-400 font-bold text-xs rounded border border-red-500/30">{selectedComplaint.crime_type}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{selectedComplaint.description}</p>
                 </div>

                 {selectedComplaint.evidence_url && (
                    <div>
                       <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Attached Evidence</span>
                       <div className="bg-black/50 border border-slate-800 rounded-xl overflow-hidden flex justify-center p-2">
                           <AuthenticatedEvidence reportId={selectedComplaint.id} alt="Attached evidence" className="max-h-64 object-contain rounded-lg shadow-2xl" />
                       </div>
                    </div>
                 )}

                 {selectedComplaint.rejection_reason && (
                    <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl">
                       <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 block">Rejection Audit Log</span>
                       <p className="text-xs text-slate-300 italic">"{selectedComplaint.rejection_reason}"</p>
                    </div>
                 )}

              </div>

              {['UNVERIFIED', 'UNDER_REVIEW', 'pending'].includes(selectedComplaint.status) && (
                 <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button 
                       onClick={() => setSelectedComplaint(null)}
                       className="px-4 py-2 font-semibold text-xs text-slate-400 hover:text-white transition-colors"
                    >Close Briefing</button>
                    <button 
                       onClick={() => setConfirmAction({id: selectedComplaint.id, status: 'rejected'})}
                       className="px-6 py-2 bg-[#132240] hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg font-bold text-xs transition-colors shadow-lg"
                    >Reject Complaint</button>
                    <button 
                       onClick={() => handleStatusUpdate(selectedComplaint.id, 'resolved')}
                       className="px-6 py-2 bg-[#132240] hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold text-xs transition-colors shadow-lg"
                    >Mark as Resolved</button>
                 </div>
              )}

           </div>
        </div>
      )}

      {/* GLOBAL REJECTION REASON MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
           <div className="bg-[#0D1E38] border border-slate-700/50 rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
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
               <button onClick={() => setConfirmAction(null)} className="flex-1 px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest transition-all">Cancel</button>
               <button 
                 onClick={() => handleStatusUpdate(confirmAction.id, 'rejected', rejectReason)}
                 disabled={isProcessing}
                 className="flex-1 px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
               >
                 {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Rejection'}
               </button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}
