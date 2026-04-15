import { useState, useEffect } from "react";
import { fetchPartidos, registrarResultado, clearLocalCache } from "../api.js";
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
    Ganador: p.Ganador,
  };
}


function ScoreModal({ open, onClose, match, cat, onSaved }) {
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
        temporada: "2026-Primavera",
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

function PlayoffMatchCard({ match, cat, onRegistrar }) {
  const { partido } = match;
  const jugado = partido && partido.estado === "jugado";
  const ganador = jugado ? (partido.Ganador || null) : null;

  const tipoLabel = match.tipo === "ascenso" ? "Playoff Ascenso" : "Playoff Descenso";
  const tipoColor = match.tipo === "ascenso" ? "#558b2f" : "#e65100";

  return (
    <div className={`playoff-match-card ${match.tipo === "ascenso" ? "ascenso" : "descenso"}`}>
      <div className="playoff-match-header" style={{ color: tipoColor }}>
        {match.tipo === "ascenso" ? "PO↑" : "PO↓"} {tipoLabel}
      </div>

      <div className="playoff-vs-row">
        <div className={`playoff-vs-player${ganador === match.j1 ? " winner" : ""}`}>
          <span className="playoff-vs-name">{match.j1}</span>
          <span className="playoff-vs-grupo">{match.gJ1}</span>
        </div>
        <span className="playoff-vs-sep">vs</span>
        <div className={`playoff-vs-player right${ganador === match.j2 ? " winner" : ""}`}>
          <span className="playoff-vs-name">{match.j2}</span>
          <span className="playoff-vs-grupo">{match.gJ2}</span>
        </div>
      </div>

      {jugado && (
        <div className="playoff-result-row">
          <span style={{ color: "var(--text2)" }}>{formatScorePartido(partido)}</span>
          {ganador && (
            <span style={{ marginLeft: 8, color: "#3a9c6a", fontWeight: 700 }}>
              Ganador: {ganador}
            </span>
          )}
        </div>
      )}

      {!jugado && (
        <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={() => onRegistrar(match)}>
          Registrar resultado
        </button>
      )}
    </div>
  );
}

function CatCard({ data, onRegistrar }) {
  const { cat, expA, expB, jugadosA, jugadosB, completo, matches, promovidos, descendidos } = data;
  const color = CAT_COLOR[cat];
  const pctA = expA > 0 ? Math.round((jugadosA / expA) * 100) : 0;
  const pctB = expB > 0 ? Math.round((jugadosB / expB) * 100) : 0;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="playoff-cat-header" style={{ borderLeftColor: color }}>
        <div className="playoff-cat-title">
          <span className="bracket-dot" style={{ background: color, marginRight: 6 }} />
          {cat}
        </div>
        {completo && <span className="playoff-completo-badge">Fase regular completada</span>}
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

      {completo && (
        <div className="playoff-bracket">
          {/* Direct promotions */}
          {promovidos.length > 0 && (
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // { match, cat }

  function loadData(signal) {
    setLoading(true);
    setError(null);
    fetchPartidos(signal)
      .then(pJson => {
        setPartidos(Array.isArray(pJson) ? pJson : []);
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

  const partidosEngine = partidos.map(normalizarEngine);
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
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎾</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text1)", marginBottom: 6 }}>
                Playoffs todavía no disponibles
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>
                Los playoffs se activan cuando todos los partidos de la fase regular de un grupo están jugados.
              </div>
            </div>
          )}

          <p className="section-label">Progreso por categoría</p>

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
