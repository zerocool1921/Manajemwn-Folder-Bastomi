# Manajemen Folder — Panduan Lengkap (Untuk Pemula)

Aplikasi ini sudah **siap pakai**. Tidak perlu install Android Studio.
Cukup upload ke GitHub, dan GitHub yang akan membuatkan file APK-nya untuk kamu (gratis, otomatis, di "awan").

Ikuti langkah di bawah **satu per satu**, jangan ada yang dilewati.

---

## BAGIAN 1 — Siapkan Akun GitHub

1. Buka **https://github.com** di HP atau laptop.
2. Klik **Sign up**, buat akun (isi email, password, username). Gratis.
3. Verifikasi email kamu (cek kotak masuk email, klik link konfirmasi).

---

## BAGIAN 2 — Buat Repository (folder proyek di GitHub)

1. Setelah login, klik tombol hijau **New** (atau ikon **+** di kanan atas → **New repository**).
2. Isi:
   - **Repository name**: `ManajemenFolder`
   - Pilih **Public**
   - **JANGAN** centang "Add a README file" (biar tidak bentrok, kita sudah punya README sendiri)
3. Klik **Create repository**.

---

## BAGIAN 3 — Upload File Proyek

1. Di halaman repo yang baru dibuat, cari link kecil bertuliskan **"uploading an existing file"**.
   (Kalau tidak muncul, klik tombol **Add file** → **Upload files**.)
2. Buka folder `ManajemenFolder` hasil download dari saya di HP/laptop kamu.
3. **Seret semua isi di DALAM folder tersebut** (bukan foldernya, tapi ISINYA: `www`, `config.xml`, `package.json`, `.gitignore`, folder `.github`, dll) ke kotak upload GitHub.
   - Kalau GitHub di HP susah untuk seret-tarik banyak file sekaligus terutama folder `.github` yang tersembunyi, gunakan **GitHub Desktop** (app resmi GitHub, lebih mudah) atau lakukan dari laptop/komputer.
4. Scroll ke bawah, klik **Commit changes**.

> 💡 **Cara alternatif yang lebih gampang (disarankan):** install aplikasi **GitHub Desktop** di laptop (https://desktop.github.com), login, pilih **"Add local repository"**, arahkan ke folder `ManajemenFolder` di komputer kamu, lalu klik **Publish repository**. Semua file (termasuk folder tersembunyi `.github`) otomatis ikut terupload dengan benar.

---

## BAGIAN 4 — Biarkan GitHub Membuatkan APK-nya

1. Setelah file terupload, klik tab **Actions** di bagian atas halaman repo.
2. Kamu akan melihat proses bernama **"Build APK Android"** sedang berjalan (ada titik kuning berputar 🟡).
3. Tunggu sekitar **5–10 menit** sampai titiknya berubah jadi **centang hijau ✅**.
   - Kalau berubah jadi **tanda silang merah ❌**, klik prosesnya untuk melihat baris mana yang error, lalu screenshot dan tanyakan ke saya — saya bantu perbaiki.

---

## BAGIAN 5 — Unduh APK ke HP

1. Klik proses yang sudah selesai (centang hijau ✅) tadi.
2. Scroll ke bawah, di bagian **Artifacts** akan ada file bernama **`ManajemenFolder-apk`**.
3. Klik untuk mengunduh (hasilnya berupa file `.zip`).
4. Ekstrak/buka file `.zip` tersebut di HP → di dalamnya ada file **`app-debug.apk`**.

---

## BAGIAN 6 — Install APK di HP Android

1. Pindahkan `app-debug.apk` ke penyimpanan HP (kalau tadi diunduh di laptop, kirim ke HP lewat kabel data / Google Drive / WhatsApp ke diri sendiri).
2. Ketuk file `app-debug.apk` untuk mulai instalasi.
3. Kalau muncul peringatan **"Untuk keamanan HP kamu diblokir..."**, ketuk **Setelan** pada notifikasi itu, lalu aktifkan **"Izinkan dari sumber ini"**. Ini normal untuk APK di luar Play Store.
4. Lanjutkan instalasi sampai selesai, lalu buka aplikasinya.

---

## BAGIAN 7 — Aktifkan Izin Penyimpanan di Aplikasi

Ini **wajib** dilakukan sekali di awal, supaya aplikasi bisa membaca/memindah file di HP:

1. Buka aplikasi **Manajemen Folder**.
2. Ketuk tombol **"🔐 Minta Izin Penyimpanan"** di bagian atas.
3. Jika muncul instruksi berwarna kuning, buka: **Setelan HP → Aplikasi → Manajemen Folder → Izin → Berkas dan media → pilih "Izinkan mengelola semua file"**.
4. Kembali ke aplikasi, ketuk lagi tombol **"🔐 Minta Izin Penyimpanan"** untuk memastikan sudah aktif (akan muncul tulisan hijau).

Setelah itu semua 16 fitur (acak file, rename dari TXT, buat sub-folder, distribusi file, kumpulkan file, rename manual) sudah bisa dipakai — tinggal ketuk menu, pilih folder lewat "Buka Eksplorer Folder", isi data yang diminta, lalu tekan **Jalankan**.

---

## Kalau Ingin Update Aplikasi di Kemudian Hari

Setiap kali kamu mengubah file di dalam repo GitHub (misalnya minta saya perbaiki sesuatu, lalu kamu upload ulang file yang diperbarui), GitHub **otomatis build ulang APK baru** — kamu tinggal ulangi **Bagian 4 dan 5** untuk mengambil APK terbaru.

---

## 🆕 Sekarang Pakai Jendela Pemilih Folder ASLI Android

Karena APK ini di-build sendiri lewat GitHub (bukan lewat layanan pihak ketiga yang membatasi plugin), sekarang aplikasi punya **plugin native buatan sendiri** yang membuka jendela pemilih folder **resmi bawaan Android** (Storage Access Framework) — jendela yang sama persis dengan yang dipakai Google Files, WhatsApp, dsb.

- Tombol **"📂 Pilih Folder (Jendela Asli Android)"** → memakai jendela sistem asli, tampilan sepenuhnya native.
- Tombol **"📁 Eksplorer Manual (cadangan)"** → tetap disediakan sebagai cadangan, khusus untuk kasus tertentu (misalnya folder di kartu SD eksternal yang kadang tidak bisa dikonversi otomatis ke path asli oleh Android).
- Tombol **"🔐 Minta Izin Penyimpanan"** sekarang membuka halaman Setelan **secara otomatis** (tidak perlu lagi navigasi manual mencari-cari menu) dan memunculkan dialog izin sistem asli untuk Android versi lama (Android 6–10).

Tidak ada langkah tambahan yang perlu kamu lakukan — semua ini otomatis ikut ter-build lewat GitHub Actions karena sudah didaftarkan di `config.xml` dan ada di folder `plugins/cordova-plugin-folderpicker-native/`.

---

## Ringkasan Apa yang Sudah Diperbaiki dari Versi Sebelumnya

- Bug pemotongan nama file saat proses **Acak File** (Fitur 1–3): dulu bisa salah memotong ekstensi kalau nama file mengandung pola serupa ekstensi di tengah nama; sekarang menggunakan cara yang sama persis dengan skrip Python aslinya (`os.path.splitext`).
- `android-targetSdkVersion`/`compileSdkVersion` diturunkan ke **34** (versi stabil resmi) — versi 36 belum tersedia luas di server build dan berisiko gagal compile.
- Ditambahkan `AndroidXEnabled` — wajib untuk Cordova Android versi baru, tanpa ini build APK bisa gagal total.
- Ditambahkan `requestLegacyExternalStorage` dan pembatasan versi izin (`maxSdkVersion`) supaya izin penyimpanan bekerja konsisten di Android lama maupun baru (Android 6 s/d Android 15+).
- Ditambahkan `package.json` + workflow **GitHub Actions** (`.github/workflows/build-apk.yml`) supaya APK bisa dibuat otomatis di GitHub tanpa install Android Studio.
