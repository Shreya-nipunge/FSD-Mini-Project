import { useSearchParams } from 'react-router-dom';
import ComplaintForm from '../../components/ComplaintForm.jsx';

export default function ReportPage() {
  const [searchParams] = useSearchParams();
  const prefillState = searchParams.get('state') || 'Maharashtra';
  const prefillDistrict = searchParams.get('district') || '';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          Report an Incident
        </h2>
        <p className="text-sm text-slate-400 mt-1">Submit visual or textual intelligence directly to the registry.</p>
      </div>

      <ComplaintForm prefillState={prefillState} prefillDistrict={prefillDistrict} />
    </div>
  );
}
