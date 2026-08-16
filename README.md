# ZK Remote Operations Center (ZKFILEZILLA)

Kurumsal olarak yetkilendirilmiş Windows ve Linux (Pardus) cihazların, güvenli ve denetlenebilir şekilde tek bir merkezi web arayüzünden yönetilmesi için geliştirilmiş profesyonel bir uzaktan yönetim ve dosya transfer platformu.

---

## 🌟 Temel Özellikler
- **📊 SOC Dashboard**: 24 saatlik aktivite grafiği, düğüm dağılımı (Pardus / Windows), gerçek zamanlı alarm akışı ve sistem KPI metrikleri.
- **🖥️ Canlı Çift İşletim Sistemli Web Terminali**:
  - Pardus GNU/Linux (SSH/Bash) & Windows (WinRM / PowerShell / OpenSSH) desteği.
  - Hızlı komut ve betik kütüphanesi (OS-duyarlı snippetlar).
  - Canlı seans kaydı ve tekrar oynatma (replay) özelliği.
- **📁 Çift Panelli SFTP Dosya Gezgini & Transfer Merkezi**:
  - FileZilla benzeri çift taraflı (Yerel ↔ Uzak) dosya aktarımı.
  - Sürükle-bırak, dizin arama, dahili Monaco Editor kod düzenleyicisi, dosya önizleme.
- **🛡️ RBAC Yetkilendirme & Değişmez Denetim Defteri (Audit Ledger)**:
  - Admin, Operatör, Denetçi, Salt Okunur rolleri.
  - Her komut, indirme, yükleme ve giriş işleminin IP, kullanıcı ve durum bazında SHA-256 / HMAC uyumlu kaydedilmesi.
- **⚡ Yüksek Başarım & Eşzamanlılık**:
  - `ThreadPoolExecutor` tabanlı paralel ağ taraması.
  - Akıllı önbellek ve optimize edilmiş Django ORM sorguları.

---

## 🛠️ Teknoloji Yığını
- **Backend**: Python 3.12+, Django 5.x, Django REST Framework, Paramiko
- **Frontend**: HTML5, Vanilla CSS3 (Dark/Light tema sistemi, Glassmorphism, CSS Custom Properties), JavaScript (ES6+ Modüler)
- **Veritabanı**: SQLite (Geliştirme) / PostgreSQL (Production)
- **Güvenlik**: Fernet simetrik şifreleme, RBAC, Path Traversal & Null-Byte koruması, CSRF koruması

---

## 🚀 Kurulum ve Başlatma

### 1. Sanal Ortam Hazırlığı
```bash
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

### 2. Bağımlılıkları Yükleme
```bash
pip install -r requirements.txt
```

### 3. Ortam Değişkenleri
```bash
copy .env.example .env
```

### 4. Veritabanı Geçişleri & Örnek Veri
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 5. Sunucuyu Başlatma
```bash
python manage.py runserver 127.0.0.1:8000
```
Tarayıcınızdan `http://127.0.0.1:8000` adresine giderek giriş yapabilirsiniz.

---

## 🧪 Test Paketi
```bash
python manage.py test
```

---

## 📄 Lisans
Ziraat Katılım Bilgi Teknolojileri ve Güvenlik Operasyonları Merkezi dahili kurumsal kullanım içindir.
