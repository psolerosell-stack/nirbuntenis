import { useState, useEffect, useMemo } from "react";
import { fetchPartidos } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";
import { calcScoreDetalle, calcRivalidades, calcPuntos } from "../engine.js";
import { palmares as palmaresData, temporadaActual } from "../data.js";

const CAT_COLOR = { Platino: "#4F81BD", Oro: "#C0A000", Plata: "#808080", Bronce: "#C05A00" };

function to10(s) {
  const v = (s / 100) * 9 + 1;
  return Math.round(v * 10) / 10;
}

function scoreColor10(s10) {
  if (s10 >= 9)   return "#1565c0";
  if (s10 >= 8)   return "#29b6f6";
  if (s10 >= 7)   return "#66bb6a";
  if (s10 >= 6.5) return "#ffd600";
  if (s10 >= 6)   return "#ffa726";
  if (s10 >= 5)   return "#ef5350";
  return "#c62828";
}

function scoreColor(s100) { return scoreColor10(to10(s100)); }

function formatFecha(f) {
  if (!f) return "";
  const parts = String(f).split("-");
  if (parts.length < 3) return f;
  const meses = ["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(parts[2])} ${meses[parseInt(parts[1])] || parts[1]}`;
}

function normalizar(p) {
  const stbl = (p.STB_L !== "" && p.STB_L != null) ? Number(p.STB_L) : (p.stbl ?? null);
  const stbv = (p.STB_V !== "" && p.STB_V != null) ? Number(p.STB_V) : (p.stbv ?? null);
  const grupo = p.Categoria ? `${p.Categoria}-${p.Grupo}` : (p.grupo || "");
  return {
    grupo,
    local:     p.Jugador_Local    ?? p.local    ?? "",
    visitante: p.Jugador_Visitante ?? p.visitante ?? "",
    s1l: Number(p.Set1_L ?? p.s1l) || 0,
    s1v: Number(p.Set1_V ?? p.s1v) || 0,
    s2l: Number(p.Set2_L ?? p.s2l) || 0,
    s2v: Number(p.Set2_V ?? p.s2v) || 0,
    stbl, stbv,
    estado: (p.Estado ?? p.estado ?? "").toLowerCase(),
    fecha:  p.Fecha  ?? p.fecha  ?? "",
  };
}

function scorePartido(p, jugador) {
  const esLocal = p.local === jugador;
  const sets = [
    esLocal ? `${p.s1l}-${p.s1v}` : `${p.s1v}-${p.s1l}`,
    esLocal ? `${p.s2l}-${p.s2v}` : `${p.s2v}-${p.s2l}`,
  ];
  if (p.stbl != null) sets.push(esLocal ? `(${p.stbl}-${p.stbv})` : `(${p.stbv}-${p.stbl})`);
  return sets.join(" ");
}

function initials(nombre) {
  return nombre.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}

const FACTOR_LABELS = {
  categoria:    "Categoría",
  winrate:      "Winrate",
  sets:         "Sets",
  juegos:       "Juegos",
  consistencia: "Consistencia",
};

export default function PerfilJugador({ jugador, onVolver, irAPerfil }) {
  const { grupos } = useGrupos();
  const [partidos, setPartidos] = useState([]);
  const [loading,  setLoading]  = useState(true);

  let categoria = "Bronce", grupoLetra = "A";
  for (const [key, players] of Object.entries(grupos)) {
    if (players.includes(jugador)) {
      const parts = key.split("-");
      categoria  = parts[0];
      grupoLetra = parts[1] || "A";
      break;
    }
  }

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    fetchPartidos(controller.signal)
      .then(json => {
        setPartidos(Array.isArray(json) ? json.map(normalizar) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [jugador]);

  const mis = useMemo(() =>
    partidos.filter(p =>
      p.estado === "jugado" && (p.local === jugador || p.visitante === jugador)
    ), [partidos, jugador]);

  const pj = mis.length;
  const g  = mis.filter(p => calcPuntos(p).ganador === jugador).length;
  const winrate = pj > 0 ? Math.round((g / pj) * 100) : 0;
  let sG = 0, sP = 0;
  mis.forEach(p => {
    const esLocal = p.local === jugador;
    const sl = (p.s1l > p.s1v ? 1 : 0) + (p.s2l > p.s2v ? 1 : 0) + (p.stbl != null && p.stbl > p.stbv ? 1 : 0);
    const sv = (p.s1v > p.s1l ? 1 : 0) + (p.s2v > p.s2l ? 1 : 0) + (p.stbl != null && p.stbv > p.stbl ? 1 : 0);
    sG += esLocal ? sl : sv;
    sP += esLocal ? sv : sl;
  });
  const setPct  = (sG + sP) > 0 ? Math.round((sG / (sG + sP)) * 100) : 0;
  const detalle = calcScoreDetalle(jugador, partidos, categoria);

  const pal = palmaresData[jugador] || {};
  const numTemporadas = (pal.temporadas ?? [temporadaActual]).length;

  const { nemesis, victima } = calcRivalidades(jugador, partidos);

  const catColor = CAT_COLOR[categoria] || "#888";
  const s10      = to10(detalle.total);
  const scCol    = scoreColor10(s10);

  return (
    <div className="page-content">
      <button className="back-btn" onClick={onVolver}>← Atrás</button>

      {loading ? (
        <div className="empty-state">Cargando perfil...</div>
      ) : (
        <>
          {/* Header */}
          <div className="perfil-header">
            <div className="perfil-avatar" style={{ background: catColor }}>
              {initials(jugador)}
            </div>
            <div className="perfil-nombre">{jugador}</div>
            <div className="perfil-badges">
              <span className="perfil-cat-badge" style={{ background: catColor, borderColor: catColor }}>
                {categoria} {grupoLetra}
              </span>
              <span className="perfil-nscore-badge" style={{ color: scCol, borderColor: scCol }}>
                {s10} <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 2 }}>NS</span>
              </span>
            </div>
          </div>

          {/* 4 stat cards */}
          <div className="perfil-stat-grid">
            {[
              { label: "Partidos",   val: pj },
              { label: "Winrate",    val: pj > 0 ? `${winrate}%` : "—" },
              { label: "% Sets",     val: pj > 0 ? `${setPct}%` : "—" },
              { label: "Temporadas", val: numTemporadas },
            ].map(({ label, val }) => (
              <div className="perfil-stat-card" key={label}>
                <div className="perfil-stat-val">{val}</div>
                <div className="perfil-stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* NirbunScore detalle */}
          <div className="perfil-score-card">
            <div className="section-title" style={{ marginBottom: 10 }}>NirbunScore</div>
            <div className="perfil-score-total-row">
              <span className="perfil-score-total-num" style={{ color: scCol }}>{s10}</span>
              <span style={{ fontSize: 12, color: "var(--text2)", marginLeft: 4 }}>/ 10</span>
            </div>
            <div className="perfil-score-main-bar-wrap">
              <div
                className="perfil-score-main-bar"
                style={{ width: `${detalle.total}%`, background: scCol }}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              {Object.entries(detalle.factores).map(([key, fac]) => (
                <div className="perfil-factor-row" key={key}>
                  <span className="perfil-factor-label">{FACTOR_LABELS[key] || key}</span>
                  <div className="perfil-factor-bar-wrap">
                    <div
                      className="perfil-factor-bar"
                      style={{ width: `${(fac.contribucion / fac.max) * 100}%`, background: scCol }}
                    />
                  </div>
                  <span className="perfil-factor-val">{fac.contribucion}/{fac.max}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Forma reciente */}
          <div className="perfil-section-card">
            <div className="section-title" style={{ marginBottom: 10 }}>Forma reciente</div>
            {mis.length === 0 ? (
              <div className="empty-state">Sin partidos jugados aún</div>
            ) : (
              <div className="forma-scroll">
                {[...mis]
                  .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
                  .slice(0, 8)
                  .map((p, i) => {
                    const esLocal = p.local === jugador;
                    const rival   = esLocal ? p.visitante : p.local;
                    const { ganador } = calcPuntos(p);
                    const gano    = ganador === jugador;
                    const score   = scorePartido(p, jugador);
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
            )}
          </div>

          {/* Ultimos partidos */}
          <div className="perfil-section-card">
            <div className="section-title" style={{ marginBottom: 10 }}>Últimos partidos</div>
            {mis.length === 0 ? (
              <div className="empty-state">Sin partidos jugados aún</div>
            ) : (
              [...mis]
                .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
                .slice(0, 5)
                .map((p, i) => {
                  const esLocal = p.local === jugador;
                  const rival   = esLocal ? p.visitante : p.local;
                  const { ganador } = calcPuntos(p);
                  const gano    = ganador === jugador;
                  const score   = scorePartido(p, jugador);
                  return (
                    <div className="perfil-match-row" key={i}>
                      <span className={`perfil-match-badge ${gano ? "win" : "loss"}`}>{gano ? "W" : "L"}</span>
                      <span className="perfil-match-rival">{rival}</span>
                      <span className="perfil-match-score">{score}</span>
                      {p.fecha && <span className="perfil-match-fecha">{formatFecha(p.fecha)}</span>}
                    </div>
                  );
                })
            )}
          </div>

          {/* Palmarés */}
          <div className="perfil-section-card perfil-palmares-card">
            <div className="section-title" style={{ marginBottom: 10 }}>Palmarés</div>
            <div className="perfil-palmares-row">
              <span>Títulos</span>
              <span className="perfil-palmares-val">{pal.titulos ?? 0}</span>
            </div>
            <div className="perfil-palmares-row">
              <span>Ascensos</span>
              <span className="perfil-palmares-val">{pal.ascensos ?? 0}</span>
            </div>
            <div className="perfil-palmares-row">
              <span>Mejor NirbunScore</span>
              <span className="perfil-palmares-val">{pal.mejorScore ? to10(pal.mejorScore) : "—"}</span>
            </div>
            <div className="perfil-palmares-row">
              <span>Temporadas</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {(pal.temporadas ?? [temporadaActual]).map(t => (
                  <span key={t} className="grupo-pill-mini" style={{ background: "var(--accent)" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Rivalidades */}
          <div className="perfil-riv-row">
            {[
              { emoji: "💀", titulo: "Némesis",          data: nemesis, tipo: "nemesis" },
              { emoji: "🎯", titulo: "Víctima favorita", data: victima, tipo: "victima" },
            ].map(({ emoji, titulo, data, tipo }) => (
              <div
                key={tipo}
                className={`perfil-riv-card ${!data ? "perfil-riv-card--empty" : ""}`}
                onClick={() => data && irAPerfil?.(data.rival)}
                style={{ cursor: data ? "pointer" : "default" }}
              >
                <div className="perfil-riv-icon">{emoji}</div>
                <div className="perfil-riv-title">{titulo}</div>
                {!data ? (
                  <div className="perfil-riv-sub">Aún sin datos</div>
                ) : (
                  <>
                    <div className="perfil-riv-nombre">{data.rival}</div>
                    <div className="perfil-riv-sub">
                      {tipo === "nemesis"
                        ? `${data.derrotas} ${data.derrotas === 1 ? "derrota" : "derrotas"} tuyas`
                        : `${data.victorias} ${data.victorias === 1 ? "victoria" : "victorias"} tuyas`}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
