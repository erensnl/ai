// Test: https://ai-one-pi-67.vercel.app/api/ping  ->  {"ok":true}
module.exports = (req, res) => {
  res.status(200).json({ ok: true, time: new Date().toISOString() });
};
