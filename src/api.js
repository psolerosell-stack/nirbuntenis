const API_URL = 'https://script.google.com/macros/s/AKfycbwibf-E94FoXEIM9plBSdyMdliHoV42mbMQn0oSdC7BpBQPy0gfnjHR0UiIKlyIH2W4/exec';
const LOCAL_TTL = 4 * 60 * 1000; // 4 minutos en ms

function bust() {
  return `&t=${Date.now()}`;
}

// ── Fetch seguro: verifica HTTP ok + parseo JSON ─────────────────────────────
async function safeFetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (networkErr) {
    throw new Error(`Error de red: ${networkErr.message}`);
  }
  if (!res.ok) {
    throw new Error(`Error del servidor (HTTP ${res.status})`);
  }
  try {
    return await res.json();
  } catch {
    throw new Error('Respuesta inválida del servidor');
  }
}

// ── Caché local ──────────────────────────────────────────────────────────────
function getLocalCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < LOCAL_TTL) return data;
    localStorage.removeItem(key);
  } catch { /* caché corrupta, ignorar */ }
  return null;
}

function setLocalCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage lleno, ignorar */ }
}

export function clearLocalCache() {
  ['clasificacion', 'partidos', 'jugadores', 'config'].forEach(k =>
    localStorage.removeItem(k)
  );
}

// ── Fetch de datos (con caché) ───────────────────────────────────────────────
export async function fetchClasificacion(signal) {
  const cached = getLocalCache('clasificacion');
  if (cached) return cached;
  const data = await safeFetchJson(`${API_URL}?action=clasificacion${bust()}`, { signal });
  setLocalCache('clasificacion', data);
  return data;
}

export async function fetchPartidos(signal) {
  const cached = getLocalCache('partidos');
  if (cached) return cached;
  const data = await safeFetchJson(`${API_URL}?action=partidos${bust()}`, { signal });
  setLocalCache('partidos', data);
  return data;
}

export async function fetchJugadores(signal) {
  const cached = getLocalCache('jugadores');
  if (cached) return cached;
  const data = await safeFetchJson(`${API_URL}?action=jugadores${bust()}`, { signal });
  setLocalCache('jugadores', data);
  return data;
}

export async function fetchConfig(signal) {
  const cached = getLocalCache('config');
  if (cached) return cached;
  const data = await safeFetchJson(`${API_URL}?action=config${bust()}`, { signal });
  setLocalCache('config', data);
  return data;
}

// ── Escrituras (sin caché) ───────────────────────────────────────────────────
export async function agregarJugador(payload) {
  const params = new URLSearchParams({
    action:    'agregar_jugador',
    nombre:    String(payload.nombre    ?? '').trim(),
    categoria: String(payload.categoria ?? ''),
    grupo:     String(payload.grupo     ?? ''),
  });
  const data = await safeFetchJson(`${API_URL}?${params}`);
  clearLocalCache();
  return data;
}

export async function registrarResultado(payload) {
  const params = new URLSearchParams({
    action:    'registrar_resultado',
    temporada: payload.temporada ?? '',
    categoria: payload.categoria ?? '',
    grupo:     payload.grupo     ?? '',
    local:     String(payload.local     ?? '').trim(),
    visitante: String(payload.visitante ?? '').trim(),
    s1l:  payload.s1l  ?? '',
    s1v:  payload.s1v  ?? '',
    s2l:  payload.s2l  ?? '',
    s2v:  payload.s2v  ?? '',
    stbl: payload.stbl ?? '',
    stbv: payload.stbv ?? '',
  });
  const data = await safeFetchJson(`${API_URL}?${params}`);
  clearLocalCache();
  return data;
}
