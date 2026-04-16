/**
 * Returns the current Manila time (PHT) as a MySQL-compatible string YYYY-MM-DD HH:mm:ss
 */
function getPHTNow() {
  const d = new Date();
  // Adjust to Manila time manually to be 100% sure regardless of server TZ
  const manilaDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  
  const Y = manilaDate.getFullYear();
  const M = String(manilaDate.getMonth() + 1).padStart(2, '0');
  const D = String(manilaDate.getDate()).padStart(2, '0');
  const H = String(manilaDate.getHours()).padStart(2, '0');
  const m = String(manilaDate.getMinutes()).padStart(2, '0');
  const s = String(manilaDate.getSeconds()).padStart(2, '0');
  
  return `${Y}-${M}-${D} ${H}:${m}:${s}`;
}

module.exports = { getPHTNow };
