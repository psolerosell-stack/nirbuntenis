import { useState, useEffect } from "react";
import { fetchPartidos } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";
import { calcClasificacion, calcScoreDetalle, calcPuntos } from "../engine.js";

const CAT_COLOR = {
  Platino: "#4F81BD",
  Oro:     "#C0A000",
  Plata:   "#808080",
  Bronce:  "#C05A00",
};

// ── Pequeños helpers ────────────────────────────────────────────────────────

const norm = s =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function initials(nombre) {
  return (nombre || "?").split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}

function to10(s) {
  return Math.round(((s / 100) * 9 + 1) * 10) / 10;
}
function scoreColor10(s) {
  if (s >= 9)   return "#1565c0";
  if (s >= 8)   return "#29b6f6";
  if (s >= 7)   return "#66bb6a";
  if (s >= 6.5) return "#ffd600";
  if (s >= 6)   return "#ffa726";
  if (s >= 5)   return "#ef5350";
  return "#c62828";
}

/** Mapea displayName de Google a un nombre de jugador en la liga */
function encontrarJugador(grupos, displayName) {
  if (!displayName) return null;
  const allPlayers = [...new Set(Object.values(grupos).flat())];
  const words = displayName
    .split(" ")
    .filter(w => w.length > 2)
    .sort((a, b) => b.length - a.length);

  for (const word of words) {
    const wn = norm(word);
    const matches = allPlayers.filter(p => norm(p).includes(wn));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      for (const w2 of words.filter(w => w !== word)) {
        const narrow = matches.filter(p => norm(p).includes(norm(w2)));
        if (narrow.length >= 1) return narrow[0];
      }
      return matches[0];
    }
  }
  return null;
}

/** Normaliza el partido raw de la API al formato del engine */
function normalizar(p) {
  return {
    grupo:     `${p.Categoria}-${p.Grupo}`,
    local:      p.Jugador_Local    ?? "",
    visitante:  p.Jugador_Visitante ?? "",
    s1l: Number(p.Set1_L), s1v: Number(p.Set1_V),
    s2l: Number(p.Set2_L), s2v: Number(p.Set2_V),
    stbl: p.STB_L !== "" && p.STB_L != null ? Number(p.STB_L) : null,
    stbv: p.STB_V !== "" && p.STB_V != null ? Number(p.STB_V) : null,
    estado: (p.Estado ?? "").toLowerCase(),
    fecha:   p.Fecha ?? "",
    ganador: p.Ganador ?? "",
  };
}

function formatFecha(fechaStr) {
  if (!fechaStr) return "";
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const parts  = String(fechaStr).split("-");
  if (parts.length < 3) return fechaStr;
  return `${Number(parts[2])} ${meses[Number(parts[1]) - 1]}`;
}

function calcRacha(misPartidos, playerName) {
  if (!misPartidos.length) return null;
  const sorted = [...misPartidos].sort((a, b) =>
    String(b.fecha).localeCompare(String(a.fecha))
  );
  const firstWin = calcPuntos(sorted[0]).ganador === playerName;
  let count = 0;
  for (const p of sorted) {
    if ((calcPuntos(p).ganador === playerName) === firstWin) count++;
    else break;
  }
  return { tipo: firstWin ? "W" : "L", count };
}

function calcPosicion(playerName, grupos, partidos) {
  for (const [key, players] of Object.entries(grupos)) {
    if (!players.includes(playerName)) continue;
    const clasi = calcClasificacion(players, partidos, key);
    const idx   = clasi.findIndex(r => r.jugador === playerName);
    if (idx === -1) continue;
    const [cat, grupo] = key.split("-");
    return {
      pos: idx + 1, total: clasi.length,
      pts: clasi[idx].pts,
      difArriba: idx > 0 ? clasi[idx - 1].pts - clasi[idx].pts : null,
      cat, grupo, key,
    };
  }
  return null;
}

function calcPendientes(playerName, grupos, partidos) {
  for (const [key, players] of Object.entries(grupos)) {
    if (!players.includes(playerName)) continue;
    const jugados = partidos.filter(p => p.grupo === key && p.estado === "jugado");
    return players
      .filter(r => r !== playerName)
      .filter(r => !jugados.some(p =>
        (p.local === playerName && p.visitante === r) ||
        (p.local === r && p.visitante === playerName)
      ));
  }
  return [];
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function ProfilePanel({ open, onClose, user, onSignOut }) {
  const { grupos } = useGrupos();
  const [partidos,     setPartidos]     = useState([]);
  const [dataLoading,  setDataLoading]  = useState(false);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setDataLoading(true);
    fetchPartidos(ctrl.signal)
      .then(data => { setPartidos(Array.isArray(data) ? data : []); setDataLoading(false); })
      .catch(err  => { if (err.name !== "AbortError") setDataLoading(false); });
    return () => ctrl.abort();
  }, [open]);

  const playerName = encontrarJugador(grupos, user?.displayName);
  const inicial    = (user?.displayName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  // Normalize once
  const partNorm = partidos.map(normalizar);

  // Mis partidos jugados
  const misPartidos = partNorm.filter(p =>
    p.estado === "jugado" &&
    (p.local === playerName || p.visitante === playerName)
  );

  // Stats temporada
  const pj = misPartidos.length;
  const w  = misPartidos.filter(p => calcPuntos(p).ganador === playerName).length;
  const l  = pj - w;
  const winPct = pj > 0 ? Math.round((w / pj) * 100) : 0;
  const racha  = calcRacha(misPartidos, playerName);

  // Posición + NirbunScore
  const posicion = playerName && !dataLoading ? calcPosicion(playerName, grupos, partNorm) : null;
  const detalle  = playerName && pj > 0 ? calcScoreDetalle(playerName, partNorm, posicion?.cat || "Bronce") : null;
  const s10      = detalle ? to10(detalle.total) : null;
  const scCol    = s10 ? scoreColor10(s10) : "var(--text2)";
  const catColor = CAT_COLOR[posicion?.cat] || "var(--accent)";

  // Forma reciente (últimos 8)
  const forma = [...misPartidos]
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .slice(0, 8);

  // Partidos pendientes
  const pendientes = playerName && !dataLoading
    ? calcPendientes(playerName, grupos, partNorm)
    : [];

  return (
    <>
      {/* Overlay */}
      <div className={`profile-overlay ${open ? "open" : ""}`} onClick={onClose} />

      {/* Drawer */}
      <div className={`profile-drawer ${open ? "open" : ""}`}>
        <button className="profile-close-btn" onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="profile-scroll">

          {/* ── 1. Identidad ── */}
          <div className="profile-section profile-identity">
            {user?.photoURL
              ? <img src={user.photoURL} alt="avatar" className="profile-avatar-lg" />
              : <div className="profile-avatar-lg profile-avatar-initial">{inicial}</div>
            }
            <div className="profile-name">{user?.displayName || "Usuario"}</div>
            <div className="profile-email">{user?.email}</div>
            {playerName && posicion && (
              <div className="profile-player-badge">
                <span style={{ color: catColor }}>●</span>
                &nbsp;{playerName} · {posicion.cat} {posicion.grupo}
              </div>
            )}
            <button className="profile-signout-btn" onClick={onSignOut}>
              Cerrar sesión
            </button>
          </div>

          {/* ── 2. Mi temporada ── */}
          {playerName && (
            <div className="profile-section">
              <div className="profile-section-title">Mi temporada</div>

              {dataLoading ? (
                <div className="profile-loading">Cargando...</div>
              ) : (
                <>
                  {/* Fila stats: PJ / V / D */}
                  <div className="profile-stats-row">
                    <div className="profile-stat">
                      <div className="profile-stat-num">{pj}</div>
                      <div className="profile-stat-label">Jugados</div>
                    </div>
                    <div className="profile-stat">
                      <div className="profile-stat-num" style={{ color: "#4caf50" }}>{w}</div>
                      <div className="profile-stat-label">Victorias</div>
                    </div>
                    <div className="profile-stat">
                      <div className="profile-stat-num" style={{ color: "#ef5350" }}>{l}</div>
                      <div className="profile-stat-label">Derrotas</div>
                    </div>
                  </div>

                  {/* Fila: % victorias + racha */}
                  <div className="profile-stats-row" style={{ marginTop: 8 }}>
                    <div className="profile-stat">
                      <div className="profile-stat-num">
                        {winPct}<span style={{ fontSize: 14 }}>%</span>
                      </div>
                      <div className="profile-stat-label">% victorias</div>
                    </div>
                    <div className="profile-stat" style={{ flex: 2 }}>
                      {racha ? (
                        <>
                          <div className="profile-stat-num" style={{ fontSize: 20, color: racha.tipo === "W" ? "#4caf50" : "#ef5350" }}>
                            {racha.count} {racha.tipo === "W" ? "🔥" : "❄️"}
                          </div>
                          <div className="profile-stat-label">
                            Racha {racha.tipo === "W" ? "ganadora" : "perdedora"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="profile-stat-num">—</div>
                          <div className="profile-stat-label">Sin partidos</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Fila: Posición + NirbunScore */}
                  <div className="profile-stats-row" style={{ marginTop: 8 }}>
                    {/* Posición */}
                    <div className="profile-stat profile-stat--pos" style={{ flex: 1.2 }}>
                      {posicion ? (
                        <>
                          <div className="profile-stat-num" style={{ fontSize: 32, color: catColor }}>
                            {posicion.pos}º
                          </div>
                          <div className="profile-stat-label" style={{ marginBottom: 4 }}>Posición</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>
                            {posicion.pts} pts
                          </div>
                          {posicion.pos === 1 && (
                            <div style={{ fontSize: 10, color: "#4caf50", marginTop: 2 }}>Líder 🏆</div>
                          )}
                          {posicion.difArriba !== null && posicion.difArriba > 0 && (
                            <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 2 }}>
                              -{posicion.difArriba} pts del {posicion.pos - 1}º
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="profile-stat-num">—</div>
                          <div className="profile-stat-label">Posición</div>
                        </>
                      )}
                    </div>

                    {/* NirbunScore */}
                    <div className="profile-stat profile-stat--ns" style={{ flex: 1 }}>
                      {s10 ? (
                        <>
                          <div className="profile-stat-num" style={{ fontSize: 32, color: scCol }}>
                            {s10}
                          </div>
                          <div className="profile-stat-label">NirbunScore</div>
                          <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 2 }}>
                            sobre 10
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="profile-stat-num">—</div>
                          <div className="profile-stat-label">NirbunScore</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Gráfico forma reciente */}
                  {forma.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                        Forma reciente
                      </div>
                      <div className="forma-scroll">
                        {forma.map((p, i) => {
                          const esLocal = p.local === playerName;
                          const rival   = esLocal ? p.visitante : p.local;
                          const gano    = calcPuntos(p).ganador === playerName;
                          const sl = esLocal ? p.s1l : p.s1v, sv = esLocal ? p.s1v : p.s1l;
                          const sl2 = esLocal ? p.s2l : p.s2v, sv2 = esLocal ? p.s2v : p.s2l;
                          const score = [
                            `${sl}-${sv}`,
                            `${sl2}-${sv2}`,
                            p.stbl != null ? (esLocal ? `(${p.stbl}-${p.stbv})` : `(${p.stbv}-${p.stbl})`) : null,
                          ].filter(Boolean).join(" ");
                          return (
                            <div className="forma-card" key={i}>
                              <div className="forma-rival-avatar">{initials(rival || "?")}</div>
                              <div className="forma-rival-name">{rival}</div>
                              <div className="forma-score">{score}</div>
                              <div className={`forma-wl-bar ${gano ? "win" : "loss"}`} />
                              <div className={`forma-wl-label ${gano ? "win" : "loss"}`}>{gano ? "W" : "L"}</div>
                              {p.fecha && <div className="forma-fecha">{formatFecha(p.fecha)}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Partidos pendientes */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                      Pendientes
                    </div>
                    {pendientes.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#4caf50", fontWeight: 600 }}>
                        ✓ Todos los partidos jugados
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {pendientes.map(rival => (
                          <div key={rival} className="profile-pendiente-row">
                            <div className="forma-rival-avatar" style={{ width: 28, height: 28, fontSize: 9 }}>
                              {initials(rival)}
                            </div>
                            <span style={{ fontSize: 13, color: "var(--text1)" }}>vs {rival}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── 3. Últimos partidos ── */}
          {playerName && !dataLoading && forma.length > 0 && (
            <div className="profile-section">
              <div className="profile-section-title">Últimos partidos</div>
              {forma.slice(0, 5).map((p, i) => {
                const win   = calcPuntos(p).ganador === playerName;
                const rival = p.local === playerName ? p.visitante : p.local;
                const esLocal = p.local === playerName;
                const score = [
                  `${esLocal ? p.s1l : p.s1v}-${esLocal ? p.s1v : p.s1l}`,
                  `${esLocal ? p.s2l : p.s2v}-${esLocal ? p.s2v : p.s2l}`,
                  p.stbl != null ? (esLocal ? `(${p.stbl}-${p.stbv})` : `(${p.stbv}-${p.stbl})`) : null,
                ].filter(Boolean).join("  ");
                return (
                  <div key={i} className={`profile-match-row ${win ? "win" : "loss"}`}>
                    <div className="profile-match-badge">{win ? "V" : "D"}</div>
                    <div className="profile-match-info">
                      <div className="profile-match-rival">vs {rival}</div>
                      <div className="profile-match-score">{score}</div>
                    </div>
                    <div className="profile-match-date">{formatFecha(p.fecha)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sin jugador vinculado */}
          {!dataLoading && !playerName && (
            <div className="profile-section" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎾</div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                Tu cuenta no está vinculada a ningún jugador de la liga.
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
