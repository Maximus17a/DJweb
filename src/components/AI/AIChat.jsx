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
    { from: 'ai', text: 'Hola — soy tu DJ asistente. Puedo "optimizar" la cola o hacer una "mezcla" profesional.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [remoteEnabled, setRemoteEnabled] = useState(true);

  const push = (from, text) => setMessages((m) => [...m, { from, text }]);

  const parseAndRun = async (text) => {
    const t = text.toLowerCase().trim();

    if (t.includes('activar ia') || t.includes('activar ai')) {
      toggleAIMode();
      push('ai', `IA ${isAIMode ? 'desactivada' : 'activada'}`);
      return;
    }

    if (t.includes('desactivar ia') || t.includes('desactivar ai')) {
      toggleAIMode();
      push('ai', `IA ${isAIMode ? 'desactivada' : 'activada'}`);
      return;
    }

    if (t.includes('limpiar')) {
      clearQueue();
      push('ai', 'Cola limpiada');
      return;
    }

    // Comandos de navegación y mezcla
    if (t.includes('siguiente') || t.includes('next') || t.includes('mezcla') || t.includes('mix')) {
      // Si el usuario pide explícitamente "mezclar" o "mix"
      if (t.includes('mezcla') || t.includes('mix')) {
        setBusy(true);
        push('ai', 'Analizando BPM y energía para transición profesional...');
        try {
          await performSmartMix();
          push('ai', 'Transición de DJ completada.');
        } catch (error) {
          console.error(error);
          push('ai', 'No se pudo realizar la mezcla inteligente. Saltando normal.');
          nextTrack();
        } finally {
          setBusy(false);
        }
      } else {
        // Solo siguiente normal
        nextTrack();
        push('ai', 'Siguiente track');
      }
      return;
    }

    if (t.includes('anterior') || t.includes('prev')) {
      previousTrack();
      push('ai', 'Track anterior');
      return;
    }

    // Optimizar con flow types
    if (t.includes('optimizar')) {
      let flow = 'maintain';
      if (t.includes('build') || t.includes('subida') || t.includes('aumentar')) flow = 'build_up';
      if (t.includes('cool') || t.includes('bajar') || t.includes('enfriar')) flow = 'cool_down';

      setBusy(true);
      push('ai', `Optimizando la cola (modo: ${flow})...`);
      try {
        await optimizeQueueWithAI(flow);
        push('ai', 'Optimización completada');
      } catch (err) {
        console.warn('AI optimize error:', err);
        push('ai', 'No se pudo optimizar la cola. Revisa la consola.');
      } finally {
        setBusy(false);
      }

      return;
    }

    push('ai', 'No entendí el comando. Prueba: "haz una mezcla", "optimizar", "siguiente", "activar ia"');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    push('user', text);
    setInput('');

    // First try to detect and run direct commands locally
    const lower = text.toLowerCase();
    const isCommand = /\b(optimizar|limpiar|siguiente|anterior|activar ia|activar ai|desactivar ia|desactivar ai|mezcla|mix)\b/.test(lower);
    if (isCommand) {
      await parseAndRun(text);
      return;
    }

    // If remote is disabled (e.g. exhausted quota), inform user
    if (!remoteEnabled) {
      push('ai', 'Las llamadas remotas están desactivadas. Puedes usar comandos locales (ej: mezcla, optimizar).');
      return;
    }

    // Otherwise, send to AI backend for natural language response
    push('ai', 'Consultando al modelo...');
    setBusy(true);
    try {
      const resp = await fetch('/api/ai_groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.warn('AI endpoint error', err);
        const code = err && (err.code || err.error?.code) ? (err.code || err.error?.code) : null;
        if (code === 'insufficient_quota' || (err.details && String(err.details).toLowerCase().includes('insufficient_quota'))) {
          push('ai', 'Error de cuota. Llamadas remotas desactivadas.');
          setRemoteEnabled(false);
        } else {
          push('ai', 'Error consultando al modelo. Intenta más tarde.');
        }
      } else {
        const data = await resp.json();
        const reply = data.reply || '';
        push('ai', reply);

        // Post-processing: if model suggested an ACTION
        const actionMatch = reply.match(/ACTION:\s*(\w+[\w_-]*)/i);
        if (actionMatch) {
          const action = actionMatch[1].toLowerCase();
          if (action.startsWith('optimizar')) {
            const parts = action.split('_');
            const flow = parts[1] || 'maintain';
            await optimizeQueueWithAI(flow);
            push('ai', `Acción ejecutada: optimizar (${flow})`);
          } else if (action.includes('mezcla') || action.includes('mix')) {
             await performSmartMix();
             push('ai', 'Acción ejecutada: Mezcla inteligente');
          } else if (action.includes('siguiente')) {
             nextTrack();
          }
        }
      }
    } catch (err) {
      console.warn('AI chat error', err);
      push('ai', 'Error comunicándose con el servidor de IA.');
    } finally {
      setBusy(false);
    }
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