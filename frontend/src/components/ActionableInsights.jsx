// frontend/src/components/ActionableInsights.jsx
import React from 'react';
import { ShieldCheck, AlertTriangle, Info, Zap, TrendingUp, Target, Users, AlertCircle } from 'lucide-react';

const ActionableInsights = ({ insights, gapAlerts = [], loading }) => {
  if (loading) {
    return (
      <div className="bg-[#0D1E38] border border-slate-700/30 rounded-2xl p-6 h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">Running Intelligence Engine...</p>
      </div>
    );
  }

  const hasData = (insights && insights.length > 0) || (gapAlerts && gapAlerts.length > 0);

  if (!hasData) {
    return (
      <div className="bg-[#0D1E38] border border-slate-700/30 rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center">
        <ShieldCheck size={40} className="text-slate-700 mb-4" />
        <p className="text-slate-400 text-sm">No critical priority shifts detected.</p>
        <p className="text-slate-600 text-xs mt-1">System status: Normal Operations.</p>
      </div>
    );
  }

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'HIGH':
      case 'CRITICAL':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          icon: <AlertTriangle className="text-red-500" size={18} />,
          badge: 'bg-red-500/20 text-red-500'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          icon: <Zap className="text-amber-500" size={18} />,
          badge: 'bg-amber-500/20 text-amber-500'
        };
      default:
        return {
          bg: 'bg-teal-500/10',
          border: 'border-teal-500/30',
          text: 'text-teal-400',
          icon: <ShieldCheck className="text-teal-500" size={18} />,
          badge: 'bg-teal-500/20 text-teal-500'
        };
    }
  };

  return (
    <div className="bg-[#0D1E38] border border-slate-700/30 rounded-2xl p-6 h-full flex flex-col overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
            <Target className="text-violet-400" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Intelligence Support</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Decision Support Panel</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 no-scrollbar">
        {/* Under-Reporting Alerts (Priority 1) */}
        {gapAlerts.map((alert, idx) => (
          <div key={`gap-${idx}`} className="bg-red-500/10 border border-red-500/30 border rounded-xl p-4 transition-all hover:scale-[1.02] cursor-default border-dashed">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-red-500/20 text-red-500">
                  ⚠️ UNDER-REPORTING ALERT
                </span>
              </div>
              <Users className="text-red-500" size={18} />
            </div>
            <div className="space-y-3">
               <h4 className="text-xs font-bold text-slate-200 leading-relaxed uppercase">
                 Reporting Anomaly in {alert.district}
               </h4>
               <p className="text-[11px] text-red-300 font-medium">
                 ⚠️ Under-reporting detected: High citizen reports ({alert.complaint_count}+) vs low official scores ({alert.official_score}) suggest a critical data gap.
               </p>
               <div className="pt-2 border-t border-red-500/20">
                 <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1 h-3 bg-red-500 rounded-full" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Focus</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium italic">
                    "Immediate audit of localized record-keeping and community safety town-halls."
                  </p>
               </div>
            </div>
          </div>
        ))}

        {/* Regular Insights (Priority 2) */}
        {insights.map((item, idx) => {
          const style = getPriorityStyle(item.priority);
          return (
            <div 
              key={idx} 
              className={`${style.bg} ${style.border} border rounded-xl p-4 transition-all hover:scale-[1.02] cursor-default`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${style.badge}`}>
                    {item.priority} ALERT
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">{item.time_range}</span>
                </div>
                {style.icon}
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 leading-relaxed">
                    {item.observation}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendingUp size={12} className={item.growth_pct > 0 ? "text-red-400" : "text-teal-400"} />
                    <span className={`text-[11px] font-bold ${item.growth_pct > 0 ? "text-red-400" : "text-teal-400"}`}>
                      Classification: {item.category} | Shift: {item.growth_pct > 0 ? '+' : ''}{item.growth_pct}% ({item.time_range})
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Focus</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium italic">
                    "{item.suggested_focus}"
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/20">
        <p className="text-[9px] text-slate-500 text-center italic tracking-wide">
          Intelligence engine syncing Official IPC (2017-2022) with Real-time Citizen Intelligence loops.
        </p>
      </div>
    </div>
  );
};

export default ActionableInsights;
