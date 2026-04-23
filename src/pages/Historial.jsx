import { useState, useEffect } from "react";
import { fetchPartidos, fetchConfig, registrarResultado } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";
import { calcClasificacion, calcPlayoffs, formatScore } from "../engine.js";
import { gruposFromPartidos } from "../utils/gruposFromPartidos.js";
import { validarSets } from "../utils/validarSets.js";

const CATEGORIAS = ["Platino", "Oro", "Plata", "Bronce"];
const CAT_COLOR = {
  Platino: "#4F81BD",
  Oro: "#C0A000",
  Plata: "#808080",
  Bronce: "#C05A00",
};

function n(v) { return v === "" ? null : parseInt(v, 10); }

/** Devuelve true si j1 y j2 ya tienen un partido jugado en ese grupo */
function yaJugaron(partidos, cat, grupoLetra, j1, j2) {
  return partidos.some(p => {
    const pCat = p.Categoria ?? "";
    const pGrp = p.Grupo ?? "";
    const estado = (p.Estado ?? p.estado ?? "").toLowerCase();
    const local = p.Jugador_Local ?? p.local ?? "";
    const visit = p.Jugador_Visitante ?? p.visitante ?? "";
    return pCat === cat && pGrp === grupoLetra && estado === "jugado" &&
      ((local === j1 && visit === j2) || (local === j2 && visit === j1));
  });
}

// ─── Modal de registro de resultado ────────────────────────────────────────
function ResultadoModal({ grupos, partidos, temporada, open, onClose, onGuardado }) {
  const [cat, setCat] = useState("");
  const [grupoLetra, setGrupoLetra] = useState("");
  const [local, setLocal] = useState("");
  const [visitante, setVisitante] = useState("");
  const [s1l, setS1l] = useState(""); const [s1v, setS1v] = useState("");
  const [s2l, setS2l] = useState(""); const [s2v, setS2v] = useState("");
  const [stbl, setStbl] = useState(""); const [stbv, setStbv] = useState("");
  const [msg, setMsg] = useState(null);
  const [msgType, setMsgType] = useState("error");
  const [sending, setSending] = useState(false);

  // Limpia el formulario cada vez que el modal se abre
  useEffect(() => {
    if (open) {
      setCat(""); setGrupoLetra(""); setLocal(""); setVisitante("");
      setS1l(""); setS1v(""); setS2l(""); setS2v("");
      setStbl(""); setStbv(""); setMsg(null);
    }
  }, [open]);

  const grupoKey = cat && grupoLetra ? `${cat}-${grupoLetra}` : null;
  const jugadores = grupoKey ? (grupos[grupoKey] || []) : [];
  // Excluir jugadores con los que local ya ha jugado en este grupo
  const visitantesDisp = jugadores.filter(j =>
    j !== local && !yaJugaron(partidos, cat, grupoLetra, local, j)
  );
  const w1 = n(s1l) != null && n(s1v) != null ? (n(s1l) > n(s1v) ? "l" : "v") : null;
  const w2 = n(s2l) != null && n(s2v) != null ? (n(s2l) > n(s2v) ? "l" : "v") : null;
  const showSTB = w1 != null && w2 != null && w1 !== w2;

  async function handleGuardar() {
    if (sending) return; // guard contra doble envío
    setMsg(null);
    if (!grupoKey || !local || !visitante) { setMsg("Selecciona grupo y ambos jugadores"); setMsgType("error"); return; }
    if (yaJugaron(partidos, cat, grupoLetra, local, visitante)) { setMsg("Este partido ya está registrado."); setMsgType("error"); return; }
    const errors = validarSets(n(s1l), n(s1v), n(s2l), n(s2v), showSTB ? n(stbl) : null, showSTB ? n(stbv) : null);
    if (errors.length > 0) { setMsg(errors.join(" · ")); setMsgType("error"); return; }

    setSending(true);
    try {
      await registrarResultado({
        temporada: temporada || "2026-Primavera",
        categoria: cat, grupo: grupoLetra,
        local, visitante,
        s1l: n(s1l), s1v: n(s1v),
        s2l: n(s2l), s2v: n(s2v),
        stbl: showSTB ? n(stbl) : null,
        stbv: showSTB ? n(stbv) : null,
      });
      setMsg("¡Resultado registrado correctamente!");
      setMsgType("success");
      setTimeout(() => { onGuardado(); }, 1500);
    } catch (err) {
      setMsg(err?.message || "Error de red al enviar. Inténtalo de nuevo.");
      setMsgType("error");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">Registrar resultado</div>

        {msg && (
          <div className={`alert alert-${msgType === "error" ? "error" : "success"}`}>{msg}</div>
        )}

        <div className="form-group">
          <label className="form-label">Categoría</label>
          <select
            className="form-select"
            value={cat}
            onChange={e => { setCat(e.target.value); setGrupoLetra(""); setLocal(""); setVisitante(""); setMsg(null); }}
          >
            <option value="">— Selecciona —</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {cat && (
          <div className="form-group">
            <label className="form-label">Grupo</label>
            <select
              className="form-select"
              value={grupoLetra}
              onChange={e => { setGrupoLetra(e.target.value); setLocal(""); setVisitante(""); }}
            >
              <option value="">— Selecciona —</option>
              {["A", "B"].map(g => <option key={g} value={g}>Grupo {g}</option>)}
            </select>
          </div>
        )}

        {grupoKey && jugadores.length > 0 && (
          <div className="form-group">
            <label className="form-label">Jugador local</label>
            <select
              className="form-select"
              value={local}
              onChange={e => { setLocal(e.target.value); setVisitante(""); }}
            >
              <option value="">— Selecciona —</option>
              {jugadores.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
        )}

        {local && (
          visitantesDisp.length === 0 ? (
            <div className="alert alert-error" style={{ marginTop: 4 }}>
              {local} ya ha jugado contra todos los jugadores del grupo.
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Jugador visitante</label>
              <select
                className="form-select"
                value={visitante}
                onChange={e => setVisitante(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {visitantesDisp.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          )
        )}

        {visitante && (
          <>
            <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: "var(--text2)" }}>
              <span style={{ color: "var(--text1)" }}>L:</span> {local} &nbsp;|&nbsp; <span style={{ color: "var(--text1)" }}>V:</span> {visitante}
            </div>

            <div className="form-group">
              <label className="form-label">Set 1</label>
              <div className="score-row">
                <span className="score-label">Local</span>
                <input className="score-input" type="number" min="0" max="7" value={s1l} onChange={e => setS1l(e.target.value)} />
                <span className="score-sep">–</span>
                <input className="score-input" type="number" min="0" max="7" value={s1v} onChange={e => setS1v(e.target.value)} />
                <span className="score-label">Visit.</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Set 2</label>
              <div className="score-row">
                <span className="score-label">Local</span>
                <input className="score-input" type="number" min="0" max="7" value={s2l} onChange={e => setS2l(e.target.value)} />
                <span className="score-sep">–</span>
                <input className="score-input" type="number" min="0" max="7" value={s2v} onChange={e => setS2v(e.target.value)} />
                <span className="score-label">Visit.</span>
              </div>
            </div>

            {showSTB && (
              <div className="form-group">
                <label className="form-label">Super Tiebreak (10 pts)</label>
                <div className="score-row">
                  <span className="score-label">Local</span>
                  <input className="score-input" type="number" min="0" max="99" value={stbl} onChange={e => setStbl(e.target.value)} style={{ width: 60 }} />
                  <span className="score-sep">–</span>
                  <input className="score-input" type="number" min="0" max="99" value={stbv} onChange={e => setStbv(e.target.value)} style={{ width: 60 }} />
                  <span className="score-label">Visit.</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={sending}>Cancelar</button>
          {visitante && (
            <button className="btn-primary" onClick={handleGuardar} disabled={sending}>
              {sending ? "Enviando..." : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini componentes de clasificación por categoría ───────────────────────
function normalizarStats(p) {
  return {
    local: p.Jugador_Local ?? p.local,
    visitante: p.Jugador_Visitante ?? p.visitante,
    estado: (p.Estado ?? p.estado ?? "").toLowerCase(),
  };
}

function normalizarEngine(p) {
  const stbl = p.STB_L !== "" && p.STB_L != null ? Number(p.STB_L) : null;
  const stbv = p.STB_V !== "" && p.STB_V != null ? Number(p.STB_V) : null;
  return {
    grupo: `${p.Categoria}-${p.Grupo}`,
    local: p.Jugador_Local,
    visitante: p.Jugador_Visitante,
    s1l: Number(p.Set1_L), s1v: Number(p.Set1_V),
    s2l: Number(p.Set2_L), s2v: Number(p.Set2_V),
    stbl, stbv,
    estado: (p.Estado ?? "").toLowerCase(),
    fase: (p.Fase ?? p.fase ?? "liga").toLowerCase(),
    Ganador: p.Ganador,
    temporada: (p.Temporada ?? "").trim(),
  };
}

function BracketCategoria({ cat, partidos, grupos, irAClasificacion }) {
  const color = CAT_COLOR[cat];
  return (
    <div className="bracket-section">
      <div
        className="bracket-cat-title bracket-cat-title--link"
        onClick={() => irAClasificacion(cat, "A")}
        title={`Ver clasificación ${cat}`}
      >
        <span className="bracket-dot" style={{ background: color }} />
        {cat}
        <span className="bracket-nav-arrow">›</span>
      </div>
      <div className="bracket-row">
        {["A", "B"].map(g => {
          const key = `${cat}-${g}`;
          const jug = grupos[key] || [];
          const rows = calcClasificacion(jug, partidos, key);
          return (
            <div
              className="bracket-box bracket-box--link"
              key={key}
              onClick={() => irAClasificacion(cat, g)}
              title={`Ver ${cat} Grupo ${g}`}
            >
              <div className="bracket-box-title">
                Grupo {g}
                <span className="bracket-nav-arrow">›</span>
              </div>
              {rows.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text2)" }}>Sin datos</div>
              ) : rows.map((row, i) => {
                const total = rows.length;
                let arrow = null, arrowClass = "";
                if (cat === "Platino") {
                  if (i === 0 || i === 1) { arrow = "F4"; arrowClass = "arrow-po"; }
                  else if (i === total - 2 && total > 3) { arrow = "PO↓"; arrowClass = "arrow-po"; }
                  else if (i === total - 1) { arrow = "↓"; arrowClass = "arrow-down"; }
                } else {
                  if (i === 0) { arrow = "↑"; arrowClass = "arrow-up"; }
                  else if (i === 1) { arrow = "PO↑"; arrowClass = "arrow-po"; }
                  else if (cat !== "Bronce" && i === total - 2 && total > 3) { arrow = "PO↓"; arrowClass = "arrow-po"; }
                  else if (cat !== "Bronce" && i === total - 1) { arrow = "↓"; arrowClass = "arrow-down"; }
                }
                return (
                  <div className="bracket-player" key={row.jugador}>
                    {arrow
                      ? <span className={arrowClass} style={{ fontSize: 10, minWidth: 22 }}>{arrow}</span>
                      : <span style={{ minWidth: 22 }} />}
                    <span style={{ fontSize: 12 }}>{row.jugador}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text2)" }}>{row.pts}pts</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modal de registro de partido de playoff ────────────────────────────────
function PlayoffRegistroModal({ grupos, partidos, temporada, open, onClose, onGuardado }) {
  const [paso, setPaso] = useState(1);     // 1 = elegir partido, 2 = introducir score
  const [matchSel, setMatchSel] = useState(null);
  const [catSel, setCatSel] = useState(null);
  const [s1l, setS1l] = useState(""); const [s1v, setS1v] = useState("");
  const [s2l, setS2l] = useState(""); const [s2v, setS2v] = useState("");
  const [stbl, setStbl] = useState(""); const [stbv, setStbv] = useState("");
  const [msg, setMsg] = useState(null);
  const [msgType, setMsgType] = useState("error");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) { setPaso(1); setMatchSel(null); resetScore(); }
  }, [open]);

  function resetScore() {
    setS1l(""); setS1v(""); setS2l(""); setS2v(""); setStbl(""); setStbv(""); setMsg(null);
  }

  // Partidos de playoff pendientes por categoría (excluye final si semis no terminadas)
  const data = calcPlayoffs(grupos, partidos);
  const pendientes = data.flatMap(d =>
    d.matches
      .filter(m => m.disponible !== false && (!m.partido || m.partido.estado !== "jugado"))
      .map(m => ({ ...m, cat: d.cat }))
  );

  const w1 = n(s1l) != null && n(s1v) != null ? (n(s1l) > n(s1v) ? "l" : "v") : null;
  const w2 = n(s2l) != null && n(s2v) != null ? (n(s2l) > n(s2v) ? "l" : "v") : null;
  const showSTB = w1 != null && w2 != null && w1 !== w2;

  async function handleGuardar() {
    if (sending) return;
    setMsg(null);
    const errors = validarSets(n(s1l), n(s1v), n(s2l), n(s2v), showSTB ? n(stbl) : null, showSTB ? n(stbv) : null);
    if (errors.length > 0) { setMsg(errors.join(" · ")); setMsgType("error"); return; }
    setSending(true);
    try {
      await registrarResultado({
        temporada: temporada || "2026-Primavera",
        categoria: catSel,
        grupo: matchSel.grupoPartido, // "PO-Asc" o "PO-Des"
        local: matchSel.j1,
        visitante: matchSel.j2,
        s1l: n(s1l), s1v: n(s1v),
        s2l: n(s2l), s2v: n(s2v),
        stbl: showSTB ? n(stbl) : null,
        stbv: showSTB ? n(stbv) : null,
      });
      setMsg("¡Resultado registrado correctamente!");
      setMsgType("success");
      setTimeout(() => { onGuardado(); }, 1500);
    } catch (err) {
      setMsg(err?.message || "Error de red al enviar. Inténtalo de nuevo.");
      setMsgType("error");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  // ── Paso 1: seleccionar partido ──
  if (paso === 1) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-box">
          <div className="modal-title">🏆 Registrar playoff</div>

          {pendientes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text2)", fontSize: 13 }}>
              No hay partidos de playoff pendientes
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendientes.map(m => (
                <button
                  key={m.grupoKey}
                  onClick={() => { setMatchSel(m); setCatSel(m.cat); setPaso(2); resetScore(); }}
                  style={{
                    textAlign: "left", background: "var(--bg3)",
                    border: "1px solid var(--border)", borderRadius: 10,
                    padding: "12px 14px", cursor: "pointer",
                    color: "var(--text1)", fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 11, color: CAT_COLOR[m.cat], fontWeight: 700, marginBottom: 4 }}>
                    {m.cat} · {poLabel(m.tipo)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {m.j1} <span style={{ color: "var(--text2)", fontWeight: 400 }}>vs</span> {m.j2}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 2: introducir resultado ──
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">
          {matchSel.tipo === "ascenso" ? "PO↑ Playoff Ascenso" : "PO↓ Playoff Descenso"}
        </div>
        <div style={{ fontSize: 11, color: CAT_COLOR[catSel], fontWeight: 700, marginBottom: 12 }}>
          {catSel}
        </div>
        <div style={{ marginBottom: 14, fontWeight: 600, fontSize: 14 }}>
          <span style={{ opacity: 0.7 }}>L:</span> {matchSel.j1}
          &nbsp;|&nbsp;
          <span style={{ opacity: 0.7 }}>V:</span> {matchSel.j2}
        </div>

        {msg && <div className={`alert alert-${msgType === "error" ? "error" : "success"}`}>{msg}</div>}

        <div className="form-group">
          <label className="form-label">Set 1</label>
          <div className="score-row">
            <span className="score-label">Local</span>
            <input className="score-input" type="number" min="0" max="7" value={s1l} onChange={e => setS1l(e.target.value)} />
            <span className="score-sep">–</span>
            <input className="score-input" type="number" min="0" max="7" value={s1v} onChange={e => setS1v(e.target.value)} />
            <span className="score-label">Visit.</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Set 2</label>
          <div className="score-row">
            <span className="score-label">Local</span>
            <input className="score-input" type="number" min="0" max="7" value={s2l} onChange={e => setS2l(e.target.value)} />
            <span className="score-sep">–</span>
            <input className="score-input" type="number" min="0" max="7" value={s2v} onChange={e => setS2v(e.target.value)} />
            <span className="score-label">Visit.</span>
          </div>
        </div>

        {showSTB && (
          <div className="form-group">
            <label className="form-label">Super Tiebreak (10 pts)</label>
            <div className="score-row">
              <span className="score-label">Local</span>
              <input className="score-input" type="number" min="0" max="99" value={stbl} onChange={e => setStbl(e.target.value)} style={{ width: 60 }} />
              <span className="score-sep">–</span>
              <input className="score-input" type="number" min="0" max="99" value={stbv} onChange={e => setStbv(e.target.value)} style={{ width: 60 }} />
              <span className="score-label">Visit.</span>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => { setPaso(1); resetScore(); }} disabled={sending}>
            ← Volver
          </button>
          <button className="btn-primary" onClick={handleGuardar} disabled={sending}>
            {sending ? "Enviando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// helpers para tipos de partido
function poLabel(tipo) {
  switch(tipo) {
    case "semi1": return "Semifinal · 1A vs 2B";
    case "semi2": return "Semifinal · 2A vs 1B";
    case "final": return "🏆 Final";
    case "ascenso": return "Playoff ascenso";
    case "descenso": return "Playoff descenso";
    default: return tipo;
  }
}
function poBadgeClass(tipo) {
  return tipo === "descenso" ? "badge-po-down" : "badge-po-up";
}
function poBadgeText(tipo) {
  switch(tipo) {
    case "semi1": case "semi2": return "F4";
    case "final": return "Final";
    case "ascenso": return "PO↑";
    case "descenso": return "PO↓";
    default: return tipo;
  }
}

// ─── Sección playoffs activos ───────────────────────────────────────────────
function PlayoffResumen({ grupos, partidos }) {
  const data = calcPlayoffs(grupos, partidos);
  const activas = data.filter(d => d.matches.length > 0);
  if (activas.length === 0) return null;

  return (
    <>
      <div className="section-label" style={{ marginTop: 20 }}>🏆 Playoffs</div>
      {activas.map(({ cat, matches, promovidos, descendidos, campeon }) => {
        const color = CAT_COLOR[cat];
        return (
          <div className="card" key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color, fontSize: 13, marginBottom: 10,
              display: "flex", alignItems: "center", gap: 6 }}>
              <span className="bracket-dot" style={{ background: color }} />
              {cat}
              {campeon && (
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#f9a825", fontWeight: 700 }}>
                  🏆 {campeon}
                </span>
              )}
            </div>

            {/* Ascenso directo (no Platino) */}
            {promovidos.map(j => (
              <div key={j} style={{ fontSize: 12, color: "#4caf50", marginBottom: 6,
                display: "flex", alignItems: "center", gap: 6 }}>
                <span className="arrow-up" style={{ fontSize: 11 }}>↑</span>
                <span>Asciende directo: <strong>{j}</strong></span>
              </div>
            ))}

            {/* Partidos */}
            {matches.map(m => {
              const jugado = m.partido && m.partido.estado === "jugado";
              const ganador = jugado ? m.partido.Ganador : null;
              const score = jugado ? formatScore(m.partido) : null;
              const pendienteLabel = m.disponible === false ? "Pendiente (semis sin jugar)" : "Pendiente";
              const esFinal = m.tipo === "final";
              return (
                <div key={m.tipo} style={{ padding: "8px 0",
                  borderTop: "1px solid var(--border)", marginTop: 4,
                  opacity: m.disponible === false ? 0.45 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span className={`badge ${poBadgeClass(m.tipo)}`}
                      style={esFinal ? { background: "#f9a825", color: "#000" } : {}}>
                      {poBadgeText(m.tipo)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text2)" }}>{poLabel(m.tipo)}</span>
                  </div>
                  <div className="match-row" style={{ alignItems: "center" }}>
                    <span className={`match-player${ganador === m.j1 ? " winner" : ""}`}
                      style={{ fontSize: 13, color: m.j1 === "?" ? "var(--text2)" : undefined }}>
                      {m.j1 === "?" ? "Por determinar" : m.j1}
                    </span>
                    {jugado && score
                      ? <span className="match-score" style={{ fontSize: 12 }}>{score}</span>
                      : <span className="match-vs">vs</span>}
                    <span className={`match-player${ganador === m.j2 ? " winner" : ""}`}
                      style={{ fontSize: 13, textAlign: "right", color: m.j2 === "?" ? "var(--text2)" : undefined }}>
                      {m.j2 === "?" ? "Por determinar" : m.j2}
                    </span>
                  </div>
                  {ganador && (
                    <div style={{ fontSize: 11, color: esFinal ? "#f9a825" : "#4caf50", marginTop: 4, textAlign: "center", fontWeight: esFinal ? 700 : 400 }}>
                      {esFinal ? "🏆 Campeón: " : "Ganador: "}<strong>{ganador}</strong>
                    </div>
                  )}
                  {!jugado && !ganador && (
                    <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4, textAlign: "center" }}>
                      {pendienteLabel}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Descenso directo */}
            {descendidos.map(j => (
              <div key={j} style={{ fontSize: 12, color: "#e53935", marginTop: 6,
                display: "flex", alignItems: "center", gap: 6 }}>
                <span className="arrow-down" style={{ fontSize: 11 }}>↓</span>
                <span>Desciende directo: <strong>{j}</strong></span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────
export default function Historial({ irAClasificacion, isAdmin, temporadaSel, onCambioTemporada }) {
  const { grupos } = useGrupos();
  const [partidos, setPartidos] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalResultado, setModalResultado] = useState(false);
  const [modalPlayoff, setModalPlayoff] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const sig = controller.signal;
    setLoading(true);
    setError(null);
    Promise.all([fetchPartidos(sig), fetchConfig(sig)])
      .then(([pJson, cJson]) => {
        setPartidos(Array.isArray(pJson) ? pJson : []);
        setConfig(cJson || {});
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== "AbortError") { setError(err?.message || "Error cargando datos"); setLoading(false); }
      });
    return () => controller.abort();
  }, []);

  function handleGuardado() {
    setModalResultado(false);
    const controller = new AbortController();
    Promise.all([fetchPartidos(controller.signal), fetchConfig(controller.signal)])
      .then(([pJson, cJson]) => {
        setPartidos(Array.isArray(pJson) ? pJson : []);
        setConfig(cJson || {});
      })
      .catch(() => {});
  }

  // temporada activa del config; temporadaSel viene del estado global de App
  const temporadaActiva = config?.temporada ?? "";
  const temporada = temporadaSel ?? temporadaActiva;
  const esTemporadaActiva = !temporada || temporada === temporadaActiva;

  // Temporadas únicas en los datos (para el selector)
  const todosEngine = partidos.map(normalizarEngine);
  const temporadasDisp = [...new Set(todosEngine.map(p => p.temporada).filter(Boolean))].sort();

  // Partidos filtrados por temporada seleccionada
  const partidosEngine = temporada
    ? todosEngine.filter(p => !p.temporada || p.temporada === temporada)
    : todosEngine;

  // Para temporadas históricas, los grupos se reconstruyen desde los partidos
  // (Jugadores solo refleja la asignación de la temporada actual)
  const gruposEfectivos = esTemporadaActiva ? grupos : gruposFromPartidos(partidosEngine);

  const jugados = partidosEngine.filter(p => p.estado === "jugado");
  const gruposValues = Object.values(grupos);
  const totalPartidosTeorico = gruposValues.reduce((acc, jug) => {
    const n = jug.length;
    return acc + (n * (n - 1)) / 2;
  }, 0);
  const pct = totalPartidosTeorico > 0 ? Math.round((jugados.length / totalPartidosTeorico) * 100) : 0;

  return (
    <div className="page-content">
      <h1 className="page-title">Inicio</h1>

      {/* Banner registrar resultado — solo admin */}
      {isAdmin && <button className="resultado-banner" onClick={() => config?.playoffs_activos ? setModalPlayoff(true) : setModalResultado(true)}>
        <div className="resultado-banner-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <div className="resultado-banner-text">
          <span className="resultado-banner-title">
            {config?.playoffs_activos ? "🏆 Registrar playoff" : "Registrar resultado"}
          </span>
          <span className="resultado-banner-sub">
            {config?.playoffs_activos ? "Apunta el resultado del playoff" : "Apunta el marcador de tu partido"}
          </span>
        </div>
        <svg className="resultado-banner-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>}

      {loading && <div className="loading-text">Cargando...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <>
          {/* ── Cabecera temporada + selector ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div className="section-label" style={{ margin: 0 }}>Temporada</div>
            {temporadasDisp.length > 1 && (
              <select
                value={temporada}
                onChange={e => onCambioTemporada?.(e.target.value)}
                style={{
                  fontSize: 12, fontWeight: 600,
                  padding: "4px 28px 4px 10px",
                  borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--bg3)", color: "var(--text1)",
                  cursor: "pointer", appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 8px center",
                  outline: "none",
                }}
              >
                {temporadasDisp.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
          <div className="temporada-card">
            <div className="temporada-top">
              <span className="temporada-name">{temporada || "—"}</span>
              <span className="temporada-badge">
                {temporada === temporadaActiva ? config?.estado_temporada ?? "En curso" : "Histórica"}
              </span>
            </div>
            <div className="temporada-progreso">
              <div className="progreso-bar">
                <div className="progreso-fill" style={{ width: pct + "%" }}></div>
              </div>
              <div className="progreso-labels">
                <span>{jugados.length} de {totalPartidosTeorico} partidos jugados</span>
                <span className="progreso-pct">{pct}% completada</span>
              </div>
            </div>
          </div>

          {/* Cuando los playoffs están activos mostramos su estado; si no, el bracket provisional */}
          {config?.playoffs_activos ? (
            <PlayoffResumen grupos={gruposEfectivos} partidos={partidosEngine} />
          ) : (
            <>
              <div className="section-label">Posiciones actuales</div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
                Ascensos y descensos proyectados con la clasificación actual
              </div>
              {CATEGORIAS.map(cat => (
                <BracketCategoria key={cat} cat={cat} partidos={partidosEngine} grupos={gruposEfectivos} irAClasificacion={irAClasificacion} />
              ))}
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--text2)", lineHeight: 2 }}>
                <span className="arrow-up">↑</span> Asciende &nbsp;
                <span className="arrow-po">PO↑</span> Playoff ascenso &nbsp;
                <span className="arrow-po">PO↓</span> Playoff descenso &nbsp;
                <span className="arrow-down">↓</span> Desciende
              </div>
            </>
          )}

          <div className="section-label">Normas</div>
          <div className="normas-card">
            <div className="norma-bloque">
              <div className="norma-titulo">Formato de partido</div>
              <div className="norma-item">• 2 sets al mejor de 3 con tie-break a 7 si 6-6</div>
              <div className="norma-item">• Si hay 1-1 en sets, se juega un super tie-break al mejor de 10 (mínimo 2 de diferencia)</div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">Puntuación</div>
              <div className="norma-item">• Victoria 2-0: <strong>4 pts</strong> ganador · <strong>1 pt</strong> perdedor</div>
              <div className="norma-item">• Victoria 2-1: <strong>3 pts</strong> ganador · <strong>2 pts</strong> perdedor</div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">Plazos y presentación</div>
              <div className="norma-item">• Los partidos se deben acordar y jugar dentro del plazo de cada jornada</div>
              <div className="norma-item">• No presentarse sin aviso previo equivale a una derrota por 6-0, 6-0 (0 puntos)</div>
              <div className="norma-item">• Los resultados se deben registrar en la app en un plazo máximo de 48 h</div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">Ascensos y descensos</div>
              <div className="norma-item">• 1º de cada grupo: <strong>asciende directamente</strong></div>
              <div className="norma-item">• 2º y 3º: <strong>playoff de ascenso/descenso</strong> entre grupos</div>
              <div className="norma-item">• Último de cada grupo: <strong>desciende directamente</strong></div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">Desempate</div>
              <div className="norma-item">En caso de igualdad de puntos: head-to-head → diferencia de sets → diferencia de juegos → juegos totales</div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">NirbunScore (1–10)</div>
              <div className="norma-item">Indicador global de rendimiento de cada jugador. Se calcula combinando 5 factores:</div>
              <div className="norma-item" style={{ marginTop: 6 }}>
                <strong>• Categoría de liga</strong> <span style={{ color: "var(--text2)" }}>(30 %)</span> — Platino 10 · Oro 7.5 · Plata 5 · Bronce 2.5
              </div>
              <div className="norma-item">
                <strong>• Winrate</strong> <span style={{ color: "var(--text2)" }}>(25 %)</span> — % de partidos ganados
              </div>
              <div className="norma-item">
                <strong>• Eficiencia de sets</strong> <span style={{ color: "var(--text2)" }}>(20 %)</span> — sets ganados / sets totales
              </div>
              <div className="norma-item">
                <strong>• Eficiencia de juegos</strong> <span style={{ color: "var(--text2)" }}>(15 %)</span> — juegos ganados / juegos totales
              </div>
              <div className="norma-item">
                <strong>• Consistencia</strong> <span style={{ color: "var(--text2)" }}>(10 %)</span> — penaliza si se han jugado menos de 5 partidos
              </div>
              <div className="norma-item" style={{ marginTop: 6, color: "var(--text2)", fontSize: 12 }}>
                Cada factor se pondera y se convierte a escala 1–10. A más partidos jugados, más fiable es el índice.
              </div>
            </div>
          </div>
        </>
      )}

      <ResultadoModal
        grupos={grupos}
        partidos={temporada ? partidos.filter(p => { const t = (p.Temporada ?? "").trim(); return !t || t === temporada; }) : partidos}
        temporada={temporada}
        open={modalResultado}
        onClose={() => setModalResultado(false)}
        onGuardado={handleGuardado}
      />

      <PlayoffRegistroModal
        grupos={grupos}
        partidos={partidosEngine}
        temporada={temporada}
        open={modalPlayoff}
        onClose={() => setModalPlayoff(false)}
        onGuardado={() => { setModalPlayoff(false); handleGuardado(); }}
      />
    </div>
  );
}
