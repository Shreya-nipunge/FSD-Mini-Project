// frontend/src/components/HotspotCards.jsx
import { Badge } from './ui/badge.jsx';
import { FlameKindling, MapPin, AlertTriangle } from 'lucide-react';

const RANK_COLORS = ['#C0392B', '#E67E22', '#F39C12', '#0E7C8B', '#64748B'];

export default function HotspotCards({ hotspotsData, onSelectHotspot }) {
  const data = hotspotsData || [];

  const getRiskLevel = (rank) => {
    if (rank <= 1) return { label: 'High', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (rank <= 3) return { label: 'Medium', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { label: 'Low', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
  };

  return (
    <div className="h-full flex flex-col bg-[#132240] border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlameKindling size={16} className="text-[#C0392B]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crime Hotspots</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 rounded-md bg-[#0A1628]">Ranked by Intensity</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {data.map((spot) => {
          const color = RANK_COLORS[spot.rank - 1] ?? '#64748B';
          const risk = getRiskLevel(spot.rank);
          
          return (
            <button
              type="button"
              key={spot.rank}
              onClick={() => onSelectHotspot?.(spot)}
              className="w-full group rounded-xl bg-[#0A1628] border border-slate-700/30 hover:border-[#F39C12]/50 p-4 transition-all hover:shadow-lg hover:shadow-orange-900/10 text-left relative overflow-hidden"
            >
              {/* Severity Side Bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1" 
                style={{ backgroundColor: color }}
              />

              <div className="flex items-start gap-4">
                {/* Rank Circle */}
                <div 
                  className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44` }}
                >
                  {spot.rank}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-bold group-hover:text-[#F39C12] transition-colors truncate">
                      {spot.area}
                    </p>
                    <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter ${risk.bg} ${risk.color}`}>
                      {risk.label} Risk
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-3">
                    <MapPin size={10} />
                    <span>Region: {spot.station}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3 mt-2">
                    <Badge crimeType={spot.primary_crime} className="text-[10px]" />
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-300">
                        {Number(spot.count).toLocaleString()} <span className="text-slate-500 font-normal">Crime Score</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

