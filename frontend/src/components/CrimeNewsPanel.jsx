import React, { useState, useEffect } from 'react';
import { ExternalLink, Calendar, MapPin, AlertTriangle, Newspaper, Search, ShieldCheck, Zap } from 'lucide-react';
import { getNews } from '../services/api.js';
import { getApiErrorMessage } from '../services/api.js';

const CrimeNewsPanel = ({ initialQuery }) => {
  const [query, setQuery] = useState(initialQuery || 'India');
  const [searchInput, setSearchInput] = useState(initialQuery || '');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      setStatusMsg('');
      try {
        const data = await getNews(query);
        
        if (data.status === 'error') {
          setError(data.message || 'Unable to sync with live feed.');
          setNews([]);
        } else {
          // The backend now handles all strict filtering and fallbacks
          setNews(data.articles || []);
          setStatusMsg(data.message);
        }
      } catch (err) {
        console.error('Error fetching news:', err);
        setError(getApiErrorMessage(err, 'Connection to Intelligence Feed lost. Please check infrastructure.'));
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
       setQuery(searchInput.trim());
    }
  };

  const getSeverityColor = (sev) => {
    switch(String(sev || '').toLowerCase()) {
      case 'high': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/20 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]">
            <Zap className="text-orange-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight italic">🧠 Live Crime Intelligence Feed</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              OSINT Registry: <span className="text-slate-300">{query}</span>
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
               type="text" 
               value={searchInput}
               onChange={(e) => setSearchInput(e.target.value)}
               placeholder="Enter sector for scanning..."
               className="w-full md:w-72 bg-slate-900/80 border border-slate-700 rounded-xl p-2.5 pl-10 text-xs font-bold text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
            />
          </div>
        </form>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-700/30 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-40 bg-slate-800/50" />
              <div className="p-5 space-y-4">
                <div className="h-4 bg-slate-800/50 rounded w-3/4" />
                <div className="h-12 bg-slate-800/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-red-950/5 border border-dashed border-red-500/20 rounded-3xl text-red-500/70">
          <AlertTriangle size={48} className="mb-4 opacity-50" />
          <h3 className="font-black uppercase tracking-widest mb-1">Infrastructure Failure</h3>
          <p className="text-xs font-bold opacity-60 uppercase">{error}</p>
        </div>
      ) : news.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-slate-900/40 border border-dashed border-slate-700 rounded-3xl text-slate-500">
          <ShieldCheck size={48} className="mb-4 opacity-20" />
          <h3 className="font-black uppercase tracking-widest mb-1">Sector Stable</h3>
          <p className="text-xs font-bold opacity-60 uppercase tracking-widest">No recent OSINT anomalies found for this region.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((article, index) => (
            <div 
              key={index} 
              className="group bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden hover:bg-[#0D1E38] hover:border-orange-500/40 transition-all duration-500 shadow-2xl flex flex-col h-full"
            >
              <div className="relative h-44 overflow-hidden bg-slate-800">
                {article.image ? (
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Newspaper className="text-slate-700" size={48} />
                  </div>
                )}
                
                {/* Intelligence Layer Overlays */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getSeverityColor(article.severity)}`}>
                    {article.severity} Threat
                  </span>
                  {article.location_hint && (
                    <span className="bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                      <MapPin size={10} className="text-blue-400" /> {article.location_hint}
                    </span>
                  )}
                </div>
                
                <div className="absolute bottom-3 right-3">
                   <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-lg backdrop-blur-md border ${String(article.confidence).toLowerCase() === 'high' ? 'bg-emerald-500 text-slate-900 border-emerald-400' : 'bg-slate-900/90 text-slate-300 border-slate-700'}`}>
                      {String(article.confidence).toLowerCase() === 'high' ? 'Verified OSINT' : 'Signal Analysis'}
                   </span>
                </div>
              </div>
              
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="text-sm font-black text-slate-100 leading-tight mb-2 group-hover:text-orange-400 transition-colors line-clamp-2 uppercase italic tracking-tight">
                  {article.title}
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-4 line-clamp-3 font-medium border-l-2 border-slate-800 pl-3">
                  {article.description}
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <div className="truncate pr-4 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    {article.source}
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar size={12} className="text-slate-700" />
                    {article.publishedAt}
                  </div>
                </div>
                
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900/50 hover:bg-orange-600 text-slate-400 hover:text-white transition-all duration-300 text-[10px] font-black uppercase tracking-widest border border-slate-800 hover:border-orange-500 shadow-inner group/btn"
                >
                  Intercept Report <ExternalLink size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrimeNewsPanel;
