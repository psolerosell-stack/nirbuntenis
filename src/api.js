const API_URL = 'https://script.google.com/macros/s/AKfycbwibf-E94FoXEIM9plBSdyMdliHoV42mbMQn0oSdC7BpBQPy0gfnjHR0UiIKlyIH2W4/exec';
const LOCAL_TTL = 4 * 60 * 1000; // 4 minutos en ms

function bust() {
  return `&t=${Date.now()}`;
}

function getLocalCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < LOCAL_TTL) return data;
    localStorage.removeItem(key);
  } catch (e) {}
  return null;
}

function setLocalCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {}
}

export function clearLocalCache() {
  ['clasificacion', 'partidos', 'jugadores', 'config'].forEach(k =>
    localStorage.removeItem(k)
  );
}

export async function fetchClasificacion(signal) {
  const cached = getLocalCache('clasificacion');
  if (cached) return cached;
  const res = await fetch(`${API_URL}?action=clasificacion${bust()}`, { signal });
  const data = await res.json();
  setLocalCache('clasificacion', data);
  return data;
}

export async function fetchPartidos(signal) {
  const cached = getLocalCache('partidos');
  if (cached) return cached;
  const res = await fetch(`${API_URL}?action=partidos${bust()}`, { signal });
  const data = await res.json();
  setLocalCache('partidos', data);
  return data;
}

export async function fetchJugadores(signal) {
  const cached = getLocalCache('jugadores');
  if (cached) return cached;
  const res = await fetch(`${API_URL}?action=jugadores${bust()}`, { signal });
  const data = await res.json();
  setLocalCache('jugadores', data);
  return data;
}

export async function fetchConfig(signal) {
  const cached = getLocalCache('config');
  if (cached) return cached;
  const res = await fetch(`${API_URL}?action=config${bust()}`, { signal });
  const data = await res.json();
  setLocalCache('config', data);
  return data;
}

export async function agregarJugador(payload) {
  const params = new URLSearchParams({
    action: 'agregar_jugador',
    nombre: payload.nombre ?? '',
    categoria: payload.categoria ?? '',
    grupo: payload.grupo ?? '',
  });
  const res = await fetch(`${API_URL}?${params}`);
  clearLocalCache();
  return res.json();
}

export async function registrarResultado(payload) {
  const params = new URLSearchParams({
    action: 'registrar_resultado',
    temporada: payload.temporada ?? '',
    categoria: payload.categoria ?? '',
    grupo: payload.grupo ?? '',
    local: payload.local ?? '',
    visitante: payload.visitante ?? '',
    s1l: payload.s1l ?? '',
    s1v: payload.s1v ?? '',
    s2l: payload.s2l ?? '',
    s2v: payload.s2v ?? '',
    stbl: payload.stbl ?? '',
    stbv: payload.stbv ?? '',
  });
  const res = await fetch(`${API_URL}?${params}`);
  clearLocalCache(); // invalidar caché local tras registrar
  return res.json();
}
