import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchJugadores, agregarJugador as apiAgregarJugador } from "./api.js";
import { grupos as staticGrupos } from "./data.js";

const GruposContext = createContext(null);

/**
 * Construye un objeto grupos fusionando los grupos estáticos (data.js) con
 * los jugadores que vienen del Sheet. Los jugadores estáticos siempre conservan
 * sus nombres completos. Sólo se añaden jugadores del Sheet que NO existan ya
 * en los grupos estáticos (para no sobrescribir con nombres truncados o erróneos).
 */
function mergeWithSheet(lista) {
  // Copia profunda de los grupos estáticos
  const result = {};
  Object.entries(staticGrupos).forEach(([key, players]) => {
    result[key] = [...players];
  });

  // Conjunto de todos los jugadores ya existentes en los estáticos
  const existentes = new Set(Object.values(staticGrupos).flat());

  // Añadir sólo jugadores nuevos del Sheet (nombre con longitud razonable)
  lista.forEach(item => {
    const nombre = (item.Nombre || item.nombre || "").trim();
    const cat    = (item.Categoria || item.categoria || "").trim();
    const grp    = (item.Grupo || item.grupo || "").trim();

    if (!nombre || nombre.length < 3) return; // descartar nombres vacíos o muy cortos
    if (!cat || !grp) return;
    if (existentes.has(nombre)) return; // ya está en los datos estáticos

    const key = `${cat}-${grp}`;
    if (!result[key]) result[key] = [];
    result[key].push(nombre);
    existentes.add(nombre);
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
