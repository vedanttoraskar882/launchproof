import { processSubmission } from './submit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload.' });
    }
  }

  payload = { ...payload, type: 'early-access' };
  const result = await processSubmission(payload, clientIp);
  return res.status(result.status).json(result.data);
}
