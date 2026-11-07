// frontend/src/components/StatsBar.jsx
// Team A — Frontend component
// Connects to: GET /api/summary (data passed as summaryData prop from App.jsx)
// Renders 4 KPI cards in a horizontal row with large numbers and lucide icons.
import { ShieldCheck, TrendingUp, MapPin, Search } from 'lucide-react';

const KPI_CONFIG = [
  {
    key:       'total_incidents',
    label:     'Total Incidents',
    icon:      ShieldCheck,
    color:     'text-white',
    border:    'border-slate-600/40',
    iconColor: 'text-slate-400',
    bg:        'bg-slate-700/10',
  },
  {
    key:       'top_crime',
    label:     'Top Crime Type',
    icon:      TrendingUp,
    color:     'text-[#C0392B]',
    border:    'border-[#C0392B]/20',
    iconColor: 'text-[#C0392B]',
    bg:        'bg-[#C0392B]/5',
  },
  {
    key:       'hottest_zone',
    label:     'Hottest Zone',
    icon:      MapPin,
    color:     'text-[#F39C12]',
    border:    'border-[#F39C12]/20',
    iconColor: 'text-[#F39C12]',
    bg:        'bg-[#F39C12]/5',
  },
  {
    key:       'under_investigation',
    label:     'Under Investigation',
    icon:      Search,
    color:     'text-[#0EACB5]',
    border:    'border-[#0E7C8B]/20',
    iconColor: 'text-[#0E7C8B]',
    bg:        'bg-[#0E7C8B]/5',
  },
];

export default function StatsBar({ summaryData }) {
  const data = summaryData || {};

  return (
    <div className="grid grid-cols-4 gap-3">
      {KPI_CONFIG.map(({ key, label, icon: Icon, color, border, iconColor, bg }) => (
        <div
          key={key}
          className={`rounded-xl border ${border} ${bg} px-4 py-3 flex items-center gap-4 bg-[#132240]`}
        >
          <div className={`p-2 rounded-lg bg-[#0A1628] ${iconColor}`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-0.5 whitespace-nowrap">
              {label}
            </p>
            <p className={`text-2xl font-bold leading-none truncate ${color}`}>
              {data[key] ?? '—'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
