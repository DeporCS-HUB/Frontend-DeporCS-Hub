# 🏆 Frontend DeporCS Hub

Antarmuka modern untuk **DeporCS Hub (Departemen Olahraga Hub)** — sistem informasi dan manajemen terpusat untuk memfasilitasi operasional organisasi olahraga secara efisien, terstruktur, dan real-time.

Frontend ini berperan sebagai pusat visualisasi dan interaksi untuk:

- monitoring **Program Kerja (Proker)**
- pengelolaan **keuangan & RAB**
- pelacakan **inventaris alat olahraga**
- manajemen tugas harian melalui **Kanban Board**

Didesain dengan gaya **Deep Ocean glassmorphism**, terinspirasi dari UI/UX *Persona 3 Reload*, agar pengalaman pengguna tetap clean, profesional, dan responsif di berbagai perangkat.

---

## ✨ Fitur Utama

- **Dashboard Eksekutif**  
  Menampilkan ringkasan metrik proker, anggaran, dan progress tugas secara real-time.

- **Manajemen Proker & Event**  
  Pelacakan status acara, timeline kegiatan, dan alur perizinan dalam satu tampilan.

- **Modul Keuangan (RAB)**  
  Visualisasi alur pengajuan dana, pemasukan, dan pengeluaran per proker untuk mendukung efisiensi bendahara.

- **Task Management (Kanban Board)**  
  Papan tugas kolaboratif bergaya Notion untuk koordinasi antar staff.

- **Manajemen Inventaris**  
  Monitoring peminjaman, pengembalian, dan status aset olahraga.

- **Role-based Access Awareness**  
  Integrasi tampilan berbasis peran (Member/Staff) sesuai aturan akses dari backend/database.

---

## 🛠️ Tech Stack

- **Framework:** React.js
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **API Integration:** Node.js + Express.js backend (Render)
- **Database/Auth (via backend):** PostgreSQL (Supabase) + Google OAuth

---

## 📦 Prasyarat

Sebelum menjalankan project frontend, pastikan sudah tersedia:

- Node.js (disarankan versi LTS)
- npm atau yarn
- Akses ke endpoint backend DeporCS Hub
- File environment (`.env`) sesuai kebutuhan project

---

## 🚀 Instalasi & Menjalankan (Development)

1. **Clone repository frontend**
   ```bash
   git clone https://github.com/DeporCS-HUB/Frontend-DeporCS-Hub.git
   cd Frontend-DeporCS-Hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   atau
   ```bash
   yarn
   ```

3. **Konfigurasi environment**
   
   Buat file `.env` di root project lalu isi variabel yang dibutuhkan (contoh):
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   VITE_APP_NAME=DeporCS Hub
   ```
   > Sesuaikan nama variabel dengan implementasi di kode kamu (`VITE_*` untuk Vite).

4. **Jalankan development server**
   ```bash
   npm run dev
   ```
   atau
   ```bash
   yarn dev
   ```

5. **Buka di browser**
   
   Umumnya di:
   ```bash
   http://localhost:5173
   ```

---

## 🏗️ Build untuk Production

```bash
npm run build
npm run preview
```

Hasil build production akan tersedia di folder output sesuai konfigurasi build tool yang digunakan.

---

## 🌐 Deployment

Frontend ini dirancang untuk dideploy di **Vercel**.

Langkah singkat:
1. Push project ke GitHub.
2. Import repo ke Vercel.
3. Set environment variables di dashboard Vercel.
4. Deploy.

---

## 🤝 Kontribusi

Kontribusi terbuka untuk pengembangan fitur, perbaikan bug, dan peningkatan UI/UX.

Alur kontribusi:
1. Fork repository
2. Buat branch fitur: `feat/nama-fitur`
3. Commit perubahan
4. Push ke branch kamu
5. Buat Pull Request

---

## 📄 Lisensi

Tentukan lisensi project di sini (misalnya MIT) jika sudah tersedia.

---

## 👥 Tim

Dikembangkan oleh tim **DeporCS Hub** untuk mendukung transformasi digital operasional Departemen Olahraga.
