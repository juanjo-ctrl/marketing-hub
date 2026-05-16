import { useState, useEffect } from "react";
import { getSheet, appendRow, updateRow, deleteRow, clientToRow, rowToClient, taskToRow, rowToTask, userToRow, rowToUser } from "./sheets";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg: "#ffffff", surface: "#f8f8f8", surfaceAlt: "#f0f0f0",
  border: "#e0e0e0", text: "#111111", textMid: "#555555", textLight: "#999999", black: "#111111",
  red: "#c53030", redBg: "#fff5f5", redBorder: "#feb2b2",
  yellow: "#b7791f", yellowBg: "#fffff0", yellowBorder: "#faf089",
  green: "#276749", greenBg: "#f0fff4", greenBorder: "#9ae6b4",
};

const STATUS_CONFIG = {
  sin_hacer:  { label: "Sin hacer",  color: C.red,    bg: C.redBg,    border: C.redBorder,    dot: C.red    },
  en_tramite: { label: "En trámite", color: C.yellow, bg: C.yellowBg, border: C.yellowBorder, dot: C.yellow },
  hecho:      { label: "Hecho",      color: C.green,  bg: C.greenBg,  border: C.greenBorder,  dot: C.green  },
};

const CLIENT_STATUS = {
  activo:    { label: "Activo",    color: C.green },
  potencial: { label: "Potencial", color: C.yellow },
  pausado:   { label: "Pausado",   color: C.textLight },
};

const RECURRENCE_LABELS = {
  lunes: "Cada lunes", martes: "Cada martes", miercoles: "Cada miércoles",
  jueves: "Cada jueves", viernes: "Cada viernes",
  mensual: "Mensual", quincenal: "Quincenal",
};

const NAV_ITEMS = [
  { id: "tablero",  label: "Tablero",  icon: "▦" },
  { id: "clientes", label: "Clientes", icon: "◉" },
  { id: "tareas",   label: "Tareas",   icon: "✓" },
  { id: "equipo",   label: "Equipo",   icon: "⊙", adminOnly: true },
];

const FALLBACK_USERS = [
  { id: 1, username: "juanjo",  password: "juanjo123",  name: "Juanjo",  role: "admin"  },
  { id: 2, username: "dolores", password: "dolores123", name: "Dolores", role: "member" },
  { id: 3, username: "nadia",   password: "nadia123",   name: "Nadia",   role: "member" },
];

function today() { return new Date().toISOString().split("T")[0]; }
let _id = 200; function uid() { return _id++; }

// ── HOOKS ─────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

// ── BASE COMPONENTS ───────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.black, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, flexShrink: 0, letterSpacing: "0.02em" }}>
      {(name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

function StatusPill({ status, onChange }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.sin_hacer;
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 7px", borderRadius: 99, border: `1.5px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }} />{cfg.label}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 140 }}>
          {Object.entries(STATUS_CONFIG).map(([key, c]) => (
            <button key={key} onClick={() => { onChange(key); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", background: "none", border: "none", fontSize: 13, fontWeight: 600, color: c.color, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />{c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000, padding: 0 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, padding: "24px 24px 32px", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: C.border, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textLight, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMid, marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.black}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inp = { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const btnP = { padding: "11px 20px", borderRadius: 10, border: "none", background: C.black, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "inherit" };
const btnS = { padding: "11px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "none", color: C.textMid, cursor: "pointer", fontSize: 15, fontWeight: 600, fontFamily: "inherit" };
const btnD = { padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.redBorder}`, background: C.redBg, color: C.red, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" };

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ users, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isMobile = useIsMobile();

  const handleLogin = () => {
    const user = users.find(u => u.username === username.toLowerCase().trim() && u.password === password);
    if (user) onLogin(user); else setError("Usuario o contraseña incorrectos.");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: isMobile ? 32 : 28, fontWeight: 800, color: C.text, letterSpacing: "-0.04em" }}>b2bpro</div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Acceso del equipo</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
          <Field label="Usuario"><input style={inp} value={username} onChange={e => { setUsername(e.target.value); setError(""); }} placeholder="tu usuario..." onKeyDown={e => e.key === "Enter" && handleLogin()} /></Field>
          <Field label="Contraseña"><input type="password" style={inp} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} /></Field>
          {error && <div style={{ fontSize: 13, color: C.red, marginBottom: 14, fontWeight: 600 }}>⚠ {error}</div>}
          <button onClick={handleLogin} style={{ ...btnP, width: "100%", fontSize: 16, padding: "13px 0" }}>Entrar</button>
        </div>
      </div>
    </div>
  );
}

// ── FORMS ─────────────────────────────────────────────────────────────────────
function UserForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: "", username: "", password: "", role: "member" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <>
      <Field label="Nombre"><input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nombre Apellido" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Usuario"><input style={inp} value={form.username} onChange={e => set("username", e.target.value.toLowerCase().trim())} placeholder="usuario" /></Field>
        <Field label="Contraseña"><input style={inp} value={form.password} onChange={e => set("password", e.target.value)} placeholder="contraseña" /></Field>
      </div>
      <Field label="Rol">
        <div style={{ display: "flex", gap: 8 }}>
          {[["admin", "Administrador"], ["member", "Miembro"]].map(([val, label]) => {
            const sel = form.role === val;
            return <button key={val} onClick={() => set("role", val)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${sel ? C.black : C.border}`, background: sel ? C.black : C.surface, color: sel ? "#fff" : C.textMid, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>{label}</button>;
          })}
        </div>
      </Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={btnS}>Cancelar</button>
        <button onClick={() => form.name && form.username && form.password && onSave(form)} style={btnP}>Guardar</button>
      </div>
    </>
  );
}

function TaskForm({ clients, users, initial, currentUser, onSave, onClose }) {
  const isAdmin = currentUser.role === "admin";
  const visibleClients = isAdmin ? clients : clients.filter(c => c.manager === currentUser.name);
  const [form, setForm] = useState(initial || { clientId: visibleClients[0]?.id || "", title: "", assigned: currentUser.name, taskStatus: "sin_hacer", recurrent: false, recurrence: "lunes", dueDate: today(), notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <>
      <Field label="Cliente">
        <select style={inp} value={form.clientId} onChange={e => set("clientId", +e.target.value)}>
          {visibleClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Tarea"><input style={inp} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Describe la tarea..." /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Asignado a">
          {isAdmin
            ? <select style={inp} value={form.assigned} onChange={e => set("assigned", e.target.value)}>{users.map(u => <option key={u.id}>{u.name}</option>)}</select>
            : <div style={{ ...inp, color: C.textMid, background: C.surfaceAlt }}>{currentUser.name}</div>}
        </Field>
        <Field label="Estado">
          <select style={inp} value={form.taskStatus} onChange={e => set("taskStatus", e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Fecha límite"><input type="date" style={inp} value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></Field>
      <Field label="Recurrencia">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: C.textMid, cursor: "pointer" }}>
            <input type="checkbox" checked={form.recurrent} onChange={e => set("recurrent", e.target.checked)} style={{ accentColor: C.black, width: 16, height: 16 }} />
            Es recurrente
          </label>
          {form.recurrent && (
            <select style={{ ...inp, width: "auto" }} value={form.recurrence} onChange={e => set("recurrence", e.target.value)}>
              {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
        </div>
      </Field>
      <Field label="Notas"><textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Contexto, instrucciones..." /></Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={btnS}>Cancelar</button>
        <button onClick={() => form.title && onSave(form)} style={btnP}>Guardar tarea</button>
      </div>
    </>
  );
}

function ClientForm({ initial, users, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: "", sector: "", status: "activo", since: today().slice(0, 7), clientType: "B", management: "", notes: "", driveUrl: "", manager: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <>
      <Field label="Nombre"><input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Empresa S.L." /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Sector"><input style={inp} value={form.sector} onChange={e => set("sector", e.target.value)} placeholder="Consultoría..." /></Field>
        <Field label="Estado">
          <select style={inp} value={form.status} onChange={e => set("status", e.target.value)}>
            <option value="activo">Activo</option><option value="potencial">Potencial</option><option value="pausado">Pausado</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tipo de cliente">
          <div style={{ display: "flex", gap: 8 }}>
            {["A", "B", "C"].map(t => { const sel = form.clientType === t; return <button key={t} onClick={() => set("clientType", t)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `2px solid ${sel ? C.black : C.border}`, background: sel ? C.black : C.surface, color: sel ? "#fff" : C.textMid, cursor: "pointer", fontWeight: 800, fontSize: 16, fontFamily: "inherit" }}>{t}</button>; })}
          </div>
        </Field>
        <Field label="Mes de inicio"><input type="month" style={inp} value={form.since} onChange={e => set("since", e.target.value)} /></Field>
      </div>
      <Field label="Responsable de gestión">
        <select style={inp} value={form.manager} onChange={e => set("manager", e.target.value)}>
          <option value="">— Sin asignar —</option>
          {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
        <div style={{ fontSize: 11, color: C.textLight, marginTop: 5 }}>Solo este usuario verá este cliente (además del admin)</div>
      </Field>
      <Field label="Gestión a realizar"><textarea style={{ ...inp, minHeight: 68, resize: "vertical" }} value={form.management} onChange={e => set("management", e.target.value)} placeholder="2 posts LinkedIn semanales + informe mensual..." /></Field>
      <Field label="Notas internas"><textarea style={{ ...inp, minHeight: 68, resize: "vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Observaciones, preferencias del cliente..." /></Field>
      <Field label="Carpeta de Google Drive">
        <input style={inp} value={form.driveUrl} onChange={e => set("driveUrl", e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
      </Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={btnS}>Cancelar</button>
        <button onClick={() => form.name && onSave(form)} style={btnP}>Guardar cliente</button>
      </div>
    </>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function MarketingHub() {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState(FALLBACK_USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("tablero");
  const [filterClient, setFilterClient] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterPerson, setFilterPerson] = useState("todos");
  const [clientSearch, setClientSearch] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [uRows, cRows, tRows] = await Promise.all([
          getSheet("Usuarios"), getSheet("Clientes"), getSheet("Tareas"),
        ]);
        if (uRows.length > 1) setUsers(uRows.slice(1).map(rowToUser));
        if (cRows.length > 1) setClients(cRows.slice(1).map(rowToClient));
        if (tRows.length > 1) setTasks(tRows.slice(1).map(rowToTask));
      } catch (e) {
        console.error("Error cargando datos:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 20 }}>b2bpro</div>
        <Spinner />
        <div style={{ fontSize: 13, color: C.textLight, marginTop: 16 }}>Cargando datos...</div>
      </div>
    </div>
  );

  if (!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} />;

  const isAdmin = currentUser.role === "admin";
  const closeModal = () => setModal(null);

  // Clientes visibles según rol
  const visibleClients = isAdmin
    ? clients
    : clients.filter(c => !c.manager || c.manager === currentUser.name);

  // Clientes ordenados alfabéticamente y filtrados por búsqueda
  const sortedClients = [...visibleClients]
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));

  // ── USERS CRUD ────────────────────────────────────────────────────────────
  // ── USERS CRUD ────────────────────────────────────────────────────────────
  const addUser = async (form) => {
    const newUser = { ...form, id: uid() };
    await appendRow("Usuarios", userToRow(newUser));
    setUsers(u => [...u, newUser]);
    closeModal();
  };
  const updateUser = async (id, form) => {
    const updated = { ...users.find(u => u.id === id), ...form };
    await updateRow("Usuarios", id, userToRow(updated));
    setUsers(u => u.map(x => x.id === id ? updated : x));
    closeModal();
  };
  const deleteUser = async (id) => {
    await deleteRow("Usuarios", id);
    setUsers(u => u.filter(x => x.id !== id));
  };

  // ── TASKS CRUD ────────────────────────────────────────────────────────────
  const addTask = async (form) => {
    const newTask = { ...form, assigned: isAdmin ? form.assigned : currentUser.name, id: uid() };
    await appendRow("Tareas", taskToRow(newTask));
    setTasks(t => [...t, newTask]);
    closeModal();
  };
  const updateTask = async (id, form) => {
    const updated = { ...tasks.find(t => t.id === id), ...form };
    await updateRow("Tareas", id, taskToRow(updated));
    setTasks(t => t.map(tk => tk.id === id ? updated : tk));
    closeModal();
  };
  const setTaskStatus = async (id, status) => {
    const updated = { ...tasks.find(t => t.id === id), taskStatus: status };
    await updateRow("Tareas", id, taskToRow(updated));
    setTasks(t => t.map(tk => tk.id === id ? updated : tk));
  };
  const deleteTask = async (id) => {
    await deleteRow("Tareas", id);
    setTasks(t => t.filter(tk => tk.id !== id));
  };

  // ── CLIENTS CRUD ──────────────────────────────────────────────────────────
  const addClient = async (form) => {
    console.log("Guardando cliente:", form);
    const newClient = { ...form, id: uid() };
    await appendRow("Clientes", clientToRow(newClient));
    setClients(c => [...c, newClient]);
    closeModal();
  };
  const updateClient = async (id, form) => {
    const updated = { ...clients.find(c => c.id === id), ...form };
    await updateRow("Clientes", id, clientToRow(updated));
    setClients(c => c.map(x => x.id === id ? updated : x));
    closeModal();
  };
  const deleteClient = async (id) => {
    await deleteRow("Clientes", id);
    setClients(c => c.filter(x => x.id !== id));
  };
  // ── TASKS CRUD ────────────────────────────────────────────────────────────
  const addTask = async (form) => {
    const newTask = { ...form, assigned: isAdmin ? form.assigned : currentUser.name, id: uid() };
    await appendRow("Tareas", taskToRow(newTask));
    setTasks(t => [...t, newTask]);
    closeModal();
  };
  const updateTask = async (id, form) => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const updated = { ...tasks[idx], ...form };
    await updateRow(`Tareas!A${idx + 2}:I${idx + 2}`, taskToRow(updated));
    setTasks(t => t.map(tk => tk.id === id ? updated : tk));
    closeModal();
  };
  const setTaskStatus = async (id, status) => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const updated = { ...tasks[idx], taskStatus: status };
    await updateRow(`Tareas!A${idx + 2}:I${idx + 2}`, taskToRow(updated));
    setTasks(t => t.map(tk => tk.id === id ? updated : tk));
  };
  const deleteTask = async (id) => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    await clearRow(`Tareas!A${idx + 2}:I${idx + 2}`);
    setTasks(t => t.filter(tk => tk.id !== id));
  };

  // ── CLIENTS CRUD ──────────────────────────────────────────────────────────
  const addClient = async (form) => {
    const newClient = { ...form, id: uid() };
    await appendRow("Clientes", clientToRow(newClient));
    setClients(c => [...c, newClient]);
    closeModal();
  };
  const updateClient = async (id, form) => {
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return;
    const updated = { ...clients[idx], ...form };
    await updateRow(`Clientes!A${idx + 2}:J${idx + 2}`, clientToRow(updated));
    setClients(c => c.map(x => x.id === id ? updated : x));
    closeModal();
  };
  const deleteClient = async (id) => {
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return;
    await clearRow(`Clientes!A${idx + 2}:J${idx + 2}`);
    setClients(c => c.filter(x => x.id !== id));
  };

  const clientName = id => clients.find(c => c.id === id)?.name || "—";
  const visibleTasks = isAdmin ? tasks : tasks.filter(t => t.assigned === currentUser.name);
  const filteredTasks = visibleTasks.filter(t => {
    if (filterClient !== "todos" && t.clientId !== +filterClient) return false;
    if (filterStatus !== "todos" && t.taskStatus !== filterStatus) return false;
    if (isAdmin && filterPerson !== "todos" && t.assigned !== filterPerson) return false;
    return true;
  });
  const counts = {
    sin_hacer:  visibleTasks.filter(t => t.taskStatus === "sin_hacer").length,
    en_tramite: visibleTasks.filter(t => t.taskStatus === "en_tramite").length,
    hecho:      visibleTasks.filter(t => t.taskStatus === "hecho").length,
  };
  const navItems = NAV_ITEMS.filter(n => !n.adminOnly || isAdmin);

  // ── TASK CARD ─────────────────────────────────────────────────────────────
  const TaskCard = ({ task }) => {
    const isDone = task.taskStatus === "hecho";
    const isOverdue = !isDone && task.dueDate < today();
    const scfg = STATUS_CONFIG[task.taskStatus] || STATUS_CONFIG.sin_hacer;
    const canEdit = isAdmin || task.assigned === currentUser.name;
    return (
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${scfg.dot}`, borderRadius: 12, padding: isMobile ? "14px 14px" : "13px 16px", marginBottom: 8, opacity: isDone ? 0.55 : 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 15 : 14, color: isDone ? C.textLight : C.text, fontWeight: 600, textDecoration: isDone ? "line-through" : "none", marginBottom: 8 }}>{task.title}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.textMid, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 99, padding: "2px 8px" }}>{clientName(task.clientId)}</span>
              {isAdmin && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Avatar name={task.assigned} size={18} /><span style={{ fontSize: 12, color: C.textMid, fontWeight: 600 }}>{task.assigned}</span></span>}
              {task.recurrent && <span style={{ fontSize: 11, fontWeight: 600, color: C.textMid, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 99, padding: "2px 8px" }}>🔁 {RECURRENCE_LABELS[task.recurrence]}</span>}
              <span style={{ fontSize: 12, color: isOverdue ? C.red : C.textLight, fontWeight: isOverdue ? 700 : 400, marginLeft: "auto" }}>{isOverdue ? "⚠ " : ""}{task.dueDate}</span>
            </div>
            {task.notes && <div style={{ fontSize: 12, color: C.textLight, marginTop: 7, fontStyle: "italic" }}>{task.notes}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            <StatusPill status={task.taskStatus} onChange={s => setTaskStatus(task.id, s)} />
            {canEdit && (
              <div style={{ display: "flex", gap: 2 }}>
                <button onClick={() => setModal(`editTask:${task.id}`)} style={{ background: "none", border: "none", color: C.textLight, cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✏</button>
                {isAdmin && <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: C.textLight, cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕</button>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── TABLERO ───────────────────────────────────────────────────────────────
  const TablerView = () => (
    <div>
      <div style={{ marginBottom: 20, padding: "12px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={currentUser.name} size={32} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{currentUser.name}</div>
          <div style={{ fontSize: 12, color: C.textLight }}>{isAdmin ? "Administrador · vista completa" : "Solo tus tareas asignadas"}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} onClick={() => setFilterStatus(filterStatus === key ? "todos" : key)}
            style={{ background: cfg.bg, border: `1.5px solid ${filterStatus === key ? cfg.dot : cfg.border}`, borderRadius: 12, padding: isMobile ? "14px 12px" : "16px 18px", cursor: "pointer" }}>
            <div style={{ fontSize: isMobile ? 28 : 30, fontWeight: 800, color: cfg.color }}>{counts[key]}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.07em" }}>{cfg.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {isAdmin && <select style={{ ...inp, width: "auto", fontSize: 13 }} value={filterPerson} onChange={e => setFilterPerson(e.target.value)}><option value="todos">Todo el equipo</option>{users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>}
        <select style={{ ...inp, width: "auto", fontSize: 13 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}><option value="todos">Todos los clientes</option>{visibleClients.sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {(filterStatus !== "todos" || filterPerson !== "todos" || filterClient !== "todos") && <button onClick={() => { setFilterStatus("todos"); setFilterPerson("todos"); setFilterClient("todos"); }} style={{ ...btnS, padding: "8px 12px", fontSize: 12 }}>× Limpiar</button>}
        <button onClick={() => setModal("newTask")} style={{ ...btnP, marginLeft: "auto", whiteSpace: "nowrap", padding: isMobile ? "10px 16px" : "9px 18px" }}>+ Nueva tarea</button>
      </div>
      {filteredTasks.length === 0
        ? <div style={{ textAlign: "center", color: C.textLight, padding: 48 }}>No hay tareas con este filtro.</div>
        : filteredTasks.map(t => <TaskCard key={t.id} task={t} />)}
    </div>
  );

  // ── CLIENTES ──────────────────────────────────────────────────────────────
  const ClientsView = () => (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        {/* Buscador */}
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: C.textLight }}>🔍</span>
          <input style={{ ...inp, paddingLeft: 36 }} value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Buscar cliente..." />
        </div>
        {isAdmin && <button onClick={() => setModal("newClient")} style={btnP}>+ Nuevo</button>}
      </div>
      {sortedClients.length === 0 && <div style={{ textAlign: "center", color: C.textLight, padding: 48 }}>No hay clientes{clientSearch ? " con ese nombre" : " todavía"}.</div>}
      {sortedClients.map(c => {
        const cs = CLIENT_STATUS[c.status] || CLIENT_STATUS.activo;
        const ct = visibleTasks.filter(t => t.clientId === c.id);
        const byS = { sin_hacer: 0, en_tramite: 0, hecho: 0 };
        ct.forEach(t => { if (t.taskStatus in byS) byS[t.taskStatus]++; });
        return (
          <div key={c.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{c.name}</span>
                  <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 800, background: C.black, color: "#fff" }}>Tipo {c.clientType}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cs.color }}>● {cs.label}</span>
                  {c.driveUrl && <a href={c.driveUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: C.textMid, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 99, padding: "2px 10px", textDecoration: "none" }}>📁 Drive</a>}
                </div>
                <div style={{ fontSize: 13, color: C.textMid, marginBottom: 8 }}>
                  {c.sector} · desde {c.since}
                  {c.manager && <span style={{ marginLeft: 8, fontSize: 12, color: C.textLight }}>· <strong style={{ color: C.textMid }}>Gestión:</strong> {c.manager}</span>}
                </div>
                {c.management && <div style={{ fontSize: 13, color: C.textMid, background: C.surface, borderRadius: 8, padding: "9px 12px", border: `1px solid ${C.border}`, lineHeight: 1.6, marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 800, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 3 }}>Gestión contratada</span>{c.management}</div>}
                {c.notes && <div style={{ fontSize: 13, color: C.textMid, background: C.yellowBg, borderRadius: 8, padding: "9px 12px", border: `1px solid ${C.yellowBorder}`, lineHeight: 1.6 }}><span style={{ fontSize: 10, fontWeight: 800, color: C.yellow, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 3 }}>Notas internas</span>{c.notes}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: cfg.dot }}>{byS[key]}</div>
                      <div style={{ fontSize: 10, color: C.textLight, fontWeight: 700, textTransform: "uppercase" }}>{cfg.label.split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
                {isAdmin && <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setModal(`editClient:${c.id}`)} style={{ ...btnS, padding: "6px 12px", fontSize: 12 }}>Editar</button>
                  <button onClick={() => deleteClient(c.id)} style={{ ...btnD, padding: "6px 12px" }}>Eliminar</button>
                </div>}
              </div>
            </div>
            {ct.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                {ct.slice(0, 3).map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_CONFIG[t.taskStatus]?.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: t.taskStatus === "hecho" ? C.textLight : C.text, textDecoration: t.taskStatus === "hecho" ? "line-through" : "none", flex: 1 }}>{t.title}</span>
                    {isAdmin && <Avatar name={t.assigned} size={18} />}
                  </div>
                ))}
                {ct.length > 3 && <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>+{ct.length - 3} tareas más</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── TAREAS ────────────────────────────────────────────────────────────────
  const TareasView = () => {
    const recurrents = visibleTasks.filter(t => t.recurrent);
    const oneOff = visibleTasks.filter(t => !t.recurrent);
    const byRec = {};
    recurrents.forEach(t => { if (!byRec[t.recurrence]) byRec[t.recurrence] = []; byRec[t.recurrence].push(t); });
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <button onClick={() => setModal("newTask")} style={{ ...btnP, padding: isMobile ? "10px 16px" : "9px 18px" }}>+ Nueva tarea</button>
        </div>
        {Object.keys(byRec).length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 14 }}>🔁 Tareas recurrentes</div>
            {Object.entries(byRec).map(([rec, tks]) => (
              <div key={rec} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>{RECURRENCE_LABELS[rec]}</div>
                {tks.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            ))}
          </div>
        )}
        {oneOff.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 14 }}>○ Tareas puntuales</div>
            {oneOff.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        )}
        {visibleTasks.length === 0 && <div style={{ textAlign: "center", color: C.textLight, padding: 48 }}>No hay tareas todavía.</div>}
      </div>
    );
  };

  // ── EQUIPO ────────────────────────────────────────────────────────────────
  const EquipoView = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: C.textLight }}>{users.length} usuarios</div>
        <button onClick={() => setModal("newUser")} style={btnP}>+ Nuevo usuario</button>
      </div>
      {users.map(u => {
        const ut = tasks.filter(t => t.assigned === u.name);
        const isMe = u.id === currentUser.id;
        return (
          <div key={u.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <Avatar name={u.name} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{u.name}</span>
                  <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: u.role === "admin" ? C.black : C.surfaceAlt, color: u.role === "admin" ? "#fff" : C.textMid, border: `1px solid ${C.border}` }}>{u.role === "admin" ? "Admin" : "Miembro"}</span>
                  {isMe && <span style={{ fontSize: 11, color: C.textLight, fontStyle: "italic" }}>— tú</span>}
                </div>
                <div style={{ fontSize: 13, color: C.textLight }}>@{u.username}</div>
              </div>
              <div style={{ display: "flex", gap: 14, textAlign: "center", marginRight: 4 }}>
                <div><div style={{ fontSize: 18, fontWeight: 800, color: C.yellow }}>{ut.filter(t => t.taskStatus !== "hecho").length}</div><div style={{ fontSize: 10, color: C.textLight, fontWeight: 700, textTransform: "uppercase" }}>Activas</div></div>
                <div><div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{ut.filter(t => t.taskStatus === "hecho").length}</div><div style={{ fontSize: 10, color: C.textLight, fontWeight: 700, textTransform: "uppercase" }}>Hechas</div></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setModal(`editUser:${u.id}`)} style={{ ...btnS, padding: "6px 12px", fontSize: 13 }}>Editar</button>
                {!isMe && <button onClick={() => deleteUser(u.id)} style={btnD}>Eliminar</button>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── MODALS ────────────────────────────────────────────────────────────────
  const renderModal = () => {
    if (!modal) return null;
    const wrap = (title, children) => <Modal title={title} onClose={closeModal}>{children}</Modal>;
    if (modal === "newTask")   return wrap("Nueva tarea",   <TaskForm clients={visibleClients} users={users} currentUser={currentUser} onSave={addTask} onClose={closeModal} />);
    if (modal === "newClient") return wrap("Nuevo cliente", <ClientForm users={users} onSave={addClient} onClose={closeModal} />);
    if (modal === "newUser")   return wrap("Nuevo usuario", <UserForm onSave={addUser} onClose={closeModal} />);
    if (modal.startsWith("editTask:"))   { const t = tasks.find(x => x.id === +modal.split(":")[1]);   return t ? wrap("Editar tarea",   <TaskForm clients={visibleClients} users={users} initial={t} currentUser={currentUser} onSave={f => updateTask(t.id, f)} onClose={closeModal} />) : null; }
    if (modal.startsWith("editClient:")) { const c = clients.find(x => x.id === +modal.split(":")[1]); return c ? wrap("Editar cliente", <ClientForm users={users} initial={c} onSave={f => updateClient(c.id, f)} onClose={closeModal} />) : null; }
    if (modal.startsWith("editUser:"))   { const u = users.find(x => x.id === +modal.split(":")[1]);   return u ? wrap("Editar usuario", <UserForm initial={u} onSave={f => updateUser(u.id, f)} onClose={closeModal} />) : null; }
    return null;
  };

  const viewContent = () => {
    if (view === "tablero")  return <TablerView />;
    if (view === "clientes") return <ClientsView />;
    if (view === "tareas")   return <TareasView />;
    if (view === "equipo" && isAdmin) return <EquipoView />;
    return null;
  };

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ minHeight: "100vh", background: C.surface, fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } select option { background: #fff; color: #111; } button:focus { outline: none; }`}</style>
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: "-0.03em" }}>{navItems.find(n => n.id === view)?.label || "b2bpro"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar name={currentUser.name} size={30} />
          <button onClick={() => setCurrentUser(null)} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Salir</button>
        </div>
      </div>
      <div style={{ padding: "16px 16px 0" }}>{viewContent()}</div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{ flex: 1, padding: "10px 4px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 20, lineHeight: 1, opacity: view === n.id ? 1 : 0.3 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: view === n.id ? C.text : C.textLight, letterSpacing: "0.04em" }}>{n.label}</span>
            {view === n.id && <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.black, marginTop: 1 }} />}
          </button>
        ))}
      </div>
      {renderModal()}
    </div>
  );

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.surface, fontFamily: "'DM Sans', sans-serif", display: "flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } select option { background: #fff; color: #111; } button:focus { outline: none; }`}</style>
      <div style={{ width: 220, background: C.bg, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 100 }}>
        <div style={{ padding: "24px 20px 20px" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: "-0.03em", marginBottom: 2 }}>b2bpro</div>
          <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{visibleClients.filter(c => c.status === "activo").length} clientes activos</div>
        </div>
        <nav style={{ flex: 1, padding: "8px 12px" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: view === n.id ? C.surfaceAlt : "none", color: view === n.id ? C.text : C.textMid, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", textAlign: "left", marginBottom: 2 }}>
              <span style={{ fontSize: 16, opacity: view === n.id ? 1 : 0.5 }}>{n.icon}</span>
              {n.label}
              {view === n.id && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: C.black }} />}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Avatar name={currentUser.name} size={34} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: C.textLight }}>{isAdmin ? "Administrador" : "Miembro"}</div>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "none", color: C.textMid, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>Cerrar sesión</button>
        </div>
      </div>
      <div style={{ marginLeft: 220, flex: 1, padding: "32px 40px", maxWidth: "calc(100% - 220px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.03em" }}>{navItems.find(n => n.id === view)?.label}</div>
          </div>
          {viewContent()}
        </div>
      </div>
      {renderModal()}
    </div>
  );
}
