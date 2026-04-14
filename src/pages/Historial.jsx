import { useState, useEffect } from "react";
import { fetchPartidos, fetchConfig, registrarResultado } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";
import { calcClasificacion } from "../engine.js";
import { validarSets } from "../utils/validarSets.js";

const CATEGORIAS = ["Platino", "Oro", "Plata", "Bronce"];
const CAT_COLOR = {
  Platino: "#4F81BD",
  Oro: "#C0A000",
  Plata: "#808080",
  Bronce: "#C05A00",
};

function n(v) { return v === "" ? null : parseInt(v, 10); }

// ─── Modal de registro de resultado ────────────────────────────────────────
function ResultadoModal({ grupos, open, onClose, onGuardado }) {
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

  const grupoKey = cat && grupoLetra ? `${cat}-${grupoLetra}` : null;
  const jugadores = grupoKey ? (grupos[grupoKey] || []) : [];
  const visitantesDisp = jugadores.filter(j => j !== local);
  const w1 = n(s1l) != null && n(s1v) != null ? (n(s1l) > n(s1v) ? "l" : "v") : null;
  const w2 = n(s2l) != null && n(s2v) != null ? (n(s2l) > n(s2v) ? "l" : "v") : null;
  const showSTB = w1 != null && w2 != null && w1 !== w2;

  async function handleGuardar() {
    if (sending) return; // guard contra doble envío
    setMsg(null);
    if (!grupoKey || !local || !visitante) { setMsg("Selecciona grupo y ambos jugadores"); setMsgType("error"); return; }
    const errors = validarSets(n(s1l), n(s1v), n(s2l), n(s2v), showSTB ? n(stbl) : null, showSTB ? n(stbv) : null);
    if (errors.length > 0) { setMsg(errors.join(" · ")); setMsgType("error"); return; }

    setSending(true);
    try {
      await registrarResultado({
        temporada: "2026-Primavera",
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
                if (i === 0) { arrow = "↑"; arrowClass = "arrow-up"; }
                else if (i === 1) { arrow = "PO↑"; arrowClass = "arrow-po"; }
                else if (i === total - 2 && total > 3) { arrow = "PO↓"; arrowClass = "arrow-po"; }
                else if (i === total - 1) { arrow = "↓"; arrowClass = "arrow-down"; }
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

// ─── Página principal ───────────────────────────────────────────────────────
export default function Historial({ irAClasificacion }) {
  const { grupos } = useGrupos();
  const [partidos, setPartidos] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalResultado, setModalResultado] = useState(false);

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

  const partidosStats = partidos.map(normalizarStats);
  const partidosEngine = partidos.map(normalizarEngine);
  const jugados = partidosStats.filter(p => p.estado === "jugado");
  const gruposValues = Object.values(grupos);
  const totalPartidosTeorico = gruposValues.reduce((acc, jug) => {
    const n = jug.length;
    return acc + (n * (n - 1)) / 2;
  }, 0);
  const temporada = config?.temporada ?? "2026-Primavera";
  const pct = totalPartidosTeorico > 0 ? Math.round((jugados.length / totalPartidosTeorico) * 100) : 0;

  return (
    <div className="page-content">
      <h1 className="page-title">Inicio</h1>

      {/* Banner registrar resultado */}
      <button className="resultado-banner" onClick={() => setModalResultado(true)}>
        <div className="resultado-banner-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <div className="resultado-banner-text">
          <span className="resultado-banner-title">Registrar resultado</span>
          <span className="resultado-banner-sub">Apunta el marcador de tu partido</span>
        </div>
        <svg className="resultado-banner-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {loading && <div className="loading-text">Cargando...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <>
          <p className="section-label">Temporada</p>
          <div className="temporada-card">
            <div className="temporada-top">
              <span className="temporada-name">{temporada}</span>
              <span className="temporada-badge">En curso</span>
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

          <p className="section-label">Posiciones actuales</p>
          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
            Ascensos y descensos proyectados con la clasificación actual
          </div>

          {CATEGORIAS.map(cat => (
            <BracketCategoria key={cat} cat={cat} partidos={partidosEngine} grupos={grupos} irAClasificacion={irAClasificacion} />
          ))}

          <div style={{ marginTop: 4, fontSize: 11, color: "var(--text2)", lineHeight: 2 }}>
            <span className="arrow-up">↑</span> Asciende &nbsp;
            <span className="arrow-po">PO↑</span> Playoff ascenso &nbsp;
            <span className="arrow-po">PO↓</span> Playoff descenso &nbsp;
            <span className="arrow-down">↓</span> Desciende
          </div>

          <p className="section-label">Normas</p>
          <div className="normas-card">
            <div className="norma-bloque">
              <div className="norma-titulo">🎾 Formato de partido</div>
              <div className="norma-item">• 2 sets al mejor de 3 con tie-break a 7 si 6-6</div>
              <div className="norma-item">• Si hay 1-1 en sets, se juega un super tie-break al mejor de 10 (mínimo 2 de diferencia)</div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">📊 Puntuación</div>
              <div className="norma-item">• Victoria 2-0: <strong>4 pts</strong> ganador · <strong>1 pt</strong> perdedor</div>
              <div className="norma-item">• Victoria 2-1: <strong>3 pts</strong> ganador · <strong>2 pts</strong> perdedor</div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">📅 Plazos y presentación</div>
              <div className="norma-item">• Los partidos se deben acordar y jugar dentro del plazo de cada jornada</div>
              <div className="norma-item">• No presentarse sin aviso previo equivale a una derrota por 6-0, 6-0 (0 puntos)</div>
              <div className="norma-item">• Los resultados se deben registrar en la app en un plazo máximo de 48 h</div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">🔼 Ascensos y descensos</div>
              <div className="norma-item">• 1º de cada grupo: <strong>asciende directamente</strong></div>
              <div className="norma-item">• 2º y 3º: <strong>playoff de ascenso/descenso</strong> entre grupos</div>
              <div className="norma-item">• Último de cada grupo: <strong>desciende directamente</strong></div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">⚖️ Desempate</div>
              <div className="norma-item">En caso de igualdad de puntos: head-to-head → diferencia de sets → diferencia de juegos → juegos totales</div>
            </div>
            <div className="norma-bloque">
              <div className="norma-titulo">📈 NirbunScore (1–10)</div>
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
        open={modalResultado}
        onClose={() => setModalResultado(false)}
        onGuardado={handleGuardado}
      />
    </div>
  );
}
