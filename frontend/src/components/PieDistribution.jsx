// frontend/src/components/PieDistribution.jsx
// Team A — Frontend component
// Derives data from filtered crimes prop — does NOT call API directly.
// Recharts PieChart showing % split of crime types from whatever crimes are currently shown.
import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card.jsx';
import { CRIME_COLORS } from '../lib/utils';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0];
  const color = CRIME_COLORS[name] ?? '#64748B';
  return (
    <div className="bg-[#132240] border border-slate-600/40 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold mb-1" style={{ color }}>{name}</p>
      <p className="text-slate-300">{value} incidents ({(percent * 100).toFixed(0)}%)</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.07) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function PieDistribution({ barData }) {
  const source = barData?.labels?.length ? barData : { labels: [], values: [] };

  const pieData = useMemo(() => {
    return (source.labels || [])
      .map((label, i) => ({
        name: label,
        value: source.values[i] ?? 0
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [source]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Type Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="48%"
              outerRadius="62%"
              innerRadius="30%"
              labelLine={false}
              label={renderCustomLabel}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={CRIME_COLORS[entry.name] ?? '#64748B'} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={7}
              formatter={(value) => (
                <span style={{ fontSize: 9, color: '#94a3b8' }}>
                  {value.length > 14 ? `${value.slice(0, 14)}…` : value}
                </span>
              )}
              wrapperStyle={{ paddingTop: 4 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
