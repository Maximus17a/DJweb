import { Buffer } from 'node:buffer';

/*
  Vercel serverless proxy para Groq API.
*/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { message, mode, trackData } = req.body || {};
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_KEY) {
    res.status(500).json({ error: 'Groq API key not configured' });
    return;
  }

  try {
    let systemPrompt = 'Eres un DJ asistente. Responde en español.';
    let userContent = message;

    // MODO DJ PROFESIONAL
    if (mode === 'dj_mix') {
      systemPrompt = `
        Eres un DJ Profesional experto en mezcla armónica y control de energía.
        Vas a recibir datos de la canción ACTUAL y la SIGUIENTE.
        
        Tu tarea es decidir cómo hacer la transición perfecta.
        Devuelve SOLO un objeto JSON con este formato (sin texto adicional):
        {
          "transitionType": "smooth" | "cut" | "long_fade",
          "fadeDuration": número (en milisegundos, entre 2000 y 10000),
          "rationale": "Breve explicación de por qué elegiste esto (ej: cambio drástico de BPM requiere corte rápido)"
        }
      `;
      
      userContent = `
        Canción Actual: ${trackData.current.name} (BPM: ${trackData.current.bpm}, Energy: ${trackData.current.energy})
        Canción Siguiente: ${trackData.next.name} (BPM: ${trackData.next.bpm}, Energy: ${trackData.next.energy})
      `;
    } 
    else {
      systemPrompt = 'Eres un DJ asistente. Si recibes una instrucción clara, responde con texto y ACTION: [accion].';
    }

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: mode === 'dj_mix' ? 150 : 300,
      temperature: 0.5,
      response_format: mode === 'dj_mix' ? { type: "json_object" } : undefined
    };

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      throw new Error(await r.text());
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || '';
    
    if (mode === 'dj_mix') {
      try {
        const mixData = JSON.parse(reply);
        return res.status(200).json({ mixData });
      } catch (e) {
        console.error('Error parsing JSON:', e);
        return res.status(200).json({ mixData: { transitionType: 'smooth', fadeDuration: 5000, rationale: 'Fallback' } });
      }
    }

    res.status(200).json({ reply });

  } catch (err) {
    console.error('AI proxy error', err);
    res.status(500).json({ error: 'Server error' });
  }
}