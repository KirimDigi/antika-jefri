/**
 * ====================================================================
 * GOOGLE APPS SCRIPT - BUKU TAMU & RSVP DIGITAL WEDDING
 * Pengantin: Antika & Jefri
 * Spreadsheet ID: 1Xzz931-lMdjLbk3k9hCZu-sYkH8Nv0luotueHASaM6o
 * Sheet Name: Sheet1
 * ====================================================================
 * 
 * CARA MEMASANG:
 * 1. Buka spreadsheet: https://docs.google.com/spreadsheets/d/1Xzz931-lMdjLbk3k9hCZu-sYkH8Nv0luotueHASaM6o/edit
 * 2. Klik menu "Extensions" (Ekstensi) > "Apps Script".
 * 3. Hapus semua kode yang ada di editor Apps Script, lalu PASTE seluruh kode di bawah ini.
 * 4. Klik ikon "Save" (Simpan).
 * 5. Klik tombol "Deploy" (Terapkan) berwarna biru di kanan atas > "New deployment" (Penerapan baru).
 * 6. Klik ikon gerigi (Settings) di sebelah "Select type", pilih "Web app".
 * 7. Isi:
 *    - Description: RSVP Undangan Antika & Jefri
 *    - Execute as: "Me" (Email Google Anda)
 *    - Who has access: "Anyone" (Siapa saja)  <-- PENTING agar tamu bisa kirim & baca
 * 8. Klik "Deploy", beri izin (Authorize Access) jika diminta Google.
 * 9. Salin "Web App URL" yang diberikan (berakhiran /exec).
 * 10. Buka file index.html, cari variabel GOOGLE_SCRIPT_URL dan paste URL Web App tersebut.
 */

const SPREADSHEET_ID = "1Xzz931-lMdjLbk3k9hCZu-sYkH8Nv0luotueHASaM6o";
const SHEET_NAME = "Sheet1";

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // Buat header otomatis jika sheet masih kosong
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Nama Tamu",
      "Ucapan",
      "Konfirmasi Kehadiran",
      "Jumlah Tamu"
    ]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#e6ccb2");
  }
  return sheet;
}

// --------------------------------------------------------------------
// 1. GET: Mengambil daftar ucapan dari Spreadsheet
// --------------------------------------------------------------------
function doGet(e) {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const rows = [];

    // Mulai dari baris 1 (lewati baris 0 / header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] || row[2]) {
        let formattedDate = "";
        if (row[0] instanceof Date) {
          formattedDate = Utilities.formatDate(row[0], "Asia/Jakarta", "dd MMM yyyy, HH:mm");
        } else {
          formattedDate = row[0] ? String(row[0]) : "";
        }

        rows.push({
          timestamp: formattedDate,
          nama: String(row[1] || ""),
          ucapan: String(row[2] || ""),
          kehadiran: String(row[3] || ""),
          jumlahTamu: String(row[4] || "-")
        });
      }
    }

    // Urutkan dari ucapan terbaru di paling atas
    rows.reverse();

    const result = {
      status: "success",
      total: rows.length,
      data: rows
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --------------------------------------------------------------------
// 2. POST: Menyimpan ucapan & konfirmasi kehadiran baru
// --------------------------------------------------------------------
function doPost(e) {
  try {
    const sheet = getSheet();
    let nama = "";
    let ucapan = "";
    let kehadiran = "";
    let jumlahTamu = "-";

    // Dukung format JSON body maupun application/x-www-form-urlencoded
    if (e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        nama = body.nama || body.author || "";
        ucapan = body.ucapan || body.comment || "";
        kehadiran = body.kehadiran || body.attendance || "";
        jumlahTamu = body.jumlahTamu || body.guest || "-";
      } catch (err) {
        if (e.parameter) {
          nama = e.parameter.nama || e.parameter.author || "";
          ucapan = e.parameter.ucapan || e.parameter.comment || "";
          kehadiran = e.parameter.kehadiran || e.parameter.attendance || "";
          jumlahTamu = e.parameter.jumlahTamu || e.parameter.guest || "-";
        }
      }
    } else if (e.parameter) {
      nama = e.parameter.nama || e.parameter.author || "";
      ucapan = e.parameter.ucapan || e.parameter.comment || "";
      kehadiran = e.parameter.kehadiran || e.parameter.attendance || "";
      jumlahTamu = e.parameter.jumlahTamu || e.parameter.guest || "-";
    }

    if (!nama.trim() || !ucapan.trim()) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Nama dan ucapan wajib diisi."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Format waktu sekarang (WIB / GMT+7)
    const timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd MMM yyyy, HH:mm");

    // Normalisasi teks kehadiran
    let statusKehadiran = kehadiran;
    if (kehadiran === "present") statusKehadiran = "Hadir";
    else if (kehadiran === "notpresent") statusKehadiran = "Tidak Hadir";
    else if (kehadiran === "notsure") statusKehadiran = "Masih Ragu";

    // Normalisasi jumlah tamu (otomatis "-" jika Tidak Hadir)
    let guestStr = jumlahTamu;
    if (statusKehadiran === "Tidak Hadir") {
      guestStr = "-";
    } else if (jumlahTamu && jumlahTamu !== "-") {
      guestStr = jumlahTamu.toString().includes("orang") ? jumlahTamu : jumlahTamu + " orang";
    }

    // Tambah baris baru ke Sheet1
    sheet.appendRow([
      timestamp,
      nama.trim(),
      ucapan.trim(),
      statusKehadiran,
      guestStr
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Terima kasih! Doa dan ucapan Anda telah berhasil disimpan."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
