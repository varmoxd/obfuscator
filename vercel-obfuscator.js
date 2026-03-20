// api/obfuscator.js — проксирует на Railway IronBrew сервер
const RAILWAY_URL = process.env.IRONBREW_API_URL || 'https://your-app.railway.app';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let code = '';
    if (req.method === 'POST') {
        code = req.body?.code || '';
    } else if (req.method === 'GET') {
        code = req.query?.code || '';
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!code.trim()) return res.status(400).json({ error: 'No code provided' });

    try {
        const upstream = await fetch(`${RAILWAY_URL}/obfuscate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
            signal: AbortSignal.timeout(35000)
        });
        const data = await upstream.json();
        return res.status(upstream.status).json(data);
    } catch (e) {
        return res.status(500).json({ error: 'IronBrew API unreachable: ' + e.message });
    }
}
