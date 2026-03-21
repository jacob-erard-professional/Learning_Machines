import { Router } from 'express';
import {
  clearStoredTokens,
  exchangeCodeForTokens,
  getGoogleAuthStatus,
  getGoogleConnectUrl,
} from '../lib/googleAuth.js';

const router = Router();

router.get('/google/status', async (req, res) => {
  try {
    const status = await getGoogleAuthStatus();
    return res.json({
      ...status,
      connectUrl: status.configured ? getGoogleConnectUrl() : null,
    });
  } catch (err) {
    console.error('[GET /auth/google/status]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

router.get('/google/connect', (req, res) => {
  try {
    return res.redirect(getGoogleConnectUrl());
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    if (!req.query.code) {
      return res.status(400).json({
        error: 'MISSING_AUTH_CODE',
        message: 'Google callback did not include an authorization code.',
      });
    }

    const result = await exchangeCodeForTokens(req.query.code);
    return res.json({
      connected: true,
      message: 'Google authorization saved. New form submissions can now send Gmail messages.',
      ...result,
    });
  } catch (err) {
    console.error('[GET /auth/google/callback]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

router.post('/google/disconnect', async (req, res) => {
  try {
    await clearStoredTokens();
    return res.json({ connected: false, message: 'Stored Google OAuth tokens were removed.' });
  } catch (err) {
    console.error('[POST /auth/google/disconnect]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

export default router;
