# MONSTER DUMB — PERSISTENT AGENT RULES & MEMORY

## 1. USER AUTHORIZATION & AUTONOMY
- **Izin Penuh Mengubah File**: Pengguna telah memberikan izin eksplisit penuh kepada agen untuk mengubah, mengedit, membuat, dan mengelola semua file di dalam workspace yang diperlukan guna menyelesaikan perbaikan bug, penambahan fitur, dan optimasi.
- **Jangan Bertanya Lagi**: Agen tidak perlu meminta izin atau konfirmasi untuk melakukan perubahan kode yang diperlukan dalam lingkup task. Langsung laksanakan perubahan, jalankan pengujian, dan laporkan hasilnya secara lengkap.

## 2. CORE PROJECT PRINCIPLES
- **Preserve Existing Game. Extend, Don't Rebuild**:
  - Jangan membangun ulang arsitektur dasar game, identitas visual, atau kontrol.
  - Pertahankan kontrol desktop dan mobile yang sudah ada.
  - Pertahankan kecepatan pemain, fisika kamera, dan audio.
- **Weapon System & Persistence**:
  - *One Permanent Weapon Unlock = All World Pickups with the Same Weapon ID are Hidden*.
  - Begitu sebuah senjata di-unlock di `SaveManager`, semua pickup dunia dengan `weaponId` tersebut harus disembunyikan/tidak dimunculkan di level mana pun.
  - Jangan reset unlocked weapons saat reload, retry, atau game over.
- **Level & Collision Isolation**:
  - Setiap level memiliki konfigurasi collision dan environment geometry yang terisolasi.
- **Verification First**:
  - Setiap perubahan wajib diuji dengan `npm run build` dan automated verification script sebelum menyelesaikan turn.
- **Git Safety**:
  - Jangan melakukan commit, push ke remote, atau deploy tanpa instruksi eksplisit dari pengguna. Simpan semua perubahan di working directory.
