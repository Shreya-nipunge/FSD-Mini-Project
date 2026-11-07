// frontend/src/components/CrimeBarChart.jsx
// Team A — Frontend component
// Connects to: GET /api/by-type (data passed as barData prop from App.jsx)
// Recharts horizontal BarChart, bars coloured by crime type.
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card.jsx';
import { CRIME_COLORS } from '../lib/utils';

const SHORT_LABELS = {
  'Crimes Against Women': 'Women',
  'Crimes Against Children': 'Children',
  'Theft & Robbery': 'Theft',
  'Murder / Homicide': 'Murder',
  'Assault / Hurt': 'Assault',
  'Cyber Crime': 'Cyber',
  'Drug / Narcotics': 'Drugs',
  'Riots / Public Order': 'Riots',
  'Other IPC Crimes': 'Other',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const color = CRIME_COLORS[label] ?? '#64748B';
  return (
    <div className="bg-[#132240] border border-slate-600/40 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold mb-1" style={{ color }}>{label}</p>
      <p className="text-slate-300">{payload[0].value} incidents</p>
    </div>
  );
};

export default function CrimeBarChart({ barData }) {
  const source = barData?.labels?.length ? barData : { labels: [], values: [] };

  const chartData = (source.labels || []).map((label, i) => ({
    label,
    shortLabel: SHORT_LABELS[label] ?? label,
    value: source.values[i] ?? 0,
  }));

  const hasData = chartData.some(d => d.value > 0);

  return (
    <Card className="h-full relative overflow-hidden">
      <CardHeader>
        <CardTitle>Incidents by Type</CardTitle>
      </CardHeader>
      <CardContent className="relative h-full">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#132240]/60 backdrop-blur-[2px]">
            <p className="text-slate-400 text-sm font-medium">No incident data recorded</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">Adjust filters to broaden search</p>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 8, left: -20, bottom: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#64748b', fontSize: 9 }}
              axisLine={{ stroke: '#1e3a5f' }}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={CRIME_COLORS[entry.label] ?? '#64748B'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
