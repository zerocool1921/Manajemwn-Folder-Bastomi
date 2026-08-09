document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    log("Aplikasi Android Siap.", "log-green");
    log("Cara memilih folder: tekan tombol \"Buka Eksplorer Folder\", navigasi ke folder yang dituju, lalu tekan \"Simpan Folder Ini\".", "log-cyan");
    log("Untuk akses penuh ke semua folder di Android 11+, tekan tombol \"Minta Izin Penyimpanan\" di atas.", "log-gray");
    checkStoragePermissionSilently();
}

// ==========================================
// IZIN PENYIMPANAN (tanpa plugin permission tambahan --
// VoltBuilder Free Plan cuma boleh plugin cordova-plugin-file)
//
// PENTING soal pengecekan izin:
// window.resolveLocalFileSystemURL() ke folder root SELALU
// berhasil walau izin belum aktif -- itu bukan bukti izin aktif.
// Pengecekan yang benar adalah mencoba BACA ISI folder lewat
// reader.readEntries(), karena itu yang akan gagal (code 2 /
// SECURITY_ERR) kalau izin belum benar-benar diberikan.
//
// Untuk MEMINTA izin: Android tidak menyediakan cara membuka
// halaman Setelan izin secara otomatis tanpa plugin permission
// (sudah dicoba lewat cordova-plugin-inappbrowser + intent://,
// TERBUKTI TIDAK JALAN -- ini keterbatasan resmi plugin tsb,
// bukan bug di app ini). Karena plugin permission (mis.
// cordova.plugins.diagnostic) tidak diizinkan di Free Plan,
// solusinya adalah instruksi manual yang jelas ke pengguna.
// ==========================================
function checkStorageReadable(onSuccess, onFail) {
    window.resolveLocalFileSystemURL('file:///storage/emulated/0/', (dirEntry) => {
        const reader = dirEntry.createReader();
        reader.readEntries(() => onSuccess(), (err) => onFail(err));
    }, (err) => onFail(err));
}

function showManualPermissionInstructions() {
    log('Izin belum aktif. Buka manual: Pengaturan > Aplikasi > Manajemen Folder > Izin > Berkas dan media > pilih "Izinkan mengelola semua file". Lalu kembali ke aplikasi ini dan tekan lagi tombol "Minta Izin Penyimpanan" untuk verifikasi.', 'log-yellow');
}

function checkStoragePermissionSilently() {
    if (hasNativePicker()) {
        cordova.plugins.FolderPickerNative.hasAllFilesAccess((granted) => {
            if (granted) {
                log("Izin penyimpanan aktif. Silakan pilih folder lewat tombol \"Pilih Folder (Jendela Asli Android)\" di setiap fitur.", "log-green");
            } else {
                log("Izin penyimpanan belum aktif. Tekan tombol \"Minta Izin Penyimpanan\" di atas.", "log-yellow");
            }
        }, () => {
            checkStorageReadable(
                () => log("Izin penyimpanan aktif.", "log-green"),
                (err) => log("Izin penyimpanan belum aktif (kode: " + (err && err.code) + "). Tekan tombol \"Minta Izin Penyimpanan\" di atas.", "log-yellow")
            );
        });
    } else {
        checkStorageReadable(() => {
            log("Izin penyimpanan aktif. Silakan pilih folder lewat tombol \"Buka Eksplorer Folder\" di setiap fitur.", "log-green");
        }, (err) => {
            log("Izin penyimpanan belum aktif (kode: " + (err && err.code) + "). Tekan tombol \"Minta Izin Penyimpanan\" di atas.", "log-yellow");
        });
    }
}

function requestStoragePermission() {
    log("Memeriksa izin akses penyimpanan...", "log-cyan");
    if (!hasNativePicker()) {
        checkStorageReadable(() => {
            log("Izin penyimpanan sudah aktif.", "log-green");
        }, (err) => {
            log("Izin belum aktif (kode: " + (err && err.code) + ").", "log-red");
            showManualPermissionInstructions();
        });
        return;
    }

    cordova.plugins.FolderPickerNative.hasAllFilesAccess((granted) => {
        if (granted) {
            log("Izin penyimpanan sudah aktif. Silakan pilih folder lewat tombol \"Pilih Folder (Jendela Asli Android)\" di setiap fitur.", "log-green");
            return;
        }
        // Android 6-10: munculkan dialog izin sistem asli
        cordova.plugins.FolderPickerNative.requestLegacyPermissions(() => {
            log("Izin dasar diberikan. Untuk akses penuh ke semua folder (Android 11+), lanjutkan ke halaman Setelan yang akan terbuka.", "log-green");
        }, () => {});
        // Android 11+: buka langsung halaman Setelan "Kelola semua file"
        cordova.plugins.FolderPickerNative.openAllFilesAccessSettings(() => {
            log('Halaman Setelan dibuka. Aktifkan "Izinkan mengelola semua file", lalu kembali ke aplikasi ini dan tekan tombol ini lagi untuk verifikasi.', 'log-cyan');
        }, (err) => {
            log('Perangkat ini mungkin di bawah Android 11, sehingga tidak butuh langkah tambahan. (' + err + ')', 'log-gray');
        });
    }, (err) => {
        log("Gagal memeriksa status izin: " + err, "log-red");
        showManualPermissionInstructions();
    });
}

// ==========================================
// REGEX EXTENSIONS
// ==========================================
const ExtMusik  = /\.(mp3|wav|flac|m4a|ogg|wma)$/i;
const ExtGambar = /\.(png|jpg|jpeg|gif|webp|bmp)$/i;
const ExtVideo  = /\.(mp4|mkv|avi|mov|wmv|mpg|mpeg|flv|webm)$/i;

let currentFeature = 0;

// State folder/file yang sudah dipilih lewat jendela eksplorer
let picked = {
    source: null,   // DirectoryEntry folder sumber utama
    target: null,    // DirectoryEntry folder target/induk
    txtFile: null    // FileEntry file TXT
};

// ==========================================
// LOGGER
// ==========================================
function log(text, colorClass = "") {
    const consoleBox = document.getElementById('console-log');
    const div = document.createElement('div');
    if (colorClass) div.classList.add(colorClass);
    div.innerText = text;
    consoleBox.appendChild(div);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function cleanFilename(name) {
    return name.replace(/[\\/*?:"<>|]/g, '');
}

// ==========================================
// EKSPLORER FOLDER/FILE BUATAN SENDIRI (IN-APP)
// Dibangun murni dari API cordova-plugin-file (sudah termasuk
// dalam Free Plan, tanpa plugin tambahan). Cara pakai:
// navigasi masuk-keluar folder di dalam daftar, lalu tekan
// "Simpan Folder Ini" untuk mengambil folder yang SEDANG TERBUKA
// saat itu juga -- jendela otomatis tertutup setelahnya.
// Untuk memilih file TXT, cukup ketuk nama filenya di daftar.
//
// CATATAN: ini BUKAN picker sistem Android asli (Storage Access
// Framework). Memunculkan picker asli wajib pakai plugin native
// yang tidak tersedia di Free Plan VoltBuilder. Eksplorer ini
// dipoles semaksimal mungkin (tampilkan file & folder, ikon per
// tipe, ukuran file, breadcrumb) supaya terasa selengkap mungkin.
// ==========================================
const STORAGE_ROOT = '/storage/emulated/0/';

let browserState = { kind: null, lblId: null, isFile: false, currentEntry: null };
let browserBusy = false; // cegah tap ganda saat sedang memuat folder

// Pemetaan jenis field -> key pada objek "picked"
function pickedKeyFor(kind) {
    if (kind === 'target-auto' || kind === 'target-manual') return 'target';
    if (kind === 'txt') return 'txtFile';
    return kind; // 'source'
}

function iconForFile(name) {
    if (ExtMusik.test(name)) return '🎵';
    if (ExtGambar.test(name)) return '🖼️';
    if (ExtVideo.test(name)) return '🎬';
    if (/\.txt$/i.test(name)) return '📝';
    return '📄';
}

function formatBytes(bytes) {
    if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return n.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function getEntryMetadata(entry) {
    return new Promise((resolve) => {
        if (!entry.isFile) { resolve(null); return; }
        entry.getMetadata((meta) => resolve(meta), () => resolve(null));
    });
}

function openBrowser(kind, lblId, isFile) {
    browserState = { kind, lblId, isFile, currentEntry: null };
    document.getElementById('browser-modal').classList.remove('hidden');
    document.getElementById('browser-save').style.display = isFile ? 'none' : 'block';
    document.getElementById('browser-hint').innerText = isFile
        ? 'Ketuk nama file TXT untuk memilihnya. Folder & file lain hanya untuk dilihat.'
        : 'Ketuk folder untuk masuk. Tekan "Simpan Folder Ini" untuk memilih folder yang sedang terbuka. File yang tampil hanya untuk referensi, tidak bisa diketuk.';
    window.resolveLocalFileSystemURL('file://' + STORAGE_ROOT, (entry) => {
        loadDir(entry);
    }, (err) => {
        log('Gagal membuka penyimpanan internal (kode: ' + (err && err.code) + '). Tekan tombol "Minta Izin Penyimpanan" di atas lalu coba lagi.', 'log-red');
        closeBrowser();
    });
}

function browserJump(sub) {
    const target = STORAGE_ROOT + sub;
    window.resolveLocalFileSystemURL('file://' + target, (entry) => loadDir(entry), () => {
        log(`Folder pintasan "${sub || 'Awal'}" tidak ditemukan di perangkat ini.`, 'log-yellow');
    });
}

// Breadcrumb path yang bisa diketuk per segmen untuk lompat cepat
function renderBreadcrumb(fullPath) {
    const pathEl = document.getElementById('browser-path');
    pathEl.innerHTML = '';
    const clean = fullPath.replace(/^\/+|\/+$/g, '');
    const parts = clean.split('/').filter(Boolean);
    let acc = '';
    const rootBtn = document.createElement('span');
    rootBtn.className = 'crumb';
    rootBtn.innerText = '/';
    rootBtn.onclick = () => browserJump('');
    pathEl.appendChild(rootBtn);
    parts.forEach((part) => {
        acc += part + '/';
        const seg = acc; // closure copy
        const btn = document.createElement('span');
        btn.className = 'crumb';
        btn.innerText = part + '/';
        btn.onclick = () => {
            window.resolveLocalFileSystemURL('file:///' + seg, (entry) => loadDir(entry), () => {
                log('Gagal membuka folder "' + part + '".', 'log-yellow');
            });
        };
        pathEl.appendChild(btn);
    });
}

async function loadDir(dirEntry) {
    if (browserBusy) return;
    browserBusy = true;
    browserState.currentEntry = dirEntry;
    const fullPath = dirEntry.nativeURL ? decodeURIComponent(dirEntry.nativeURL.replace('file://', '')) : dirEntry.fullPath;
    renderBreadcrumb(fullPath);
    const listEl = document.getElementById('browser-list');
    const countEl = document.getElementById('browser-count');
    countEl.innerText = '';
    listEl.innerHTML = '<div class="browser-empty">Memuat...</div>';
    try {
        const entries = await readAllEntries(dirEntry);
        const folders = entries.filter(e => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
        const allFiles = entries.filter(e => e.isFile).sort((a, b) => a.name.localeCompare(b.name));
        const tappableFiles = browserState.isFile ? allFiles.filter(e => /\.txt$/i.test(e.name)) : [];
        const displayFiles = browserState.isFile ? allFiles : allFiles; // semua file ditampilkan sebagai referensi
        const items = folders.concat(displayFiles);

        countEl.innerText = `${folders.length} folder, ${allFiles.length} file`;

        if (!items.length) {
            listEl.innerHTML = '<div class="browser-empty">(Folder ini kosong)</div>';
            browserBusy = false;
            return;
        }
        listEl.innerHTML = '';
        items.forEach(entry => {
            const isTappableFile = entry.isFile && (browserState.isFile ? /\.txt$/i.test(entry.name) : false);
            const row = document.createElement('div');
            row.className = 'browser-item' + (entry.isFile ? ' file-item' : ' folder-item') + (entry.isFile && !isTappableFile ? ' disabled-item' : '');

            const nameSpan = document.createElement('span');
            nameSpan.className = 'browser-item-name';
            nameSpan.innerText = (entry.isDirectory ? '📁 ' : iconForFile(entry.name) + ' ') + entry.name;
            row.appendChild(nameSpan);

            const metaSpan = document.createElement('span');
            metaSpan.className = 'browser-item-meta';
            row.appendChild(metaSpan);

            if (entry.isDirectory) {
                const chevron = document.createElement('span');
                chevron.className = 'browser-item-chevron';
                chevron.innerText = '›';
                row.appendChild(chevron);
                row.onclick = () => loadDir(entry);
            } else if (isTappableFile) {
                row.onclick = () => selectAndClose(entry);
            }
            listEl.appendChild(row);

            if (entry.isFile) {
                getEntryMetadata(entry).then((meta) => {
                    if (meta && typeof meta.size === 'number') {
                        metaSpan.innerText = formatBytes(meta.size);
                    }
                });
            }
        });
    } catch (e) {
        const msg = String(e);
        if (msg.includes('code":2')) {
            listEl.innerHTML = '<div class="browser-empty">Gagal membaca folder ini (izin belum aktif, atau ini folder sistem terbatas seperti Android/data yang dikunci Android meski izin sudah aktif). Coba folder lain, atau tutup jendela ini dan tekan "Minta Izin Penyimpanan" di layar utama.</div>';
        } else {
            listEl.innerHTML = '<div class="browser-empty">Gagal membaca folder: ' + e + '</div>';
        }
    }
    browserBusy = false;
}

function browserGoUp() {
    if (!browserState.currentEntry || browserBusy) return;
    browserState.currentEntry.getParent((parent) => {
        loadDir(parent);
    }, () => {
        log('Sudah berada di folder paling atas yang bisa diakses.', 'log-yellow');
    });
}

function selectAndClose(entry) {
    picked[pickedKeyFor(browserState.kind)] = entry;
    const lbl = document.getElementById(browserState.lblId);
    const displayPath = entry.nativeURL ? decodeURIComponent(entry.nativeURL.replace('file://', '')) : entry.fullPath;
    if (lbl) lbl.innerText = 'Terpilih: ' + displayPath;
    log(`${entry.isFile ? 'File' : 'Folder'} dipilih: ${displayPath}`, 'log-green');
    closeBrowser();
}

function closeBrowser() {
    document.getElementById('browser-modal').classList.add('hidden');
}

// ==========================================
// PROMISE HELPERS UNTUK FILE SYSTEM
// ==========================================

// PENTING: readEntries() TIDAK menjamin mengembalikan semua entri
// dalam satu panggilan (bisa terpotong untuk folder isi banyak file).
// Harus dipanggil berulang sampai hasilnya kosong.
function readAllEntries(dirEntry) {
    return new Promise((resolve, reject) => {
        const reader = dirEntry.createReader();
        let all = [];
        function readBatch() {
            reader.readEntries((entries) => {
                if (!entries.length) {
                    resolve(all);
                } else {
                    all = all.concat(entries);
                    readBatch();
                }
            }, (err) => reject('Gagal membaca isi folder: ' + JSON.stringify(err)));
        }
        readBatch();
    });
}

function getDirectory(parent, name, create) {
    return new Promise((resolve, reject) => {
        parent.getDirectory(name, { create: !!create }, resolve, (err) => reject('Gagal akses folder ' + name + ': ' + JSON.stringify(err)));
    });
}

function readFileAsText(fileEntry) {
    return new Promise((resolve, reject) => {
        fileEntry.file((file) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject('Gagal membaca isi file TXT.');
            reader.readAsText(file);
        }, (err) => reject('Gagal membaca file TXT: ' + JSON.stringify(err)));
    });
}

// Pindah/rename file dengan penanganan tabrakan nama otomatis
// (kalau nama tujuan sudah ada, tambahkan "(1)", "(2)", dst.)
function moveToSafe(fileEntry, targetDir, desiredName) {
    return new Promise((resolve, reject) => {
        attempt(desiredName, 0);
        function attempt(name, counter) {
            fileEntry.moveTo(targetDir, name, (newEntry) => resolve(newEntry), (err) => {
                if (err && counter < 50) {
                    const next = counter + 1;
                    const dot = desiredName.lastIndexOf('.');
                    const base = dot > -1 ? desiredName.slice(0, dot) : desiredName;
                    const ext = dot > -1 ? desiredName.slice(dot) : '';
                    attempt(`${base} (${next})${ext}`, next);
                } else {
                    reject(`Gagal memindahkan ${fileEntry.name}: ${JSON.stringify(err)}`);
                }
            });
        }
    });
}

// Hapus tag ID3v2 (di awal file) dan ID3v1 (128 byte di akhir file) dari MP3
function stripId3Tags(fileEntry) {
    return new Promise((resolve, reject) => {
        fileEntry.file((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                try {
                    const bytes = new Uint8Array(reader.result);
                    let start = 0;
                    let end = bytes.length;

                    if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
                        const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
                        start = 10 + size;
                    }
                    if (bytes.length > 128) {
                        const off = bytes.length - 128;
                        if (bytes[off] === 0x54 && bytes[off + 1] === 0x41 && bytes[off + 2] === 0x47) {
                            end = off;
                        }
                    }
                    if (start === 0 && end === bytes.length) { resolve(false); return; }

                    const cleaned = bytes.slice(start, end);
                    fileEntry.createWriter((writer) => {
                        writer.onerror = (e) => reject('Gagal menulis file: ' + e.toString());
                        writer.truncate(0);
                        writer.onwriteend = () => {
                            writer.onwriteend = () => resolve(true);
                            writer.write(new Blob([cleaned]));
                        };
                    }, (err) => reject('Gagal membuka writer: ' + JSON.stringify(err)));
                } catch (e) {
                    reject('Gagal memproses metadata: ' + e.toString());
                }
            };
            reader.onerror = () => reject('Gagal membaca file untuk metadata.');
            reader.readAsArrayBuffer(file);
        }, (err) => reject('Gagal membaca file: ' + JSON.stringify(err)));
    });
}

// ==========================================
// TEMPLATE FIELD: Tombol buka Eksplorer Folder/File in-app
// ==========================================
function hasNativePicker() {
    return !!(window.cordova && cordova.plugins && cordova.plugins.FolderPickerNative);
}

function folderFieldHtml(kind, labelText) {
    const lblId = `lbl-${kind}`;
    return `
        <label style="color:#fff;display:block;margin-top:10px">${labelText}</label>
        <button type="button" class="btn btn-picker" onclick="pickFolderNative('${kind}','${lblId}')">📂 Pilih Folder (Jendela Asli Android)</button>
        <button type="button" class="btn btn-picker-alt" onclick="openBrowser('${kind}','${lblId}',false)">📁 Eksplorer Manual (cadangan)</button>
        <span id="${lblId}" class="picked-label">Belum ada folder dipilih</span>`;
}

function fileFieldHtml(kind, labelText) {
    const lblId = `lbl-${kind}`;
    return `
        <label style="color:#fff;display:block;margin-top:10px">${labelText}</label>
        <button type="button" class="btn btn-picker" onclick="pickTxtFileNative('${kind}','${lblId}')">📄 Pilih File TXT (Jendela Asli Android)</button>
        <button type="button" class="btn btn-picker-alt" onclick="openBrowser('${kind}','${lblId}',true)">📄 Eksplorer Manual (cadangan)</button>
        <span id="${lblId}" class="picked-label">Belum ada file dipilih</span>`;
}

// ==========================================
// PEMILIH NATIVE (Storage Access Framework via plugin custom)
// ==========================================
function pickFolderNative(kind, lblId) {
    if (!hasNativePicker()) {
        log('Plugin native belum termuat (perlu build APK, tidak berfungsi di preview browser). Gunakan "Eksplorer Manual".', 'log-yellow');
        return;
    }
    log('Membuka jendela pemilih folder asli Android...', 'log-cyan');
    cordova.plugins.FolderPickerNative.pickFolder((path) => {
        window.resolveLocalFileSystemURL('file://' + path, (entry) => {
            picked[pickedKeyFor(kind)] = entry;
            const lbl = document.getElementById(lblId);
            if (lbl) lbl.innerText = 'Terpilih: ' + path;
            log(`Folder dipilih: ${path}`, 'log-green');
        }, (err) => {
            log('Folder terpilih tapi gagal dibuka (kode: ' + (err && err.code) + '). Pastikan izin "Kelola semua file" sudah aktif, lalu coba lagi.', 'log-red');
        });
    }, (err) => {
        log('Pemilihan folder dibatalkan: ' + err, 'log-yellow');
    });
}

function pickTxtFileNative(kind, lblId) {
    if (!hasNativePicker()) {
        log('Plugin native belum termuat (perlu build APK, tidak berfungsi di preview browser). Gunakan "Eksplorer Manual".', 'log-yellow');
        return;
    }
    log('Membuka jendela pemilih file asli Android...', 'log-cyan');
    cordova.plugins.FolderPickerNative.pickTxtFile((contentUri) => {
        window.resolveLocalFileSystemURL(contentUri, (entry) => {
            picked[pickedKeyFor(kind)] = entry;
            const lbl = document.getElementById(lblId);
            if (lbl) lbl.innerText = 'Terpilih: ' + entry.name;
            log(`File dipilih: ${entry.name}`, 'log-green');
        }, (err) => {
            log('File terpilih tapi gagal dibuka (kode: ' + (err && err.code) + ').', 'log-red');
        });
    }, (err) => {
        log('Pemilihan file dibatalkan: ' + err, 'log-yellow');
    });
}

// ==========================================
// UI PANEL CONTROL
// ==========================================
function openFeature(featureId) {
    currentFeature = featureId;
    picked = { source: null, target: null, txtFile: null };
    const panel = document.getElementById('action-panel');
    const title = document.getElementById('panel-title');
    const inputs = document.getElementById('panel-inputs');

    panel.classList.remove('hidden');
    inputs.innerHTML = '';

    const sourcePicker = folderFieldHtml('source', '📁 Folder Sumber');
    const targetPicker = folderFieldHtml('target', '📁 Folder Target');
    const targetPickerAuto = folderFieldHtml('target-auto', '📁 Folder Induk (Berisi Sub-Folder Angka)');
    const targetPickerManual = folderFieldHtml('target-manual', '📁 Satu Sub-Folder Tujuan');
    const txtPicker = fileFieldHtml('txt', '📄 File TXT Referensi Nama');

    switch (featureId) {
        case 1: case 2: case 3:
            title.innerText = `[${featureId}] ACAK POSISI FILE`;
            inputs.innerHTML = sourcePicker;
            break;
        case 4: case 5: case 6:
            title.innerText = `[${featureId}] RENAME VIA FILE TXT`;
            inputs.innerHTML = sourcePicker + txtPicker +
                (featureId === 4 ? '<label style="color:#fff;display:block;margin-top:6px"><input type="checkbox" id="input-meta"> Hapus Metadata MP3?</label>' : '');
            break;
        case 7:
            title.innerText = `[7] BUAT SUB-FOLDER BERURUTAN`;
            inputs.innerHTML = sourcePicker + '<input type="number" id="input-count" placeholder="Jumlah Sub-Folder">';
            break;
        case 8: case 9: case 10:
            title.innerText = `[${featureId}] DISTRIBUSI FILE KE SUB-FOLDER`;
            inputs.innerHTML = sourcePicker +
                '<label style="color:#fff;display:block;margin-top:10px">Mode Distribusi</label>' +
                '<select id="input-mode" onchange="toggleDistributeMode()">' +
                '<option value="auto">Mode Otomatis (Bagi Rata ke Semua Sub-Folder)</option>' +
                '<option value="manual">Mode Manual (Pilih Satu Sub-Folder Tujuan)</option>' +
                '</select>' +
                `<div id="distribute-auto-fields">${targetPickerAuto}<input type="number" id="input-limit" placeholder="Kapasitas File per Sub-Folder"></div>` +
                `<div id="distribute-manual-fields" class="hidden">${targetPickerManual}<input type="number" id="input-jumlah" placeholder="Jumlah File yang Dipindahkan"></div>`;
            break;
        case 11: case 12: case 13:
            title.innerText = `[${featureId}] KUMPULKAN FILE DARI SUB-FOLDER`;
            inputs.innerHTML = sourcePicker + targetPicker;
            break;
        case 14: case 15: case 16:
            title.innerText = `[${featureId}] RENAME MANUAL MASSAL`;
            inputs.innerHTML = sourcePicker +
                '<input type="text" id="input-base" placeholder="Nama Baru Dasar">' +
                '<input type="number" id="input-start" placeholder="Mulai Angka (Default: 1)" value="1">' +
                (featureId === 14 ? '<label style="color:#fff;display:block;margin-top:6px"><input type="checkbox" id="input-meta"> Hapus Metadata MP3?</label>' : '');
            break;
    }
}

function toggleDistributeMode() {
    const mode = document.getElementById('input-mode').value;
    document.getElementById('distribute-auto-fields').classList.toggle('hidden', mode !== 'auto');
    document.getElementById('distribute-manual-fields').classList.toggle('hidden', mode !== 'manual');
}

document.getElementById('browser-save').onclick = () => {
    if (browserState.isFile) {
        log('Untuk memilih file TXT, ketuk nama filenya langsung di daftar.', 'log-yellow');
        return;
    }
    if (!browserState.currentEntry) { log('Belum ada folder yang terbuka.', 'log-red'); return; }
    selectAndClose(browserState.currentEntry);
};
document.getElementById('browser-up').onclick = browserGoUp;
document.getElementById('browser-cancel').onclick = closeBrowser;

document.getElementById('btn-cancel').onclick = () => {
    document.getElementById('action-panel').classList.add('hidden');
};

document.getElementById('btn-execute').onclick = async () => {
    if (!picked.source) {
        log("Error: Pilih folder sumber terlebih dahulu!", "log-red");
        return;
    }
    if ([4, 5, 6].includes(currentFeature) && !picked.txtFile) {
        log("Error: Pilih file TXT terlebih dahulu!", "log-red");
        return;
    }
    if ([8, 9, 10, 11, 12, 13].includes(currentFeature) && !picked.target) {
        log("Error: Pilih folder target terlebih dahulu!", "log-red");
        return;
    }

    document.getElementById('action-panel').classList.add('hidden');
    log(`Memproses folder: ${picked.source.name}...`, "log-yellow");
    await executeLogic();
};

// ==========================================
// EXECUTION LOGIC MATRIX
// ==========================================
async function executeLogic() {
    if ([1, 2, 3].includes(currentFeature)) {
        const regex = currentFeature === 1 ? ExtMusik : (currentFeature === 2 ? ExtGambar : ExtVideo);
        await shuffleFiles(picked.source, regex);
    }
    else if ([4, 5, 6].includes(currentFeature)) {
        const regex = currentFeature === 4 ? ExtMusik : (currentFeature === 5 ? ExtGambar : ExtVideo);
        const cleanMeta = document.getElementById('input-meta')?.checked || false;
        await renameFromTxt(picked.source, picked.txtFile, regex, cleanMeta);
    }
    else if (currentFeature === 7) {
        const count = parseInt(document.getElementById('input-count').value);
        await createSubfolders(picked.source, count);
    }
    else if ([8, 9, 10].includes(currentFeature)) {
        const regex = currentFeature === 8 ? ExtMusik : (currentFeature === 9 ? ExtGambar : ExtVideo);
        const mode = document.getElementById('input-mode').value;
        if (mode === 'auto') {
            const limit = parseInt(document.getElementById('input-limit').value);
            await distributeFilesAuto(picked.source, picked.target, limit, regex);
        } else {
            const jumlah = parseInt(document.getElementById('input-jumlah').value);
            await distributeFilesManual(picked.source, picked.target, jumlah, regex);
        }
    }
    else if ([11, 12, 13].includes(currentFeature)) {
        const regex = currentFeature === 11 ? ExtMusik : (currentFeature === 12 ? ExtGambar : ExtVideo);
        await collectFiles(picked.source, picked.target, regex);
    }
    else if ([14, 15, 16].includes(currentFeature)) {
        const regex = currentFeature === 14 ? ExtMusik : (currentFeature === 15 ? ExtGambar : ExtVideo);
        const baseName = document.getElementById('input-base').value.trim();
        let startNum = parseInt(document.getElementById('input-start').value);
        if (isNaN(startNum)) startNum = 1;
        const cleanMeta = document.getElementById('input-meta')?.checked || false;
        await renameManual(picked.source, baseName, startNum, regex, cleanMeta);
    }
}

// ------------------------------------------
// FITUR 1, 2, 3: Acak File
// ------------------------------------------
async function shuffleFiles(dirEntry, regex) {
    try {
        const entries = await readAllEntries(dirEntry);
        let files = entries.filter(e => e.isFile && regex.test(e.name));
        if (!files.length) { log("Tidak ada file yang cocok ditemukan.", "log-yellow"); return; }

        files.sort(() => Math.random() - 0.5);
        log(`Mengacak ${files.length} file...`, "log-yellow");

        // Fase 1: nama sementara agar tidak tabrakan dengan file asli yang belum diproses
        for (let i = 0; i < files.length; i++) {
            files[i] = await moveToSafe(files[i], dirEntry, `__tmp_${i}_${files[i].name}`);
        }
        // Fase 2: nama final berurutan
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const rawName = f.name.replace(/^__tmp_\d+_/, '');
            const dot = rawName.lastIndexOf('.');
            const ext = dot > -1 ? rawName.substring(dot) : '';
            const baseNoExt = dot > -1 ? rawName.substring(0, dot) : rawName;
            const cleanOldName = baseNoExt.replace(/^\d+[\s_-]*/, '');
            const numStr = String(i + 1).padStart(3, '0');
            const newName = `${numStr} - ${cleanOldName}${ext}`;
            await moveToSafe(f, dirEntry, newName);
            log(`Berhasil: -> ${newName}`, "log-green");
        }
        log("Pengacakan selesai.", "log-cyan");
    } catch (e) {
        log("Error: " + e, "log-red");
    }
}

// ------------------------------------------
// FITUR 4, 5, 6: Rename dari TXT
// ------------------------------------------
async function renameFromTxt(dirEntry, txtFileEntry, regex, cleanMeta) {
    try {
        const text = await readFileAsText(txtFileEntry);
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const entries = await readAllEntries(dirEntry);
        let files = entries.filter(e => e.isFile && regex.test(e.name)).sort((a, b) => a.name.localeCompare(b.name));
        const limit = Math.min(files.length, lines.length);
        if (!limit) { log("Tidak ada pasangan file/baris yang bisa diproses.", "log-yellow"); return; }

        log(`Memproses ${limit} file...`, "log-yellow");
        for (let i = 0; i < limit; i++) {
            files[i] = await moveToSafe(files[i], dirEntry, `__tmp_${i}_${files[i].name}`);
        }
        for (let i = 0; i < limit; i++) {
            const ext = files[i].name.includes('.') ? files[i].name.substring(files[i].name.lastIndexOf('.')) : '';
            const newName = cleanFilename(lines[i]) + ext;
            const finalEntry = await moveToSafe(files[i], dirEntry, newName);
            if (cleanMeta && ext.toLowerCase() === '.mp3') {
                try {
                    await stripId3Tags(finalEntry);
                    log(`Metadata dibersihkan: ${newName}`, "log-gray");
                } catch (e) {
                    log(`Gagal bersihkan metadata ${newName}: ${e}`, "log-red");
                }
            }
            log(`Renamed: -> ${newName}`, "log-green");
        }
        if (files.length > lines.length) log(`Peringatan: ${files.length - lines.length} file tidak diproses (baris TXT kurang).`, "log-yellow");
        if (lines.length > files.length) log(`Peringatan: ${lines.length - files.length} baris TXT tidak terpakai (file kurang).`, "log-yellow");
    } catch (e) {
        log("Error: " + e, "log-red");
    }
}

// ------------------------------------------
// FITUR 7: Buat Subfolder Berurutan
// ------------------------------------------
async function createSubfolders(parentDirEntry, totalToCreate) {
    try {
        if (!totalToCreate || totalToCreate < 1) { log("Jumlah subfolder harus lebih dari 0.", "log-red"); return; }
        const entries = await readAllEntries(parentDirEntry);
        let maxNum = 0;
        entries.filter(e => e.isDirectory).forEach(e => {
            const n = parseInt(e.name);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });
        const start = maxNum + 1;
        for (let i = 0; i < totalToCreate; i++) {
            const folderName = String(start + i);
            await getDirectory(parentDirEntry, folderName, true);
            log(`Subfolder dibuat: ${folderName}`, "log-green");
        }
    } catch (e) {
        log("Error: " + e, "log-red");
    }
}

// ------------------------------------------
// FITUR 8, 9, 10: Distribusi File ke Subfolder
// MODE OTOMATIS: bagi rata ke semua subfolder bernomor,
//   menghitung slot sisa berdasarkan file yang SUDAH ADA
//   di tiap subfolder (persis seperti versi Python).
// MODE MANUAL: pindahkan sejumlah file ke SATU subfolder
//   tujuan yang dipilih langsung.
// ------------------------------------------
async function distributeFilesAuto(sourceDir, targetParentDir, limitPerFolder, regex) {
    try {
        if (!limitPerFolder || limitPerFolder < 1) { log("Kapasitas per folder harus lebih dari 0.", "log-red"); return; }
        const sourceEntries = await readAllEntries(sourceDir);
        const files = sourceEntries.filter(e => e.isFile && regex.test(e.name));
        if (!files.length) { log("Tidak ada file yang cocok di folder sumber.", "log-yellow"); return; }

        const targetEntries = await readAllEntries(targetParentDir);
        const numberedDirs = targetEntries.filter(e => e.isDirectory && /^\d+$/.test(e.name))
            .sort((a, b) => parseInt(a.name) - parseInt(b.name));
        if (!numberedDirs.length) {
            log("Tidak ada subfolder bernomor di folder target. Buat subfolder dulu lewat Fitur [7].", "log-red");
            return;
        }

        let fileIndex = 0;
        for (const subDir of numberedDirs) {
            if (fileIndex >= files.length) break;
            const existingCount = (await readAllEntries(subDir)).filter(e => e.isFile).length;
            const spaceLeft = limitPerFolder - existingCount;
            if (spaceLeft <= 0) {
                log(`Folder ${subDir.name} sudah terisi penuh (${existingCount}/${limitPerFolder}).`, "log-yellow");
                continue;
            }
            log(`Mengisi subfolder ${subDir.name} (sisa slot: ${spaceLeft})...`, "log-cyan");
            for (let i = 0; i < spaceLeft && fileIndex < files.length; i++) {
                const file = files[fileIndex];
                await moveToSafe(file, subDir, file.name);
                log(`Dipindahkan: ${file.name} -> Folder ${subDir.name}`, "log-green");
                fileIndex++;
            }
        }
        if (fileIndex < files.length) {
            log(`Peringatan: ${files.length - fileIndex} file tidak terdistribusi (subfolder penuh/tidak cukup).`, "log-yellow");
        } else {
            log("Distribusi selesai.", "log-cyan");
        }
    } catch (e) {
        log("Error: " + e, "log-red");
    }
}

async function distributeFilesManual(sourceDir, singleTargetDir, jumlahPindah, regex) {
    try {
        if (!jumlahPindah || jumlahPindah < 1) { log("Jumlah file harus lebih dari 0.", "log-red"); return; }
        const sourceEntries = await readAllEntries(sourceDir);
        const files = sourceEntries.filter(e => e.isFile && regex.test(e.name));
        if (!files.length) { log("Tidak ada file yang cocok di folder sumber.", "log-yellow"); return; }

        const limit = Math.min(jumlahPindah, files.length);
        log(`Memindahkan ${limit} file ke folder ${singleTargetDir.name}...`, "log-yellow");
        for (let i = 0; i < limit; i++) {
            const file = files[i];
            const moved = await moveToSafe(file, singleTargetDir, file.name);
            log(`Berhasil memindahkan: ${file.name} -> (${moved.name})`, "log-green");
        }
        log("Distribusi manual selesai.", "log-cyan");
    } catch (e) {
        log("Error: " + e, "log-red");
    }
}

// ------------------------------------------
// FITUR 11, 12, 13: Kumpulkan File ke Target
// ------------------------------------------
async function collectFiles(parentDir, targetDir, regex) {
    try {
        const subEntries = await readAllEntries(parentDir);
        const subFolders = subEntries.filter(e => e.isDirectory);
        if (!subFolders.length) { log("Tidak ada subfolder ditemukan di folder sumber.", "log-yellow"); return; }

        // Pindai dulu seluruh subfolder sebelum memindahkan apapun
        let foundFiles = [];
        for (const subDir of subFolders) {
            const files = (await readAllEntries(subDir)).filter(f => f.isFile && regex.test(f.name));
            foundFiles = foundFiles.concat(files);
        }
        if (!foundFiles.length) { log("Tidak ada file yang cocok ditemukan di dalam subfolder.", "log-yellow"); return; }

        log(`Ditemukan ${foundFiles.length} file yang cocok.`, "log-yellow");
        const ok = confirm(`Ditemukan ${foundFiles.length} file. Pindahkan semua ke folder target?`);
        if (!ok) { log("Proses dibatalkan oleh pengguna.", "log-red"); return; }

        let total = 0;
        for (const file of foundFiles) {
            const moved = await moveToSafe(file, targetDir, file.name);
            log(`Dikumpulkan: ${file.name} -> Target (${moved.name})`, "log-green");
            total++;
        }
        log(`Selesai. Total ${total} file dikumpulkan.`, "log-cyan");
    } catch (e) {
        log("Error: " + e, "log-red");
    }
}

// ------------------------------------------
// FITUR 14, 15, 16: Rename Manual Massal
// ------------------------------------------
async function renameManual(dirEntry, baseName, startNum, regex, cleanMeta) {
    try {
        if (!baseName) { log("Nama dasar tidak boleh kosong.", "log-red"); return; }
        const cleanBase = cleanFilename(baseName);
        const entries = await readAllEntries(dirEntry);
        let files = entries.filter(e => e.isFile && regex.test(e.name)).sort((a, b) => a.name.localeCompare(b.name));
        if (!files.length) { log("Tidak ada file yang cocok ditemukan.", "log-yellow"); return; }

        log(`Mengganti nama ${files.length} file...`, "log-yellow");
        for (let i = 0; i < files.length; i++) {
            files[i] = await moveToSafe(files[i], dirEntry, `__tmp_${i}_${files[i].name}`);
        }
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const ext = f.name.includes('.') ? f.name.substring(f.name.lastIndexOf('.')) : '';
            const numStr = String(startNum + i).padStart(3, '0');
            const newName = `${cleanBase} - ${numStr}${ext}`;
            const finalEntry = await moveToSafe(f, dirEntry, newName);
            if (cleanMeta && ext.toLowerCase() === '.mp3') {
                try {
                    await stripId3Tags(finalEntry);
                    log(`Metadata dibersihkan: ${newName}`, "log-gray");
                } catch (e) {
                    log(`Gagal bersihkan metadata ${newName}: ${e}`, "log-red");
                }
            }
            log(`Berhasil: -> ${newName}`, "log-green");
        }
    } catch (e) {
        log("Error: " + e, "log-red");
    }
                      }
