import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchJugadores, agregarJugador as apiAgregarJugador } from "./api.js";
import { grupos as staticGrupos } from "./data.js";

const GruposContext = createContext(null);

/**
 * Construye los grupos a partir de los jugadores del Sheet.
 * El Sheet es la fuente de verdad: si un jugador cambia de grupo o categoría
 * en la pestaña Jugadores, la app lo refleja al expirar el caché (4 min).
 * Si la llamada al API falla, se usan los grupos estáticos de data.js como fallback.
 */
function mergeWithSheet(lista) {
  if (!lista || lista.length === 0) {
    // Fallback: copia de los grupos estáticos
    const result = {};
    Object.entries(staticGrupos).forEach(([key, players]) => {
      result[key] = [...players];
    });
    return result;
  }

  // Construir grupos íntegramente desde el Sheet
  const result = {};
  lista.forEach(item => {
    const nombre = (item.NombreCompleto || item.Nombre || item.nombre || "").trim();
    const cat    = (item.Categoria || item.categoria || "").trim();
    const grp    = (item.Grupo || item.grupo || "").trim();

    if (!nombre || nombre.length < 3) return;
    if (!cat || !grp) return;

    const key = `${cat}-${grp}`;
    if (!result[key]) result[key] = [];
    if (!result[key].includes(nombre)) result[key].push(nombre);
  });

  return result;
}

export function GruposProvider({ children }) {
  const [grupos, setGrupos] = useState(staticGrupos);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchJugadores(controller.signal)
      .then(json => {
        if (Array.isArray(json)) {
          setGrupos(mergeWithSheet(json));
        }
      })
      .catch(() => {
        // Si falla la carga, los grupos estáticos ya están como estado inicial
      });
    return () => controller.abort();
  }, [reloadKey]);

  const agregarJugador = useCallback(async (nombre, categoria, grupo) => {
    await apiAgregarJugador({ nombre, categoria, grupo });
    setReloadKey(k => k + 1);
  }, []);

  return (
    <GruposContext.Provider value={{ grupos, agregarJugador }}>
      {children}
    </GruposContext.Provider>
  );
}

export function useGrupos() {
  return useContext(GruposContext);
}
