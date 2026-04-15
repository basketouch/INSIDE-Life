/**
 * Vercel Serverless — lee/escribe archivos del repo vía GitHub Contents API.
 *
 * URL: /api/github
 *
 * Vercel → Environment Variables:
 *   GITHUB_TOKEN      — PAT (fine-grained: repo INSIDE-Life, Contents R/W)
 *   ADMIN_API_SECRET  — mismo valor que ADMIN_PASS en admin.html (Bearer)
 *
 * GET  ?file=newsletter.html
 * PUT  JSON { file, content, sha?, message? }
 *       sha es opcional: omitir para crear archivo nuevo, incluir para actualizar.
 */

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const h = u.hostname;
    if (h === 'insidelife.club' || h === 'www.insidelife.club') return true;
    if (h.endsWith('.vercel.app')) return true;
  } catch (e) {
    return false;
  }
  return false;
}

function setCors(res, req) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res, req);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const TOKEN = process.env.GITHUB_TOKEN;
  const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

  if (!TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN no configurado en Vercel' });
  }
  if (!ADMIN_SECRET) {
    return res.status(500).json({ error: 'ADMIN_API_SECRET no configurado en Vercel' });
  }

  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (bearer !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const OWNER = 'basketouch';
  const REPO = 'INSIDE-Life';
  const base = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  if (req.method === 'GET') {
    const file = (req.query && req.query.file) || 'newsletter.html';
    if (file.includes('..') || file.startsWith('/')) {
      return res.status(400).json({ error: 'Nombre de archivo no válido' });
    }
    const r = await fetch(`${base}/${encodeURIComponent(file)}`, { headers });
    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: 'No se pudo leer el archivo', detail: errText });
    }
    const data = await r.json();
    if (!data.content) {
      return res.status(500).json({ error: 'Respuesta GitHub sin contenido' });
    }
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return res.status(200).json({ content, sha: data.sha });
  }

  if (req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}');
      } catch (e) {
        return res.status(400).json({ error: 'JSON inválido' });
      }
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Cuerpo requerido' });
    }
    const { file, content, sha, message } = body;
    if (!file || typeof content !== 'string') {
      return res.status(400).json({ error: 'Faltan file o content' });
    }
    if (file.includes('..') || String(file).startsWith('/')) {
      return res.status(400).json({ error: 'Nombre de archivo no válido' });
    }
    const encoded = Buffer.from(content, 'utf8').toString('base64');
    const githubBody = {
      message: message || `Update ${file}`,
      content: encoded,
    };
    if (sha) githubBody.sha = sha;
    const r = await fetch(`${base}/${encodeURIComponent(file)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(githubBody),
    });
    if (!r.ok) {
      let err;
      try {
        err = await r.json();
      } catch (e) {
        err = { message: await r.text() };
      }
      return res.status(r.status).json({ error: err.message || 'GitHub rechazó la escritura', detail: err });
    }
    const ok = await r.json();
    return res.status(200).json({ ok: true, commit: ok.commit && ok.commit.sha });
  }

  return res.status(405).json({ error: 'Método no permitido' });
};
