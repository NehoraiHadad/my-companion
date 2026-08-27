import type { ComponentType } from "react";
import type { DecorKey } from "./gameEngine";

const ink = "#2a2140";
const s4 = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x + r * .24} ${y - r * .24} ${x + r} ${y}Q${x + r * .24} ${y + r * .24} ${x} ${y + r}Q${x - r * .24} ${y + r * .24} ${x - r} ${y}Q${x - r * .24} ${y - r * .24} ${x} ${y - r}Z`;
const star5 = "M0-10 2.47-3.4 9.51-3.09 3.99 1.3 5.88 8.09 0 4.2-5.88 8.09-3.99 1.3-9.51-3.09-2.47-3.4Z";
const leaf = "M0 0C-6.4-4.4-9.6-14-5.6-22.4-.4-18 2.8-8.4 0 0Z";

function LampArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="lampGlowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffdf9b" stopOpacity=".72" />
          <stop offset=".55" stopColor="#ffc46a" stopOpacity=".26" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lampShadeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffeec2" />
          <stop offset=".55" stopColor="#ffcd83" />
          <stop offset="1" stopColor="#f3a950" />
        </linearGradient>
        <linearGradient id="lampBaseGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d29457" />
          <stop offset="1" stopColor="#8c5729" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="24" r="30" fill="url(#lampGlowGrad)" />
      <ellipse cx="32" cy="57.6" rx="14.4" ry="3.4" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".36">
        <path d="M15.4 32.4 22.4 10.2h19.2l7 22.2a2.6 2.6 0 0 1-2.5 3.4H17.9a2.6 2.6 0 0 1-2.5-3.4Z" />
        <path d="M28.8 29h6.4v21h-6.4z" />
        <path d="M18.4 56.6c0-5.4 4.6-8.6 13.6-8.6s13.6 3.2 13.6 8.6z" />
      </g>
      <path d="M29.6 30h4.8v20h-4.8z" fill="#b07a35" />
      <path d="M32.4 30h2v20h-2z" fill="#7d5220" opacity=".5" />
      <path d="M20 55.4c0-4.8 4.4-7.6 12-7.6s12 2.8 12 7.6z" fill="url(#lampBaseGrad)" />
      <ellipse cx="27.6" cy="52.2" rx="4.4" ry="1.5" fill="#f0c491" opacity=".5" />
      <path d="M17 31.6 23.6 12.6a2.4 2.4 0 0 1 2.3-1.7h12.2a2.4 2.4 0 0 1 2.3 1.7L47 31.6a2 2 0 0 1-1.9 2.7H18.9A2 2 0 0 1 17 31.6Z" fill="url(#lampShadeGrad)" />
      <path d="M38.4 10.9h1.7L47 31.6a2 2 0 0 1-1.9 2.7h-3.5z" fill="#e18f42" opacity=".42" />
      <rect x="23" y="9.2" width="18" height="3.8" rx="1.9" fill="#fff2d2" />
      <ellipse cx="32" cy="35.8" rx="12.2" ry="2.6" fill="#ffe3a6" opacity=".6" />
      <path d={s4(26, 20.4, 3.2)} fill="#fff8e2" />
      <path d={s4(37.2, 25.4, 2.4)} fill="#fff8e2" opacity=".8" />
      <path d={s4(30.6, 27.6, 1.6)} fill="#fff8e2" opacity=".65" />
      <path d={star5} transform="translate(32 6.2) scale(.42)" fill="#ffd66a" />
    </svg>
  );
}

function PosterArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="posterFrameGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8b471" />
          <stop offset="1" stopColor="#a5652d" />
        </linearGradient>
        <linearGradient id="posterSkyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#33296e" />
          <stop offset=".5" stopColor="#5b3f9d" />
          <stop offset="1" stopColor="#9a55ab" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="57.4" rx="15.6" ry="3.2" fill={ink} opacity=".2" />
      <g transform="rotate(-6 32 32)">
        <rect x="10.4" y="6.4" width="43.2" height="49.2" rx="5.6" fill={ink} opacity=".36" />
        <rect x="12" y="8" width="40" height="46" rx="4.4" fill="url(#posterFrameGrad)" />
        <rect x="12" y="8" width="40" height="46" rx="4.4" fill="#fbe0b6" opacity=".22" />
        <rect x="16.4" y="12.4" width="31.2" height="37.2" rx="2.6" fill="url(#posterSkyGrad)" />
        <g fill="#fff3c4">
          <circle cx="21" cy="18.4" r="1.1" />
          <circle cx="26.4" cy="15" r=".8" opacity=".8" />
          <circle cx="43.6" cy="30" r=".9" opacity=".75" />
          <circle cx="19.6" cy="30.4" r=".7" opacity=".7" />
        </g>
        <path d={s4(41.6, 19.4, 3)} fill="#ffe9a3" />
        <path d="M16.4 44.8c4-3.6 8-3.6 12 0 3.6-4.6 7.6-4.8 11.6-1.2 2.6-2.2 5-2.6 7.6-1.4v4.9a2.5 2.5 0 0 1-2.5 2.5H18.9a2.5 2.5 0 0 1-2.5-2.5z" fill="#453286" />
        <path d="M32 18.4c3.4 2.7 5.3 6.7 5.3 11l-1.6 3.6h-7.4l-1.6-3.6c0-4.3 1.9-8.3 5.3-11z" fill="#f7f2ff" />
        <path d="M32 18.4c1.9 1.5 3.4 3.5 4.3 5.7h-8.6c.9-2.2 2.4-4.2 4.3-5.7z" fill="#ff7f78" />
        <circle cx="32" cy="26.6" r="2.4" fill="#7fd6f2" />
        <circle cx="31.2" cy="25.8" r=".9" fill="#eafcff" />
        <path d="M26.7 27.8c-2 1.5-3 3.5-3 6l4.6-1.7z" fill="#ff7f78" />
        <path d="M37.3 27.8c2 1.5 3 3.5 3 6l-4.6-1.7z" fill="#dd6058" />
        <path d="M32 33.4c1.9 1.7 2.9 3.5 2.9 5.2 0 1.9-1.3 3.1-2.9 3.1s-2.9-1.2-2.9-3.1c0-1.7 1-3.5 2.9-5.2z" fill="#ffc55e" />
        <path d="M32 36c1 .9 1.5 1.9 1.5 2.8 0 1-.7 1.6-1.5 1.6s-1.5-.6-1.5-1.6c0-.9.5-1.9 1.5-2.8z" fill="#fff2bd" />
        <circle cx="26.4" cy="42.6" r="1.8" fill="#241b40" />
        <path d="M24.7 44.6h3.4l1 4.8h-5.4z" fill="#241b40" />
        <path d="M28.1 44.6c2.7 1.1 3.7 3.3 3.5 4.8h-2.5z" fill="#ff7f78" />
        <path d="M16.6 49 39.8 12.4h5.6L18.8 49.4z" fill="#fff" opacity=".09" />
      </g>
    </svg>
  );
}

function RugArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="rugTopGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f7ff" />
          <stop offset="1" stopColor="#cdd9f8" />
        </linearGradient>
        <radialGradient id="rugFieldGrad" cx="50%" cy="36%" r="62%">
          <stop offset="0" stopColor="#d3ddfb" />
          <stop offset="1" stopColor="#9dafe0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="48.4" rx="26.6" ry="6.2" fill={ink} opacity=".2" />
      <g fill={ink} opacity=".32">
        <ellipse cx="17.4" cy="38.8" rx="11.6" ry="8.4" />
        <ellipse cx="31.6" cy="35.2" rx="14.4" ry="10.4" />
        <ellipse cx="46.2" cy="38.8" rx="12" ry="8.6" />
        <ellipse cx="32" cy="42.8" rx="22.6" ry="7.4" />
      </g>
      <g fill="url(#rugTopGrad)">
        <ellipse cx="17.4" cy="38.2" rx="10.4" ry="7.4" />
        <ellipse cx="31.6" cy="34.6" rx="13.2" ry="9.4" />
        <ellipse cx="46.2" cy="38.2" rx="10.8" ry="7.6" />
        <ellipse cx="32" cy="42" rx="21.4" ry="6.6" />
      </g>
      <ellipse cx="32" cy="40.2" rx="15.8" ry="6.2" fill="url(#rugFieldGrad)" />
      <g fill="#fff" opacity=".5">
        <ellipse cx="27" cy="29.4" rx="6.2" ry="3" />
        <ellipse cx="14.6" cy="34.6" rx="4.4" ry="2.2" />
        <ellipse cx="44" cy="34.2" rx="4.6" ry="2.3" />
      </g>
      <path d="M17.4 43.6c4 2.7 9 4 14.6 4s10.6-1.3 14.6-4c-1.6 3.1-7.4 5.3-14.6 5.3s-13-2.2-14.6-5.3z" fill="#8fa2d8" opacity=".45" />
      <g fill="#f2f6ff" opacity=".75">
        <circle cx="25.8" cy="39.4" r="1" />
        <circle cx="32" cy="41.4" r="1" />
        <circle cx="38.2" cy="39.4" r="1" />
      </g>
    </svg>
  );
}

function PlantArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="plantPotGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f39a6d" />
          <stop offset=".5" stopColor="#e07a4e" />
          <stop offset="1" stopColor="#b45631" />
        </linearGradient>
        <linearGradient id="plantLeafAGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3f9a63" />
          <stop offset="1" stopColor="#74d692" />
        </linearGradient>
        <linearGradient id="plantLeafBGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2c7a4e" />
          <stop offset="1" stopColor="#4fb173" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58.4" rx="15.4" ry="3.4" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".34">
        <g transform="translate(32 40)">
          <path d={leaf} transform="rotate(-46) scale(1.06)" />
          <path d={leaf} transform="rotate(-22) scale(1.12)" />
          <path d={leaf} transform="scale(1.2)" />
          <path d={leaf} transform="rotate(22) scale(1.12)" />
          <path d={leaf} transform="rotate(46) scale(1.06)" />
        </g>
        <path d="M17.2 35.2h29.6v6.6l-3.2 15.4a5 5 0 0 1-4.9 4H25.3a5 5 0 0 1-4.9-4L17.2 41.8z" />
      </g>
      <ellipse cx="32" cy="37.4" rx="13" ry="2.6" fill="#5c3b2d" />
      <g transform="translate(32 40)">
        <path d={leaf} transform="rotate(-46) scale(.94)" fill="url(#plantLeafBGrad)" />
        <path d={leaf} transform="rotate(46) scale(.94)" fill="url(#plantLeafBGrad)" />
        <path d={leaf} transform="rotate(-22)" fill="url(#plantLeafAGrad)" />
        <path d={leaf} transform="rotate(22)" fill="url(#plantLeafAGrad)" />
        <path d={leaf} transform="scale(1.08)" fill="url(#plantLeafAGrad)" />
        <path d="M0 0C-3.2-3.2-5.2-9.6-3.6-15 -1.6-11.2-.4-5.2 0 0Z" transform="scale(1.08)" fill="#b3f0c6" opacity=".45" />
        <path d="M0 0C-3.2-3.2-5.2-9.6-3.6-15 -1.6-11.2-.4-5.2 0 0Z" transform="rotate(22) scale(.8)" fill="#b3f0c6" opacity=".3" />
      </g>
      <path d="M18.6 40.4h26.8l-3 15.2a4.7 4.7 0 0 1-4.6 3.8H26.2a4.7 4.7 0 0 1-4.6-3.8z" fill="url(#plantPotGrad)" />
      <path d="M39.8 40.4h5.6l-3 15.2a4.7 4.7 0 0 1-4.6 3.8h-3.6a4.7 4.7 0 0 0 4.6-3.8z" fill="#a04b2b" opacity=".5" />
      <ellipse cx="24.4" cy="48.4" rx="2.4" ry="5.2" fill="#ffcaa5" opacity=".38" />
      <rect x="16.4" y="36.2" width="31.2" height="6.6" rx="3.3" fill="#f5a97c" />
      <rect x="16.4" y="40.2" width="31.2" height="2.6" rx="1.3" fill="#c66840" opacity=".45" />
      <rect x="19.6" y="37.6" width="10.4" height="2" rx="1" fill="#ffe0c8" opacity=".55" />
    </svg>
  );
}

function RadioArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="radioBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6dfae" />
          <stop offset=".55" stopColor="#e2b877" />
          <stop offset="1" stopColor="#b9884a" />
        </linearGradient>
        <linearGradient id="radioKnobGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#79dbd0" />
          <stop offset="1" stopColor="#2c8b87" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="57.2" rx="21.4" ry="3.4" fill={ink} opacity=".22" />
      <path d="M45.8 25.6 56.6 8.8l2.6 1.6-10.8 16.8z" fill="#4d445f" />
      <circle cx="58.2" cy="8.6" r="2.4" fill="#ff9a6b" />
      <g fill={ink} opacity=".34">
        <rect x="6.4" y="19.2" width="51.2" height="36.6" rx="9.8" />
      </g>
      <rect x="12.6" y="52.4" width="7.4" height="5" rx="2.4" fill="#6b4a2b" />
      <rect x="44" y="52.4" width="7.4" height="5" rx="2.4" fill="#6b4a2b" />
      <rect x="8" y="20.6" width="48" height="33.6" rx="8.6" fill="url(#radioBodyGrad)" />
      <rect x="11.6" y="23.2" width="40.8" height="4.6" rx="2.3" fill="#fff4d9" opacity=".45" />
      <rect x="12.4" y="29.6" width="24.4" height="19.6" rx="4.2" fill="#3b3450" />
      <g fill="#9a92b8">
        <rect x="15.4" y="32.6" width="18.4" height="2" rx="1" />
        <rect x="15.4" y="36.6" width="18.4" height="2" rx="1" opacity=".85" />
        <rect x="15.4" y="40.6" width="18.4" height="2" rx="1" opacity=".7" />
        <rect x="15.4" y="44.6" width="18.4" height="2" rx="1" opacity=".55" />
      </g>
      <rect x="39.8" y="29.8" width="12.8" height="8.4" rx="2.6" fill="#fff7e6" />
      <g fill="#bfae8c">
        <rect x="42" y="31.8" width="1.2" height="4.4" rx=".6" />
        <rect x="45" y="31.8" width="1.2" height="4.4" rx=".6" />
        <rect x="48" y="31.8" width="1.2" height="4.4" rx=".6" />
      </g>
      <rect x="49.6" y="30.8" width="1.6" height="6.4" rx=".8" fill="#e2564f" />
      <circle cx="43.4" cy="45.4" r="4.6" fill="url(#radioKnobGrad)" />
      <circle cx="43.4" cy="44.2" r="1.8" fill="#d3fff8" opacity=".65" />
      <circle cx="51.4" cy="45.6" r="3.2" fill="url(#radioKnobGrad)" />
      <circle cx="51.4" cy="44.8" r="1.2" fill="#d3fff8" opacity=".65" />
      <path d={s4(9.6, 15.6, 2.8)} fill="#ffe1a8" />
      <path d={s4(20.4, 12.6, 1.8)} fill="#ffe1a8" opacity=".8" />
    </svg>
  );
}

function TrophyArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="trophyGoldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0bb" />
          <stop offset=".45" stopColor="#f5c451" />
          <stop offset="1" stopColor="#c4831c" />
        </linearGradient>
        <linearGradient id="trophyBaseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#835698" />
          <stop offset="1" stopColor="#472c59" />
        </linearGradient>
        <radialGradient id="trophyGlowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff0b4" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffd76a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="24" r="28" fill="url(#trophyGlowGrad)" />
      <ellipse cx="32" cy="57.6" rx="15.4" ry="3.2" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".34">
        <path d="M19.2 9.2h25.6v13.6c0 8.8-5.7 15.2-12.8 15.2s-12.8-6.4-12.8-15.2z" />
        <path d="M22.8 35h18.4v10.4H22.8z" />
        <rect x="16.6" y="45.6" width="30.8" height="12" rx="4" />
      </g>
      <path d="M21 14.4c-6.4 0-9.6 3.6-9.6 8 0 4.8 3.6 8.3 8.9 9.1l1-4.7c-3.1-.7-5-2.5-5-4.6 0-2.1 1.7-3.4 4.7-3.4z" fill="#e4a938" />
      <path d="M21 14.4c-6.4 0-9.6 3.6-9.6 8 0 4.8 3.6 8.3 8.9 9.1l1-4.7c-3.1-.7-5-2.5-5-4.6 0-2.1 1.7-3.4 4.7-3.4z" transform="translate(64 0) scale(-1 1)" fill="#c9871f" />
      <path d="M20.6 10.6h22.8v12.2c0 8.1-4.9 13.9-11.4 13.9s-11.4-5.8-11.4-13.9z" fill="url(#trophyGoldGrad)" />
      <path d="M24.8 13.6h3.6v9.2c0 4.3 1 7.6 2.9 9.6-4.2-.9-6.5-4.9-6.5-10.3z" fill="#fff7d3" opacity=".55" />
      <path d="M38.8 13.6h4.6v9.2c0 6.7-3.4 11.8-8.1 13.4 3.2-2.7 3.5-7.1 3.5-13.4z" fill="#b06f11" opacity=".38" />
      <rect x="18.2" y="7.8" width="27.6" height="5.8" rx="2.9" fill="#ffe396" />
      <rect x="18.2" y="11.2" width="27.6" height="2.4" rx="1.2" fill="#d99b2c" opacity=".5" />
      <path d="M28.6 36.2h6.8v7.6h-6.8z" fill="url(#trophyGoldGrad)" />
      <path d="M32.8 36.2h2.6v7.6h-2.6z" fill="#b06f11" opacity=".35" />
      <rect x="24.4" y="43" width="15.2" height="4.6" rx="2.3" fill="#f0b942" />
      <rect x="20.8" y="46.8" width="22.4" height="4.8" rx="2.4" fill="url(#trophyBaseGrad)" />
      <rect x="17.8" y="50.4" width="28.4" height="6.8" rx="3.2" fill="url(#trophyBaseGrad)" />
      <rect x="21" y="52" width="10" height="1.8" rx=".9" fill="#d3b0e4" opacity=".45" />
      <path d={star5} transform="translate(32 22.4) scale(.44)" fill="#fff7d3" opacity=".85" />
      <path d={s4(12.6, 9.6, 3.6)} fill="#fff3bf" />
      <path d={s4(50.6, 6.6, 2.6)} fill="#fff3bf" opacity=".9" />
      <path d={s4(47.6, 32.6, 2)} fill="#fff3bf" opacity=".75" />
    </svg>
  );
}

export const decorArt: Record<DecorKey, ComponentType> = {
  lamp: LampArt, poster: PosterArt, rug: RugArt, plant: PlantArt, radio: RadioArt, trophy: TrophyArt,
};
