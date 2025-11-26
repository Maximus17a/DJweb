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
    { from: 'ai', text: 'Hola — soy tu DJ asistente. Escribe "haz una mezcla" para que analice la estructura y haga una transición perfecta.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  
  // Estado para controlar si el chat remoto está activo
  const [remoteEnabled, setRemoteEnabled] = useState(true);

  const push = (from, text) => setMessages((m) => [...m, { from, text }]);

  const parseAndRun = async (text) => {
    const t = text.toLowerCase().trim();

    // --- COMANDOS BÁSICOS ---

    if (t.includes('activar ia') || t.includes('activar ai')) {
      toggleAIMode();
      push('ai', `IA Auto-Mix ${isAIMode ? 'desactivada' : 'activada'}`);
      return;
    }

    if (t.includes('desactivar ia') || t.includes('desactivar ai')) {
      if (isAIMode) toggleAIMode();
      push('ai', 'IA desactivada.');
      return;
    }

    if (t.includes('limpiar')) {
      clearQueue();
      push('ai', 'Cola limpiada.');
      return;
    }

    // --- COMANDO DE SUPER MEZCLA (DJ MODE) ---
    if (t.includes('mezcla') || t.includes('mix') || t.includes('transición') || t.includes('drop')) {
      setBusy(true);
      push('ai', '🎧 Analizando estructura, letras y ritmo para la transición...');
      
      try {
        const rationale = await performSmartMix();
        
        if (rationale) {
          push('ai', `🎚️ Mezcla Realizada: "${rationale}"`);
        } else if (rationale === "Autoplay activado") {
          push('ai', 'Fin de la cola. Buscando música similar automáticamente...');
        } else {
          push('ai', 'Transición completada.');
        }
      } catch (error) {
        console.error(error);
        push('ai', 'Hubo un error técnico. Hice un cambio estándar.');
        nextTrack();
      } finally {
        setBusy(false);
      }
      return;
    }

    // --- NAVEGACIÓN ESTÁNDAR ---
    if (t.includes('siguiente') || t.includes('next')) {
      nextTrack();
      push('ai', 'Siguiente track (Corte estándar).');
      return;
    }

    if (t.includes('anterior') || t.includes('prev')) {
      previousTrack();
      push('ai', 'Track anterior.');
      return;
    }

    // --- OPTIMIZACIÓN DE COLA ---
    if (t.includes('optimizar')) {
      let flow = 'maintain';
      if (t.includes('subida') || t.includes('arriba')) flow = 'build_up';
      if (t.includes('bajada') || t.includes('abajo')) flow = 'cool_down';

      setBusy(true);
      push('ai', `Analizando musicalmente la cola (Modo: ${flow})...`);
      try {
        await optimizeQueueWithAI(flow);
        push('ai', '✅ Cola reordenada armónicamente.');
      } catch (err) {
        console.warn(err);
        push('ai', 'No se pudo optimizar la cola.');
      } finally {
        setBusy(false);
      }
      return;
    }

    push('ai', 'No entendí. Prueba: "haz una mezcla", "optimizar", "siguiente" o "activar ia".');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    push('user', text);
    setInput('');

    // 1. Intentar ejecutar comando local primero
    const lower = text.toLowerCase();
    const isCommand = /\b(optimizar|limpiar|siguiente|anterior|activar|desactivar|mezcla|mix|drop|transición)\b/.test(lower);
    
    if (isCommand) {
      await parseAndRun(text);
      return;
    }

    // 2. Si no es comando directo, hablar con la IA (Chat Mode)
    if (!remoteEnabled) {
      push('ai', 'Modo chat desactivado por errores previos. Usa comandos directos.');
      return;
    }

    push('ai', 'Pensando...');
    setBusy(true);
    
    try {
      const resp = await fetch('/api/ai_groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!resp.ok) throw new Error('Error API');

      const data = await resp.json();
      const reply = data.reply || '';
      push('ai', reply);

      // 3. Ejecutar acciones sugeridas por el chat
      const actionMatch = reply.match(/ACTION:\s*(\w+[\w_-]*)/i);
      if (actionMatch) {
        const action = actionMatch[1].toLowerCase();
        if (action.includes('mezcla') || action.includes('mix')) {
           await performSmartMix();
           push('ai', '🎚️ Ejecutando mezcla sugerida...');
        } else if (action.includes('optimizar')) {
           await optimizeQueueWithAI('maintain');
           push('ai', '✅ Optimizando cola...');
        } else if (action.includes('siguiente')) {
           nextTrack();
        }
      }
    } catch (err) {
      // CORREGIDO: Usamos 'err' y 'setRemoteEnabled'
      console.error('AI Connection Error:', err);
      push('ai', 'Error de conexión con la IA. Desactivando chat remoto temporalmente.');
      setRemoteEnabled(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-xl p-4 flex flex-col h-[300px]">
      <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
        <MessageSquare className="w-5 h-5 text-neon-purple" />
        <h3 className="font-bold">DJ Assistant</h3>
        {busy && <span className="text-xs text-neon-cyan animate-pulse ml-auto">Procesando...</span>}
      </div>

      <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-2 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.from === 'ai' ? 'text-gray-300' : 'text-white text-right'}`}>
            <div className={`inline-block p-2 rounded-lg ${m.from === 'ai' ? 'bg-white/5' : 'bg-neon-purple/20'}`}>
              {m.from === 'ai' && <strong className="block text-xs text-neon-cyan mb-1">NEON DJ</strong>}
              <span>{m.text}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-auto">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="input-neon flex-1 text-sm"
          placeholder='Escribe "haz una mezcla"...'
          disabled={busy}
          onKeyDown={(e) => { if (e.key === 'Enter' && !busy) handleSend(); }}
        />
        <button 
          onClick={handleSend} 
          disabled={busy} 
          className="p-2 bg-neon-purple/20 hover:bg-neon-purple/40 rounded-lg transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}