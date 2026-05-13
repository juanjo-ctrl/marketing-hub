const API = '/api/sheets';

export async function getSheet(sheet) {
  const res = await fetch(`${API}?sheet=${sheet}`);
  const data = await res.json();
  return data.values || [];
}

export async function appendRow(sheet, data) {
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'append', sheet, data }),
  });
}

export async function updateRow(range, data) {
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', range, data }),
  });
}

export async function clearRow(range) {
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clear', range }),
  });
}

export function clientToRow(c) {
  return [c.id, c.name, c.sector, c.status, c.since, c.clientType, c.management, c.notes, c.driveUrl];
}

export function rowToClient(r) {
  return { id: +r[0], name: r[1], sector: r[2], status: r[3], since: r[4], clientType: r[5], management: r[6] || '', notes: r[7] || '', driveUrl: r[8] || '' };
}

export function taskToRow(t) {
  return [t.id, t.clientId, t.title, t.assigned, t.taskStatus, t.recurrent ? '1' : '0', t.recurrence, t.dueDate, t.notes];
}

export function rowToTask(r) {
  return { id: +r[0], clientId: +r[1], title: r[2], assigned: r[3], taskStatus: r[4], recurrent: r[5] === '1', recurrence: r[6] || '', dueDate: r[7] || '', notes: r[8] || '' };
}

export function userToRow(u) {
  return [u.id, u.username, u.password, u.name, u.role];
}

export function rowToUser(r) {
  return { id: +r[0], username: r[1], password: r[2], name: r[3], role: r[4] };
}