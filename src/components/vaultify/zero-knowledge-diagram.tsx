"use client";

import { motion } from "framer-motion";

export function ZeroKnowledgeDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="0 0 900 320"
        className="min-w-[700px] w-full"
        style={{ filter: "drop-shadow(0 0 30px rgba(0,0,0,0.4))" }}
      >
        <defs>
          <linearGradient id="boxGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>
        </defs>

        {/* ============ WĘZEŁ 1: PRZEGLĄDARKA NADAWCY ============ */}
        <rect
          x="30" y="100" width="220" height="110" rx="16"
          fill="url(#boxGradient)"
          stroke="rgba(255,255,255,0.12)"
        />
        <text x="140" y="145" textAnchor="middle" fill="#f4f4f5" fontSize="15" fontWeight="600">
          Przeglądarka nadawcy
        </text>
        <text x="140" y="168" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="monospace">
          Szyfruje AES-256-GCM
        </text>
        <text x="140" y="186" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="monospace">
          lokalnie, przed wysyłką
        </text>

        {/* ============ WĘZEŁ 2: SERWER + BAZA DANYCH ============ */}
        <rect
          x="340" y="100" width="220" height="110" rx="16"
          fill="url(#boxGradient)"
          stroke="rgba(94,234,212,0.25)"
        />
        <text x="450" y="145" textAnchor="middle" fill="#f4f4f5" fontSize="15" fontWeight="600">
          Serwer + baza danych
        </text>
        <text x="450" y="168" textAnchor="middle" fill="#5eead4" fontSize="11" fontFamily="monospace">
          Widzi WYŁĄCZNIE
        </text>
        <text x="450" y="186" textAnchor="middle" fill="#5eead4" fontSize="11" fontFamily="monospace">
          zaszyfrowany bełkot
        </text>

        {/* ============ WĘZEŁ 3: PRZEGLĄDARKA ODBIORCY ============ */}
        <rect
          x="650" y="100" width="220" height="110" rx="16"
          fill="url(#boxGradient)"
          stroke="rgba(255,255,255,0.12)"
        />
        <text x="760" y="145" textAnchor="middle" fill="#f4f4f5" fontSize="15" fontWeight="600">
          Przeglądarka odbiorcy
        </text>
        <text x="760" y="168" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="monospace">
          Odszyfrowuje lokalnie,
        </text>
        <text x="760" y="186" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="monospace">
          treść znika po odczycie
        </text>

        {/* ============ ŚCIEŻKA 1: SZYFROGRAM (przez serwer) ============ */}
        <path
          id="cipherPath"
          d="M250,155 L340,155 M560,155 L650,155"
          fill="none"
          stroke="rgba(94,234,212,0.35)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <circle r="5" fill="#5eead4" style={{ filter: "drop-shadow(0 0 6px #5eead4)" }}>
          <animateMotion
            path="M250,155 L340,155 L560,155 L650,155"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* ============ ŚCIEŻKA 2: KLUCZ (łukiem, omija serwer) ============ */}
        <path
          d="M150,100 C150,20 750,20 750,100"
          fill="none"
          stroke="rgba(240,168,104,0.35)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <circle r="5" fill="#f0a868" style={{ filter: "drop-shadow(0 0 6px #f0a868)" }}>
          <animateMotion
            path="M150,100 C150,20 750,20 750,100"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Symbol "zakazu" nad serwerem — klucz go nigdy nie dotyka */}
        <g transform="translate(450, 40)">
          <circle r="14" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" />
          <line x1="-6" y1="-6" x2="6" y2="6" stroke="#ef4444" strokeWidth="1.5" />
          <line x1="6" y1="-6" x2="-6" y2="6" stroke="#ef4444" strokeWidth="1.5" />
        </g>
        <text x="450" y="70" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="monospace">
          klucz nigdy tu nie trafia
        </text>

        {/* Etykiety ścieżek */}
        <text x="290" y="290" textAnchor="middle" fill="#5eead4" fontSize="11" fontFamily="monospace">
          ● ciphertext (zaszyfrowany bełkot)
        </text>
        <text x="620" y="290" textAnchor="middle" fill="#f0a868" fontSize="11" fontFamily="monospace">
          ● klucz #k=... (fragment URL)
        </text>
      </svg>
    </div>
  );
}