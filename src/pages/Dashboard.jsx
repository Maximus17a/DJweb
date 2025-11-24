import { useState } from 'react';
import { Plus } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import BackgroundEffect from '../components/Layout/BackgroundEffect';
import SearchBar from '../components/Library/SearchBar';
import WebPlayback from '../components/Player/WebPlayback';
import QueueManager from '../components/AI/QueueManager';
import { usePlayer } from '../context/PlayerContext';
import { getAudioFeatures } from '../services/spotifyApi';

export default function Dashboard() {
  const { addToQueue } = usePlayer();
  const [notification, setNotification] = useState(null);

  const handleTrackSelect = async (track) => {
    try {
      let trackWithFeatures = { ...track };
      
      try {
        // Intentar obtener audio features
        const features = await getAudioFeatures(track.id);
        trackWithFeatures.audioFeatures = features;
      } catch (featureError) {
        console.warn('Could not fetch audio features, adding track without AI data:', featureError);
        // Continuar sin features
        trackWithFeatures.audioFeatures = {
          tempo: 0,
          energy: 0,
          key: 0,
          mode: 1,
          danceability: 0
        };
      }

      await addToQueue(trackWithFeatures);
      
      // Mostrar notificación
      setNotification(`"${track.name}" añadida a la cola`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error adding track:', error);
      setNotification('Error al añadir la canción');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-darker">
      <BackgroundEffect />
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda: Búsqueda y Cola */}
          <div className="lg:col-span-2 space-y-6">
            {/* Búsqueda */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-neon-purple" />
                <h2 className="text-xl font-bold">Añadir Música</h2>
              </div>
              <SearchBar onTrackSelect={handleTrackSelect} />
            </div>

            {/* Cola de reproducción */}
            <QueueManager />
          </div>

          {/* Columna derecha: Reproductor */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <WebPlayback />
            </div>
          </div>
        </div>
      </main>

      {/* Notificación flotante */}
      {notification && (
        <div className="fixed bottom-8 right-8 glass px-6 py-4 rounded-lg shadow-xl animate-pulse z-50">
          <p className="text-sm">{notification}</p>
        </div>
      )}
    </div>
  );
}
