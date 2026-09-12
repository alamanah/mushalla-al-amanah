// Upload Pamflet -- Google Apps Script Web App
//
// Salin-tempel seluruh isi file ini ke project baru di https://script.google.com/,
// ganti nilai TOKEN di bawah dengan teks rahasia buatanmu sendiri, lalu Deploy sebagai
// Web app (Execute as: Me, Who has access: Anyone).
//
// Panduan lengkap langkah demi langkah ada di supabase/SETUP.md, bagian
// "6. (Opsional) Upload Pamflet otomatis ke Google Drive".

// Ganti dengan teks rahasia bebas -- semacam kata sandi supaya alamat upload ini
// tidak bisa dipakai sembarang orang lain. Harus sama persis dengan nilai
// VITE_GAS_UPLOAD_TOKEN yang diisi di GitHub Actions secrets.
var TOKEN = "GANTI_DENGAN_TOKEN_RAHASIA_KAMU";

// Nama folder di Google Drive tempat semua pamflet disimpan (dibuat otomatis
// kalau belum ada).
var FOLDER_NAME = "Pamflet";

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) {
      return jsonResponse({ error: "Token tidak valid." });
    }
    var folder = getOrCreateFolder(FOLDER_NAME);

    // Kalau file dengan nama yang sama sudah ada di folder ini, jangan
    // upload dobel -- langsung balikin link file yang sudah ada. Ini
    // membuat percobaan ulang otomatis dari sisi aplikasi (kalau responsnya
    // sempat gagal diterima browser padahal upload sebelumnya sudah
    // berhasil) aman dilakukan tanpa membuat file dobel di Drive.
    var existing = folder.getFilesByName(body.filename);
    if (existing.hasNext()) {
      var existingFile = existing.next();
      return jsonResponse({ url: "https://drive.google.com/file/d/" + existingFile.getId() + "/view" });
    }

    var bytes = Utilities.base64Decode(body.data);
    var blob = Utilities.newBlob(bytes, body.mimeType, body.filename);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return jsonResponse({ url: "https://drive.google.com/file/d/" + file.getId() + "/view" });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
