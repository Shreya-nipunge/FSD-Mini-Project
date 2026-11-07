// frontend/src/lib/utils.js
// Utility for merging Tailwind classes safely (used by shadcn-style components)
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Crime type → colour mapping — single source of truth used by all components
export const CRIME_COLORS = {
  'Crimes Against Women':    '#C0392B',
  'Crimes Against Children': '#E67E22',
  'Theft & Robbery':         '#F39C12',
  'Murder / Homicide':       '#7B241C',
  'Assault / Hurt':          '#F1C40F',
  'Cyber Crime':             '#0E7C8B',
  'Drug / Narcotics':        '#8E44AD',
  'Riots / Public Order':    '#A04000',
  'Other IPC Crimes':        '#64748B',
};

export const CRIME_TYPES = Object.keys(CRIME_COLORS);

export const POLICE_STATIONS = [
  'Virar East',
  'Virar West',
  'Nalasopara East',
  'Vasai Road',
  'Arnala',
];

export const GENDERS = ['Male', 'Female', 'Other'];
