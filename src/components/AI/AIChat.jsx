import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export default function AIChat() {
  const { optimizeQueueWithAI, toggleAIMode, clearQueue, nextTrack, previousTrack, isAIMode } = usePlayer();
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Hola — dime qué quieres que haga. Ej: "optimizar", "activar ia", "limpiar cola", "siguiente"' },
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

    if (t.includes('siguiente')) {
      nextTrack();
      push('ai', 'Siguiente track');
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

    push('ai', 'No entendí el comando. Prueba: optimizar, limpiar, siguiente, activar ia');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    push('user', text);
    setInput('');

    // First try to detect and run direct commands locally
    const lower = text.toLowerCase();
    const isCommand = /\b(optimizar|limpiar|siguiente|anterior|activar ia|activar ai|desactivar ia|desactivar ai)\b/.test(lower);
    if (isCommand) {
      await parseAndRun(text);
      return;
    }

    // If remote is disabled (e.g. exhausted quota), inform user
    if (!remoteEnabled) {
      push('ai', 'Las llamadas remotas están desactivadas debido a problemas con la API. Puedes usar comandos locales (ej: optimizar, limpiar, siguiente).');
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
        // If OpenAI indicates insufficient_quota, disable remote and inform user
        const code = err && (err.code || err.error?.code) ? (err.code || err.error?.code) : null;
        if (code === 'insufficient_quota' || (err.details && String(err.details).toLowerCase().includes('insufficient_quota'))) {
          push('ai', 'La cuota de OpenAI se ha agotado. He desactivado las llamadas remotas. Añade otra API key o configura facturación.');
          setRemoteEnabled(false);
        } else {
          push('ai', 'Error consultando al modelo. Intenta más tarde.');
        }
      } else {
        const data = await resp.json();
        const reply = data.reply || '';
        push('ai', reply);

        // Simple post-processing: if model suggested an ACTION: line, execute it
        const actionMatch = reply.match(/ACTION:\s*(\w+[\w_-]*)/i);
        if (actionMatch) {
          const action = actionMatch[1].toLowerCase();
          if (action.startsWith('optimizar')) {
            // allow 'optimizar_build_up' or similar
            const parts = action.split('_');
            const flow = parts[1] || 'maintain';
            try {
              await optimizeQueueWithAI(flow);
              push('ai', `Acción ejecutada: optimizar (${flow})`);
            } catch (err) {
              console.warn('Error ejecutando acción del modelo', err);
              push('ai', 'No se pudo ejecutar la acción sugerida.');
            }
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
