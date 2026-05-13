const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: "marketing-hub-496210",
    private_key_id: "5d4bb791dbfa3862f841e2821083c26c5175cb1b",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDUZcJ0NSMv9w9a\nhw7BpS0x2trBgtIR+dXpAb/3502zDePdPW/w+ICjE2CvwN2pSvK3YJa0iYndvN6a\nPJUQGtL3gKqWcGgGheO0bWw1wyLBDpzHfkz6zUwErSLyRg1Nq8YKitI2vn6aJkgg\nG+cLSuF57IEyQk3KSYZYRgKdiGid8In5bzSbEVO5Tfkx0k4zi0zaXx/S0ThQWI5Z\nbTrhnJIc8ovrUfnYRXo/dRzvy/nauMzj5GYZ8Ke8qMcVTX8ZUJ9YY85XlMjDsEbH\nqcmtBOUG8ymBErx996Y3yhSpFYF9VqeKRjKXjeEztVn4KwB4QGurfMzDwfFGsBP8\ngRf+vhqnAgMBAAECggEANTDgwFJ4Y/A256BwGR3BEj2xUAnvivHq2KYICdDi3AcL\n/CGBMbNCH9Tf/1PJDzcGTtdBFqhlHuNISg8G85gMIlCWKAOxgYSxUEOg+FvMjdWX\nfLxMEfks4vTrDgpuFXgBqi021N/i+76/jE8AjwrrKaoJduk06wZ7vwqVaBc7v+WC\ntuQPiBRQUreEoXA0imnnkOAVFHud7IhGONYVU0wGGdQcP6mbUw4YxLcwk6ls6CyX\nXwsSr7qgHuFBcGrd+JaNFTM6uXETNy4jEeotsgGzt3+beP3T97eq+FQJJuzkhR6i\nmFUtN4n4KX6EKAPWY54dM0ZTnR2PAM1/w/xY12Fu1QKBgQD8bt/XOptzBsgR2+cB\nafglOeFff92ntJZqqxj0EXit+kOANLro2v+48UP0elceySgkZiCSpPs46hDySliE\nU3ThPgofgkJIczSl9dG5LYmJpg9fwfUjY4J8S1wxjC8kn9SXvbiXBmLR+XnPJ6Me\nOWHk7uc4XdjcOyK2F1VIuZSFuwKBgQDXZhCELJ+UhFMckGPrKJMRvx2FWvM3IwEe\nniRDjBLOJxBAHimF0pkS6JqQWckrP3Y6FGT4xyGXwleQItaevQWWyNq5q8/J5LI3\ngohjicMwfy8AXmV3Q1hp+evbGKAWYNj0PvOT9bGMiJPw2Pgmopga0xVz5p0UamMg\nbpoo0l+aBQKBgQCbHUpgx/ujiARCrRzbCpHX1iQ9+aVrmxVewHpZ565/QaxeyIgd\n9Ax1SZPXU6HbIgKPs03KrqRMyc/WAoc38Mx+aA/yYql2OYydelr/7hJ4ydjin52R\nvGD/HZOuQpTpbWlGQOd/rgXlPuZxu8qJFPupoH/mbAyI77GZsObQBHFWZwKBgHtg\nCKHMdXM5/+jig3jUeri1gRE7MQgp0qBY8GiIONU/5rzzCdGO+QKtnKqF4wYUiYFm\n4Rbl6EXmmQUED25I0oS1cyLaWGBJ0BKff8OTyutiTeemKfQP7Pp2njOWfUuUGXB9\nBkN/fT0DlclkXW6zvu/ObAFA3EQvU6vl7gLnzL6JAoGBAN0Vr18B5ujidDxaYUYk\neGJ75sZkMURScfixdHmA1TVvYcypZDBOLnie20Y1JsAf85KF+OgcXDs5YPKmcXd/\ndMax+AJ82JC/D2PXBTCs5WjnnmSDa6gKZtgf8DZmlbL9jo07yY9vT0+Z/+YFpWbt\n4x/QulTJo2rHUq6PCMiSCpA0\n-----END PRIVATE KEY-----\n",
    client_email: "marketing-hub@marketing-hub-496210.iam.gserviceaccount.com",
    client_id: "114920605552035358827",
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = '1ZaYA-dER29TE40tj4I5aPZ62fVhnE14R9REt397YId8';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sheets = google.sheets({ version: 'v4', auth });
  const { action, sheet, data, range } = req.body || {};

  try {
    if (req.method === 'GET') {
      const tab = req.query.sheet;
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A:Z`,
      });
      return res.json({ values: result.data.values || [] });
    }

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
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'RAW',
        resource: { values: [data] },
      });
      return res.json({ ok: true });
    }

    if (action === 'clear') {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
      });
      return res.json({ ok: true });
    }

    if (action === 'batchUpdate') {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          valueInputOption: 'RAW',
          data: data,
        },
      });
      return res.json({ ok: true });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};