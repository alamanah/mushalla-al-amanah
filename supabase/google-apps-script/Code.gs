// Upload Pamflet -- Google Apps Script Web App
//
// Salin-tempel seluruh isi file ini ke project baru di https://script.google.com/,
// ganti nilai TOKEN di bawah dengan teks rahasia buatanmu sendiri, lalu Deploy sebagai
// Web app (Execute as: Me, Who has access: Anyone).
//
// Panduan lengkap langkah demi langkah ada di supabase/SETUP.md, bagian
// "6. (Opsional) Upload Pamflet otomatis ke Google Drive" dan
// "7. (Opsional) Pamflet dibuat AI (Gemini)".

// Ganti dengan teks rahasia bebas -- semacam kata sandi supaya alamat upload ini
// tidak bisa dipakai sembarang orang lain. Harus sama persis dengan nilai
// VITE_GAS_UPLOAD_TOKEN yang diisi di GitHub Actions secrets.
var TOKEN = "GANTI_DENGAN_TOKEN_RAHASIA_KAMU";

// Nama folder di Google Drive tempat semua pamflet disimpan (dibuat otomatis
// kalau belum ada).
var FOLDER_NAME = "Pamflet";

// Model Gemini yang dipakai untuk fitur "Buat dengan AI" (opsional, lihat
// bagian 7 di SETUP.md). "-lite" dipilih sebagai default karena paling murah
// per gambar -- ganti ke "gemini-3.1-flash-image" (tanpa "-lite") kalau mau
// kualitas lebih tinggi dengan biaya sedikit lebih mahal per gambar.
var GEMINI_MODEL = "gemini-3.1-flash-lite-image";

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) {
      return jsonResponse({ error: "Token tidak valid." });
    }

    // action "generate" (opsional, fitur "Buat dengan AI") -- BEDA dari alur
    // upload biasa: di sini cuma membuat gambarnya lewat Gemini API dan
    // mengembalikannya ke browser sebagai base64 untuk dipratinjau dulu.
    // BELUM diupload ke Drive -- upload baru terjadi lewat request terpisah
    // (action default/"upload" di bawah) setelah pengurus klik "Pakai
    // Pamflet Ini", sama seperti alur pamflet template biasa.
    if (body.action === "generate") {
      return generateWithGemini_(body.prompt);
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

// Panggil Gemini API (Google AI Studio) untuk menggambar pamflet dari teks
// prompt yang sudah disusun di sisi aplikasi (lihat src/lib/pamfletAiGenerate.ts).
// API key SENGAJA disimpan di sini (Script Properties), BUKAN di kode
// frontend/GitHub -- supaya key berbayar ini tidak pernah ke-expose ke
// browser pengunjung/tidak bisa diambil siapa pun dari file JS yang
// di-publish ke GitHub Pages.
function generateWithGemini_(prompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse({
      error: "GEMINI_API_KEY belum diisi di Script Properties Apps Script ini. Lihat SETUP.md bagian 7.",
    });
  }
  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent";
  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"] },
  };
  var res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { "x-goog-api-key": apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var status = res.getResponseCode();
  var json;
  try {
    json = JSON.parse(res.getContentText());
  } catch (parseErr) {
    return jsonResponse({ error: "Respons Gemini tidak valid (" + status + ")." });
  }
  if (status !== 200) {
    var apiErrMsg = (json && json.error && json.error.message) || "Gemini API menolak permintaan (" + status + ").";
    return jsonResponse({ error: apiErrMsg });
  }
  var parts = ((((json.candidates || [])[0] || {}).content || {}).parts) || [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].inlineData && parts[i].inlineData.data) {
      return jsonResponse({ image: parts[i].inlineData.data, mimeType: parts[i].inlineData.mimeType || "image/png" });
    }
  }
  return jsonResponse({ error: "Gemini tidak mengembalikan gambar. Coba lagi atau ubah isian." });
}

function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
