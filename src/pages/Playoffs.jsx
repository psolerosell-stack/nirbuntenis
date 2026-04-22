import { useState, useEffect } from "react";
import { fetchPartidos, fetchConfig, registrarResultado, clearLocalCache } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";
import { calcPlayoffs } from "../engine.js";
import { validarSets } from "../utils/validarSets.js";

const CAT_COLOR = {
  Platino: "#4F81BD",
  Oro: "#C0A000",
  Plata: "#808080",
  Bronce: "#C05A00",
};

function n(v) { return v === "" ? null : parseInt(v, 10); }

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


function ScoreModal({ open, onClose, match, cat, temporada, onSaved }) {
  const [s1l, setS1l] = useState("");
  const [s1v, setS1v] = useState("");
  const [s2l, setS2l] = useState("");
  const [s2v, setS2v] = useState("");
  const [stbl, setStbl] = useState("");
  const [stbv, setStbv] = useState("");
  const [msg, setMsg] = useState(null);
  const [sending, setSending] = useState(false);

  const w1 = n(s1l) != null && n(s1v) != null ? (n(s1l) > n(s1v) ? "l" : "v") : null;
  const w2 = n(s2l) != null && n(s2v) != null ? (n(s2l) > n(s2v) ? "l" : "v") : null;
  const showSTB = w1 != null && w2 != null && w1 !== w2;

  async function handleGuardar() {
    if (sending) return; // guard contra doble envío
    setMsg(null);
    const errors = validarSets(n(s1l), n(s1v), n(s2l), n(s2v), showSTB ? n(stbl) : null, showSTB ? n(stbv) : null);
    if (errors.length > 0) { setMsg(errors.join(" · ")); return; }

    setSending(true);
    try {
      await registrarResultado({
        temporada: temporada || "2026-Primavera",
        categoria: cat,
        grupo: match.grupoPartido,
        local: match.j1,
        visitante: match.j2,
        s1l: n(s1l), s1v: n(s1v),
        s2l: n(s2l), s2v: n(s2v),
        stbl: showSTB ? n(stbl) : null,
        stbv: showSTB ? n(stbv) : null,
      });
      onSaved();
    } catch (err) {
      setMsg(err?.message || "Error de red al enviar. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">
          {match.tipo === "ascenso" ? "Playoff Ascenso" : "Playoff Descenso"}
        </div>

        <div style={{ marginBottom: 14, fontWeight: 600, fontSize: 14 }}>
          <span style={{ opacity: 0.7 }}>L:</span> {match.j1} &nbsp;|&nbsp;{" "}
          <span style={{ opacity: 0.7 }}>V:</span> {match.j2}
        </div>

        {msg && (
          <div className="alert alert-error">{msg}</div>
        )}

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
          <button className="btn-secondary" onClick={onClose} disabled={sending}>Cancelar</button>
          <button className="btn-primary" onClick={handleGuardar} disabled={sending}>
            {sending ? "Enviando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatScorePartido(p) {
  if (!p || p.estado !== "jugado") return null;
  const sets = [`${p.s1l}-${p.s1v}`, `${p.s2l}-${p.s2v}`];
  if (p.stbl != null) sets.push(`(${p.stbl}-${p.stbv})`);
  return sets.join("  ");
}

function poMatchLabel(tipo) {
  switch(tipo) {
    case "semi1": return "Semifinal · 1A vs 2B";
    case "semi2": return "Semifinal · 2A vs 1B";
    case "final": return "🏆 Final";
    case "ascenso": return "Playoff Ascenso";
    case "descenso": return "Playoff Descenso";
    default: return tipo;
  }
}
function poMatchBadge(tipo) {
  switch(tipo) {
    case "semi1": case "semi2": return "F4";
    case "final": return "Final";
    case "ascenso": return "PO↑";
    case "descenso": return "PO↓";
    default: return tipo;
  }
}
function poMatchColor(tipo) {
  if (tipo === "final") return "#f9a825";
  if (tipo === "descenso") return "#e65100";
  return "#558b2f";
}

function PlayoffMatchCard({ match, cat, onRegistrar }) {
  const { partido } = match;
  const jugado = partido && partido.estado === "jugado";
  const ganador = jugado ? (partido.Ganador || null) : null;
  const esFinal = match.tipo === "final";

  const tipoLabel = poMatchLabel(match.tipo);
  const tipoColor = poMatchColor(match.tipo);

  return (
    <div className={`playoff-match-card ${match.tipo === "descenso" ? "descenso" : "ascenso"}`}
      style={esFinal ? { borderColor: "#f9a825", borderWidth: 2 } : {}}>
      <div className="playoff-match-header" style={{ color: tipoColor }}>
        <span style={{ marginRight: 6 }}>{poMatchBadge(match.tipo)}</span>{tipoLabel}
      </div>

      <div className="playoff-vs-row">
        <div className={`playoff-vs-player${ganador === match.j1 ? " winner" : ""}`}>
          <span className="playoff-vs-name" style={{ color: match.j1 === "?" ? "var(--text2)" : undefined }}>
            {match.j1 === "?" ? "Por determinar" : match.j1}
          </span>
          {match.gJ1 && <span className="playoff-vs-grupo">{match.gJ1}</span>}
        </div>
        <span className="playoff-vs-sep">vs</span>
        <div className={`playoff-vs-player right${ganador === match.j2 ? " winner" : ""}`}>
          <span className="playoff-vs-name" style={{ color: match.j2 === "?" ? "var(--text2)" : undefined }}>
            {match.j2 === "?" ? "Por determinar" : match.j2}
          </span>
          {match.gJ2 && <span className="playoff-vs-grupo">{match.gJ2}</span>}
        </div>
      </div>

      {jugado && (
        <div className="playoff-result-row">
          <span style={{ color: "var(--text2)" }}>{formatScorePartido(partido)}</span>
          {ganador && (
            <span style={{ marginLeft: 8, color: esFinal ? "#f9a825" : "#3a9c6a", fontWeight: 700 }}>
              {esFinal ? "🏆 Campeón: " : "Ganador: "}{ganador}
            </span>
          )}
        </div>
      )}

      {!jugado && match.disponible !== false && (
        <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={() => onRegistrar(match)}>
          Registrar resultado
        </button>
      )}
      {!jugado && match.disponible === false && (
        <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 8, textAlign: "center" }}>
          Disponible tras las semifinales
        </div>
      )}
    </div>
  );
}

function CatCard({ data, onRegistrar }) {
  const { cat, gA, gB, expA, expB, jugadosA, jugadosB, completo, matches, promovidos, descendidos, campeon } = data;
  const color = CAT_COLOR[cat];
  const esPlatino = cat === "Platino";
  const hayProvisional = !completo && (jugadosA + jugadosB) > 0 && (promovidos.length > 0 || matches.length > 0);
  const letraA = gA.split("-")[1] ?? "A";
  const letraB = gB.split("-")[1] ?? "B";
  const pctA = expA > 0 ? Math.round((jugadosA / expA) * 100) : 0;
  const pctB = expB > 0 ? Math.round((jugadosB / expB) * 100) : 0;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="playoff-cat-header" style={{ borderLeftColor: color }}>
        <div className="playoff-cat-title">
          <span className="bracket-dot" style={{ background: color, marginRight: 6 }} />
          {cat}
          {esPlatino && <span style={{ marginLeft: 8, fontSize: 11, color: "#f9a825", fontWeight: 700 }}>Final 4</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {campeon && <span style={{ fontSize: 12, color: "#f9a825", fontWeight: 700 }}>🏆 {campeon}</span>}
          {completo && <span className="playoff-completo-badge">Fase regular completada</span>}
        </div>
      </div>

      <div className="playoff-progreso">
        <div className="playoff-prog-row">
          <span className="playoff-prog-label">Grupo A</span>
          <div className="progreso-bar" style={{ flex: 1, margin: "0 8px" }}>
            <div className="progreso-fill" style={{ width: pctA + "%" }}></div>
          </div>
          <span className="playoff-prog-num">{jugadosA}/{expA}</span>
        </div>
        <div className="playoff-prog-row">
          <span className="playoff-prog-label">Grupo B</span>
          <div className="progreso-bar" style={{ flex: 1, margin: "0 8px" }}>
            <div className="progreso-fill" style={{ width: pctB + "%" }}></div>
          </div>
          <span className="playoff-prog-num">{jugadosB}/{expB}</span>
        </div>
      </div>

      {hayProvisional && (
        <div className="prov-section">
          <div className="prov-header">
            <span className="prov-badge">Provisional</span>
            Si terminara hoy
          </div>

          {/* Cruces de playoff — foco principal */}
          {matches.filter(m => m.disponible !== false || m.tipo !== "final").map((m, idx) => (
            <div key={m.tipo} className="prov-match-block" style={idx > 0 ? { borderTop: "1px solid var(--border)" } : {}}>
              <div className="prov-match-type">
                <span className={`badge ${m.tipo === "descenso" ? "badge-po-down" : "badge-po-up"}`}
                  style={m.tipo === "final" ? { background: "#f9a825", color: "#000" } : {}}>
                  {poMatchBadge(m.tipo)}
                </span>
                {poMatchLabel(m.tipo)}
              </div>
              <div className="prov-match-players">
                <span className="prov-match-name">{m.j1 === "?" ? "Por determinar" : m.j1}</span>
                <span className="prov-vs">vs</span>
                <span className="prov-match-name" style={{ textAlign: "right" }}>{m.j2 === "?" ? "Por determinar" : m.j2}</span>
              </div>
            </div>
          ))}

          {/* Ascensos y descensos directos — contexto secundario */}
          {(promovidos.length > 0 || descendidos.length > 0) && (
            <div className="prov-direct-strip">
              {promovidos.map((j, i) => (
                <span key={`up-${j}`} className="prov-direct-item">
                  <span className="arrow-up">↑</span> {j}
                  <span className="prov-sub" style={{ marginLeft: 3 }}>Gr. {i === 0 ? letraA : letraB}</span>
                </span>
              ))}
              {descendidos.map((j, i) => (
                <span key={`down-${j}`} className="prov-direct-item prov-direct-item--down">
                  <span className="arrow-down">↓</span> {j}
                  <span className="prov-sub" style={{ marginLeft: 3 }}>Gr. {i === 0 ? letraA : letraB}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {completo && (
        <div className="playoff-bracket">
          {/* Direct promotions (no Platino) */}
          {!esPlatino && promovidos.length > 0 && (
            <div className="bracket-direct-row" style={{ marginBottom: 10 }}>
              {promovidos.map((j, i) => (
                <div className="bracket-direct" key={j} style={{ borderTop: "2px solid #2e7d32" }}>
                  <span className="arrow-up" style={{ fontSize: 14 }}>↑</span>
                  <span className="bracket-direct-name">{j}</span>
                  <span className="bracket-direct-sub">{i === 0 ? data.gA : data.gB} · 1º</span>
                </div>
              ))}
            </div>
          )}

          {/* Playoff matches */}
          {matches.map(match => (
            <PlayoffMatchCard
              key={match.grupoKey}
              match={match}
              cat={cat}
              onRegistrar={onRegistrar}
            />
          ))}

          {/* Direct relegations */}
          {descendidos.length > 0 && (
            <div className="bracket-direct-row" style={{ marginTop: 10 }}>
              {descendidos.map((j, i) => (
                <div className="bracket-direct" key={j} style={{ borderTop: "2px solid #c62828" }}>
                  <span className="arrow-down" style={{ fontSize: 14 }}>↓</span>
                  <span className="bracket-direct-name">{j}</span>
                  <span className="bracket-direct-sub">
                    {i === 0 ? data.gA : data.gB} · Último
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Playoffs({ embedded = false }) {
  const { grupos } = useGrupos();
  const [partidos, setPartidos] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // { match, cat }

  function loadData(signal) {
    setLoading(true);
    setError(null);
    Promise.all([fetchPartidos(signal), fetchConfig(signal)])
      .then(([pJson, cJson]) => {
        setPartidos(Array.isArray(pJson) ? pJson : []);
        setConfig(cJson || {});
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== "AbortError") { setError(err?.message || "Error cargando datos"); setLoading(false); }
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const temporada = config?.temporada ?? "";
  const todosEngine = partidos.map(normalizarEngine);
  // Filtra por temporada activa (sin temporada → pertenece a la actual)
  const partidosEngine = temporada
    ? todosEngine.filter(p => !p.temporada || p.temporada === temporada)
    : todosEngine;
  const playoffsData = calcPlayoffs(grupos, partidosEngine);
  const alguno = playoffsData.some(d => d.completo);

  function handleRegistrar(match, cat) {
    setModal({ match, cat });
  }

  function handleSaved() {
    setModal(null);
    clearLocalCache();
    window.location.reload();
  }

  const inner = (
    <>
      {loading && <div className="loading-text">Cargando...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <>
          {!alguno && (
            <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text1)", marginBottom: 6 }}>
                Playoffs aún no activos
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                Se activarán al cerrarse la fase regular de cada categoría.
                Mientras tanto, puedes ver el escenario actual más abajo.
              </div>
            </div>
          )}

          <div className="section-title" style={{ marginTop: 20 }}>Estado de la fase regular</div>

          {playoffsData.map(data => (
            <CatCard
              key={data.cat}
              data={data}
              onRegistrar={(match) => handleRegistrar(match, data.cat)}
            />
          ))}
        </>
      )}

      {modal && (
        <ScoreModal
          open={!!modal}
          onClose={() => setModal(null)}
          match={modal.match}
          cat={modal.cat}
          temporada={temporada}
          onSaved={handleSaved}
        />
      )}
    </>
  );

  if (embedded) return inner;

  return (
    <div className="page-content">
      <h1 className="page-title">Playoffs</h1>
      {inner}
    </div>
  );
}
