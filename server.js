const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ana sayfayı serve et
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Varsayılan veri yapısı
const DEFAULT_DATA = {
    members: [],
    stock: [],
    distributions: [],
    financial: []
};

// Veri dosyasını oku
async function readData() {
    try {
        const exists = await fs.pathExists(DATA_FILE);
        if (!exists) {
            await fs.ensureDir(path.dirname(DATA_FILE));
            await fs.writeJson(DATA_FILE, DEFAULT_DATA, { spaces: 2 });
            return DEFAULT_DATA;
        }
        return await fs.readJson(DATA_FILE);
    } catch (error) {
        console.error('Veri okuma hatası:', error);
        return DEFAULT_DATA;
    }
}

// Veri dosyasına yaz
async function writeData(data) {
    try {
        await fs.ensureDir(path.dirname(DATA_FILE));
        await fs.writeJson(DATA_FILE, data, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('Veri yazma hatası:', error);
        return false;
    }
}

// API Routes
app.get('/api/data', async (req, res) => {
    try {
        const data = await readData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        const newData = req.body;
        const success = await writeData(newData);
        if (success) {
            res.json({ success: true, message: 'Veriler başarıyla kaydedildi' });
        } else {
            res.status(500).json({ success: false, error: 'Veri kaydedilemedi' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Veri yedekleme endpoint'i
app.get('/api/backup', async (req, res) => {
    try {
        const data = await readData();
        const backupPath = path.join(__dirname, 'backups', `backup-${new Date().toISOString().split('T')[0]}.json`);
        await fs.ensureDir(path.dirname(backupPath));
        await fs.writeJson(backupPath, data, { spaces: 2 });
        res.json({ success: true, message: 'Yedekleme başarılı', path: backupPath });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Veri yükleme endpoint'i
app.post('/api/restore', async (req, res) => {
    try {
        const { data } = req.body;
        const success = await writeData(data);
        if (success) {
            res.json({ success: true, message: 'Veri geri yükleme başarılı' });
        } else {
            res.status(500).json({ success: false, error: 'Veri geri yüklenemedi' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Şifre yönetimi için ek endpoint'ler
const PASSWORD_FILE = path.join(__dirname, 'data', 'passwords.json');

const DEFAULT_PASSWORDS = {
    admin: 'admin123',
    viewer: 'goruntule123'
};

async function readPasswords() {
    try {
        const exists = await fs.pathExists(PASSWORD_FILE);
        if (!exists) {
            await fs.writeJson(PASSWORD_FILE, DEFAULT_PASSWORDS, { spaces: 2 });
            return DEFAULT_PASSWORDS;
        }
        return await fs.readJson(PASSWORD_FILE);
    } catch (error) {
        console.error('Şifre okuma hatası:', error);
        return DEFAULT_PASSWORDS;
    }
}

async function writePasswords(passwords) {
    try {
        await fs.writeJson(PASSWORD_FILE, passwords, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('Şifre yazma hatası:', error);
        return false;
    }
}

app.get('/api/passwords', async (req, res) => {
    try {
        const passwords = await readPasswords();
        res.json({ success: true, data: passwords });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/passwords', async (req, res) => {
    try {
        const { currentAdmin, newAdmin, newViewer } = req.body;
        const passwords = await readPasswords();
        
        // Admin şifresi değişikliği
        if (newAdmin && currentAdmin === passwords.admin) {
            passwords.admin = newAdmin;
        } else if (newAdmin) {
            return res.status(401).json({ success: false, error: 'Mevcut admin şifresi hatalı' });
        }
        
        // Görüntüleme şifresi değişikliği
        if (newViewer && currentAdmin === passwords.admin) {
            passwords.viewer = newViewer;
        } else if (newViewer) {
            return res.status(401).json({ success: false, error: 'Admin şifresi gerekli' });
        }
        
        const success = await writePasswords(passwords);
        if (success) {
            res.json({ success: true, message: 'Şifreler güncellendi' });
        } else {
            res.status(500).json({ success: false, error: 'Şifre kaydedilemedi' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
    console.log(`📁 Veri dosyası: ${DATA_FILE}`);
});