import { useState, useEffect, useMemo } from "react";
import { fetchPartidos } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";
import { calcScoreDetalle, calcRivalidades, calcPuntos } from "../engine.js";
import { palmares as palmaresData, temporadaActual } from "../data.js";

const CAT_COLOR = {
  Platino: "#4F81BD", Oro: "#C0A000", Plata: "#808080", Bronce: "#C05A00",
};

// ── NirbunScore: interno 0-100, display 1.0-10.0 ──────────────────────────
function to10(s) {
  const v = (s / 100) * 9 + 1;
  return Math.round(v * 10) / 10;
}

// Escala de colores tipo SofaScore (1-10)
function scoreColor10(s10) {
  if (s10 >= 9)   return "#1565c0"; // azul oscuro
  if (s10 >= 8)   return "#29b6f6"; // cyan
  if (s10 >= 7)   return "#66bb6a"; // verde
  if (s10 >= 6.5) return "#ffd600"; // amarillo (valoración inicial)
  if (s10 >= 6)   return "#ffa726"; // naranja
  if (s10 >= 5)   return "#ef5350"; // rojo-naranja
  return "#c62828";                 // rojo oscuro
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

// ─── Header ────────────────────────────────────────────────────────────────
function Header({ jugador, categoria, grupoLetra, score100 }) {
  const color  = CAT_COLOR[categoria] || "#888";
  const s10    = to10(score100);
  const scCol  = scoreColor10(s10);
  return (
    <div className="perfil-header">
      <div className="perfil-avatar" style={{ background: color }}>{initials(jugador)}</div>
      <div className="perfil-nombre">{jugador}</div>
      <div className="perfil-badges">
        <span className="perfil-cat-badge" style={{ background: color }}>
          {categoria} {grupoLetra}
        </span>
        <span className="perfil-nscore-badge" style={{ color: scCol, borderColor: scCol }}>
          {s10} <span style={{ fontSize: 10, fontWeight: 600 }}>NS</span>
        </span>
      </div>
    </div>
  );
}

// ─── 4 stat cards ──────────────────────────────────────────────────────────
function StatCards({ pj, winrate, setPct, temporadas }) {
  const items = [
    { label: "Partidos",    val: pj },
    { label: "Winrate",     val: pj > 0 ? `${winrate}%` : "—" },
    { label: "% Sets",      val: pj > 0 ? `${setPct}%` : "—" },
    { label: "Temporadas",  val: temporadas },
  ];
  return (
    <div className="perfil-stat-grid">
      {items.map(({ label, val }) => (
        <div className="perfil-stat-card" key={label}>
          <div className="perfil-stat-val">{val}</div>
          <div className="perfil-stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Últimos partidos (scroll horizontal) ──────────────────────────────────
function UltimosPartidos({ jugador, mis }) {
  const lista = [...mis]
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .slice(0, 8);

  if (lista.length === 0) {
    return (
      <div className="perfil-section-card">
        <div className="section-title" style={{ marginBottom: 8 }}>Forma reciente</div>
        <div style={{ fontSize: 13, color: "var(--text2)", padding: "8px 0" }}>Sin partidos jugados aún</div>
      </div>
    );
  }

  return (
    <div className="perfil-section-card" style={{ paddingBottom: 16 }}>
      <div className="section-title" style={{ marginBottom: 12 }}>Forma reciente</div>
      <div className="forma-scroll">
        {lista.map((p, i) => {
          const esLocal = p.local === jugador;
          const rival   = esLocal ? p.visitante : p.local;
          const { ganador } = calcPuntos(p);
          const gano    = ganador === jugador;
          const score   = scorePartido(p, jugador);
          const rivalInit = initials(rival || "?");
          return (
            <div className="forma-card" key={i}>
              {/* Rival avatar */}
              <div className="forma-rival-avatar">{rivalInit}</div>
              {/* Rival name */}
              <div className="forma-rival-name">{rival}</div>
              {/* Score sets */}
              <div className="forma-score">{score}</div>
              {/* W/L bar */}
              <div className={`forma-wl-bar ${gano ? "win" : "loss"}`} />
              {/* W/L label */}
              <div className={`forma-wl-label ${gano ? "win" : "loss"}`}>{gano ? "W" : "L"}</div>
              {/* Fecha */}
              {p.fecha && <div className="forma-fecha">{formatFecha(p.fecha)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Palmarés ───────────────────────────────────────────────────────────────
function Palmares({ jugador }) {
  const pal = palmaresData[jugador] || {};
  const titulos    = pal.titulos    ?? 0;
  const ascensos   = pal.ascensos   ?? 0;
  const mejorScore = pal.mejorScore ?? 0;
  const temporadas = pal.temporadas ?? [temporadaActual];

  return (
    <div className="perfil-section-card perfil-palmares-card">
      <div className="section-title" style={{ marginBottom: 8 }}>Palmarés</div>
      <div className="perfil-palmares-row">
        <span>🏆 Títulos</span>
        <span className="perfil-palmares-val">{titulos}</span>
      </div>
      <div className="perfil-palmares-row">
        <span>⬆ Ascensos</span>
        <span className="perfil-palmares-val">{ascensos}</span>
      </div>
      <div className="perfil-palmares-row">
        <span>📈 Mejor NirbunScore</span>
        <span className="perfil-palmares-val">
          {mejorScore ? to10(mejorScore) : "—"}
        </span>
      </div>
      <div className="perfil-palmares-row" style={{ border: "none" }}>
        <span>📅 Temporadas</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {temporadas.map(t => (
            <span key={t} className="grupo-pill-mini" style={{ background: "var(--accent)" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Rivalidades ────────────────────────────────────────────────────────────
function Rivalidades({ nemesis, victima, irAPerfil }) {
  function RivCard({ emoji, titulo, data, tipo }) {
    const vacio = !data;
    return (
      <div
        className={`perfil-riv-card ${vacio ? "perfil-riv-card--empty" : ""}`}
        onClick={() => !vacio && irAPerfil?.(data.rival)}
        style={{ cursor: vacio ? "default" : "pointer" }}
      >
        <div className="perfil-riv-icon">{emoji}</div>
        <div className="perfil-riv-title">{titulo}</div>
        {vacio ? (
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
    );
  }
  return (
    <div className="perfil-riv-row">
      <RivCard emoji="💀" titulo="Némesis"          data={nemesis} tipo="nemesis" />
      <RivCard emoji="🎯" titulo="Víctima favorita" data={victima} tipo="victima" />
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────
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

  return (
    <div className="page-content">
      <button className="back-btn" onClick={onVolver}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Atrás
      </button>

      {loading ? (
        <div className="empty-state">Cargando perfil...</div>
      ) : (
        <>
          <Header jugador={jugador} categoria={categoria} grupoLetra={grupoLetra} score100={detalle.total} />
          <StatCards pj={pj} winrate={winrate} setPct={setPct} temporadas={numTemporadas} />
          <UltimosPartidos jugador={jugador} mis={mis} />
          <Palmares jugador={jugador} />
          <Rivalidades nemesis={nemesis} victima={victima} irAPerfil={irAPerfil} />
        </>
      )}
    </div>
  );
}
