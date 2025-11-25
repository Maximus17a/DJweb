/*
  Vercel serverless proxy para Groq API (alternativa gratuita a OpenAI).
  
  Groq ofrece:
  - Plan gratuito generoso (14,400 requests/día)
  - Velocidad extremadamente rápida (LPU inference)
  - Compatible con OpenAI SDK
  - No requiere tarjeta de crédito
  
  Para obtener tu API key:
  1. Ve a https://console.groq.com/
  2. Crea una cuenta (solo email, sin tarjeta)
  3. Ve a "API Keys" y crea una nueva key
  4. Añade GROQ_API_KEY a las variables de entorno en Vercel
  
  POST body: { message: string }
  Response: { reply: string }
*/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { message } = req.body || {};
  if (!message) {
    res.status(400).json({ error: 'Missing message' });
    return;
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    res.status(500).json({ 
      error: 'Groq API key not configured on server',
      instructions: 'Obtén tu API key gratis en https://console.groq.com/keys'
    });
    return;
  }

  try {
    const payload = {
      model: 'llama-3.3-70b-versatile', // Modelo gratuito y potente
      messages: [
        { 
          role: 'system', 
          content: 'Eres un DJ asistente que ayuda a optimizar y mezclar pistas. Responde en español. Si recibes una instrucción clara de acción (ej: optimizar, siguiente, limpiar), responde con texto y además incluye una línea con la etiqueta ACTION: seguido de la acción sugerida en formato simple.' 
        },
        { role: 'user', content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
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
      const errText = await r.text();
      console.warn('Groq API error:', r.status, errText);
      let parsed = null;
      try { parsed = JSON.parse(errText); } catch (e) { /* ignore */ }
      const code = parsed?.error?.code || null;
      res.status(502).json({ error: 'Groq API error', details: errText, code });
      return;
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ reply });
  } catch (err) {
    console.error('AI proxy error', err);
    res.status(500).json({ error: 'Server error' });
  }
}
