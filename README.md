# DeporCS Hub Frontend (Development)

Dashboard web untuk mengelola operasional Departemen Olahraga: program kerja, tugas, keuangan, inventaris, event, dan anggota tim.

## Fitur

- Dashboard dengan statistik, grafik aktivitas, notifikasi, agenda, dan inventaris.
- Manajemen program beserta status, PIC, progress, dan anggaran.
- Kanban board dengan drag-and-drop untuk pengelolaan tugas.
- Ringkasan budget, realisasi, transaksi, dan pengajuan dana.
- Pencarian aset inventaris serta status ketersediaannya.
- Kalender event dan informasi perizinan.
- Tampilan organisasi, anggota tim, performa kehadiran, dan pengaturan workspace.
- Sidebar responsif dengan navigasi mobile dan mode collapse.

## Teknologi

- React 19 + Vite
- React Router DOM 7
- Recharts
- Lucide React
- ESLint

## Prasyarat

- Node.js 20 atau versi LTS yang lebih baru
- npm

## Menjalankan secara lokal

```bash
git clone https://github.com/DeporCS-HUB/Frontend-DeporCS-Hub.git
cd Frontend-DeporCS-Hub
npm install
npm run dev
```

Buka alamat yang muncul di terminal, biasanya `http://localhost:5173`.

## Perintah

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan development server Vite |
| `npm run build` | Membuat build production ke folder `dist` |
| `npm run preview` | Menjalankan preview hasil build production |
| `npm run lint` | Memeriksa kualitas kode dengan ESLint |

## Routing

Semua halaman menggunakan layout/sidebar yang sama melalui nested route React Router.

| URL | Halaman |
| --- | --- |
| `/` | Dashboard |
| `/programs` | Program Management |
| `/tasks` | Task Board |
| `/finance` | Finance Dashboard |
| `/inventory` | Inventory |
| `/events` | Event & Permit Center |
| `/team` | Team Management |
| `/settings` | Settings |

URL yang tidak terdaftar akan diarahkan ke dashboard.

## Struktur project

```text
src/
|-- components/  # Layout dan komponen UI reusable
|-- pages/       # Halaman tiap route
|-- assets/      # Aset statis aplikasi
|-- data.js      # Data dummy untuk tampilan saat ini
|-- App.jsx      # Konfigurasi route
`-- main.jsx     # Entry point React
```

## Catatan

Saat ini aplikasi menggunakan data dummy dari `src/data.js`. Ketika backend siap, ganti sumber data tersebut dengan service/API layer agar komponen halaman tetap terpisah dari logika request.
