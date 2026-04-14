import { useState, useEffect, useMemo, useRef } from "react";
import { fetchPartidos } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";

const CATEGORIAS = ["Todas", "Platino", "Oro", "Plata", "Bronce"];
const CATS_ADD   = ["Platino", "Oro", "Plata", "Bronce"];
const SORT_OPTIONS = [
  { key: "score", label: "NirbunScore" },
  { key: "pct",   label: "% Victoria" },
  { key: "g",     label: "Victorias" },
  { key: "pj",    label: "Partidos" },
  { key: "sG",    label: "Sets" },
];

const CAT_COLOR = {
  Platino: "#4F81BD", Oro: "#C0A000", Plata: "#808080", Bronce: "#C05A00",
};
const CAT_SCORE = { Platino: 100, Oro: 75, Plata: 50, Bronce: 25 };

// ── Utilidades ──────────────────────────────────────────────────────────────
function getCat(grupo) { return (grupo || "").split("-")[0]; }

function matchNombre(nombre, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (nombre.toLowerCase().includes(q)) return true;
  const qWords = q.split(/\s+/).filter(Boolean);
  const nWords = nombre.toLowerCase().split(/\s+/).filter(Boolean);
  return qWords.every(qw =>
    nWords.some(nw => {
      if (nw.includes(qw)) return true;
      if (nw.endsWith(".") && qw.startsWith(nw.slice(0, -1))) return true;
      return false;
    })
  );
}

function to10(s) { return Math.round(((s / 100) * 9 + 1) * 10) / 10; }

function scoreColor(s100) {
  const s = to10(s100);
  if (s >= 9)   return "#1565c0";
  if (s >= 8)   return "#29b6f6";
  if (s >= 7)   return "#66bb6a";
  if (s >= 6.5) return "#ffd600";
  if (s >= 6)   return "#ffa726";
  if (s >= 5)   return "#ef5350";
  return "#c62828";
}

function initials(nombre) {
  return (nombre || "?").split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}

function nirbunScore5({ cat, pj, g, sG, sP, jG, jP }) {
  const cv = CAT_SCORE[cat] ?? 25;
  const wv = pj > 0 ? Math.round((g / pj) * 100) : 0;
  const sv = (sG + sP) > 0 ? Math.round((sG / (sG + sP)) * 100) : 0;
  const jv = (jG + jP) > 0 ? Math.round((jG / (jG + jP)) * 100) : 0;
  const kv = pj > 0 ? Math.min(100, Math.round((Math.min(pj, 5) / 5) * 100)) : 0;
  return Math.round(cv * 0.30 + wv * 0.25 + sv * 0.20 + jv * 0.15 + kv * 0.10);
}

function buildStats(partidos, grupos) {
  const stats = {};
  Object.entries(grupos).forEach(([key, players]) => {
    const [cat] = key.split("-");
    players.forEach(n => {
      stats[n] = { nombre: n, grupo: key, cat, pj: 0, g: 0, p: 0, sG: 0, sP: 0, jG: 0, jP: 0 };
    });
  });
  partidos.forEach(m => {
    const estado = (m.Estado || m.estado || "").toLowerCase();
    if (estado !== "jugado") return;
    const local = m.Jugador_Local || m.local || "";
    const visit = m.Jugador_Visitante || m.visitante || "";
    const gan   = m.Ganador || m.ganador || "";
    const s1l = Number(m.Set1_L || 0), s1v = Number(m.Set1_V || 0);
    const s2l = Number(m.Set2_L || 0), s2v = Number(m.Set2_V || 0);
    const tbl = Number(m.STB_L  || 0), tbv = Number(m.STB_V  || 0);
    const sL = (s1l>s1v?1:0)+(s2l>s2v?1:0), sV = (s1v>s1l?1:0)+(s2v>s2l?1:0);
    const jl = s1l+s2l+tbl, jv = s1v+s2v+tbv;
    if (stats[local]) {
      stats[local].pj++; if (gan===local) stats[local].g++; else stats[local].p++;
      stats[local].sG+=sL; stats[local].sP+=sV; stats[local].jG+=jl; stats[local].jP+=jv;
    }
    if (stats[visit]) {
      stats[visit].pj++; if (gan===visit) stats[visit].g++; else stats[visit].p++;
      stats[visit].sG+=sV; stats[visit].sP+=sL; stats[visit].jG+=jv; stats[visit].jP+=jl;
    }
  });
  return Object.values(stats).map(s => ({
    ...s,
    pct:    s.pj > 0 ? Math.round((s.g / s.pj) * 100) : 0,
    winPct: s.pj > 0 ? Math.round((s.g / s.pj) * 100) : 0,
    setPct: (s.sG+s.sP) > 0 ? Math.round((s.sG/(s.sG+s.sP))*100) : 0,
    jPct:   (s.jG+s.jP) > 0 ? Math.round((s.jG/(s.jG+s.jP))*100) : 0,
    score:  nirbunScore5(s),
  }));
}

function formatScore(m, local, visit) {
  const s1l=Number(m.Set1_L||m.s1l||0), s1v=Number(m.Set1_V||m.s1v||0);
  const s2l=Number(m.Set2_L||m.s2l||0), s2v=Number(m.Set2_V||m.s2v||0);
  const stbl=m.STB_L!=null&&m.STB_L!==""?Number(m.STB_L):(m.stbl??null);
  const stbv=m.STB_V!=null&&m.STB_V!==""?Number(m.STB_V):(m.stbv??null);
  const sets = [`${s1l}-${s1v}`, `${s2l}-${s2v}`];
  if (stbl != null) sets.push(`(${stbl}-${stbv})`);
  return sets.join(" ");
}

function formatFecha(f) {
  if (!f) return "";
  const p = String(f).split("-");
  const meses = ["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(p[2])} ${meses[parseInt(p[1])]||p[1]}`;
}

// ── JugadorRow ──────────────────────────────────────────────────────────────
function JugadorRow({ jugador, rank, irAPerfil }) {
  const cat   = getCat(jugador.grupo);
  const color = CAT_COLOR[cat] || "#888";
  const sc    = jugador.score;
  const scCol = scoreColor(sc);
  return (
    <div className="jugador-row" style={{ cursor: "pointer" }} onClick={() => irAPerfil?.(jugador.nombre)}>
      <div className="jugador-rank">{rank}</div>
      <div className="jugador-info">
        <div className="jugador-nombre">{jugador.nombre}</div>
        <div className="jugador-meta">
          <span className="grupo-pill-mini" style={{ background: color }}>{jugador.grupo}</span>
        </div>
      </div>
      <div className="jugador-stats-cols">
        <div className="jugador-stat-col">
          <span className="jstat-val">{jugador.pj}</span>
          <span className="jstat-label">PJ</span>
        </div>
        <div className="jugador-stat-col">
          <span className="jstat-val" style={{ color: "#3a9c6a" }}>{jugador.g}</span>
          <span className="jstat-label">G</span>
        </div>
        <div className="jugador-stat-col">
          <span className="jstat-val" style={{ color: "#c0392b" }}>{jugador.p}</span>
          <span className="jstat-label">P</span>
        </div>
        <div className="jugador-stat-col">
          <span className="jstat-val" style={{ color: color }}>{jugador.pj > 0 ? `${jugador.pct}%` : "—"}</span>
          <span className="jstat-label">%V</span>
        </div>
        <div className="jugador-stat-col">
          <span className="jstat-val">{jugador.pj > 0 ? `${jugador.sG}/${jugador.sG+jugador.sP}` : "—"}</span>
          <span className="jstat-label">Sets</span>
        </div>
      </div>
      <div className="jugador-score-block">
        <span className="jscore-num" style={{ color: scCol }}>{to10(sc)}</span>
        <span className="jscore-label">NS</span>
      </div>
    </div>
  );
}

// ── Selector de jugador con buscador ────────────────────────────────────────
function JugadorSelector({ label, value, stats, onChange, onClear }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const resultados = useMemo(() => {
    if (!query.trim()) return stats.slice(0, 12);
    return stats.filter(j => matchNombre(j.nombre, query)).slice(0, 12);
  }, [query, stats]);

  function select(j) {
    onChange(j);
    setQuery("");
    setOpen(false);
  }

  const color = value ? CAT_COLOR[getCat(value.grupo)] || "#888" : null;

  return (
    <div className="cmp-selector-wrap" ref={ref}>
      {value ? (
        <div className="cmp-selected">
          <div className="cmp-avatar" style={{ background: color }}>{initials(value.nombre)}</div>
          <div className="cmp-selected-info">
            <span className="cmp-selected-nombre">{value.nombre}</span>
            <span className="grupo-pill-mini" style={{ background: color }}>{value.grupo}</span>
          </div>
          <button className="cmp-clear" onClick={onClear}>✕</button>
        </div>
      ) : (
        <div className="cmp-input-wrap">
          <svg className="search-bar-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="cmp-input"
            placeholder="Buscar jugador..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>
      )}
      {!value && open && resultados.length > 0 && (
        <div className="cmp-dropdown">
          {resultados.map(j => {
            const c = CAT_COLOR[getCat(j.grupo)] || "#888";
            return (
              <div key={j.nombre} className="cmp-dropdown-item" onMouseDown={() => select(j)}>
                <div className="cmp-avatar" style={{ background: c, width: 28, height: 28, fontSize: 9 }}>{initials(j.nombre)}</div>
                <span className="cmp-drop-nombre">{j.nombre}</span>
                <span className="grupo-pill-mini" style={{ background: c }}>{j.grupo}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Vista Comparar ──────────────────────────────────────────────────────────
function VistaComparar({ stats, partidos, irAPerfil }) {
  const [jugA, setJugA] = useState(null);
  const [jugB, setJugB] = useState(null);

  const statsA = jugA ? stats.find(s => s.nombre === jugA.nombre) : null;
  const statsB = jugB ? stats.find(s => s.nombre === jugB.nombre) : null;
  const colorA = statsA ? CAT_COLOR[getCat(statsA.grupo)] || "#888" : "#888";
  const colorB = statsB ? CAT_COLOR[getCat(statsB.grupo)] || "#888" : "#888";

  const h2h = useMemo(() => {
    if (!jugA || !jugB) return [];
    return partidos.filter(m => {
      const estado = (m.Estado || m.estado || "").toLowerCase();
      if (estado !== "jugado") return false;
      const loc = m.Jugador_Local || m.local || "";
      const vis = m.Jugador_Visitante || m.visitante || "";
      return (loc === jugA.nombre && vis === jugB.nombre) ||
             (loc === jugB.nombre && vis === jugA.nombre);
    }).sort((a, b) => String(b.Fecha||b.fecha||"").localeCompare(String(a.Fecha||a.fecha||"")));
  }, [jugA, jugB, partidos]);

  const vicA = h2h.filter(m => (m.Ganador||m.ganador||"") === jugA?.nombre).length;
  const vicB = h2h.filter(m => (m.Ganador||m.ganador||"") === jugB?.nombre).length;

  const ambos = statsA && statsB;

  const FILAS = [
    { label: "NirbunScore", fn: s => to10(s.score), hi: "score" },
    { label: "Winrate",     fn: s => s.pj > 0 ? `${s.winPct}%` : "—", hi: "winPct" },
    { label: "% Sets gan.", fn: s => s.pj > 0 ? `${s.setPct}%` : "—", hi: "setPct" },
    { label: "Efic. juegos",fn: s => s.pj > 0 ? `${s.jPct}%` : "—",  hi: "jPct" },
    { label: "Partidos",    fn: s => s.pj, hi: "pj" },
  ];

  return (
    <div>
      {/* Selectores */}
      <div className="cmp-selectors-row">
        <JugadorSelector
          value={jugA}
          stats={stats.filter(s => !jugB || s.nombre !== jugB.nombre)}
          onChange={setJugA}
          onClear={() => setJugA(null)}
        />
        <div className="cmp-vs">VS</div>
        <JugadorSelector
          value={jugB}
          stats={stats.filter(s => !jugA || s.nombre !== jugA.nombre)}
          onChange={setJugB}
          onClear={() => setJugB(null)}
        />
      </div>

      {!ambos && (
        <div className="empty-state" style={{ marginTop: 24 }}>
          Selecciona dos jugadores para comparar
        </div>
      )}

      {ambos && (
        <>
          {/* Headers jugadores */}
          <div className="cmp-table-header">
            <div className="cmp-col-header" style={{ alignItems: "flex-start" }}>
              <div className="cmp-avatar" style={{ background: colorA }}>{initials(statsA.nombre)}</div>
              <div className="cmp-col-nombre">{statsA.nombre}</div>
              <span className="grupo-pill-mini" style={{ background: colorA }}>{statsA.grupo}</span>
            </div>
            <div style={{ flex: 1.4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", letterSpacing: "0.05em" }}>VS</span>
            </div>
            <div className="cmp-col-header" style={{ alignItems: "flex-end" }}>
              <div className="cmp-avatar" style={{ background: colorB }}>{initials(statsB.nombre)}</div>
              <div className="cmp-col-nombre">{statsB.nombre}</div>
              <span className="grupo-pill-mini" style={{ background: colorB }}>{statsB.grupo}</span>
            </div>
          </div>

          {/* Filas de stats */}
          <div className="cmp-section-card">
            {FILAS.map(({ label, fn, hi }) => {
              const vA = statsA[hi], vB = statsB[hi];
              const winA = vA > vB, winB = vB > vA;
              return (
                <div className="cmp-row" key={label}>
                  <span className="cmp-row-val" style={{
                    textAlign: "right",
                    color: winA ? colorA : "var(--text2)",
                    fontWeight: winA ? 700 : 400,
                  }}>
                    {winA ? "● " : ""}{fn(statsA)}
                  </span>
                  <span className="cmp-row-label">{label}</span>
                  <span className="cmp-row-val" style={{
                    textAlign: "left",
                    color: winB ? colorB : "var(--text2)",
                    fontWeight: winB ? 700 : 400,
                  }}>
                    {fn(statsB)}{winB ? " ●" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Barra H2H dominancia */}
          <div className="cmp-section-card">
            <div className="section-title" style={{ marginBottom: 12 }}>Head to Head</div>
            {h2h.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text2)", fontSize: 13 }}>
                Sin enfrentamientos directos aún
              </div>
            ) : (
              <>
                <div className="cmp-h2h-bar-row">
                  <span className="cmp-h2h-name" style={{ color: colorA }}>{statsA.nombre.split(" ")[0]}</span>
                  <div className="cmp-h2h-bar-wrap">
                    <div className="cmp-h2h-bar-a" style={{ width: `${(vicA/(vicA+vicB))*100}%`, background: colorA }} />
                    <div className="cmp-h2h-bar-b" style={{ width: `${(vicB/(vicA+vicB))*100}%`, background: colorB }} />
                  </div>
                  <span className="cmp-h2h-name" style={{ color: colorB, textAlign: "right" }}>{statsB.nombre.split(" ")[0]}</span>
                </div>
                <div className="cmp-h2h-vic-row">
                  <span style={{ color: colorA }}>{vicA} {vicA === 1 ? "victoria" : "victorias"}</span>
                  <span style={{ color: colorB }}>{vicB} {vicB === 1 ? "victoria" : "victorias"}</span>
                </div>

                {/* Historial */}
                <div style={{ marginTop: 14 }}>
                  {h2h.map((m, i) => {
                    const gan = m.Ganador || m.ganador || "";
                    const loc = m.Jugador_Local || m.local || "";
                    const vis = m.Jugador_Visitante || m.visitante || "";
                    const fecha = m.Fecha || m.fecha || "";
                    const ganColor = gan === statsA.nombre ? colorA : colorB;
                    return (
                      <div className="cmp-h2h-match" key={i}>
                        {fecha && <span className="cmp-h2h-fecha">{formatFecha(fecha)}</span>}
                        <span className="cmp-h2h-ganador" style={{ color: ganColor }}>{gan}</span>
                        <span className="cmp-h2h-score">{formatScore(m, loc, vis)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Botones ver perfil */}
          <div className="cmp-perfil-btns">
            <button className="cmp-perfil-btn btn-secondary" onClick={() => irAPerfil?.(statsA.nombre)}>
              Ver perfil {statsA.nombre.split(" ")[0]} →
            </button>
            <button className="cmp-perfil-btn btn-secondary" onClick={() => irAPerfil?.(statsB.nombre)}>
              Ver perfil {statsB.nombre.split(" ")[0]} →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Modal añadir jugador ─────────────────────────────────────────────────────
function ModalAñadir({ showModal, setShowModal, onGuardar }) {
  const [nombre,    setNombre]    = useState("");
  const [categoria, setCategoria] = useState("");
  const [grupo,     setGrupo]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState(null);

  async function handleGuardar() {
    const t = nombre.trim();
    if (!t || !categoria || !grupo) { setError("Completa todos los campos"); return; }
    setSending(true); setError(null);
    try { await onGuardar(t, categoria, grupo); setShowModal(false); }
    catch { setError("Error al añadir el jugador."); setSending(false); }
  }

  if (!showModal) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
      <div className="modal-box">
        <div className="modal-title">Añadir jugador</div>
        {error && (
          <div style={{ fontSize: 13, color: "#c0392b", background: "#fdecea", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
            {error}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ej: J. García"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Categoría</label>
          <select
            className="form-select"
            value={categoria}
            onChange={e => { setCategoria(e.target.value); setGrupo(""); }}
          >
            <option value="">— Selecciona —</option>
            {CATS_ADD.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {categoria && (
          <div className="form-group">
            <label className="form-label">Grupo</label>
            <select
              className="form-select"
              value={grupo}
              onChange={e => setGrupo(e.target.value)}
            >
              <option value="">— Selecciona —</option>
              <option value="A">Grupo A</option>
              <option value="B">Grupo B</option>
            </select>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={sending}>Cancelar</button>
          <button className="btn-primary" onClick={handleGuardar} disabled={sending}>
            {sending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Jugadores({ irAPerfil }) {
  const { grupos, agregarJugador } = useGrupos();
  const [partidos,  setPartidos]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [vista,     setVista]     = useState("ranking"); // "ranking" | "comparar"
  const [catFiltro, setCatFiltro] = useState("Todas");
  const [sortKey,   setSortKey]   = useState("score");
  const [showModal, setShowModal] = useState(false);
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    fetchPartidos(controller.signal)
      .then(json => { setPartidos(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(err  => { if (err.name !== "AbortError") { setError("Error cargando datos"); setLoading(false); } });
    return () => controller.abort();
  }, []);

  const stats = useMemo(() => buildStats(partidos, grupos), [partidos, grupos]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    let lista = catFiltro === "Todas" ? stats : stats.filter(j => getCat(j.grupo) === catFiltro);
    if (q) lista = lista.filter(j => matchNombre(j.nombre, search));
    return [...lista].sort((a, b) => {
      if (sortKey === "score") return b.score - a.score || b.pct - a.pct || a.nombre.localeCompare(b.nombre);
      if (sortKey === "pct")   return b.pct   - a.pct   || b.g   - a.g;
      if (sortKey === "g")     return b.g     - a.g     || b.pct - a.pct;
      if (sortKey === "pj")    return b.pj    - a.pj    || b.pct - a.pct;
      if (sortKey === "sG")    return b.sG    - a.sG    || b.pct - a.pct;
      return 0;
    });
  }, [stats, catFiltro, sortKey, search]);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="page-title" style={{ margin: 0 }}>Jugadores</div>
        <button className="btn-icon" onClick={() => setShowModal(true)} title="Añadir jugador">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
        </button>
      </div>

      {/* Toggle vistas */}
      <div className="vista-toggle" style={{ marginBottom: 12 }}>
        <button className={`vista-btn ${vista === "ranking" ? "active" : ""}`} onClick={() => setVista("ranking")}>Ranking</button>
        <button className={`vista-btn ${vista === "comparar" ? "active" : ""}`} onClick={() => setVista("comparar")}>Comparar</button>
      </div>

      {loading && <div className="empty-state">Cargando...</div>}
      {error   && <div style={{ fontSize: 13, color: "#c0392b", background: "#fdecea", borderRadius: 6, padding: "6px 10px", marginBottom: 12 }}>{error}</div>}

      {!loading && !error && vista === "ranking" && (
        <>
          {/* Búsqueda */}
          <div className="search-bar-wrap" style={{ marginBottom: 12 }}>
            <svg className="search-bar-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-bar-input"
              type="text"
              placeholder="Buscar jugador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-bar-clear" onClick={() => setSearch("")}>✕</button>
            )}
          </div>

          {/* Pills de categoría */}
          <div className="pills-row" style={{ marginBottom: 10 }}>
            {CATEGORIAS.map(cat => {
              const isActive = catFiltro === cat;
              const color = CAT_COLOR[cat];
              return (
                <button
                  key={cat}
                  className={`pill${isActive ? ` active-${cat}` : ""}`}
                  style={isActive && color ? { background: color, borderColor: color, color: "#fff" } : undefined}
                  onClick={() => setCatFiltro(cat)}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Sort buttons */}
          <div className="sort-row" style={{ marginBottom: 10 }}>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`sort-btn${sortKey === opt.key ? " active" : ""}`}
                onClick={() => setSortKey(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="jugadores-list">
            {filtrados.map((j, i) => (
              <JugadorRow key={j.nombre} jugador={j} rank={i + 1} irAPerfil={irAPerfil} />
            ))}
          </div>
          {filtrados.length === 0 && (
            <div className="empty-state">No hay jugadores en esta categoría</div>
          )}
        </>
      )}

      {!loading && !error && vista === "comparar" && (
        <VistaComparar stats={stats} partidos={partidos} irAPerfil={irAPerfil} />
      )}

      <ModalAñadir showModal={showModal} setShowModal={setShowModal} onGuardar={agregarJugador} />
    </div>
  );
}
