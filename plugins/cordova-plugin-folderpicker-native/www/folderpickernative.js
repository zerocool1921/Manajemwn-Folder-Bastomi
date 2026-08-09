var exec = require('cordova/exec');

var FolderPickerNative = {
    // Membuka pemilih FOLDER asli Android (Storage Access Framework).
    // success(path: string) -> path asli absolut, langsung bisa dipakai cordova-plugin-file
    pickFolder: function (success, error) {
        exec(success, error, 'FolderPickerNative', 'pickFolder', []);
    },
    // Membuka pemilih FILE asli Android, dibatasi ke file .txt.
    // success(contentUri: string) -> content:// URI, bisa langsung dibaca via
    // window.resolveLocalFileSystemURL (cordova-plugin-file mendukung content://)
    pickTxtFile: function (success, error) {
        exec(success, error, 'FolderPickerNative', 'pickTxtFile', []);
    },
    // Membuka langsung halaman Setelan Android "Izinkan mengelola semua file"
    // untuk aplikasi ini (Android 11+), tanpa perlu navigasi manual.
    openAllFilesAccessSettings: function (success, error) {
        exec(success, error, 'FolderPickerNative', 'openAllFilesAccessSettings', []);
    },
    // Mengecek status izin akses penyimpanan penuh saat ini.
    // success(granted: boolean)
    hasAllFilesAccess: function (success, error) {
        exec(success, error, 'FolderPickerNative', 'hasAllFilesAccess', []);
    },
    // Memunculkan dialog izin SISTEM ASLI Android (untuk Android 6 - 10 / API < 30).
    requestLegacyPermissions: function (success, error) {
        exec(success, error, 'FolderPickerNative', 'requestLegacyPermissions', []);
    }
};

module.exports = FolderPickerNative;
