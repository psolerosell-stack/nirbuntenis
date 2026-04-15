import { useState } from "react";
import "./App.css";
import { GruposProvider } from "./GruposContext.jsx";
import Clasificacion from "./pages/Clasificacion.jsx";
import Partidos from "./pages/Partidos.jsx";
import Historial from "./pages/Historial.jsx";
import Jugadores from "./pages/Jugadores.jsx";
import PerfilJugador from "./pages/PerfilJugador.jsx";

const TABS = [
  {
    id: "clasificacion",
    label: "Clasificación",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: "partidos",
    label: "Partidos",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <clipPath id="rc1"><circle cx="5.5" cy="5.5" r="4.2"/></clipPath>
          <clipPath id="rc2"><circle cx="18.5" cy="5.5" r="4.2"/></clipPath>
        </defs>
        {/* Racket 1 head */}
        <circle cx="5.5" cy="5.5" r="4.2" strokeWidth="1.7"/>
        {/* Strings 1 */}
        <g clipPath="url(#rc1)" strokeWidth="0.9">
          <line x1="1" y1="3.8" x2="10" y2="3.8"/>
          <line x1="1" y1="5.5" x2="10" y2="5.5"/>
          <line x1="1" y1="7.2" x2="10" y2="7.2"/>
          <line x1="3.8" y1="1" x2="3.8" y2="10"/>
          <line x1="5.5" y1="1" x2="5.5" y2="10"/>
          <line x1="7.2" y1="1" x2="7.2" y2="10"/>
        </g>
        {/* Handle 1 */}
        <line x1="8.8" y1="8.8" x2="20" y2="20" strokeWidth="1.9"/>
        {/* Racket 2 head */}
        <circle cx="18.5" cy="5.5" r="4.2" strokeWidth="1.7"/>
        {/* Strings 2 */}
        <g clipPath="url(#rc2)" strokeWidth="0.9">
          <line x1="14" y1="3.8" x2="23" y2="3.8"/>
          <line x1="14" y1="5.5" x2="23" y2="5.5"/>
          <line x1="14" y1="7.2" x2="23" y2="7.2"/>
          <line x1="16.8" y1="1" x2="16.8" y2="10"/>
          <line x1="18.5" y1="1" x2="18.5" y2="10"/>
          <line x1="20.2" y1="1" x2="20.2" y2="10"/>
        </g>
        {/* Handle 2 */}
        <line x1="15.2" y1="8.8" x2="4" y2="20" strokeWidth="1.9"/>
      </svg>
    ),
  },
  {
    id: "historial",
    label: "Inicio",
    center: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "jugadores",
    label: "Jugadores",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function App() {
  const [tab, setTab] = useState("historial");
  const [clasiFiltro, setClasiFiltro] = useState({ cat: "Platino", grupo: "A", seq: 0 });
  const [perfilActivo, setPerfilActivo] = useState(null); // { jugador: string }

  function irAClasificacion(cat, grupo) {
    setClasiFiltro({ cat, grupo, seq: Date.now() });
    setTab("clasificacion");
  }

  function irAPerfil(jugador) {
    setPerfilActivo({ jugador });
  }

  function volverDePerfil() {
    setPerfilActivo(null);
  }

  const PAGES = {
    historial: <Historial irAClasificacion={irAClasificacion} />,
    clasificacion: <Clasificacion navTo={clasiFiltro} irAPerfil={irAPerfil} />,
    partidos: <Partidos />,
    jugadores: <Jugadores irAPerfil={irAPerfil} />,
  };

  return (
    <GruposProvider>
      <div className="app-shell">
        {perfilActivo ? (
          <PerfilJugador
            jugador={perfilActivo.jugador}
            onVolver={volverDePerfil}
            irAPerfil={irAPerfil}
          />
        ) : (
          <>
            {PAGES[tab]}
            <nav className="bottom-nav">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`nav-tab ${tab === t.id ? "active" : ""} ${t.center ? "center" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.center ? <span className="center-icon-wrap">{t.icon}</span> : t.icon}
                  {t.label}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </GruposProvider>
  );
}
