import { useState, useEffect } from 'react';
import { submitComplaint } from '../services/api';
import { getApiErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { FileWarning, CheckCircle, Search, User, Image as ImageIcon, X } from 'lucide-react';
import LocationSearch from './LocationSearch.jsx';
import CrimeLocationPicker from './CrimeLocationPicker.jsx';
import { applySearchedPlace } from '../services/locationPicker.js';

export default function ComplaintForm({ prefillState, prefillDistrict }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    crime_type: 'Theft',
    description: '',
    location: '',
    district: prefillDistrict || '',
    lat: 0,
    lng: 0,
    locationSelected: false,
    state: prefillState || 'Maharashtra',
    incidentDate: '',
    share_description: true
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Keep the location search prefilled when arriving from a district view.
  useEffect(() => {
    if (prefillDistrict && !formData.location) {
       setFormData((current) => ({ ...current, location: prefillDistrict }));
    }
  }, [prefillDistrict, formData.location]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        setError('Evidence must be a JPEG, PNG, or WebP image no larger than 5 MB.');
        e.target.value = '';
        return;
      }
      setError('');
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location || !formData.description) return;
    
    setLoading(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append("crime_type", formData.crime_type);
      payload.append("description", formData.description);
      payload.append("location", formData.location);
      payload.append("state", formData.state);
      payload.append("district", formData.district);
      payload.append("lat", formData.lat);
      payload.append("lng", formData.lng);
      payload.append("share_description", String(formData.share_description));
      if (formData.incidentDate) payload.append("incident_date", formData.incidentDate);
      
      if (imageFile) {
        payload.append("image", imageFile);
      }

      await submitComplaint(payload);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      
      // Keep the signed-in reporter and clear incident-specific fields.
      setFormData(prev => ({
         ...prev, 
         description: '', 
         location: prefillDistrict || '', 
         incidentDate: '',
         district: prev.state === prefillState ? prefillDistrict : '',
         lat: 0, 
         lng: 0,
         locationSelected: false,
      }));
      removeImage();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Your report could not be submitted. Please try again.'));
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-700">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <FileWarning className="text-blue-400" size={24} />
        </div>
        <div>
           <h2 className="text-xl font-bold text-slate-100">Incident Report Form</h2>
           <p className="text-xs text-slate-400">All fields marked with * are required.</p>
        </div>
      </div>

      {success ? (
        <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 bg-green-500/5 rounded-xl border border-green-500/20">
          <CheckCircle size={56} className="text-green-400 mb-4 drop-shadow-[0_0_15px_rgba(74,222,128,0.4)]" />
          <h3 className="text-2xl font-bold text-green-50 mb-2">Intelligence Received</h3>
          <p className="text-slate-400 text-sm max-w-sm">Your intelligence report has been securely registered to the regional network and forwarded to administrators.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
          
          {/* Identity Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-900/50 rounded-xl border border-slate-800">
             <div>
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Reporting as</label>
               <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input type="text" value={user?.name || ''} readOnly className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-sm text-slate-300 outline-none" />
               </div>
             </div>
             <div>
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Account email</label>
               <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300">{user?.email || ''}</div>
             </div>
          </div>

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Incident date <span className="text-slate-600 normal-case">(Optional)</span>
            <input type="date" value={formData.incidentDate} onChange={e => setFormData({...formData, incidentDate: e.target.value})} className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Incident Type *</label>
               <select
                 value={formData.crime_type}
                 onChange={e => setFormData({...formData, crime_type: e.target.value})}
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
               >
                 <option value="Theft">Theft</option>
                 <option value="Robbery">Robbery</option>
                 <option value="Vehicle Theft">Vehicle Theft</option>
                 <option value="Burglary">Burglary</option>
                 <option value="Cyber Crime">Cyber Crime</option>
                 <option value="Assault">Assault</option>
                 <option value="Other">Other IPC Crime</option>
               </select>
             </div>

             <div>
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Exact Location *</label>
                <div className="relative">
                  <LocationSearch
                    value={formData.location}
                   placeholder="Search precise location..."
                    className="w-full"
                    inputClassName="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    icon={<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />}
                    required
                    onChange={(location) => setFormData((current) => ({ ...current, location, district: '', lat: 0, lng: 0, locationSelected: false }))}
                    onSelect={(place) => setFormData((current) => applySearchedPlace(current, place))}
                 />
               </div>
             </div>
          </div>

          <CrimeLocationPicker
            latitude={formData.lat}
            longitude={formData.lng}
            hasSelectedLocation={formData.locationSelected}
            onCoordinatesChange={({ lat, lng }) => setFormData((current) => ({ ...current, location: '', district: '', lat, lng, locationSelected: true }))}
            onAddressResolved={(updateAddress) => setFormData((current) => updateAddress(current))}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Detailed Description *</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Provide specific details about the incident, perpetrators, or stolen items..."
              className="w-full min-h-[120px] bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              required
            />
            <div className="mt-3 flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
               <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={formData.share_description} 
                   onChange={e => setFormData({...formData, share_description: e.target.checked})}
                   className="sr-only peer" 
                 />
                 <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
               </label>
               <span className="text-xs font-medium text-slate-300">Share this description on the public map? <span className="text-slate-500 font-normal">(Disable to keep details private)</span></span>
            </div>
          </div>

          {/* Image Upload Block */}
          <div>
             <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Upload Evidence <span className="text-slate-600">(Optional Image)</span></label>
             {!imagePreview ? (
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <div className="flex flex-col items-center">
                    <ImageIcon className="text-slate-500 group-hover:text-blue-400 transition-colors mb-2" size={28} />
                    <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300">Click to upload an image</span>
                    <span className="text-xs text-slate-500 mt-1">PNG, JPG, WebP up to 5MB</span>
                  </div>
                  <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} />
                </label>
             ) : (
                <div className="relative w-full h-48 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center group">
                  <img src={imagePreview} alt="Evidence preview" className="max-h-full max-w-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <button type="button" onClick={removeImage} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-red-600">
                       <X size={16} /> Remove Evidence
                     </button>
                  </div>
                </div>
             )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]"
          >
            {loading ? 'Transmitting Intelligence...' : 'Submit Official Report'}
          </button>
        </form>
      )}
    </div>
  );
}
