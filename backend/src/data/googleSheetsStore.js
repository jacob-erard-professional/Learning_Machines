/**
 * @file googleSheetsStore.js
 * Temporary persistence adapter backed by Google Sheets.
 *
 * Requests and admin overrides are stored as row-based records with a JSON
 * payload column so schema changes remain low-friction while the team is still
 * iterating quickly.
 */

import { google } from 'googleapis';

const REQUESTS_SHEET_NAME = process.env.GOOGLE_SHEETS_REQUESTS_SHEET_NAME ?? 'Requests';
const OVERRIDES_SHEET_NAME =
  process.env.GOOGLE_SHEETS_ADMIN_OVERRIDES_SHEET_NAME ?? 'AdminOverrides';
const STAFF_SHEET_NAME = process.env.GOOGLE_SHEETS_STAFF_SHEET_NAME ?? 'Staff';

const REQUEST_HEADERS = [
  'id',
  'updatedAt',
  'status',
  'eventDate',
  'eventCity',
  'eventZip',
  'requestorName',
  'json',
];

const OVERRIDE_HEADERS = [
  'requestId',
  'field',
  'timestamp',
  'json',
];

const STAFF_COLUMNS = [
  'staffId', 'zipCode', 'name', 'email', 'phone',
  'role', 'certifications', 'availableWeekdays', 'active', 'yearsExperience',
];

function parseStaffRows(rows = []) {
  if (rows.length < 2) return [];
  return rows.slice(1).map((row) => ({
    staffId: row[0] ?? '',
    zipCode: row[1] ?? '',
    name: row[2] ?? '',
    email: row[3] ?? '',
    phone: row[4] ?? '',
    role: row[5] ?? '',
    certifications: (row[6] ?? '').split(';').map((s) => s.trim()).filter(Boolean),
    availableWeekdays: (row[7] ?? '').split(';').map((s) => s.trim()).filter(Boolean),
    active: (row[8] ?? '').trim().toUpperCase() === 'TRUE',
    yearsExperience: Number(row[9] ?? 0) || 0,
  })).filter((s) => s.staffId);
}

function getSheetsConfig() {
  return {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '',
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? '',
    privateKey: (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  };
}

export function isGoogleSheetsConfigured() {
  const config = getSheetsConfig();
  return Boolean(config.spreadsheetId && config.clientEmail && config.privateKey);
}

function getAuthClient() {
  const config = getSheetsConfig();
  return new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  const auth = getAuthClient();
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

async function ensureSheetExists(sheets, spreadsheetId, title) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = metadata.data.sheets?.find((sheet) => sheet.properties?.title === title);
  if (existing) return existing.properties.sheetId;

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });

  return response.data.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
}

async function replaceSheetValues(sheets, spreadsheetId, sheetName, values) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

function buildRequestRows(requests) {
  return [
    REQUEST_HEADERS,
    ...requests.map((request) => [
      request.id ?? '',
      request.updatedAt ?? '',
      request.status ?? '',
      request.eventDate ?? '',
      request.eventCity ?? '',
      request.eventZip ?? '',
      request.requestorName ?? '',
      JSON.stringify(request),
    ]),
  ];
}

function buildOverrideRows(adminOverrides) {
  return [
    OVERRIDE_HEADERS,
    ...adminOverrides.map((override) => [
      override.requestId ?? '',
      override.field ?? '',
      override.timestamp ?? '',
      JSON.stringify(override),
    ]),
  ];
}

function parseJsonColumn(rows = []) {
  return rows
    .slice(1)
    .map((row) => row[row.length - 1])
    .filter(Boolean)
    .map((value) => {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function loadStateFromGoogleSheets() {
  const config = getSheetsConfig();
  const sheets = await getSheetsClient();

  await ensureSheetExists(sheets, config.spreadsheetId, REQUESTS_SHEET_NAME);
  await ensureSheetExists(sheets, config.spreadsheetId, OVERRIDES_SHEET_NAME);

  const [requestsRes, overridesRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${REQUESTS_SHEET_NAME}!A:H`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${OVERRIDES_SHEET_NAME}!A:D`,
    }),
  ]);

  return {
    requests: parseJsonColumn(requestsRes.data.values),
    adminOverrides: parseJsonColumn(overridesRes.data.values),
  };
}

export async function saveStateToGoogleSheets({ requests, adminOverrides }) {
  const config = getSheetsConfig();
  const sheets = await getSheetsClient();

  await ensureSheetExists(sheets, config.spreadsheetId, REQUESTS_SHEET_NAME);
  await ensureSheetExists(sheets, config.spreadsheetId, OVERRIDES_SHEET_NAME);

  await Promise.all([
    replaceSheetValues(
      sheets,
      config.spreadsheetId,
      REQUESTS_SHEET_NAME,
      buildRequestRows(requests)
    ),
    replaceSheetValues(
      sheets,
      config.spreadsheetId,
      OVERRIDES_SHEET_NAME,
      buildOverrideRows(adminOverrides)
    ),
  ]);
}

export async function loadStaffFromGoogleSheets() {
  const config = getSheetsConfig();
  const sheets = await getSheetsClient();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${STAFF_SHEET_NAME}!A:J`,
    });
    return parseStaffRows(res.data.values ?? []);
  } catch (err) {
    console.error('[googleSheetsStore] Failed to load Staff sheet:', err.message);
    return [];
  }
}
