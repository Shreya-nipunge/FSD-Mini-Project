import { useSearchParams } from 'react-router-dom';
import CrimeNewsPanel from '../../components/CrimeNewsPanel.jsx';

export default function NewsPage() {
  const [searchParams] = useSearchParams();
  const prefillCity = searchParams.get('district') || searchParams.get('state') || 'Maharashtra';

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Intelligence Feeds
        </h2>
        <p className="text-sm text-slate-400 mt-1">Live open-source intelligence monitoring regional events.</p>
      </div>

      <CrimeNewsPanel initialQuery={prefillCity} />
    </div>
  );
}
