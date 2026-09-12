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
