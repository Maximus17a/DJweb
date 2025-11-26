import { useState } from 'react';
import { Plus } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import BackgroundEffect from '../components/Layout/BackgroundEffect';
import SearchBar from '../components/Library/SearchBar';
import WebPlayback from '../components/Player/WebPlayback';
import QueueManager from '../components/AI/QueueManager';
import AIChat from '../components/AI/AIChat';
import Recommendations from '../components/Library/Recommendations'; // <--- 1. IMPORTAR
import { usePlayer } from '../context/PlayerContext';

export default function Dashboard() {
  const { addToQueue } = usePlayer();
  const [notification, setNotification] = useState(null);

  const handleTrackSelect = async (track) => {
    try {
      let trackWithFeatures = { ...track };
      // Asignamos valores base (se rellenarán con IA al optimizar)
      trackWithFeatures.audioFeatures = {
        tempo: 0,
        energy: 0,
        key: 0,
        mode: 1,
        danceability: 0
      };

      await addToQueue(trackWithFeatures);
      
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
          {/* Columna izquierda: Búsqueda, Chat y Cola */}
          <div className="lg:col-span-2 space-y-6">
            {/* Búsqueda */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-neon-purple" />
                <h2 className="text-xl font-bold">Añadir Música</h2>
              </div>
              <SearchBar onTrackSelect={handleTrackSelect} />
            </div>

            {/* Chat IA */}
            <AIChat />

            {/* Cola de reproducción */}
            <QueueManager />
          </div>

          {/* Columna derecha: Reproductor y RECOMENDACIONES */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6"> {/* Añadido space-y-6 para separar */}
              
              <WebPlayback />
              
              {/* --- AQUÍ ESTÁ EL NUEVO COMPONENTE --- */}
              <Recommendations />
              
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