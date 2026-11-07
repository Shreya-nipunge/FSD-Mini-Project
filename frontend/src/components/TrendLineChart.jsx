// frontend/src/components/TrendLineChart.jsx
// Team A — Frontend component
// Connects to: GET /api/trend (data passed as trendData prop from App.jsx)
// Recharts LineChart — monthly incident count with smooth teal curve.
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card.jsx';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#132240] border border-slate-600/40 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-[#0EACB5] font-semibold">{payload[0].value} incidents</p>
    </div>
  );
};

export default function TrendLineChart({ trendData }) {
  const data = trendData || [];

  const chartData = data.map((d) => ({ month: d.month, count: d.count }));

  const hasData = chartData.some(d => d.count > 0);

  return (
    <Card className="h-full relative overflow-hidden">
      <CardHeader>
        <CardTitle>Yearly Crime Trend (2017-2022)</CardTitle>
      </CardHeader>
      <CardContent className="relative h-full">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#132240]/60 backdrop-blur-[2px]">
            <p className="text-slate-400 text-sm font-medium">No historical data found</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">Select state level for trends</p>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#0E7C8B" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0E7C8B" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748b', fontSize: 9 }}
              axisLine={{ stroke: '#1e3a5f' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#0E7C8B"
              strokeWidth={2.5}
              fill="url(#tealGradient)"
              dot={{ fill: '#0E7C8B', strokeWidth: 2, r: 4, stroke: '#0A1628' }}
              activeDot={{ r: 6, fill: '#0EACB5', stroke: '#0A1628', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
