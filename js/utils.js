// ==========================================================
// UTILS & HELPER FUNCTIONS
// ==========================================================

// Fungsi salin teks luring ke papan klip peramban (Clipboard API fallback)
function copyText(textToCopy, successMessage) {
  const dummy = document.createElement('textarea');
  dummy.value = textToCopy;
  document.body.appendChild(dummy);
  dummy.select();
  document.execCommand('copy');
  document.body.removeChild(dummy);
  showToast(successMessage || "Berhasil disalin!");
}

// Fungsi acak sandi aman biner
function generateSecurePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const pwInput = document.getElementById('generated-password-input');
  if (pwInput) pwInput.value = pass;
}

function copyGeneratedPassword() {
  const pwInput = document.getElementById('generated-password-input');
  if (pwInput && pwInput.value) {
    copyText(pwInput.value, "Kata sandi aman berhasil disalin!");
  }
}