package com.bastomi.manajemenfolder;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * Plugin native ringan untuk Manajemen Folder.
 *
 * - pickFolder(): memakai Intent.ACTION_OPEN_DOCUMENT_TREE, yaitu jendela
 *   pemilih folder RESMI bawaan Android (sama seperti dipakai Google Files,
 *   WhatsApp, dsb). Hasilnya berupa "tree URI" lalu dikonversi ke path
 *   absolut asli (mis. /storage/emulated/0/Music) supaya bisa langsung
 *   dipakai fungsi rename/pindah/hapus di cordova-plugin-file tanpa
 *   perubahan apa pun pada logika yang sudah ada.
 *
 * - pickTxtFile(): sama, tapi untuk memilih satu file .txt.
 *
 * - openAllFilesAccessSettings(): langsung membuka halaman Setelan Android
 *   "Izinkan mengelola semua file" untuk aplikasi ini (Android 11+),
 *   tanpa pengguna perlu mencari-cari menu secara manual.
 *
 * - requestLegacyPermissions(): memunculkan dialog izin SISTEM ASLI Android
 *   (untuk Android 6 s/d 10 / API < 30).
 */
public class FolderPickerNative extends CordovaPlugin {

    private static final int REQ_PICK_FOLDER = 9101;
    private static final int REQ_PICK_TXT_FILE = 9102;
    private static final int REQ_LEGACY_PERMISSIONS = 9103;

    private CallbackContext pendingCallback;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        switch (action) {
            case "pickFolder":
                pickFolder(callbackContext);
                return true;
            case "pickTxtFile":
                pickTxtFile(callbackContext);
                return true;
            case "openAllFilesAccessSettings":
                openAllFilesAccessSettings(callbackContext);
                return true;
            case "hasAllFilesAccess":
                hasAllFilesAccess(callbackContext);
                return true;
            case "requestLegacyPermissions":
                requestLegacyPermissions(callbackContext);
                return true;
            default:
                return false;
        }
    }

    // ------------------------------------------------------------
    // PILIH FOLDER (native, Storage Access Framework)
    // ------------------------------------------------------------
    private void pickFolder(CallbackContext callbackContext) {
        this.pendingCallback = callbackContext;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        this.cordova.setActivityResultCallback(this);
        this.cordova.getActivity().startActivityForResult(intent, REQ_PICK_FOLDER);
        keepCallback(callbackContext);
    }

    private void pickTxtFile(CallbackContext callbackContext) {
        this.pendingCallback = callbackContext;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/plain");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        this.cordova.setActivityResultCallback(this);
        this.cordova.getActivity().startActivityForResult(intent, REQ_PICK_TXT_FILE);
        keepCallback(callbackContext);
    }

    private void keepCallback(CallbackContext callbackContext) {
        PluginResult pr = new PluginResult(PluginResult.Status.NO_RESULT);
        pr.setKeepCallback(true);
        callbackContext.sendPluginResult(pr);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (pendingCallback == null) return;

        if (requestCode == REQ_PICK_FOLDER) {
            if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
                pendingCallback.error("Pemilihan folder dibatalkan.");
                pendingCallback = null;
                return;
            }
            Uri treeUri = data.getData();
            try {
                int takeFlags = data.getFlags()
                        & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                this.cordova.getActivity().getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
            } catch (Exception ignored) {
                // beberapa perangkat tidak butuh/izinkan ini, aman untuk dilewati
            }
            String path = resolvePathFromTreeUri(treeUri);
            if (path == null) {
                pendingCallback.error("Tidak dapat menemukan path asli untuk folder ini (biasanya terjadi pada kartu SD eksternal di sebagian merk HP). Silakan pilih folder di Penyimpanan Internal, atau gunakan tombol \"Eksplorer Manual\".");
            } else {
                pendingCallback.success(path);
            }
            pendingCallback = null;

        } else if (requestCode == REQ_PICK_TXT_FILE) {
            if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
                pendingCallback.error("Pemilihan file dibatalkan.");
                pendingCallback = null;
                return;
            }
            Uri fileUri = data.getData();
            try {
                int takeFlags = data.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION;
                this.cordova.getActivity().getContentResolver().takePersistableUriPermission(fileUri, takeFlags);
            } catch (Exception ignored) {
            }
            pendingCallback.success(fileUri.toString());
            pendingCallback = null;
        }
    }

    // Mengonversi "tree URI" SAF menjadi path asli di sistem file.
    // Berfungsi andal untuk penyimpanan internal utama ("primary").
    // Untuk kartu SD eksternal, memakai pola path umum yang berlaku di
    // mayoritas perangkat Android (tidak 100% dijamin resmi oleh Android,
    // tapi ini pendekatan standar yang dipakai luas karena Android tidak
    // menyediakan API resmi untuk konversi ini).
    private String resolvePathFromTreeUri(Uri treeUri) {
        try {
            String docId = DocumentsContract.getTreeDocumentId(treeUri);
            String[] split = docId.split(":", 2);
            String type = split.length > 0 ? split[0] : "";
            String relativePath = split.length > 1 ? split[1] : "";

            if ("primary".equalsIgnoreCase(type)) {
                String base = Environment.getExternalStorageDirectory().getAbsolutePath();
                return relativePath.isEmpty() ? base : base + "/" + relativePath;
            } else if (!type.isEmpty()) {
                String base = "/storage/" + type;
                return relativePath.isEmpty() ? base : base + "/" + relativePath;
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    // ------------------------------------------------------------
    // IZIN PENYIMPANAN
    // ------------------------------------------------------------
    private void openAllFilesAccessSettings(CallbackContext callbackContext) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + cordova.getActivity().getPackageName()));
                cordova.getActivity().startActivity(intent);
                callbackContext.success("opened");
            } else {
                callbackContext.error("Halaman ini hanya ada di Android 11 ke atas. Gunakan dialog izin biasa.");
            }
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                cordova.getActivity().startActivity(fallback);
                callbackContext.success("opened-fallback");
            } catch (Exception e2) {
                callbackContext.error("Gagal membuka halaman Setelan: " + e2.getMessage());
            }
        }
    }

    private void hasAllFilesAccess(CallbackContext callbackContext) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            callbackContext.success(Environment.isExternalStorageManager() ? 1 : 0);
        } else {
            boolean granted = ActivityCompat.checkSelfPermission(cordova.getActivity(),
                    android.Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
            callbackContext.success(granted ? 1 : 0);
        }
    }

    private void requestLegacyPermissions(CallbackContext callbackContext) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            callbackContext.success("not-needed");
            return;
        }
        this.pendingCallback = callbackContext;
        String[] perms = new String[]{
                android.Manifest.permission.READ_EXTERNAL_STORAGE,
                android.Manifest.permission.WRITE_EXTERNAL_STORAGE
        };
        cordova.requestPermissions(this, REQ_LEGACY_PERMISSIONS, perms);
    }

    @Override
    public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) throws JSONException {
        if (requestCode != REQ_LEGACY_PERMISSIONS || pendingCallback == null) return;
        boolean allGranted = grantResults.length > 0;
        for (int r : grantResults) {
            if (r != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }
        if (allGranted) {
            pendingCallback.success("granted");
        } else {
            pendingCallback.error("denied");
        }
        pendingCallback = null;
    }
        }
