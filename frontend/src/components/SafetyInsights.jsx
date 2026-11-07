// frontend/src/components/SafetyInsights.jsx
import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Info, ListChecks, TrendingDown, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card.jsx';

const getSafetyTips = (data) => {
  const tips = [];
  
  if (Number(data.thefts) > 1000 || Number(data.vehicle_theft) > 1000) {
    tips.push("Vigilance in markets and parking areas is recommended. Ensure vehicles have anti-theft locks.");
  }
  if (Number(data.burglary) > 500) {
    tips.push("Residential security should be prioritized. Install CCTV or reinforced locks where possible.");
  }
  if (Number(data.rape) > 100 || Number(data.murder) > 50) {
    tips.push("Avoid poorly lit areas after dark. Use emergency patrol contacts for safety assistance.");
  }
  if (Number(data.cheating) > 500) {
    tips.push("Be cautious of financial scams and unauthorized digital transactions.");
  }
  
  // Default tips if none triggered
  if (tips.length === 0) {
    tips.push("Standard safety awareness is sufficient in this area.");
    tips.push("Always keep emergency contact numbers handy.");
  }
  
  return tips;
};

export default function SafetyInsights({ districtData }) {
  if (!districtData) return null;

  const { district, crime_score } = districtData;
  
  // Calculate relative safety percentage
  // For this prototype, we'll use a dynamic cap. 
  // Mumbai has ~500k, so we'll scale it relative to high-risk zones.
  const safetyPercent = useMemo(() => {
    const score = Number(crime_score) || 0;
    // Inverse scaling: lower score -> higher safety
    // Max reference for high risk is ~120k for a single year in Mumbai
    const cap = 150000; 
    const percentile = Math.max(0, 100 - (score / cap) * 100);
    return Math.round(percentile);
  }, [crime_score]);

  const tips = useMemo(() => getSafetyTips(districtData), [districtData]);

  const getStatusColor = () => {
    if (safetyPercent > 80) return 'text-emerald-400';
    if (safetyPercent > 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getStatusIcon = () => {
    if (safetyPercent > 70) return <ShieldCheck className="text-emerald-400" size={24} />;
    return <ShieldAlert className="text-rose-400" size={24} />;
  };

  return (
    <Card className="h-full border-[#F39C12]/20 bg-[#132240]/80 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#F39C12]" />
            Safety Analysis: {district}
          </CardTitle>
          <div className="flex items-center gap-1.5 bg-[#F39C12]/10 px-2 py-1 rounded text-[10px] text-[#F39C12] font-bold uppercase tracking-wider">
            Live Assessment
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Safety Score Circle */}
          <div className="flex items-center gap-6 bg-[#0A1628]/40 p-4 rounded-2xl border border-slate-700/30">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={175.9}
                  strokeDashoffset={175.9 - (175.9 * safetyPercent) / 100}
                  className={getStatusColor()}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-lg font-bold leading-none">{safetyPercent}%</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Safety Index</p>
              <p className={`text-sm font-bold ${getStatusColor()}`}>
                {safetyPercent > 80 ? 'Safe Zone' : safetyPercent > 60 ? 'Moderate Risk' : 'High Alert'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Based on reported IPC incidents</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <ListChecks size={14} /> Security Recommendations
            </h4>
            <div className="space-y-2">
              {tips.map((tip, idx) => (
                <div key={idx} className="flex gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/50">
                  <div className="mt-0.5">
                    <Info size={14} className="text-[#0E7C8B]" />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed italic">
                    "{tip}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Location Context */}
          <div className="mt-auto pt-2 flex items-center gap-2 text-[10px] text-slate-500 font-medium italic">
            <MapPin size={12} />
            Auto-generated for the selected region based on historical patterns.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
