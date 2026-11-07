// frontend/src/components/BenchmarkingPanel.jsx
import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Info, ShieldCheck, Globe } from 'lucide-react';
import { getBenchmarks } from '../services/api';

const RankMedal = ({ rank }) => {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-slate-500 font-bold ml-2">#{rank}</span>;
};

const TrendIndicator = ({ trend }) => {
  if (trend === 'increasing') return <TrendingUp className="text-rose-400" size={16} />;
  if (trend === 'decreasing') return <TrendingDown className="text-emerald-400" size={16} />;
  return <Minus className="text-slate-500" size={16} />;
};

export default function BenchmarkingPanel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBenchmarks()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full bg-[#132240] border border-slate-700/50 rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-800 rounded w-full"></div>)}
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="w-full h-full bg-[#132240] border border-slate-700/50 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-5 border-b border-slate-700/30 flex items-center justify-between bg-slate-900/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Trophy size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">National Benchmarking</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-semibold">Normalized Safety Index (NSI)</p>
          </div>
        </div>
        <div className="bg-blue-500/10 px-2 py-1 rounded text-[10px] text-blue-400 font-bold uppercase border border-blue-500/20 flex items-center gap-1.5">
          <Globe size={10} /> Cross-State Intelligence
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-2">
          {data.map((item) => (
            <div 
              key={item.state}
              className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 flex justify-center">
                  <RankMedal rank={item.rank} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{item.state}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TrendIndicator trend={item.trend} />
                    <span className={`text-[10px] font-bold uppercase ${
                      item.trend === 'decreasing' ? 'text-emerald-400' : 
                      item.trend === 'increasing' ? 'text-rose-400' : 'text-slate-500'
                    }`}>
                      {item.trend} Trend
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                   <span className={`text-lg font-bold ${
                     item.nsi > 70 ? 'text-emerald-400' : item.nsi > 40 ? 'text-amber-400' : 'text-rose-400'
                   }`}>{item.nsi}</span>
                   <span className="text-[10px] text-slate-500 font-bold uppercase">NSI</span>
                </div>
                {/* Progress bar */}
                <div className="w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                   <div 
                     className={`h-full rounded-full ${
                       item.nsi > 70 ? 'bg-emerald-500' : item.nsi > 40 ? 'bg-amber-500' : 'bg-rose-500'
                     }`}
                     style={{ width: `${item.nsi}%` }}
                   ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insight Insight Line */}
      <div className="p-4 bg-emerald-500/5 border-t border-slate-700/30">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">
            "{data[0]?.insight || 'Benchmarking provides relative risk assessment across processed national datasets.'}"
          </p>
        </div>
      </div>
    </div>
  );
}
