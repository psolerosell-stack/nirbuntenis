import { useState, useEffect } from "react";
import { registrarResultado, fetchPartidos } from "../api.js";
import { useGrupos } from "../GruposContext.jsx";
import { validarSets } from "../utils/validarSets.js";

const CATEGORIAS = ["Platino", "Oro", "Plata", "Bronce"];

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

function resetForm(setters) {
  setters.forEach(([setter, val]) => setter(val));
}

export default function Resultado({ onGuardado }) {
  const { grupos } = useGrupos();
  const [partidos, setPartidos] = useState([]);
  const [cat, setCat] = useState("");
  const [grupoLetra, setGrupoLetra] = useState("");
  const [local, setLocal] = useState("");
  const [visitante, setVisitante] = useState("");
  const [s1l, setS1l] = useState("");
  const [s1v, setS1v] = useState("");
  const [s2l, setS2l] = useState("");
  const [s2v, setS2v] = useState("");
  const [stbl, setStbl] = useState("");
  const [stbv, setStbv] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState(null);
  const [msgType, setMsgType] = useState("success");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchPartidos(controller.signal)
      .then(json => { if (Array.isArray(json)) setPartidos(json); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

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
    if (!grupoKey || !local || !visitante) {
      setMsg("Selecciona grupo y ambos jugadores"); setMsgType("error"); return;
    }
    if (yaJugaron(partidos, cat, grupoLetra, local, visitante)) {
      setMsg("Este partido ya está registrado."); setMsgType("error"); return;
    }
    const errors = validarSets(n(s1l), n(s1v), n(s2l), n(s2v), showSTB ? n(stbl) : null, showSTB ? n(stbv) : null);
    if (errors.length > 0) { setMsg(errors.join(" · ")); setMsgType("error"); return; }

    setSending(true);
    try {
      await registrarResultado({
        temporada: "2026-Primavera",
        categoria: cat,
        grupo: grupoLetra,
        local,
        visitante,
        s1l: n(s1l), s1v: n(s1v),
        s2l: n(s2l), s2v: n(s2v),
        stbl: showSTB ? n(stbl) : null,
        stbv: showSTB ? n(stbv) : null,
      });

      setMsg("¡Resultado registrado! La clasificación se actualizará en unos segundos.");
      setMsgType("success");
      resetForm([
        [setLocal, ""], [setVisitante, ""],
        [setS1l, ""], [setS1v, ""],
        [setS2l, ""], [setS2v, ""],
        [setStbl, ""], [setStbv, ""],
      ]);

      // Espera 2s para que Apps Script escriba en Sheets, luego navega a Clasificación
      setTimeout(() => { onGuardado?.(); }, 2000);
    } catch (err) {
      setMsg(err?.message || "Error de red al enviar. Inténtalo de nuevo.");
      setMsgType("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-title">Registrar resultado</div>

      {msg && <div className={`alert alert-${msgType}`}>{msg}</div>}

      <>
        {/* Categoría */}
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={cat} onChange={e => { setCat(e.target.value); setGrupoLetra(""); setLocal(""); setVisitante(""); setMsg(null); }}>
              <option value="">— Selecciona —</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Grupo */}
          {cat && (
            <div className="form-group">
              <label className="form-label">Grupo</label>
              <select className="form-select" value={grupoLetra} onChange={e => { setGrupoLetra(e.target.value); setLocal(""); setVisitante(""); }}>
                <option value="">— Selecciona —</option>
                {["A", "B"].map(g => <option key={g} value={g}>Grupo {g}</option>)}
              </select>
            </div>
          )}

          {/* Jugador local */}
          {grupoKey && jugadores.length > 0 && (
            <div className="form-group">
              <label className="form-label">Jugador local</label>
              <select className="form-select" value={local} onChange={e => { setLocal(e.target.value); setVisitante(""); }}>
                <option value="">— Selecciona —</option>
                {jugadores.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          )}

          {/* Jugador visitante */}
          {local && (
            visitantesDisp.length === 0 ? (
              <div className="alert alert-error" style={{ marginTop: 4 }}>
                {local} ya ha jugado contra todos los jugadores del grupo.
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Jugador visitante</label>
                <select className="form-select" value={visitante} onChange={e => setVisitante(e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {visitantesDisp.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            )
          )}

          {/* Sets */}
          {visitante && (
            <>
              <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
                <span style={{ opacity: 0.7 }}>L:</span> {local} &nbsp;|&nbsp; <span style={{ opacity: 0.7 }}>V:</span> {visitante}
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

              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-select" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>

              <button className="btn-primary" onClick={handleGuardar} disabled={sending}>
                {sending ? "Enviando..." : "Guardar resultado"}
              </button>
            </>
          )}
      </>
    </div>
  );
}
