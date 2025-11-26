import { Buffer } from 'node:buffer';

/*
  Vercel serverless proxy para Groq API.
*/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { message, mode, trackData, tracks } = req.body || {}; // Añadimos 'tracks'
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_KEY) {
    res.status(500).json({ error: 'Groq API key not configured' });
    return;
  }

  try {
    let systemPrompt = 'Eres un DJ asistente experto musical.';
    let userContent = message;
    let max_tokens = 500;
    let temp = 0.5;

    // --- MODO 1: DJ MIX (Decisión de transición) ---
    if (mode === 'dj_mix') {
      systemPrompt = `
        Eres un DJ Profesional. Analiza la transición entre dos canciones.
        Devuelve SOLO JSON:
        {
          "transitionType": "smooth" | "cut" | "long_fade",
          "fadeDuration": ms (2000-10000),
          "rationale": "explicación breve"
        }
      `;
      userContent = `Actual: ${trackData.current.name} (${trackData.current.bpm} BPM, ${trackData.current.energy} Energy)
                     Siguiente: ${trackData.next.name} (${trackData.next.bpm} BPM, ${trackData.next.energy} Energy)`;
      max_tokens = 200;
      temp = 0.3;
    } 
    
    // --- MODO 2: ANÁLISIS DE PISTAS (NUEVO) ---
    else if (mode === 'analyze_tracks') {
      systemPrompt = `
        Eres un musicólogo experto. Tu tarea es estimar el BPM, Energía (0.0-1.0) y Tonalidad (0-11, Key Camelot) de una lista de canciones basándote en tu conocimiento.
        
        Devuelve SOLO un objeto JSON donde las claves sean los IDs proporcionados y los valores sean los datos estimados.
        Formato:
        {
          "track_id_1": { "tempo": 120, "energy": 0.8, "key": 5 },
          "track_id_2": { "tempo": 90, "energy": 0.4, "key": 0 }
        }
        
        Sé preciso. Si no conoces la canción exacta, estima basándote en el artista y el género probable.
      `;
      
      // Convertimos la lista de tracks a un string legible para la IA
      const trackListString = tracks.map(t => `ID: "${t.id}" | Canción: "${t.name}" | Artista: "${t.artist}"`).join('\n');
      userContent = `Analiza estas canciones:\n${trackListString}`;
      max_tokens = 1000; // Necesitamos espacio para devolver muchos datos
      temp = 0.1; // Temperatura baja para ser más "fáctico"
    }
    
    // --- MODO 3: CHAT NORMAL ---
    else {
      systemPrompt = 'Eres un DJ asistente. Si hay una orden clara, añade ACTION: [accion] al final.';
    }

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: max_tokens,
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
    
    // Parseo de JSON para modos técnicos
    if (mode === 'dj_mix' || mode === 'analyze_tracks') {
      try {
        const parsedData = JSON.parse(reply);
        // Devolvemos la data bajo una clave genérica o específica según el modo
        return res.status(200).json(mode === 'dj_mix' ? { mixData: parsedData } : { features: parsedData });
      } catch (e) {
        console.error('Error parsing AI JSON:', e, reply);
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }
    }

    res.status(200).json({ reply });

  } catch (err) {
    console.error('AI proxy error', err);
    res.status(500).json({ error: 'Server error' });
  }
}