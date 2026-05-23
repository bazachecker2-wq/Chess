import React from "react";

export interface PieceProps {
  color: "w" | "b";
  styleType?: "classic" | "neon" | "glass";
  className?: string;
}

export function getPieceStyles(color: "w" | "b", styleType?: "classic" | "neon" | "glass") {
  const actualStyle = styleType || "classic";
  if (actualStyle === "neon") {
    return {
      fill: color === "w" ? "url(#neon-white-grad)" : "url(#neon-black-grad)",
      stroke: color === "w" ? "#22d3ee" : "#f43f5e",
      glow: color === "w"
        ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.75)] drop-shadow-[0_0_2px_rgba(34,211,238,0.9)]"
        : "drop-shadow-[0_0_8px_rgba(244,63,94,0.75)] drop-shadow-[0_0_2px_rgba(244,63,94,0.9)]",
    };
  }
  if (actualStyle === "glass") {
    return {
      fill: color === "w" ? "url(#glass-white-grad)" : "url(#glass-black-grad)",
      stroke: color === "w" ? "#ffffff" : "#4b5563",
      glow: color === "w"
        ? "drop-shadow-[0_4px_10px_rgba(255,255,255,0.2)] drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]"
        : "drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
    };
  }
  // Default "classic": Ivory White & Obsidian Black
  return {
    fill: color === "w" ? "url(#classic-white-grad)" : "url(#classic-black-grad)",
    stroke: color === "w" ? "#92400e" : "#0f0f11",
    glow: color === "w"
      ? "drop-shadow-[0_3px_5px_rgba(0,0,0,0.25)] drop-shadow-[0_0_3px_rgba(245,158,11,0.15)]"
      : "drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]",
  };
}

export const Pawn: React.FC<PieceProps> = ({ color, styleType, className }) => {
  const { fill, stroke, glow } = getPieceStyles(color, styleType);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${glow} transition-all duration-300`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pawn Base */}
      <path
        d="M20 85 H80 V80 Q80 75 70 73 H30 Q20 75 20 80 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Body */}
      <path
        d="M32 73 C35 50, 40 45, 42 35 H58 C60 45, 65 50, 68 73 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Collar */}
      <path
        d="M34 38 H66 V34 H34 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Head */}
      <circle
        cx="50"
        cy="24"
        r="14"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
      />
    </svg>
  );
};

export const Rook: React.FC<PieceProps> = ({ color, styleType, className }) => {
  const { fill, stroke, glow } = getPieceStyles(color, styleType);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${glow} transition-all duration-300`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base */}
      <path
        d="M20 85 H80 V78 Q80 74 72 73 H28 Q20 74 20 78 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Pillar body */}
      <path
        d="M28 73 C32 50, 32 45, 30 36 H70 C68 45, 68 50, 72 73 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Upper platform */}
      <path
        d="M24 36 H76 V28 H24 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Castle Battlements */}
      <path
        d="M24 28 V16 H34 V22 H44 V16 H56 V22 H66 V16 H76 V28"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const Knight: React.FC<PieceProps> = ({ color, styleType, className }) => {
  const { fill, stroke, glow } = getPieceStyles(color, styleType);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${glow} transition-all duration-300`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base */}
      <path
        d="M20 85 H80 V78 Q80 74 72 73 H28 Q20 74 20 78 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Knight Body/Horse Shape */}
      <path
        d="M24 73 
           C26 65, 30 55, 26 40 
           C23 28, 30 18, 42 16 
           C46 15, 52 17, 56 22
           C58 20, 64 16, 68 18
           C72 20, 70 28, 66 32
           C72 35, 78 40, 74 48
           C70 54, 60 56, 56 46
           C52 52, 48 60, 52 73 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Eye of the Horse */}
      <circle
        cx="40"
        cy="28"
        r="3"
        fill={styleType === "neon" ? (color === "w" ? "#22d3ee" : "#f43f5e") : (color === "w" ? "#f59e0b" : "#ffffff")}
      />
      {/* Mane details */}
      <path
        d="M62 26 C64 35, 58 45, 54 55"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const Bishop: React.FC<PieceProps> = ({ color, styleType, className }) => {
  const { fill, stroke, glow } = getPieceStyles(color, styleType);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${glow} transition-all duration-300`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base */}
      <path
        d="M20 85 H80 V78 Q80 74 72 73 H28 Q20 74 20 78 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Pillar body */}
      <path
        d="M30 73 C34 56, 36 50, 34 42 H66 C64 50, 66 56, 70 73 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Bishop Mitre (Head) */}
      <path
        d="M32 42 
           C32 26, 42 16, 50 12 
           C58 16, 68 26, 68 42
           C68 47, 32 47, 32 42 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Small top globule/cross bead */}
      <circle
        cx="50"
        cy="9"
        r="4.5"
        fill={fill}
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Mitre Slash */}
      <path
        d="M60 26 L42 36"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const Queen: React.FC<PieceProps> = ({ color, styleType, className }) => {
  const { fill, stroke, glow } = getPieceStyles(color, styleType);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${glow} transition-all duration-300`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base */}
      <path
        d="M18 85 H82 V78 Q82 74 72 73 H28 Q18 74 18 78 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Body */}
      <path
        d="M26 73 C30 52, 34 46, 30 38 H70 C66 46, 70 52, 74 73 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Queen Crown spikes */}
      <path
        d="M22 38 
           L28 18 
           L40 32
           L50 14
           L60 32
           L72 18
           L78 38 
           Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Decorative Crown Jewels (Beads on spikes) */}
      <circle cx="28" cy="18" r="3.5" fill={styleType === "neon" ? "#22d3ee" : "#f59e0b"} stroke={stroke} strokeWidth="1.5" />
      <circle cx="50" cy="14" r="3.5" fill={styleType === "neon" ? "#e11d48" : "#f59e0b"} stroke={stroke} strokeWidth="1.5" />
      <circle cx="72" cy="18" r="3.5" fill={styleType === "neon" ? "#22d3ee" : "#f59e0b"} stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
};

export const King: React.FC<PieceProps> = ({ color, styleType, className }) => {
  const { fill, stroke, glow } = getPieceStyles(color, styleType);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${glow} transition-all duration-300`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base */}
      <path
        d="M18 85 H82 V78 Q82 74 72 73 H28 Q18 74 18 78 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Body */}
      <path
        d="M26 73 C30 52, 34 46, 30 38 H70 C66 46, 70 52, 74 73 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Crown base platform */}
      <path
        d="M24 38 C28 32, 72 32, 76 38 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* King Dome crown */}
      <path
        d="M28 38 Q50 20 72 38 T50 38 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Cross design on the top */}
      <path
        d="M50 24 V10 M44 14 H56"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
};

interface ChessPieceProps {
  type: string; // "p" | "r" | "n" | "b" | "q" | "k"
  color: "w" | "b";
  styleType?: "classic" | "neon" | "glass";
  className?: string;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, styleType = "classic", className }) => {
  const normType = type.toLowerCase();
  switch (normType) {
    case "p":
      return <Pawn color={color} styleType={styleType} className={className} />;
    case "r":
      return <Rook color={color} styleType={styleType} className={className} />;
    case "n":
      return <Knight color={color} styleType={styleType} className={className} />;
    case "b":
      return <Bishop color={color} styleType={styleType} className={className} />;
    case "q":
      return <Queen color={color} styleType={styleType} className={className} />;
    case "k":
      return <King color={color} styleType={styleType} className={className} />;
    default:
      return null;
  }
};
