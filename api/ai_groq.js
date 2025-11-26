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
        Eres un DJ de Clase Mundial. Tu tarea es crear una transición perfecta y profesional.
        Tu objetivo es mantener el "flow" de la fiesta.
        
        **Instrucciones de DJ:**
        1. **Análisis Mental (Simulado):** Considera el BPM, la tonalidad (Key) y la energía de ambas pistas.
        2. **Estrategia de Mezcla:** Decide el tipo de transición (corte, fundido rápido, fundido suave) y el punto de entrada (Cue Point) de la pista entrante.
        3. **Output:** Devuelve **SOLO** un objeto JSON.

        **Formato de Salida (JSON):**
        {
          "transitionType": "smooth" | "cut" | "fast_fade",
          "fadeDuration": número (ms, 2000-10000),
          "cuePoint": número (segundos, default 0),
          "rationale": "Explicación breve y profesional de tu decisión de mezcla, mencionando el BPM/Key simulado."
        }
      `;
      
      userContent = `
        Pista Saliente: "${trackData.current.name}" de ${trackData.current.artist}
        Pista Entrante: "${trackData.next.name}" de ${trackData.next.artist}
        
        Instrucción: Actúa como un DJ real. Analiza la estructura, el BPM, la tonalidad y la energía de estas dos pistas (simulando tu conocimiento musical) y genera la estrategia de mezcla en formato JSON.
      `;
      max_tokens = 350;
      temp = 0.4;
    } 
    
    // --- MODO 2: ANÁLISIS DE PISTAS ---
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
        // SOLUCIÓN: Usamos la variable 'e' para loguear el error
        console.error('Error parsing AI JSON:', e);
        return res.status(200).json({ mixData: { transitionType: 'smooth', fadeDuration: 5000, cuePoint: 0, rationale: 'Fallback por error de formato.' } });
      }
    }

    res.status(200).json({ reply });

  } catch (err) {
    console.error('AI proxy error', err);
    res.status(500).json({ error: 'Server error' });
  }
}