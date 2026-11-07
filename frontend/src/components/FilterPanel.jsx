// frontend/src/components/FilterPanel.jsx
import { useEffect, useState } from 'react';
import { CRIME_TYPES, GENDERS } from '../lib/utils';
import { SlidersHorizontal, X, Search, ChevronDown, Globe, Map as MapIcon, LayoutGrid } from 'lucide-react';
import LocationSearch from './LocationSearch.jsx';

const selectClass =
  'w-full lg:min-w-[170px] h-12 px-4 rounded-lg bg-slate-950 border border-slate-700 text-sm ' +
  'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ' +
  'appearance-none cursor-pointer hover:border-blue-400 transition-all duration-200 text-slate-200';

const searchClass =
  'w-full md:w-[280px] h-12 px-4 pl-10 rounded-lg bg-slate-950 border border-slate-700 ' +
  'text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 ' +
  'focus:ring-2 focus:ring-blue-500/30 transition-all duration-200';

const STATE_REGIONS = {
  'Andhra Pradesh': ['Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla', 'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'Krishna', 'Kurnool', 'Nandyal', 'Ntr', 'Palnadu', 'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'Y.S.R.'],
  'Arunachal Pradesh': ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Leparada', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
  'Assam': ['Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metro', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Marigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara Mancachar', 'Tamulpur', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'],
  'Bihar': ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur (Bhabua)', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Pashchim Champaran', 'Patna', 'Purbi Champaran', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali'],
  'Chhattisgarh': ['Balod', 'Balodabazar-Bhatapara', 'Balrampur Ramanujganj', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dakshin Bastar Dantewada', 'Dhamtari', 'Durg', 'Gariyaband', 'Gaurela Pendra Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabeerdham', 'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba', 'Korea', 'Mahasamund', 'Manendragarh-Chirmiri-Bharatpur(M C B)', 'Mohla-Manpur-Ambagarh Chouki', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja', 'Uttar Bastar Kanker'],
  'Goa': ['North Goa', 'South Goa'],
  'Gujarat': ['Ahmadabad', 'Amreli', 'Anand', 'Arvalli', 'Banas Kantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhotaudepur', 'Dang', 'Devbhumi Dwarka', 'Dohad', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kachchh', 'Kheda', 'Mahesana', 'Mahisagar', 'Morbi', 'Narmada', 'Navsari', 'Panch Mahals', 'Patan', 'Porbandar', 'Rajkot', 'Sabar Kantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
  'Haryana': ['Ambala', 'Bhiwani', 'Charki Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
  'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahul And Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
  'Jammu And Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
  'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahebganj', 'Saraikela Kharsawan', 'Simdega', 'West Singhbhum'],
  'Karnataka': ['Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagara', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davangere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Hubballi-Dharwad', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mangaluru', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagar', 'Vijayapura', 'Yadgir'],
  'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
  'Madhya Pradesh': ['Agar-Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa (East Nimar)', 'Khargone (West Nimar)', 'Mandla', 'Mandsaur', 'Morena', 'Narmadapuram', 'Narsimhapur', 'Neemuch', 'Niwari', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
  'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Chhatrapati Sambhajinagar', 'Dharashiv', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
  'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
  'Meghalaya': ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'Eastern West Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
  'Mizoram': ['Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saitual', 'Serchhip', 'Siaha'],
  'Nagaland': ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
  'Odisha': ['Anugul', 'Balangir', 'Baleshwar', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghapur', 'Jajapur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Sonepur', 'Sundargarh'],
  'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Pathankot', 'Patiala', 'Rupnagar', 'S.A.S Nagar', 'Sangrur', 'Shahid Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran'],
  'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Ganganagar', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Khairthal-Tijara', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur'],
  'Sikkim': ['Gangtok', 'Gyalshing', 'Mangan', 'Namchi', 'Pakyong', 'Soreng'],
  'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Nagapattinam', 'Namakkal', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'The Nilgiris', 'Theni', 'Thiruvallur', 'Thiruvarur', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvannamalai', 'Tuticorin', 'Vellore', 'Villupuram', 'Virudhunagar'],
  'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagitial', 'Jayashankar Bhupalapally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Medak', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'],
  'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'South Tripura', 'Unakoti', 'West Tripura'],
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Bara Banki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Mahoba', 'Mahrajganj', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Rae Bareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shrawasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
  'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudra Prayag', 'Tehri Garhwal', 'Udam Singh Nagar', 'Uttar Kashi'],
  'West Bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
  'Andaman And Nicobar Islands': ['Nicobars', 'North And Middle Andaman', 'South Andamans'],
  'Chandigarh': ['Chandigarh'],
  'The Dadra And Nagar Haveli And Daman And Diu': ['Dadra And Nagar Haveli', 'Daman', 'Diu'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  'Lakshadweep': ['Lakshadweep District'],
  'Puducherry': ['Karaikal', 'Pondicherry'],
  'Ladakh': ['Kargil', 'Leh Ladakh'],
};

const DEFAULT_FILTERS = { state: 'all', crime_type: '', region: '', year: '', gender: '' };

export default function FilterPanel({ filters, onFilterChange, onLocationSelect }) {
  const f = filters ?? DEFAULT_FILTERS;
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    if (f.state && f.state !== 'all') {
       const list = STATE_REGIONS[f.state] || [];
       setDistricts(list.sort());
    } else {
       // Aggregate ALL districts across all states for National Search
       const allList = Object.values(STATE_REGIONS).flat();
       setDistricts([...new Set(allList)].sort());
    }
  }, [f.state]);

  const handleChange = (key, value) => {
    if (key === 'state') {
       onFilterChange({ [key]: value, region: '' });
    } else {
       onFilterChange({ [key]: value });
    }
  };

  const clearAll = () => onFilterChange(DEFAULT_FILTERS);

  const hasActive = [f.crime_type, f.region, f.year, f.gender].some(Boolean) || f.state !== 'all';

  return (
    <div className="bg-[#0D1E38] border border-slate-700/30 rounded-2xl p-4 lg:p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex flex-col gap-4">
        
        {/* ROW 1: State, Region, Crime Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="relative group w-full">
            <select
              className={selectClass}
              value={f.state}
              onChange={(e) => handleChange('state', e.target.value)}
            >
              <option value="all">All States</option>
              {Object.keys(STATE_REGIONS).map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
          </div>

          <div className="relative group w-full">
            <select
              className={`${selectClass} pl-9`}
              value={f.region}
              onChange={(e) => handleChange('region', e.target.value)}
            >
              <option value="">Search District...</option>
              {districts.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
          </div>

          <div className="relative group w-full">
            <select
              className={selectClass}
              value={f.crime_type}
              onChange={(e) => handleChange('crime_type', e.target.value)}
            >
              <option value="">Crime Type</option>
              {CRIME_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
          </div>
        </div>

        {/* ROW 2: Year, Gender, Search, Reset */}
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full">
          
          <div className="grid grid-cols-2 gap-4 w-full lg:w-1/3">
            <div className="relative group w-full">
              <select
                className={selectClass}
                value={f.year}
                onChange={(e) => handleChange('year', e.target.value)}
              >
                <option value="">All Years</option>
                {['2017', '2018', '2019', '2020', '2021', '2022'].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
            </div>

            <div className="relative group w-full">
              <select
                className={selectClass}
                value={f.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <option value="">Gender</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
            </div>
          </div>

          <div className="flex-grow relative group w-full lg:w-auto">
            <LocationSearch
              placeholder="Search location..."
              className="w-full"
              inputClassName={searchClass}
              icon={<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" size={16} />}
              onSelect={(place) => onLocationSelect?.({ lat: place.latitude, lng: place.longitude, label: place.displayName })}
            />
          </div>

          {hasActive && (
            <button
              onClick={clearAll}
              className="px-6 h-12 rounded-lg bg-red-600/10 border border-red-600/20 text-red-500 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-600/20 transition-all duration-200 shrink-0 w-full lg:w-auto"
            >
              <X size={16} />
              Reset
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
