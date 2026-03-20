const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const execAsync = promisify(exec);

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
const DLL    = path.join(IB_DIR, 'IronBrew2 CLI.dll');

// IronBrew читает input.txt и пишет результат в out.lua — всё в своей папке
const IB_INPUT  = path.join(IB_DIR, 'input.txt');
const IB_OUTPUT = path.join(IB_DIR, 'out.lua');

// Мьютекс — только один запрос за раз (IronBrew пишет в фиксированные файлы)
let busy = false;

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/obfuscate', async (req, res) => {
    const code = req.body?.code || '';
    if (!code.trim()) return res.status(400).json({ error: 'No code provided' });
    if (code.length > 100000) return res.status(400).json({ error: 'Code too large (max 100KB)' });

    if (busy) return res.status(429).json({ error: 'Server busy, try again in a moment' });
    busy = true;

    try {
        // Записываем код в input.txt
        fs.writeFileSync(IB_INPUT, code, 'utf8');

        // Удаляем старый out.lua если есть
        try { fs.unlinkSync(IB_OUTPUT); } catch {}

        // Запускаем IronBrew
        const { stdout, stderr } = await execAsync(`dotnet "IronBrew2 CLI.dll" "input.txt"`, {
            cwd: IB_DIR,
            timeout: 30000
        });

        console.log('stdout:', stdout);
        console.log('stderr:', stderr);

        // Проверяем вывод
        if (!fs.existsSync(IB_OUTPUT)) {
            return res.status(500).json({ error: 'IronBrew produced no output', stdout, stderr });
        }

        const result = fs.readFileSync(IB_OUTPUT, 'utf8').trim();
        if (!result) {
            return res.status(500).json({ error: 'IronBrew output is empty', stdout, stderr });
        }

        return res.json({ success: true, result, size: result.length });

    } catch (e) {
        console.error('Error:', e.message);
        return res.status(500).json({ error: 'Obfuscation failed: ' + e.message });
    } finally {
        busy = false;
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`IronBrew API running on port ${PORT}`));
