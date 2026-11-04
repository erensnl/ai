// Evren API proxy (Vercel Serverless Function)
// /api/evren-api/models            -> https://evren.ssyz.org.tr/llm/models
// /api/evren-api/chat/completions  -> https://evren.ssyz.org.tr/llm/chat/completions

const UPSTREAM = 'https://evren.ssyz.org.tr/llm';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const path = [].concat(req.query.path || []).join('/');
  const target = `${UPSTREAM}/${path}`;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    let body;
    if (req.method === 'POST') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({
      error: 'Evren sunucusuna ulaşılamadı',
      target,
      detail: err.message,
    });
  }
};
