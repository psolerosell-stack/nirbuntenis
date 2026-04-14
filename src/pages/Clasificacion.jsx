import { useState, useEffect } from "react";
import { fetchPartidos, clearLocalCache } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";
import { calcClasificacion } from "../engine.js";

const CATEGORIAS = ["Platino", "Oro", "Plata", "Bronce"];

const CAT_COLOR = {
  Platino: "#4F81BD",
  Oro: "#C0A000",
  Plata: "#808080",
  Bronce: "#C05A00",
};

// Normaliza partido de la API al formato que espera el engine
function normalizar(p) {
  const stbl = p.STB_L !== "" && p.STB_L != null ? Number(p.STB_L) : null;
  const stbv = p.STB_V !== "" && p.STB_V != null ? Number(p.STB_V) : null;
  return {
    grupo: `${p.Categoria}-${p.Grupo}`,
    local: p.Jugador_Local ?? p.local,
    visitante: p.Jugador_Visitante ?? p.visitante,
    s1l: Number(p.Set1_L ?? p.s1l), s1v: Number(p.Set1_V ?? p.s1v),
    s2l: Number(p.Set2_L ?? p.s2l), s2v: Number(p.Set2_V ?? p.s2v),
    stbl, stbv,
    fecha: p.Fecha ?? p.fecha ?? "",
    estado: (p.Estado ?? p.estado ?? "").toLowerCase(),
  };
}

// ─── Helpers de fecha ──────────────────────────────────────────────────────
function fechaRelativa(fechaStr) {
  if (!fechaStr) return "";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const partes = String(fechaStr).split("-");
  const partido = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  const diff = Math.round((hoy - partido) / 86400000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff > 1) return `hace ${diff} días`;
  return "";
}

function formatLimite(fechaStr) {
  if (!fechaStr) return "";
  const partes = String(fechaStr).split("-");
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `Antes del ${Number(partes[2])} ${meses[Number(partes[1]) - 1]}`;
}

function diasRestantes(fechaStr) {
  if (!fechaStr) return 999;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const partes = String(fechaStr).split("-");
  const limite = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return Math.round((limite - hoy) / 86400000);
}

// ─── Formatea score a texto "6-3, 6-2" ─────────────────────────────────────
function scoreTexto(p) {
  const sets = [];
  if (p.s1l != null && !isNaN(p.s1l)) sets.push(`${p.s1l}-${p.s1v}`);
  if (p.s2l != null && !isNaN(p.s2l)) sets.push(`${p.s2l}-${p.s2v}`);
  if (p.stbl != null) sets.push(`(${p.stbl}-${p.stbv})`);
  return sets.join(", ");
}

// ─── Determina ganador/perdedor ────────────────────────────────────────────
function ganador(p) {
  const setsL = (p.s1l > p.s1v ? 1 : 0) + (p.s2l > p.s2v ? 1 : 0) + (p.stbl != null ? (p.stbl > p.stbv ? 1 : 0) : 0);
  const setsV = (p.s1v > p.s1l ? 1 : 0) + (p.s2v > p.s2l ? 1 : 0) + (p.stbv != null ? (p.stbv > p.stbl ? 1 : 0) : 0);
  return setsL > setsV ? { winner: p.local, loser: p.visitante } : { winner: p.visitante, loser: p.local };
}

function getRowClass(idx, total) {
  if (idx === 0) return "row-up";
  if (idx === 1) return "row-po-up";
  if (idx === total - 2 && total > 3) return "row-po-down";
  if (idx === total - 1) return "row-down";
  return "";
}

function getBadge(idx, total) {
  if (idx === 0) return <span className="badge badge-up">↑</span>;
  if (idx === 1) return <span className="badge badge-po-up">PO↑</span>;
  if (idx === total - 2 && total > 3) return <span className="badge badge-po-down">PO↓</span>;
  if (idx === total - 1) return <span className="badge badge-down">↓</span>;
  return null;
}

export default function Clasificacion({ navTo, irAPerfil }) {
  const { grupos } = useGrupos();
  const [cat, setCat] = useState("Platino");
  const [grupo, setGrupo] = useState("A");

  // Reacciona a navegación desde Inicio sin refetch de datos
  useEffect(() => {
    if (navTo?.seq > 0) {
      setCat(navTo.cat);
      setGrupo(navTo.grupo);
    }
  }, [navTo?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchPartidos(controller.signal)
      .then(json => {
        const lista = Array.isArray(json) ? json.map(normalizar) : [];
        setPartidos(lista);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== "AbortError") { setError("Error cargando datos"); setLoading(false); }
      });

    return () => controller.abort();
  }, [reloadKey]);

  function handleRefresh() {
    clearLocalCache();
    setReloadKey(k => k + 1);
  }

  const grupoKey = `${cat}-${grupo}`;
  const color = CAT_COLOR[cat];
  const jugadores = grupos[grupoKey] || [];
  const clasi = loading ? [] : calcClasificacion(jugadores, partidos, grupoKey);

  return (
    <div className="page-content">
      <div className="page-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Clasificación
        <button onClick={handleRefresh} title="Actualizar datos" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", padding: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      <div className="pills">
        {CATEGORIAS.map(c => (
          <button
            key={c}
            className={`pill ${cat === c ? `active-${c.toLowerCase()}` : ""}`}
            onClick={() => { setCat(c); setGrupo("A"); }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="group-tabs" style={{ "--active-cat": color }}>
        {["A", "B"].map(g => (
          <button
            key={g}
            className={`group-tab ${grupo === g ? "active" : ""}`}
            onClick={() => setGrupo(g)}
          >
            Grupo {g}
          </button>
        ))}
      </div>

      {loading && <div className="empty-state" style={{ color }}>Cargando...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && clasi.length === 0 && (
        <div className="empty-state">No hay datos para este grupo</div>
      )}

      {!loading && !error && clasi.length > 0 && (
        <table className="standings-table">
          <thead>
            <tr>
              <th style={{ width: 20 }}>#</th>
              <th>Jugador</th>
              <th style={{ width: 34 }}>Pts</th>
              <th style={{ width: 28 }}>PJ</th>
              <th style={{ width: 28 }}>W</th>
              <th style={{ width: 24 }}>L</th>
              <th style={{ width: 42 }}>Dif.S</th>
            </tr>
          </thead>
          <tbody>
            {clasi.map((row, i) => (
              <tr key={row.jugador} className={getRowClass(i, clasi.length)}>
                <td className="rank-num">{i + 1}</td>
                <td>
                  <span
                    style={{ cursor: "pointer" }}
                    onClick={() => irAPerfil?.(row.jugador)}
                  >
                    {row.jugador}
                  </span>
                  {getBadge(i, clasi.length)}
                </td>
                <td style={{ fontWeight: 700 }}>{row.pts}</td>
                <td style={{ color: "var(--text2)" }}>{row.pl}</td>
                <td>{row.w}</td>
                <td>{row.l}</td>
                <td>{(row.splus - row.sminus) > 0 ? "+" : ""}{row.splus - row.sminus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 14, fontSize: 11, color: "var(--text2)", lineHeight: 1.8 }}>
        <span className="badge badge-up">↑</span> Asciende &nbsp;
        <span className="badge badge-po-up">PO↑</span> Playoff Ascenso &nbsp;
        <span className="badge badge-po-down">PO↓</span> Playoff Descenso &nbsp;
        <span className="badge badge-down">↓</span> Desciende
      </div>

      {!loading && !error && (
        <>
          {/* ── Últimos resultados ── */}
          <div style={{ marginTop: 24 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Últimos resultados</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {(() => {
              const jugados = partidos
                .filter(p => p.grupo === grupoKey && p.estado === "jugado")
                .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
                .slice(0, 3);
              if (jugados.length === 0) return (
                <div style={{ color: "var(--text2)", fontSize: 13, padding: "10px 0" }}>
                  No hay resultados aún en este grupo
                </div>
              );
              return jugados.map((p, i) => {
                const { winner, loser } = ganador(p);
                return (
                  <div key={i} style={{
                    background: "var(--surface2)", borderRadius: 10,
                    padding: "10px 14px", display: "flex",
                    flexDirection: "column", gap: 3,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {winner}
                      </span>
                      <span style={{ color: "var(--text2)", fontSize: 12, flexShrink: 0 }}>
                        {scoreTexto(p)}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", color: "var(--text2)" }}>
                        {loser}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>
                      {fechaRelativa(p.fecha)}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: "var(--surface2)", margin: "20px 0" }} />

          {/* ── Partidos pendientes ── */}
          {(() => {
            // Calcula parejas pendientes: round-robin (cada jugador vs todos una vez)
            const jugadosGrupo = partidos.filter(p => p.grupo === grupoKey && p.estado === "jugado");
            const parejaJugada = (a, b) => jugadosGrupo.some(p =>
              (p.local === a && p.visitante === b) || (p.local === b && p.visitante === a)
            );
            const pendientesParejas = [];
            for (let i = 0; i < jugadores.length; i++) {
              for (let j = i + 1; j < jugadores.length; j++) {
                if (!parejaJugada(jugadores[i], jugadores[j])) {
                  // Busca si hay registro pendiente en la API para esta pareja (para obtener fecha límite)
                  const apiFecha = partidos.find(p =>
                    p.grupo === grupoKey && p.estado === "pendiente" &&
                    ((p.local === jugadores[i] && p.visitante === jugadores[j]) ||
                     (p.local === jugadores[j] && p.visitante === jugadores[i]))
                  )?.fecha ?? "";
                  pendientesParejas.push({ a: jugadores[i], b: jugadores[j], fecha: apiFecha });
                }
              }
            }
            return (
              <>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Pendientes</span>
                </div>
                <div style={{ marginTop: 8, marginBottom: 24, display: "flex", flexDirection: "column", gap: 6 }}>
                  {pendientesParejas.length === 0 ? (
                    <div style={{ color: "#4caf50", fontSize: 13, padding: "10px 0", fontWeight: 600 }}>
                      Todos los partidos jugados ✓
                    </div>
                  ) : pendientesParejas.slice(0, 3).map((p, i) => {
                    const urgente = p.fecha && diasRestantes(p.fecha) < 7;
                    return (
                      <div key={i} style={{
                        background: "var(--surface2)", borderRadius: 10,
                        padding: "10px 14px", display: "flex",
                        flexDirection: "column", gap: 3,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", fontSize: 13 }}>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.a}
                          </span>
                          <span style={{ color: "var(--text2)", fontSize: 11, padding: "0 8px", flexShrink: 0 }}>vs</span>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                            {p.b}
                          </span>
                        </div>
                        {p.fecha && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: urgente ? "#ff9800" : "var(--text2)" }}>
                              {formatLimite(p.fecha)}
                            </span>
                            {urgente && <span style={{ fontSize: 14 }}>⏱</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
