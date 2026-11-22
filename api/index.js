// Vercel Serverless Function Entry Point for PitchFund API
const { handleRequest } = require('../server.js');

module.exports = async (req, res) => {
  try {
    return await handleRequest(req, res);
  } catch (err) {
    console.error('Unhandled Vercel Function Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error: ' + err.message }));
  }
};
