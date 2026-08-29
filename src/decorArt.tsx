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

function BookshelfArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="bookshelfCaseGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eab883" />
          <stop offset=".55" stopColor="#c98a4c" />
          <stop offset="1" stopColor="#95602c" />
        </linearGradient>
        <linearGradient id="bookshelfBackGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7b5230" />
          <stop offset="1" stopColor="#553520" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="57.4" rx="19.4" ry="3.2" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".34">
        <rect x="8.4" y="8.4" width="47.2" height="48.2" rx="7" />
      </g>
      <rect x="10" y="10" width="44" height="45" rx="5.4" fill="url(#bookshelfCaseGrad)" />
      <rect x="13.4" y="13.4" width="37.2" height="38.2" rx="2.8" fill="url(#bookshelfBackGrad)" />
      <rect x="10.4" y="10.4" width="3.8" height="44.2" rx="1.9" fill="#ffe3bd" opacity=".32" />
      <rect x="49.8" y="10.4" width="3.8" height="44.2" rx="1.9" fill="#7c4d21" opacity=".38" />
      <g>
        <rect x="16.4" y="16.8" width="4.8" height="14.8" rx="1.2" fill="#e2645c" />
        <rect x="21.8" y="18.4" width="4" height="13.2" rx="1.1" fill="#f2a44f" />
        <rect x="26.4" y="15.8" width="5.2" height="15.8" rx="1.2" fill="#5aa9e6" />
        <rect x="32.2" y="17.4" width="4.2" height="14.2" rx="1.1" fill="#a882e0" />
        <g transform="rotate(15 38.4 31.6)">
          <rect x="38.4" y="16.6" width="4.6" height="15" rx="1.2" fill="#63bf8e" />
          <rect x="39.2" y="18.6" width="3" height="1.3" rx=".65" fill="#f4fff8" opacity=".7" />
          <rect x="39.2" y="28.4" width="3" height="1.3" rx=".65" fill="#f4fff8" opacity=".55" />
        </g>
        <g fill="#fff6e4" opacity=".6">
          <rect x="17.2" y="19" width="3.2" height="1.3" rx=".65" />
          <rect x="17.2" y="28.4" width="3.2" height="1.3" rx=".65" />
          <rect x="27.2" y="18.2" width="3.6" height="1.3" rx=".65" />
          <rect x="27.2" y="28.4" width="3.6" height="1.3" rx=".65" />
          <rect x="32.9" y="19.6" width="2.8" height="1.2" rx=".6" />
        </g>
      </g>
      <rect x="12.2" y="31.2" width="39.6" height="3.6" rx="1.8" fill="#e0aa70" />
      <rect x="12.2" y="33.2" width="39.6" height="1.6" rx=".8" fill="#8d5f2c" opacity=".5" />
      <g>
        <rect x="16.4" y="35.4" width="5.2" height="14.4" rx="1.2" fill="#f4d06a" />
        <rect x="22.2" y="36.8" width="4.2" height="13" rx="1.1" fill="#63bf8e" />
        <rect x="27" y="34.6" width="4.4" height="15.2" rx="1.2" fill="#e2645c" />
        <rect x="32" y="36" width="5.4" height="13.8" rx="1.2" fill="#5aa9e6" />
        <rect x="38" y="35" width="4.2" height="14.8" rx="1.1" fill="#f2a44f" />
        <rect x="42.8" y="37" width="4.6" height="12.8" rx="1.2" fill="#a882e0" />
        <g fill="#fff6e4" opacity=".6">
          <rect x="17.2" y="37.6" width="3.6" height="1.3" rx=".65" />
          <rect x="17.2" y="46.6" width="3.6" height="1.3" rx=".65" />
          <rect x="27.8" y="36.8" width="2.8" height="1.3" rx=".65" />
          <rect x="32.8" y="38.2" width="3.8" height="1.3" rx=".65" />
          <rect x="43.6" y="39.2" width="3" height="1.3" rx=".65" />
        </g>
      </g>
      <rect x="12.2" y="49.6" width="39.6" height="3.6" rx="1.8" fill="#e0aa70" />
      <rect x="12.2" y="51.6" width="39.6" height="1.6" rx=".8" fill="#8d5f2c" opacity=".5" />
      <path d={s4(11.4, 9.2, 2.6)} fill="#ffeccb" opacity=".85" />
    </svg>
  );
}

function AquariumArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="aquariumWaterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a6ecf8" />
          <stop offset=".5" stopColor="#4aa8dd" />
          <stop offset="1" stopColor="#2a6db1" />
        </linearGradient>
        <linearGradient id="aquariumGlassGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6fbff" />
          <stop offset="1" stopColor="#9fcfe4" />
        </linearGradient>
        <linearGradient id="aquariumStandGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d29457" />
          <stop offset="1" stopColor="#8c5729" />
        </linearGradient>
        <linearGradient id="aquariumFishGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd08a" />
          <stop offset="1" stopColor="#f0813a" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="57.4" rx="18.4" ry="3.2" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".34">
        <ellipse cx="32" cy="29" rx="24.6" ry="20.4" />
        <rect x="14.4" y="43.4" width="35.2" height="12" rx="5" />
      </g>
      <rect x="16" y="44.6" width="32" height="9.4" rx="4" fill="url(#aquariumStandGrad)" />
      <rect x="18.4" y="46.6" width="9.6" height="2.4" rx="1.2" fill="#f3ceaa" opacity=".45" />
      <ellipse cx="32" cy="29" rx="23" ry="19" fill="url(#aquariumGlassGrad)" />
      <ellipse cx="32" cy="29" rx="20" ry="16" fill="url(#aquariumWaterGrad)" />
      <ellipse cx="32" cy="20.6" rx="17.2" ry="3.4" fill="#e8fbff" opacity=".32" />
      <path d="M14.6 36.9c3.9-2.8 7.9.6 11.8-.6 4.4-1.4 8.6 1.6 12.8.2 3.4-1.2 7-.6 10.2.4A20 16 0 0 1 14.6 36.9Z" fill="#ecca92" />
      <g fill="#c9a271" opacity=".55">
        <circle cx="20.6" cy="38.8" r="1.4" />
        <circle cx="28.4" cy="39.6" r="1.1" />
        <circle cx="37.6" cy="39.2" r="1.3" />
        <circle cx="44.4" cy="38.6" r="1" />
      </g>
      <g transform="translate(20.6 36.6)">
        <path d={leaf} transform="rotate(-16) scale(.5)" fill="#2f8a55" />
        <path d={leaf} transform="rotate(15) scale(.42)" fill="#54bd7c" />
      </g>
      <g transform="translate(43.8 36.8)">
        <path d={leaf} transform="rotate(12) scale(.36)" fill="#3f9a63" />
      </g>
      <g>
        <path d="M23.4 27.8 16.8 23.2v9.4z" fill="#ef8c3f" />
        <path d="M28 22.4c2 .4 3.2 1.8 3.6 3.6l-5.2 1z" fill="#f9ad5c" />
        <ellipse cx="29.4" cy="28" rx="6.6" ry="4.8" fill="url(#aquariumFishGrad)" />
        <ellipse cx="27.6" cy="26.4" rx="3" ry="1.7" fill="#fff0d4" opacity=".55" />
        <circle cx="32.6" cy="26.6" r="1.7" fill="#fdfbff" />
        <circle cx="33.1" cy="26.7" r=".85" fill={ink} />
        <path d="M31.6 30c1.4.9 2.7.9 3.9 0-.5 1.5-3.3 1.6-3.9 0Z" fill="#c25c25" />
      </g>
      <g fill="#eafcff">
        <circle cx="40.8" cy="21.4" r="2.1" opacity=".85" />
        <circle cx="44.2" cy="16.8" r="1.4" opacity=".7" />
        <circle cx="39.4" cy="15.2" r="1" opacity=".6" />
      </g>
      <ellipse cx="22.8" cy="18.6" rx="6.4" ry="3" transform="rotate(-34 22.8 18.6)" fill="#ffffff" opacity=".34" />
      <path d={s4(50.4, 13.6, 2.4)} fill="#eafcff" opacity=".8" />
    </svg>
  );
}

function TelescopeArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="telescopeTubeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9adcf5" />
          <stop offset=".5" stopColor="#4a86c9" />
          <stop offset="1" stopColor="#28518f" />
        </linearGradient>
        <linearGradient id="telescopeTripodGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9a86e" />
          <stop offset="1" stopColor="#8a5a2c" />
        </linearGradient>
        <radialGradient id="telescopeLensGrad" cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="1" stopColor="#ffce67" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="57" rx="19.6" ry="3.2" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".34">
        <path d="M28.6 30.4h6.8l3.8 26h-6.6z" />
        <path d="M28.4 30.4h5.4L25 56.4h-5.6z" />
        <path d="M30.2 30.4h5.4L45 56.4h5.6z" />
        <circle cx="32" cy="32" r="6.4" />
        <g transform="rotate(38 32 32)">
          <rect x="22.6" y="6.4" width="18.8" height="42.4" rx="9.4" />
        </g>
      </g>
      <path d="M30.2 31.6h3.6l3.2 23.2h-3.8z" fill="#8a5a2c" />
      <path d="M29.4 31.6h4.2L25.2 54.8h-4.4z" fill="url(#telescopeTripodGrad)" />
      <path d="M30.4 31.6h4.2L43.2 54.8h-4.4z" fill="url(#telescopeTripodGrad)" />
      <rect x="24" y="44.6" width="16" height="2.8" rx="1.4" fill="#b9803f" />
      <g fill="#5c3b20">
        <ellipse cx="22.9" cy="55" rx="2.8" ry="1.4" />
        <ellipse cx="41.1" cy="55" rx="2.8" ry="1.4" />
        <ellipse cx="34.8" cy="55" rx="2.4" ry="1.2" />
      </g>
      <g transform="rotate(38 32 32)">
        <rect x="25.4" y="11" width="13.2" height="30" rx="6.6" fill="url(#telescopeTubeGrad)" />
        <rect x="27.2" y="13.4" width="3.2" height="25.4" rx="1.6" fill="#dcf4ff" opacity=".5" />
        <rect x="36" y="13.4" width="2" height="25.4" rx="1" fill="#173b6d" opacity=".35" />
        <rect x="24.8" y="23.6" width="14.4" height="4.2" rx="2.1" fill="#f0b64f" />
        <rect x="24.8" y="26" width="14.4" height="1.8" rx=".9" fill="#b97c22" opacity=".45" />
        <rect x="23.6" y="8.4" width="16.8" height="6.6" rx="3.3" fill="#f0b64f" />
        <ellipse cx="32" cy="11.7" rx="6.2" ry="2.5" fill="url(#telescopeLensGrad)" />
        <ellipse cx="30.2" cy="11.2" rx="2.2" ry="1" fill="#fffdf2" opacity=".8" />
        <rect x="28.4" y="38.6" width="7.2" height="7.8" rx="2.8" fill="#3b3450" />
        <rect x="29.6" y="40" width="2" height="4.8" rx="1" fill="#8d84ac" opacity=".7" />
      </g>
      <circle cx="32" cy="32" r="5" fill="#4d445f" />
      <circle cx="32" cy="30.8" r="2" fill="#9a92b8" opacity=".65" />
      <path d={star5} transform="translate(45.6 14.2) scale(.36)" fill="#fff6cf" />
      <path d={s4(52.6, 8.6, 2.6)} fill="#fff3bf" opacity=".9" />
      <path d={s4(39.4, 6.8, 1.8)} fill="#fff3bf" opacity=".75" />
    </svg>
  );
}

function FireplaceArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="fireplaceGlowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd08c" stopOpacity=".62" />
          <stop offset=".55" stopColor="#ffab5a" stopOpacity=".24" />
          <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fireplaceStoneGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8cde2" />
          <stop offset="1" stopColor="#8f81a6" />
        </linearGradient>
        <linearGradient id="fireplaceMantelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dda164" />
          <stop offset="1" stopColor="#8f5a2b" />
        </linearGradient>
        <linearGradient id="fireplaceFlameGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff7a3c" />
          <stop offset=".55" stopColor="#ffc44f" />
          <stop offset="1" stopColor="#fff3bb" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="38" r="30" fill="url(#fireplaceGlowGrad)" />
      <ellipse cx="32" cy="57.6" rx="21.4" ry="3.2" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".34">
        <rect x="7.4" y="11.4" width="49.2" height="45.2" rx="7.4" />
      </g>
      <rect x="9" y="17" width="46" height="38" rx="5.6" fill="url(#fireplaceStoneGrad)" />
      <g fill="#f2ebf8" opacity=".3">
        <rect x="11.6" y="21.4" width="9.6" height="4" rx="2" />
        <rect x="42.8" y="21.4" width="9.6" height="4" rx="2" />
        <rect x="11.6" y="28.4" width="6.4" height="4" rx="2" />
        <rect x="46" y="28.4" width="6.4" height="4" rx="2" />
        <rect x="11.6" y="35.4" width="6.4" height="4" rx="2" />
        <rect x="46" y="35.4" width="6.4" height="4" rx="2" />
      </g>
      <path d="M19 52V34.4a13 13 0 0 1 26 0V52a2.4 2.4 0 0 1-2.4 2.4H21.4A2.4 2.4 0 0 1 19 52Z" fill="#382e4d" />
      <path d="M21.4 52V34.8a10.6 10.6 0 0 1 21.2 0V52Z" fill="#241d38" />
      <ellipse cx="32" cy="44" rx="15" ry="11.6" fill="url(#fireplaceGlowGrad)" />
      <g>
        <rect x="22.4" y="46.4" width="19.2" height="5.4" rx="2.7" transform="rotate(-6 32 49.1)" fill="#7a4a2a" />
        <rect x="24.6" y="43" width="15" height="4.8" rx="2.4" transform="rotate(7 32.1 45.4)" fill="#96603a" />
        <ellipse cx="24" cy="47.4" rx="1.8" ry="2.2" fill="#c99263" opacity=".8" />
        <ellipse cx="40.2" cy="44.6" rx="1.5" ry="1.9" fill="#c99263" opacity=".7" />
      </g>
      <path d="M25.4 41.4c1.7 2.2 2.5 3.6 2.5 5.1 0 2-1.2 3.3-2.5 3.3s-2.5-1.3-2.5-3.3c0-1.5.8-2.9 2.5-5.1Z" fill="#ffab4d" opacity=".9" />
      <path d="M38.6 41.4c1.7 2.2 2.5 3.6 2.5 5.1 0 2-1.2 3.3-2.5 3.3s-2.5-1.3-2.5-3.3c0-1.5.8-2.9 2.5-5.1Z" fill="#ff9a42" opacity=".85" />
      <path d="M32 29.6c4.4 5.4 6.4 8.6 6.4 12.4 0 4.8-2.9 8-6.4 8s-6.4-3.2-6.4-8c0-3.8 2-7 6.4-12.4Z" fill="url(#fireplaceFlameGrad)" />
      <path d="M32 36.8c2.1 2.6 3 4.2 3 5.9 0 2.3-1.3 3.8-3 3.8s-3-1.5-3-3.8c0-1.7.9-3.3 3-5.9Z" fill="#fff5cd" opacity=".92" />
      <rect x="10.6" y="51.2" width="42.8" height="5.2" rx="2.6" fill="#c0b2d0" />
      <rect x="10.6" y="53.6" width="42.8" height="2.8" rx="1.4" fill="#8a7ba2" opacity=".45" />
      <rect x="6.6" y="11.4" width="50.8" height="7.4" rx="3.7" fill="url(#fireplaceMantelGrad)" />
      <rect x="6.6" y="15.6" width="50.8" height="3.2" rx="1.6" fill="#8a5527" opacity=".45" />
      <rect x="10.4" y="12.8" width="14" height="2.4" rx="1.2" fill="#ffe0bb" opacity=".5" />
      <path d={s4(32, 24.6, 2.4)} fill="#ffe7a8" opacity=".85" />
      <path d={s4(24.4, 30.2, 1.6)} fill="#ffe7a8" opacity=".7" />
      <path d={s4(40, 28.4, 1.8)} fill="#ffe7a8" opacity=".7" />
    </svg>
  );
}

function ProjectorArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="projectorConeGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e4d7ff" stopOpacity=".62" />
          <stop offset=".55" stopColor="#bda8ff" stopOpacity=".26" />
          <stop offset="1" stopColor="#9f8cff" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id="projectorBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a6bd6" />
          <stop offset=".55" stopColor="#4d3f9c" />
          <stop offset="1" stopColor="#2e2566" />
        </linearGradient>
        <radialGradient id="projectorLensGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#fdfbff" />
          <stop offset=".55" stopColor="#a9e6ff" />
          <stop offset="1" stopColor="#5aa9e6" />
        </radialGradient>
      </defs>
      <path d="M28.2 38 10 9.4h44L35.8 38Z" fill="url(#projectorConeGrad)" />
      <g fill="#fff6d2">
        <path d={star5} transform="translate(32 12.4) scale(.3)" opacity=".95" />
        <path d={star5} transform="translate(19.6 17.6) scale(.22)" opacity=".8" />
        <path d={s4(45.4, 14.6, 2.6)} opacity=".85" />
        <path d={s4(24.6, 24.4, 2)} opacity=".8" />
        <path d={s4(41.2, 23.2, 1.8)} opacity=".75" />
        <path d={s4(32.6, 30.4, 1.5)} opacity=".7" />
        <circle cx="14.4" cy="13.6" r="1.1" opacity=".7" />
        <circle cx="50.8" cy="19.4" r="1" opacity=".65" />
        <circle cx="30.4" cy="19.6" r=".9" opacity=".7" />
        <circle cx="37.4" cy="33.2" r=".8" opacity=".6" />
        <circle cx="26.8" cy="34.4" r=".8" opacity=".6" />
      </g>
      <ellipse cx="32" cy="57.4" rx="17.4" ry="3.2" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".34">
        <rect x="16.4" y="34.4" width="31.2" height="21.8" rx="9.4" />
      </g>
      <rect x="18.6" y="52.4" width="7.2" height="4.2" rx="2.1" fill="#3b3450" />
      <rect x="38.2" y="52.4" width="7.2" height="4.2" rx="2.1" fill="#3b3450" />
      <rect x="18.6" y="38.4" width="26.8" height="16.4" rx="7.4" fill="url(#projectorBodyGrad)" />
      <rect x="21" y="41" width="4" height="11.4" rx="2" fill="#d6ccff" opacity=".32" />
      <rect x="40.2" y="41" width="2.6" height="11.4" rx="1.3" fill="#1d1749" opacity=".35" />
      <ellipse cx="32" cy="38.6" rx="9" ry="3.8" fill="#3b3450" />
      <ellipse cx="32" cy="37.6" rx="7.2" ry="3" fill="url(#projectorLensGrad)" />
      <ellipse cx="30" cy="36.8" rx="2.4" ry="1.1" fill="#fdfbff" opacity=".85" />
      <circle cx="24.4" cy="48.4" r="2.8" fill="#79dbd0" />
      <circle cx="24.4" cy="47.6" r="1.1" fill="#e0fffa" opacity=".7" />
      <circle cx="39.8" cy="48.4" r="2" fill="#ffd166" />
      <rect x="28.6" y="47.6" width="7" height="1.8" rx=".9" fill="#c8bcff" opacity=".55" />
    </svg>
  );
}

function IcecreamArt() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="icecreamBodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2f8" />
          <stop offset=".55" stopColor="#ffd2e5" />
          <stop offset="1" stopColor="#f3a5c8" />
        </linearGradient>
        <linearGradient id="icecreamMetalGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2f6fd" />
          <stop offset=".5" stopColor="#d4dcee" />
          <stop offset="1" stopColor="#a9b6d2" />
        </linearGradient>
        <linearGradient id="icecreamSwirlGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf3" />
          <stop offset="1" stopColor="#ffbcd8" />
        </linearGradient>
        <linearGradient id="icecreamConeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8d69f" />
          <stop offset="1" stopColor="#c98f4c" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="58.2" rx="20.4" ry="3.2" fill={ink} opacity=".22" />
      <g fill={ink} opacity=".34">
        <rect x="17.4" y="2.8" width="29.2" height="9.4" rx="4.7" />
        <rect x="10.4" y="6.4" width="43.2" height="29.2" rx="8.6" />
        <rect x="13.4" y="33" width="10.2" height="20" rx="4" />
        <rect x="40.4" y="33" width="10.2" height="20" rx="4" />
        <rect x="9.4" y="49.6" width="45.2" height="8.4" rx="4.2" />
      </g>
      <rect x="15" y="34" width="7" height="17.8" rx="2.8" fill="url(#icecreamMetalGrad)" />
      <rect x="42" y="34" width="7" height="17.8" rx="2.8" fill="url(#icecreamMetalGrad)" />
      <rect x="19" y="4.4" width="26" height="6.6" rx="3.3" fill="#a9e6da" />
      <rect x="19" y="8" width="26" height="3" rx="1.5" fill="#5eb6a8" opacity=".45" />
      <rect x="12" y="8" width="40" height="26" rx="7.4" fill="url(#icecreamBodyGrad)" />
      <rect x="14.6" y="10.6" width="5" height="20.8" rx="2.5" fill="#fffdff" opacity=".55" />
      <rect x="46.4" y="10.6" width="3.4" height="20.8" rx="1.7" fill="#d97ba7" opacity=".3" />
      <rect x="17.6" y="12.6" width="28.8" height="12.6" rx="4.2" fill="#fff9fc" opacity=".9" />
      <rect x="19.4" y="17.4" width="25.2" height="6.4" rx="3.2" fill="#ffb3d2" />
      <rect x="20.6" y="18.6" width="8.6" height="2" rx="1" fill="#fff2f8" opacity=".7" />
      <g transform="rotate(-32 46 27)">
        <rect x="46" y="25.2" width="11" height="3.6" rx="1.8" fill="#f6c96a" />
      </g>
      <circle cx="55.3" cy="21.2" r="2.8" fill="#f0a84f" />
      <circle cx="54.6" cy="20.4" r="1" fill="#ffeec6" opacity=".75" />
      <circle cx="23.6" cy="29.6" r="3.2" fill="#a9e6da" />
      <circle cx="23.6" cy="28.8" r="1.2" fill="#eafffb" opacity=".75" />
      <circle cx="40.4" cy="29.6" r="3.2" fill="#ffd166" />
      <circle cx="40.4" cy="28.8" r="1.2" fill="#fff5d6" opacity=".75" />
      <path d="M27.4 34h9.2l-1.8 5.4h-5.6z" fill="url(#icecreamMetalGrad)" />
      <rect x="28.4" y="37.6" width="7.2" height="2.6" rx="1.3" fill="#a9b6d2" />
      <path d="M24.4 44.2h15.2L32 52.4Z" fill="url(#icecreamConeGrad)" />
      <g fill="#a97434" opacity=".38">
        <rect x="30.6" y="44.4" width="1.1" height="8" rx=".55" transform="rotate(14 31.2 44.4)" />
        <rect x="32.4" y="44.4" width="1.1" height="8" rx=".55" transform="rotate(-14 32.9 44.4)" />
        <rect x="26.9" y="46.6" width="10.2" height="1.1" rx=".55" />
      </g>
      <ellipse cx="32" cy="43.4" rx="7.6" ry="3.4" fill="url(#icecreamSwirlGrad)" />
      <ellipse cx="32" cy="40.6" rx="5.8" ry="3" fill="url(#icecreamSwirlGrad)" />
      <ellipse cx="32.4" cy="38.2" rx="3.8" ry="2.4" fill="url(#icecreamSwirlGrad)" />
      <g fill="#fffdf8" opacity=".6">
        <ellipse cx="28.4" cy="42.6" rx="2.6" ry="1.2" />
        <ellipse cx="29.4" cy="40" rx="2" ry="1" />
        <ellipse cx="31.2" cy="37.6" rx="1.4" ry=".8" />
      </g>
      <path d={s4(48.6, 40.4, 2.4)} fill="#ffe6f1" opacity=".8" />
      <path d={s4(15.6, 43.6, 1.8)} fill="#ffe6f1" opacity=".7" />
    </svg>
  );
}

export const decorArt: Record<DecorKey, ComponentType> = {
  lamp: LampArt, poster: PosterArt, rug: RugArt, plant: PlantArt, radio: RadioArt, trophy: TrophyArt,
  bookshelf: BookshelfArt, aquarium: AquariumArt, telescope: TelescopeArt, fireplace: FireplaceArt,
  projector: ProjectorArt, icecream: IcecreamArt,
};
