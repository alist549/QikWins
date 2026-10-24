// Phone numbers in international form (+<country><number>), so QikWins works
// in any country. Zimbabwean local numbers (0771234567) are accepted too,
// as on QikDrive, and stored as +263...
function normalizePhone(input) {
  if (typeof input !== "string") return null;
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (/^0\d{9}$/.test(digits)) digits = `+263${digits.slice(1)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

module.exports = { normalizePhone };
