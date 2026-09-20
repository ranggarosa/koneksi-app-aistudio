# Panduan Commit Message (Conventional Commits)

Dokumen ini mengatur standar penulisan pesan _commit_ menggunakan format **Conventional Commits v1.0.0** agar riwayat perubahan proyek mudah dibaca, dilacak, dan dapat diintegrasikan dengan sistem rilis otomatis.

## 1. Struktur Dasar Commit
Setiap _commit message_ harus mengikuti format berikut:
```text
<tipe>(<opsional scope>): <deskripsi singkat>

[opsional body: penjelasan lebih detail mengapa perubahan ini dilakukan]
```

## 2. Tipe Commit yang Diizinkan (Type)
Gunakan salah satu _prefix_ berikut di awal setiap _commit_:
- **`feat:`** Untuk menambahkan fitur baru (contoh: form pembuatan surat, notifikasi).
- **`fix:`** Untuk memperbaiki *bug* atau _error_.
- **`refactor:`** Untuk penulisan ulang kode tanpa mengubah fitur atau memperbaiki *bug* (contoh: merapikan struktur folder).
- **`style:`** Untuk perubahan formatting, spasi, atau perbaikan UI/CSS yang tidak mempengaruhi logika.
- **`docs:`** Untuk perubahan pada dokumentasi (contoh: mengubah README atau panduan arsitektur).
- **`chore:`** Untuk tugas pemeliharaan, *update dependencies*, atau konfigurasi yang tidak terkait langsung dengan *source code* (contoh: mengubah file `.gitignore`).

## 3. Aturan Penulisan
- **Huruf Kecil:** Tipe (`feat`, `fix`, dll) dan scope harus ditulis dengan huruf kecil.
- **Gunakan Kata Kerja Perintah (Imperative):** Pada bagian deskripsi, gunakan kalimat perintah (contoh: `add login page`, bukan `added login page` atau `adds login page`).
- **Tidak Ada Titik:** Deskripsi singkat tidak boleh diakhiri dengan tanda titik (`.`).

## 4. Contoh Commit Message
* **Fitur baru:**
  `feat(letter): add dynamic numbering to create letter form`
* **Perbaikan bug:**
  `fix(auth): prevent app crash when user token expires`
* **Perubahan desain (UI):**
  `style(dashboard): change status badge color to tailwind standard`
* **Merombak struktur kode:**
  `refactor(service): move pdf generation logic to separate service`
* **Tugas konfigurasi:**
  `chore: update vite and react packages to latest versions`
