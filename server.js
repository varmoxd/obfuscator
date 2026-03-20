const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

const IB_DIR = path.join(__dirname, 'ironbrew');
const DLL = path.join(IB_DIR, 'IronBrew2 CLI.dll');

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/obfuscate', async (req, res) => {
    const code = req.body?.code || '';
    if (!code.trim()) return res.status(400).json({ error: 'No code provided' });
    if (code.length > 100000) return res.status(400).json({ error: 'Code too large (max 100KB)' });

    // Write input to temp file
    const id = crypto.randomBytes(8).toString('hex');
    const inputFile = path.join(os.tmpdir(), `ib_in_${id}.lua`);
    const outputFile = path.join(os.tmpdir(), `ib_out_${id}.lua`);

    try {
        fs.writeFileSync(inputFile, code, 'utf8');

        const cmd = `dotnet "${DLL}" "${inputFile}" "${outputFile}"`;

        await new Promise((resolve, reject) => {
            exec(cmd, { cwd: IB_DIR, timeout: 30000 }, (err, stdout, stderr) => {
                if (err) return reject(new Error(stderr || err.message));
                resolve();
            });
        });

        if (!fs.existsSync(outputFile)) {
            return res.status(500).json({ error: 'IronBrew produced no output' });
        }

        const result = fs.readFileSync(outputFile, 'utf8');
        return res.json({ success: true, result, size: result.length });

    } catch (e) {
        return res.status(500).json({ error: 'Obfuscation failed: ' + e.message });
    } finally {
        try { fs.unlinkSync(inputFile); } catch {}
        try { fs.unlinkSync(outputFile); } catch {}
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`IronBrew API running on port ${PORT}`));
