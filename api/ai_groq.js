import { Buffer } from 'node:buffer';

/*
  Vercel serverless proxy para Groq API.
*/

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

    // --- MODO 1: SUPER DJ MIX ---
    if (mode === 'dj_mix') {
      systemPrompt = `
        Eres un DJ Profesional. Analiza la transición entre dos canciones.
        1. Análisis de Estructura: Busca drops o coros.
        2. Conexión Semántica: Temática de las letras.
        3. Sincronización: Cue points.

        Devuelve SOLO JSON:
        {
          "transitionType": "smooth" | "cut" | "fast_fade",
          "fadeDuration": número (ms, 2000-10000),
          "cuePoint": número (segundos, default 0),
          "rationale": "Explicación breve estilo DJ"
        }
      `;
      
      // Simplificamos analysis para ahorrar tokens
      const simplifyAnalysis = (analysis) => {
        if (!analysis || !analysis.sections) return "Sin datos.";
        return analysis.sections
          .filter(s => s.loudness > -10)
          .slice(0, 3)
          .map(s => `${Math.round(s.start)}s`)
          .join('|');
      };

      userContent = `
        Actual: ${trackData.current.name} (${trackData.current.bpm} BPM)
        Siguiente: ${trackData.next.name} (${trackData.next.bpm} BPM)
        Estructura: ${trackData.next.analysis ? simplifyAnalysis(trackData.next.analysis) : 'N/A'}
      `;
      max_tokens = 300;
      temp = 0.4;
    } 
    
    // --- MODO 2: ANÁLISIS DE PISTAS ---
    else if (mode === 'analyze_tracks') {
      systemPrompt = `
        Eres un musicólogo experto. Estima BPM, Energía (0.0-1.0) y Tonalidad (0-11) de estas canciones.
        Devuelve SOLO JSON donde la clave es el ID:
        {
          "track_id": { "tempo": 120, "energy": 0.8, "key": 5 }
        }
      `;
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) throw new Error(await r.text());

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || '';
    
    if (mode === 'dj_mix' || mode === 'analyze_tracks') {
      try {
        const parsed = JSON.parse(reply);
        return res.status(200).json(mode === 'dj_mix' ? { mixData: parsed } : { features: parsed });
      } catch (e) {
        console.error('Error parsing AI JSON:', e); // <--- AQUÍ USAMOS 'e'
        return res.status(200).json({ mixData: { transitionType: 'smooth', fadeDuration: 5000, rationale: 'Fallback' } });
      }
    }

    res.status(200).json({ reply });

  } catch (err) {
    console.error('AI proxy error', err);
    res.status(500).json({ error: 'Server error' });
  }
}