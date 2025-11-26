import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export default function AIChat() {
  const { 
    optimizeQueueWithAI, 
    toggleAIMode, 
    clearQueue, 
    nextTrack, 
    previousTrack, 
    isAIMode, 
    performSmartMix 
  } = usePlayer();
  
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Hola — soy tu DJ asistente. Escribe "haz una mezcla" para una transición profesional.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const push = (from, text) => setMessages((m) => [...m, { from, text }]);

  const parseAndRun = async (text) => {
    const t = text.toLowerCase().trim();

    if (t.includes('activar ia')) { toggleAIMode(); push('ai', `IA ${isAIMode ? 'OFF' : 'ON'}`); return; }
    if (t.includes('limpiar')) { clearQueue(); push('ai', 'Cola limpiada'); return; }

    // COMANDO MEZCLA
    if (t.includes('mezcla') || t.includes('mix')) {
        setBusy(true);
        push('ai', 'Analizando pistas...');
        try {
            await performSmartMix();
            push('ai', 'Mezcla realizada.');
        } catch (error) {
            console.error(error);
            push('ai', 'Error en la mezcla.');
        } finally {
            setBusy(false);
        }
        return;
    }

    if (t.includes('siguiente')) { nextTrack(); push('ai', 'Siguiente'); return; }
    if (t.includes('anterior')) { previousTrack(); push('ai', 'Anterior'); return; }

    // OPTIMIZAR
    if (t.includes('optimizar')) {
      setBusy(true);
      push('ai', 'Optimizando cola...');
      try {
        await optimizeQueueWithAI('maintain');
        push('ai', 'Cola optimizada.');
      } catch {
        push('ai', 'Error al optimizar.');
      } finally {
        setBusy(false);
      }
      return;
    }

    push('ai', 'Comando no reconocido. Prueba: "haz una mezcla", "optimizar", "siguiente".');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    push('user', text);
    setInput('');
    await parseAndRun(text);
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-neon-purple" />
        <h3 className="font-bold">Chat IA</h3>
      </div>
      <div className="max-h-40 overflow-y-auto mb-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.from === 'ai' ? 'text-gray-300' : 'text-white'}`}>
            <strong className="mr-2 text-xs uppercase text-neon-purple">{m.from}</strong>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="input-neon flex-1"
          placeholder="Escribe un comando..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button onClick={handleSend} disabled={busy} className="btn-neon px-4">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}