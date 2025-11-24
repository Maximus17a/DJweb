import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchTracks } from '../../services/spotifyApi';
import { UI_CONFIG } from '../../utils/constants';

export default function SearchBar({ onTrackSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const tracks = await searchTracks(query);
        setResults(tracks);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setIsSearching(false);
      }
    }, UI_CONFIG.SEARCH_DEBOUNCE);

    return () => clearTimeout(timer);
  }, [query]);

  const handleTrackClick = (track) => {
    onTrackSelect(track);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      {/* Input de búsqueda */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar canciones..."
          className="input-neon pl-12 pr-12"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neon-purple w-5 h-5 animate-spin" />
        )}
      </div>

      {/* Resultados */}
      {showResults && results.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 glass rounded-xl overflow-hidden max-h-96 overflow-y-auto">
          {results.map((track) => (
            <button
              key={track.id}
              onClick={() => handleTrackClick(track)}
              className="w-full p-3 hover:bg-white/10 transition-colors flex items-center gap-3 text-left"
            >
              {/* Album art */}
              <img
                src={track.album.images[2]?.url || track.album.images[0]?.url}
                alt={track.name}
                className="w-12 h-12 rounded"
              />

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{track.name}</p>
                <p className="text-sm text-gray-400 truncate">
                  {track.artists.map((a) => a.name).join(', ')}
                </p>
              </div>

              {/* Duration */}
              <span className="text-sm text-gray-500">
                {formatDuration(track.duration_ms)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
