Selecciona todo con **Edición → Seleccionar todo**, borra y pega esto:

```javascript
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: "marketing-hub-496210",
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: "114920605552035358827",
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

async function findRowById(sheets, tab, id) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A:A`,
  });
  const rows = result.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) return i + 1;
  }
  return -1;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    if (req.method === 'GET') {
      const tab = req.query.sheet;
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A:Z`,
      });
      return res.json({ values: result.data.values || [] });
    }

    const { action, sheet, data, id } = req.body || {};

    if (action === 'append') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet}!A:Z`,
        valueInputOption: 'RAW',
        resource: { values: [data] },
      });
      return res.json({ ok: true });
    }

    if (action === 'update') {
      const rowNum = await findRowById(sheets, sheet, id);
      if (rowNum === -1) return res.status(404).json({ error: 'Row not found' });
      const cols = String.fromCharCode(64 + data.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet}!A${rowNum}:${cols}${rowNum}`,
        valueInputOption: 'RAW',
        resource: { values: [data] },
      });
      return res.json({ ok: true });
    }

    if (action === 'delete') {
      const rowNum = await findRowById(sheets, sheet, id);
      if (rowNum === -1) return res.status(404).json({ error: 'Row not found' });
      const cols = 'Z';
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet}!A${rowNum}:${cols}${rowNum}`,
      });
      return res.json({ ok: true });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
```

Guarda con **Ctrl + S** y dime cuando esté listo.