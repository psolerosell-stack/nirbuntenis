import { useState, useEffect, useMemo } from "react";
import { fetchPartidos } from "../api.js";

const CATEGORIAS = ["Todas", "Platino", "Oro", "Plata", "Bronce"];

function getCat(grupo) {
  // grupo puede ser "Platino-A" o solo "A"
  const parts = (grupo || "").split("-");
  return parts.length > 1 ? parts[0] : "";
}

function getGrupoLetra(grupo) {
  const parts = (grupo || "").split("-");
  return parts.length > 1 ? parts[1] : parts[0];
}

function formatFecha(fecha) {
  if (!fecha && fecha !== 0) return "";
  if (typeof fecha !== "string") return String(fecha);
  if (fecha.includes("-")) {
    const [y, m, d] = fecha.split("-");
    return `${d}/${m}/${y}`;
  }
  return fecha;
}

function normalizar(p) {
  const cat = p.Categoria ?? "";
  const grp = p.Grupo ?? p.grupo ?? "";
  const grupo = cat ? `${cat}-${grp}` : grp;
  return {
    id:        p.ID ?? p.id,
    grupo,
    local:     p.Jugador_Local ?? p.local ?? "",
    visitante: p.Jugador_Visitante ?? p.visitante ?? "",
    ganador:   p.Ganador ?? p.ganador ?? null,
    resultado: p.Resultado ?? p.resultado ?? null,
    fecha:     p.Fecha ?? p.fecha,
    estado:    (p.Estado ?? p.estado ?? "").toLowerCase(),
  };
}

const CAT_COLOR = {
  Platino: "#5b9bd5",
  Oro:     "#d4b430",
  Plata:   "#9898b0",
  Bronce:  "#c8783a",
};

function PartidoCard({ p }) {
  const cat = getCat(p.grupo);
  const jugado = p.estado === "jugado";
  const color = CAT_COLOR[cat] || "var(--text2)";

  return (
    <div className="card">
      <div className="card-header">
        <span className="grupo-pill" style={{ background: color }}>{p.grupo}</span>
        <span className="card-date">{formatFecha(p.fecha)}</span>
      </div>
      <div className="match-row">
        <span className={`match-player ${jugado && p.ganador === p.local ? "winner" : ""}`}>
          {p.local}
        </span>
        {jugado && p.resultado ? (
          <span className="match-score">{p.resultado}</span>
        ) : (
          <span className="match-vs">vs</span>
        )}
        <span
          className={`match-player ${jugado && p.ganador === p.visitante ? "winner" : ""}`}
          style={{ textAlign: "right" }}
        >
          {p.visitante}
        </span>
      </div>
    </div>
  );
}

export default function Partidos() {
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [catFiltro, setCatFiltro] = useState("Todas");
  const [grupoFiltro, setGrupoFiltro] = useState("Todos");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchPartidos(controller.signal)
      .then(json => {
        setPartidos(Array.isArray(json) ? json.map(normalizar) : []);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== "AbortError") { setError(err?.message || "Error cargando partidos"); setLoading(false); }
      });
    return () => controller.abort();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return partidos.filter(p => {
      if (catFiltro !== "Todas" && getCat(p.grupo) !== catFiltro) return false;
      if (grupoFiltro !== "Todos" && getGrupoLetra(p.grupo) !== grupoFiltro) return false;
      if (q && !p.local.toLowerCase().includes(q) && !p.visitante.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [partidos, busqueda, catFiltro, grupoFiltro]);

  const pendientes = filtrados
    .filter(p => p.estado === "pendiente")
    .sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));

  const jugados = filtrados
    .filter(p => p.estado === "jugado")
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));

  const hayFiltros = busqueda || catFiltro !== "Todas" || grupoFiltro !== "Todos";

  return (
    <div className="page-content">
      <div className="page-title">Partidos</div>

      {/* Buscador por jugador */}
      <div className="search-wrap">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="search-input"
          type="text"
          placeholder="Buscar jugador…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button className="search-clear" onClick={() => setBusqueda("")}>✕</button>
        )}
      </div>

      {/* Filtro categoría */}
      <div className="pills">
        {CATEGORIAS.map(c => (
          <button
            key={c}
            className={`pill ${catFiltro === c ? `active-${c.toLowerCase()}` : ""}`}
            style={catFiltro === c && c !== "Todas" ? {} : {}}
            onClick={() => { setCatFiltro(c); setGrupoFiltro("Todos"); }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Filtro grupo */}
      {catFiltro !== "Todas" && (
        <div className="group-tabs" style={{ "--active-cat": CAT_COLOR[catFiltro] }}>
          {["Todos", "A", "B"].map(g => (
            <button
              key={g}
              className={`group-tab ${grupoFiltro === g ? "active" : ""}`}
              onClick={() => setGrupoFiltro(g)}
            >
              {g === "Todos" ? "Todos los grupos" : `Grupo ${g}`}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="empty-state" style={{ color: "var(--platino)" }}>Cargando...</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <>
          {pendientes.length > 0 && (
            <>
              <div className="section-title">Pendientes ({pendientes.length})</div>
              {pendientes.map(p => <PartidoCard key={p.id} p={p} />)}
            </>
          )}

          {jugados.length > 0 && (
            <>
              <div className="section-title">Jugados ({jugados.length})</div>
              {jugados.map(p => <PartidoCard key={p.id} p={p} />)}
            </>
          )}

          {filtrados.length === 0 && (
            <div className="empty-state">
              {hayFiltros ? "No hay partidos con estos filtros" : "No hay partidos registrados"}
            </div>
          )}
        </>
      )}
    </div>
  );
}
