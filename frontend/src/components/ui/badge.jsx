// frontend/src/components/ui/badge.jsx
// Crime-type colour badge — accepts crimeType string and renders a coloured pill.
import { CRIME_COLORS } from '../../lib/utils';

export function Badge({ crimeType, className = '' }) {
  const color = CRIME_COLORS[crimeType] ?? '#64748B';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {crimeType}
    </span>
  );
}
