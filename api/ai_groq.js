import { Buffer } from 'node:buffer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { message, mode, trackData, tracks } = req.body || {};
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_KEY) {
    res.status(500).json({ error: 'Groq API key not configured' });
    return;
  }

  try {
    let systemPrompt = 'Eres un DJ asistente experto musical.';
    let userContent = message;
    let max_tokens = 600;
    let temp = 0.5;

    // --- MODO 1: SUPER DJ MIX (100% IA - Sin datos de Spotify) ---
    if (mode === 'dj_mix') {
      systemPrompt = `
        Eres un DJ de Clase Mundial y Musicólogo. Tu tarea es crear una transición perfecta entre dos canciones basándote en tu conocimiento enciclopédico de ellas.

        NO necesitas datos externos. TÚ sabes cómo suenan estas canciones.

        1. **Análisis Mental**:
           - ¿De qué tratan las letras? (Busca conexiones: amor, fiesta, noche, soledad).
           - ¿Cómo es la estructura? (Intro larga, empieza directo con golpe, tiene un drop famoso).
           - ¿Cuál es el "Vibe"? (Energía, género).

        2. **Decisión de Mezcla**:
           - **Cue Point**: Estima en qué segundo (aprox) la canción entrante se pone buena (ej: saltar la intro hablada).
           - **Tipo**: ¿Corte rápido (Cut) para cambio de ritmo? ¿Suave (Smooth) para mismo género?

        Devuelve SOLO un objeto JSON con este formato:
        {
          "transitionType": "smooth" | "cut" | "fast_fade",
          "fadeDuration": número (milisegundos, entre 2000 y 10000),
          "cuePoint": número (segundos donde empezar la siguiente canción, por defecto 0),
          "rationale": "Explica tu mezcla como un locutor de radio. Menciona la conexión de las letras o el ritmo."
        }
      `;
      
      userContent = `
        [CANCIÓN SALIENTE]
        "${trackData.current.name}" por ${trackData.current.artist}
        
        [CANCIÓN ENTRANTE]
        "${trackData.next.name}" por ${trackData.next.artist}
        
        Instrucción: Analiza la estructura y letra de estas canciones específicas y dime cómo mezclarlas.
      `;
      
      max_tokens = 350;
      temp = 0.4; // Creatividad media
    } 
    
    // --- MODO 2: ANÁLISIS DE PISTAS (Ya lo tenías, lo mantenemos igual) ---
    else if (mode === 'analyze_tracks') {
      systemPrompt = `Eres musicólogo. Estima BPM, Energía (0-1) y Key (0-11). JSON { "id": { "tempo": 120, "energy": 0.8, "key": 5 } }`;
      const trackListString = tracks.map(t => `ID: "${t.id}" | "${t.name}" - "${t.artist}"`).join('\n');
      userContent = trackListString;
      max_tokens = 1000;
      temp = 0.1;
    }
    
    else {
      systemPrompt = 'Eres un DJ asistente. Responde con texto.';
    }

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens,
      temperature: temp,
      response_format: (mode === 'dj_mix' || mode === 'analyze_tracks') ? { type: "json_object" } : undefined
    };

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify(payload),
    });

    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || '';
    
    if (mode === 'dj_mix' || mode === 'analyze_tracks') {
      try {
        const parsed = JSON.parse(reply);
        // Devolvemos la estructura esperada
        return res.status(200).json(mode === 'dj_mix' ? { mixData: parsed } : { features: parsed });
      } catch (e) {
        console.error('Error parsing JSON:', e);
        return res.status(200).json({ mixData: { transitionType: 'smooth', fadeDuration: 5000, cuePoint: 0, rationale: 'Mezcla estándar.' } });
      }
    }

    res.status(200).json({ reply });

  } catch (err) {
    console.error('AI proxy error', err);
    res.status(500).json({ error: 'Server error' });
  }
}