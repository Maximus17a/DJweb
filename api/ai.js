/*
  Simple Vercel / serverless proxy for OpenAI Chat completions.
  Expects environment variable OPENAI_API_KEY to be set in deployment.

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

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    res.status(500).json({ error: 'OpenAI API key not configured on server' });
    return;
  }

  try {
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Eres un DJ asistente que ayuda a optimizar y mezclar pistas. Responde en español. Si recibes una instrucción clara de acción (ej: optimizar, siguiente, limpiar), responde con texto y además incluye una línea con la etiqueta ACTION: seguido de la acción sugerida en formato simple.' },
        { role: 'user', content: message },
      ],
      max_tokens: 300,
      temperature: 0.7,
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.warn('OpenAI error:', r.status, errText);
      res.status(502).json({ error: 'OpenAI API error', details: errText });
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
