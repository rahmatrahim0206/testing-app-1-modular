// ==========================================================
// GOOGLE AUTHENTICATOR MIGRATION & TOTP DECODER ENGINE
// ==========================================================

// Fungsi baca struktur varint biner
function readVarint(bytes, offset) {
  let value = 0;
  let shift = 0;
  while (true) {
    if (offset >= bytes.length) throw new Error("Varint terpotong");
    const b = bytes[offset++];
    value |= (b & 0x7F) << shift;
    if (!(b & 0x80)) break;
    shift += 7;
    if (shift > 35) throw new Error("Varint terlalu besar");
  }
  return { value, offset };
}

// Pengurai manual Google Protobuf Payload
function parseProtobuf(bytes) {
  let offset = 0;
  const fields = [];
  while (offset < bytes.length) {
    try {
      const keyResult = readVarint(bytes, offset);
      const key = keyResult.value;
      offset = keyResult.offset;
      const wireType = key & 0x07;
      const fieldNumber = key >>> 3;
      
      let value;
      if (wireType === 0) {
        const varintResult = readVarint(bytes, offset);
        value = varintResult.value;
        offset = varintResult.offset;
      } else if (wireType === 2) {
        const lenResult = readVarint(bytes, offset);
        const len = lenResult.value;
        offset = lenResult.offset;
        value = bytes.slice(offset, offset + len);
        offset += len;
      } else if (wireType === 1) {
        value = bytes.slice(offset, offset + 8);
        offset += 8;
      } else if (wireType === 5) {
        value = bytes.slice(offset, offset + 4);
        offset += 4;
      } else {
        break; 
      }
      fields.push({ fieldNumber, wireType, value });
    } catch (e) {
      break;
    }
  }
  return fields;
}

// Konversi UInt8Array biner ke Base32 String kustom
function uint8ArrayToBase32(arr) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < arr.length; i++) {
    value = (value << 8) | arr[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

// Mengubah String Base64 URL-Safe aman menjadi normal
function safeAtob(str) {
  let padded = str.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  while (padded.length % 4 !== 0) {
    padded += '=';
  }
  return atob(padded);
}

// Fungsi utama decode QR ekspor massal Google Authenticator
function parseGoogleMigrationUri(uri) {
  try {
    const urlObj = new URL(uri);
    const dataParam = urlObj.searchParams.get("data");
    if (!dataParam) return null;
    
    const binaryString = safeAtob(dataParam);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const fields = parseProtobuf(bytes);
    const accounts = [];
    const otpParamsFields = fields.filter(f => f.fieldNumber === 1 && f.wireType === 2);
    
    for (const field of otpParamsFields) {
      const subFields = parseProtobuf(field.value);
      let secretBytes = null;
      let name = "";
      let issuer = "";
      
      for (const sf of subFields) {
        if (sf.fieldNumber === 1 && sf.wireType === 2) {
          secretBytes = sf.value;
        } else if (sf.fieldNumber === 2 && sf.wireType === 2) {
          name = new TextDecoder().decode(sf.value);
        } else if (sf.fieldNumber === 3 && sf.wireType === 2) {
          issuer = new TextDecoder().decode(sf.value);
        }
      }
      
      if (secretBytes && secretBytes.length > 0) {
        const base32Secret = uint8ArrayToBase32(secretBytes);
        accounts.push({
          label: issuer || name || "Akun Google",
          user: name || "-",
          key: base32Secret
        });
      }
    }
    return accounts;
  } catch (e) {
    console.error("Kesalahan parsing data migrasi:", e);
    return null;
  }
}

// Eksekusi pemrosesan QR Code hasil pindai (Kamera/Unggah Berkas)
function handleQrCodeResult(res) {
  if (res.startsWith('otpauth-migration://')) {
    const accounts = parseGoogleMigrationUri(res);
    if (accounts && accounts.length > 0) {
      let successCount = 0;
      accounts.forEach(acc => {
        const newId = '2fa-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        if (!authenticatorKeys.some(k => k.key === acc.key)) {
          authenticatorKeys.push({
            id: newId,
            label: acc.label,
            user: acc.user,
            key: acc.key
          });
          successCount++;
        }
      });
      if (successCount > 0) {
        saveAuthenticatorKeys();
        renderAuthenticatorKeys();
        showToast(`Berhasil mengimpor ${successCount} akun dari Google Authenticator!`, 'success');
      } else {
        showToast("Semua akun migrasi ini sudah terdaftar sebelumnya di portal.", "warning");
      }
    } else {
      showToast("Gagal menguraikan berkas migrasi Google Authenticator.", "error");
    }
    return;
  }

  const parsed = parseOtpAuthUri(res);
  if (parsed) {
    document.getElementById('auth-main-label').value = parsed.label;
    document.getElementById('auth-main-user').value = parsed.user;
    document.getElementById('auth-main-key').value = parsed.key;
    save2FaKeyFromMain();
  } else {
    const cleaned = res.replace(/[\s\-=]+/g, '').toUpperCase();
    if (/^[A-Z2-7]+$/.test(cleaned)) {
      document.getElementById('auth-main-key').value = cleaned;
      showToast("Kunci rahasia berhasil dimuat. Lengkapi nama layanan lalu simpan.", "warning");
    } else {
      showToast("Hasil scan QR Code tidak mengandung format OTP valid.", "error");
    }
  }
}