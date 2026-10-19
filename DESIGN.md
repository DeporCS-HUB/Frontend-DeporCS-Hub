# Design — Depor CS HUB

## Arah visual

Referensi: `image.png` yang dilampirkan pengguna pada 19 Oktober 2026. Gambar memperlihatkan dashboard gelap dengan sidebar ringkas, kumpulan KPI, chart batang, chart donut, serta tabel berisi toolbar. Gambar adalah referensi visual, bukan screenshot implementasi Depor dan bukan sumber angka operasional.

Untuk aplikasi ini, hero adalah blok pembuka workspace: judul dan sapaan singkat, tanggal/role, lalu komposisi KPI 2×2 bersebelahan dengan chart utama seperti referensi. Halaman login menerapkan identitas yang sama melalui judul Departemen Olahraga dan form pada panel terpisah.

## Penerjemahan referensi

| Elemen pada gambar | Penerapan untuk Depor |
| --- | --- |
| Background hitam dan kartu charcoal | Pertahankan kontras antarlapisan dan border tipis |
| Sidebar ikon yang ramping | Mode ikon 64 px sebagai default desktop; tombol memperluas label; accessible name dan title selalu ada |
| KPI berukuran besar | Empat angka utama dengan label pendek; KPI pertama biru kuat dengan teks putih; denominator memakai total global |
| Chart batang dominan | Bandingkan progres kegiatan, bukan memajang paragraf catatan |
| Chart donut kategori | Donut SVG native dengan total global, angka selesai di tengah dan legend berangka |
| Toolbar dan tabel rapat | Filter dekat data; kolom hanya informasi utama; deskripsi lewat Detail |
| Avatar, notifikasi, pencarian global | Tidak dianggap fitur tersedia jika belum diimplementasikan |

Instruksi terbaru pengguna pada 19 Oktober 2026 mengganti palet muted sebelumnya dengan identitas biru–merah Depor Fasilkom. Hanya biru dan merah dipakai sebagai aksen berwarna; navy, putih dan netral dipakai untuk struktur, teks, serta data belum diketahui. Oranye/hijau pada gambar referensi tidak diadopsi.

## Token warna utama

```css
:root {
  --black: #050B16;
  --background: #0B1426;
  --surface: #172B49;
  --surface-light: #264365;
  --navy: #122445;
  --blue: #2563EB;
  --blue-strong: #1D4ED8;
  --blue-bright: #60A5FA;
  --blue-light: #BFDBFE;
  --red: #DC2626;
  --red-strong: #B91C1C;
  --red-bright: #FF5A5A;
  --red-chart: #EF4444;
  --red-tint: #441C2B;
  --border: #36577D;
  --gray: #8194B2;
  --light-gray: #CBD5E1;
  --white: #F8FAFC;
}
```

Background: navy `--background`. Panel: `--surface`, dengan outline `--border` agar lapisan lebih jelas. Navigasi aktif/KPI dominan: `--blue-strong`; tombol utama: `--blue`; hover utama: `--blue-strong`. Merah menandai aksen identitas/tenggat dan aksi hapus. Teks primer: `--white`, sekunder: `--light-gray`; placeholder tidak dipudarkan. Hindari gradient dekoratif, emoji stiker, glow, dan warna acak per kartu.

## Tata letak

**Dashboard desktop:** workspace inset dengan sudut 22 px dan sidebar ikon. Header dan sapaan di atas; empat KPI dalam grid 2×2 di kiri, chart batang vertikal Proker/UKOR yang dominan di kanan. Baris kedua menempatkan panel performa Staff di kiri dan donut status di kanan. KPI pertama biru kuat dengan teks putih; aksen merah hadir pada brand, tombol tenggat dan kegiatan berjalan. Tinggi chart progres 220 px dengan scroll horizontal berfokus keyboard untuk banyak kegiatan; chart Staff maksimum 214 px. Jangan menambahkan tabel atau paragraf panjang pada dashboard.

**Dashboard tablet:** pada 768 px KPI dan chart utama tetap berdampingan, sedangkan panel Staff dan donut ditumpuk. Navigasi menjadi menu drawer.

**Dashboard mobile:** KPI tetap dua kolom, lalu chart utama, Staff, dan donut bertumpuk satu kolom. Label, nilai, selector, dan legend tetap terbaca pada lebar 375 px. Gunakan min-width: 0 untuk grid dan pemotongan label panjang dengan nama lengkap tetap tersedia secara aksesibel.

**Program:** nama/jenis, PJ, progres, tanggal agenda, tindakan. Deskripsi, catatan panjang, anggaran dan rincian agenda muncul dalam Detail. Pada mobile, baris menjadi kartu ringkas dengan tombol terlihat tanpa scroll horizontal.

**Tugas:** kartu menampilkan judul, prioritas, tenggat/status, serta Detail. Deskripsi sumber yang panjang tidak dirender penuh pada kartu.

## Tipografi dan ukuran

Gunakan system sans-serif agar tidak menambah request font. Ukuran baseline: judul halaman sekitar 28–36 px; angka KPI 26–30 px; isi 13–14 px; label chart 11–12 px. Gunakan skala jarak konsisten 4, 8, 12, 16, 24, 32 px. Radius panel 18 px, workspace 22 px, kontrol 8–10 px mengikuti referensi. Border panel tipis berwarna biru memisahkan surface dari latar. Bayangan dan efek dekoratif tidak menjadi elemen utama.

Angka memakai tabular numerals. Paragraf hanya muncul di tempat yang memang membutuhkan bacaan: Detail, form bantuan yang relevan, dan error. Hindari mengulang label Belum diisi dua kali pada satu bidang.

## Aturan chart

1. Persentase memakai batang vertikal dan sumbu 0–100 yang tetap. Bar 0% sah dan berbeda dari data null.
2. Null memakai outline track putus-putus serta tanda em dash; track itu bukan batang terisi. Jangan mengisi bar penuh untuk membuat data kosong terlihat aktif.
3. Status Selesai/Berjalan/Rencana/Belum diisi/Batal memakai label dan legend; pola arsiran membantu membedakan unknown.
4. Metrik Staff dapat diganti tanpa memuat seluruh halaman. Gunakan judul/denominator sesuai metrik.
5. Jangan memakai rata-rata yang menutup jumlah kegiatan belum dilaporkan. Tampilkan coverage bila kelak menambah agregat baru.
6. Jangan menampilkan persentase perubahan bulanan atau tren panah seperti contoh bila data pembanding tidak tersedia.

## Dialog, form, dan aksesibilitas

Detail memiliki judul, tombol Tutup, tinggi maksimum sekitar 80dvh (85dvh pada mobile), dan konten yang dapat digulir. Fokus masuk ke dialog, tetap di dalam dialog, Escape menutup, lalu fokus kembali ke pemicu. Area scroll dapat menerima fokus keyboard. Teks/URL panjang dapat membungkus tanpa membuat dialog melebar.

Gunakan label pada input, fokus keyboard terlihat, urutan heading jelas, dan angka/teks alternatif untuk chart. Targetkan kontras WCAG AA saat mengubah warna. Tombol ikon memiliki accessible name. Error tidak menghapus input; tombol simpan dinonaktifkan selama write.

## Pemeriksaan desain

Periksa desktop 1440 px, tablet 768 px dan mobile 375 px dengan data panjang, tidak ada data, null, 0, 100, dan error. Pastikan isi Detail tidak memperpanjang halaman di belakangnya. Penyesuaian visual berikutnya harus mempertahankan fungsi dan izin yang sudah berjalan.

## Acceptance komposisi — 19 Oktober 2026

- Pada 1440 px, koordinat atas KPI dan chart utama sejajar; chart berada di kanan grid KPI.
- Pada 375 px, chart berada di bawah KPI, semua panel tidak menyebabkan overflow halaman.
- Sidebar desktop dimulai dalam mode ikon; label dapat diperluas dan menu mobile tetap berfungsi.
- Donut dan Staff berada pada dua panel baris kedua desktop, bukan satu panel status selebar halaman di bawah layout lama.
- Screenshot mock diperiksa pada 375/768/1440 px; fixture visual tidak disimpan sebagai data departemen.

Implementasi komposisi berada di `src/workspace.css`, dimuat sesudah baseline `src/styles.css`. Token palet tetap memakai root styles; pemisahan ini mempertahankan form, dialog, izin, serta perilaku data saat layout direvisi.

## Kontras dan warna chart — revisi biru/merah

- Selesai: biru terang; berjalan: merah terang; rencana: biru muda; batal: merah; belum diisi: netral berarsir. Label dan angka tetap ditampilkan, bukan warna saja.
- Angka di dalam segmen chart terang memakai teks navy gelap. Tooltip, axis dan legend chart keuangan memakai token yang sama dengan dashboard, tanpa hex palet lama.
- Label chart dinaikkan ke 11 px. Fokus keyboard biru terang dan batas input tetap terlihat.
- Tes browser menghitung warna hasil render: pasangan teks/tombol/placeholder yang diuji minimal 4,5:1; warna donut terhadap panel minimal 3:1. Ini pemeriksaan pasangan terpilih, bukan sertifikasi aksesibilitas seluruh aplikasi.
- Rujukan: [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) dan [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
