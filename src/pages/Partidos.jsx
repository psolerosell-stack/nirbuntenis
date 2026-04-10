import { useState, useEffect } from "react";
import { fetchPartidos } from "../api.js";

function getCat(grupo) {
  return (grupo || "").split("-")[0].toLowerCase();
}

function formatFecha(fecha) {
  if (!fecha && fecha !== 0) return "";
  if (typeof fecha !== "string") return String(fecha);
  // Soporta tanto "2026-03-12" como "12/03/2026"
  if (fecha.includes("-")) {
    const [y, m, d] = fecha.split("-");
    return `${d}/${m}/${y}`;
  }
  return fecha;
}

// Normaliza un partido de la API al formato interno
function normalizar(p) {
  return {
    id: p.ID ?? p.id,
    grupo: p.Grupo ?? p.grupo,
    local: p.Jugador_Local ?? p.local,
    visitante: p.Jugador_Visitante ?? p.visitante,
    ganador: p.Ganador ?? p.ganador ?? null,
    resultado: p.Resultado ?? p.resultado ?? null,
    fecha: p.Fecha ?? p.fecha,
    estado: (p.Estado ?? p.estado ?? "").toLowerCase(),
  };
}

function PartidoCard({ p }) {
  const cat = getCat(p.grupo);
  const jugado = p.estado === "jugado";

  return (
    <div className="card">
      <div className="card-header">
        <span className={`grupo-pill ${cat}`}>{p.grupo}</span>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        if (err.name !== "AbortError") { setError("Error cargando partidos"); setLoading(false); }
      });

    return () => controller.abort();
  }, []);

  const pendientes = partidos.filter(p => p.estado === "pendiente")
    .sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));
  const jugados = partidos.filter(p => p.estado === "jugado")
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));

  return (
    <div className="page-content">
      <div className="page-title">Partidos</div>

      {loading && <div className="empty-state" style={{ color: "var(--platino)" }}>Cargando...</div>}
      {error && <div className="alert alert-error">{error}</div>}

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

          {partidos.length === 0 && (
            <div className="empty-state">No hay partidos registrados</div>
          )}
        </>
      )}
    </div>
  );
}
