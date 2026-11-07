import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { searchPhoton } from '../services/locationSearch.js';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 450;

export default function LocationSearch({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search for a place…',
  inputClassName = '',
  className = '',
  icon,
  disabled = false,
  required = false,
}) {
  const id = useId();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryCount, setRetryCount] = useState(0);
  const requestId = useRef(0);
  const selectedLabel = useRef('');

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const text = query.trim();
    if (text === selectedLabel.current) {
      selectedLabel.current = '';
      setStatus('idle');
      setSuggestions([]);
      return undefined;
    }

    if (text.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setActiveIndex(-1);
      setStatus(text ? 'short' : 'idle');
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      setIsOpen(true);
      try {
        const results = await searchPhoton(text, { signal: controller.signal });
        if (requestId.current !== currentRequest) return;
        setSuggestions(results);
        setActiveIndex(-1);
        setStatus(results.length ? 'ready' : 'empty');
      } catch (error) {
        if (error.name === 'AbortError' || requestId.current !== currentRequest) return;
        setSuggestions([]);
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, retryCount]);

  const chooseSuggestion = (place) => {
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      setStatus('error');
      return;
    }
    selectedLabel.current = place.displayName;
    setQuery(place.displayName);
    onChange?.(place.displayName);
    setSuggestions([]);
    setStatus('idle');
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect?.(place);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex]);
    }
  };

  const suggestionMeta = (place) => [
    place.district && place.district !== place.name ? place.district : '',
    place.city && place.city !== place.name && place.city !== place.district ? place.city : '',
    place.state,
    place.country,
  ].filter(Boolean).filter((part, index, list) => list.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index).join(', ');

  return (
    <div className={`relative ${className}`}>
      {icon || <MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-500" size={16} />}
      <input
        type="search"
        value={query}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={inputClassName}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        onFocus={() => { if (suggestions.length) setIsOpen(true); }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          const next = event.target.value;
          selectedLabel.current = '';
          setQuery(next);
          setIsOpen(true);
          onChange?.(next);
        }}
      />

      {isOpen && (status === 'loading' || status === 'ready' || status === 'empty' || status === 'error' || status === 'short') && (
        <div id={`${id}-suggestions`} role="listbox" className="absolute left-0 right-0 top-full z-[1100] mt-2 max-h-72 overflow-auto rounded-xl border border-slate-700 bg-[#0A1628] shadow-2xl">
          {status === 'loading' && <div role="status" className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300"><Loader2 className="animate-spin text-blue-400" size={16} />Searching locations…</div>}
          {status === 'short' && <div className="px-4 py-3 text-xs text-slate-500">Enter at least {MIN_QUERY_LENGTH} characters to search.</div>}
          {status === 'empty' && <div className="px-4 py-3 text-sm text-slate-400">No matching places found.</div>}
          {status === 'error' && <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-rose-300"><span>Location search is unavailable. Check your connection and try again.</span><button type="button" className="shrink-0 font-semibold text-blue-300 hover:text-blue-200" onMouseDown={(event) => event.preventDefault()} onClick={() => setRetryCount((count) => count + 1)}>Retry</button></div>}
          {status === 'ready' && suggestions.map((place, index) => (
            <button
              key={`${place.latitude},${place.longitude},${place.displayName}`}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSuggestion(place)}
              className={`block w-full border-b border-slate-800/80 px-4 py-3 text-left last:border-b-0 hover:bg-slate-800/80 ${activeIndex === index ? 'bg-slate-800/80' : ''}`}
            >
              <span className="block text-sm font-semibold text-slate-100">{place.name}</span>
              <span className="mt-0.5 block text-xs text-slate-400">{suggestionMeta(place) || place.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
