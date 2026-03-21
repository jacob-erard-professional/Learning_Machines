/**
 * @file googleAuth.js
 * Gmail OAuth2 helpers for generating consent URLs, exchanging auth codes,
 * and persisting tokens locally for the backend to reuse.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const DEFAULT_TOKEN_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../.gmail-oauth.json'
);

function getAuthConfig() {
  return {
    clientId: process.env.GMAIL_OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET ?? '',
    redirectUri: process.env.GMAIL_OAUTH_REDIRECT_URI ?? '',
    tokenFile: process.env.GMAIL_OAUTH_TOKEN_PATH ?? DEFAULT_TOKEN_FILE,
    fromAddress: process.env.MAIL_FROM_ADDRESS ?? 'erardjacob@gmail.com',
    fromName: process.env.MAIL_FROM_NAME ?? 'Learning Machines',
  };
}

export function isGoogleAuthConfigured() {
  const config = getAuthConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

function createOAuthClient() {
  const config = getAuthConfig();
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
}

async function readStoredTokens() {
  const { tokenFile } = getAuthConfig();

  try {
    const raw = await fs.readFile(tokenFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeStoredTokens(tokens) {
  const { tokenFile } = getAuthConfig();
  await fs.mkdir(path.dirname(tokenFile), { recursive: true });
  await fs.writeFile(tokenFile, JSON.stringify(tokens, null, 2));
}

export async function clearStoredTokens() {
  const { tokenFile } = getAuthConfig();
  try {
    await fs.unlink(tokenFile);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

export function getGoogleConnectUrl() {
  if (!isGoogleAuthConfigured()) {
    throw new Error(
      'Google OAuth is not configured. Set GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, and GMAIL_OAUTH_REDIRECT_URI.'
    );
  }

  return createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GMAIL_SEND_SCOPE],
  });
}

export async function exchangeCodeForTokens(code) {
  if (!isGoogleAuthConfigured()) {
    throw new Error(
      'Google OAuth is not configured. Set GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, and GMAIL_OAUTH_REDIRECT_URI.'
    );
  }

  const client = createOAuthClient();
  const existing = await readStoredTokens();
  const { tokens } = await client.getToken(code);

  const mergedTokens = {
    ...existing,
    ...tokens,
    refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
  };

  if (!mergedTokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Re-run consent with prompt=consent and access_type=offline.'
    );
  }

  await writeStoredTokens(mergedTokens);
  client.setCredentials(mergedTokens);

  const oauth2 = google.oauth2({ auth: client, version: 'v2' });
  const profile = await oauth2.userinfo.get().catch(() => ({ data: {} }));

  return {
    email: profile.data.email ?? null,
    scope: mergedTokens.scope ?? null,
    expiryDate: mergedTokens.expiry_date ?? null,
    tokenFile: getAuthConfig().tokenFile,
  };
}

export async function getGoogleAuthStatus() {
  const config = getAuthConfig();
  const configured = isGoogleAuthConfigured();
  const tokens = configured ? await readStoredTokens() : null;

  return {
    configured,
    connected: Boolean(tokens?.refresh_token),
    redirectUri: config.redirectUri || null,
    fromAddress: config.fromAddress,
    fromName: config.fromName,
    tokenFile: config.tokenFile,
    hasRefreshToken: Boolean(tokens?.refresh_token),
  };
}

export async function getAuthorizedOAuthClient() {
  if (!isGoogleAuthConfigured()) {
    return null;
  }

  const tokens = await readStoredTokens();
  if (!tokens?.refresh_token) {
    return null;
  }

  const client = createOAuthClient();
  client.setCredentials(tokens);
  return client;
}
