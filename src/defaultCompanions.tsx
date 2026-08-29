import type { ComponentType } from "react";
import type { CharacterKind } from "./gameEngine";

const ink = "#2a2140";
const shine = "#ffffff";

function Shadow() {
  return <ellipse cx="48" cy="88.5" rx="25" ry="4.6" fill={ink} opacity=".22" />;
}

function Eyes({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <ellipse cx={48 - cx} cy={cy} rx={r} ry={r * 1.16} fill={ink} />
      <ellipse cx={48 + cx} cy={cy} rx={r} ry={r * 1.16} fill={ink} />
      <circle cx={48 - cx + r * .38} cy={cy - r * .42} r={r * .38} fill={shine} />
      <circle cx={48 + cx + r * .38} cy={cy - r * .42} r={r * .38} fill={shine} />
      <circle cx={48 - cx - r * .3} cy={cy + r * .5} r={r * .19} fill={shine} opacity=".75" />
      <circle cx={48 + cx - r * .3} cy={cy + r * .5} r={r * .19} fill={shine} opacity=".75" />
    </g>
  );
}

function PersonArt() {
  return (
    <svg viewBox="0 0 96 96" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="pcPersonSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe0c2" />
          <stop offset="1" stopColor="#f5c096" />
        </linearGradient>
        <linearGradient id="pcPersonShirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ec8ff" />
          <stop offset="1" stopColor="#4f8ae4" />
        </linearGradient>
        <linearGradient id="pcPersonHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6c4630" />
          <stop offset="1" stopColor="#40281c" />
        </linearGradient>
      </defs>
      <Shadow />
      <g fill="#3a2a4d">
        <rect x="38.6" y="66" width="8.4" height="20" rx="4.2" />
        <rect x="49" y="66" width="8.4" height="20" rx="4.2" />
      </g>
      <ellipse cx="42.4" cy="86.4" rx="6.4" ry="3.6" fill="#f2f5fb" />
      <ellipse cx="53.6" cy="86.4" rx="6.4" ry="3.6" fill="#f2f5fb" />
      <path d="M48 42c11.6 0 18.4 6.8 19.4 17.4l1.4 14.2a3.6 3.6 0 0 1-3.6 4H30.8a3.6 3.6 0 0 1-3.6-4l1.4-14.2C29.6 48.8 36.4 42 48 42Z" fill="url(#pcPersonShirt)" />
      <path d="M48 42c4 0 7.2.8 9.8 2.2-1.4 4.4-5.2 7.2-9.8 7.2s-8.4-2.8-9.8-7.2C40.8 42.8 44 42 48 42Z" fill={shine} opacity=".32" />
      <rect x="21.4" y="52.4" width="9" height="20" rx="4.5" transform="rotate(11 25.9 62.4)" fill="url(#pcPersonSkin)" />
      <rect x="65.6" y="52.4" width="9" height="20" rx="4.5" transform="rotate(-11 70.1 62.4)" fill="url(#pcPersonSkin)" />
      <circle cx="28.6" cy="34.4" r="4.4" fill="url(#pcPersonSkin)" />
      <circle cx="67.4" cy="34.4" r="4.4" fill="url(#pcPersonSkin)" />
      <circle cx="48" cy="32" r="20" fill="url(#pcPersonSkin)" />
      <path d="M28.4 30.6C29.6 18.6 37.6 12 48 12s18.4 6.6 19.6 18.6c-3.2-1.2-4.6-4.4-5.2-7.6-4 3.8-9.4 5.6-14.4 5.6-4.2 0-7.6-.8-10.6-2.6-.6 2.4-2 4.2-4.4 5.2-1.6.7-3.2 1-4.6 1.4Z" fill="url(#pcPersonHair)" />
      <path d="M56.6 12.8c5.6 2.2 9.4 7.4 10.6 15.4-2.4-.6-4-2.6-5-5.2-1.6 1.6-3.4 2.8-5.2 3.6 1.4-4.6 1.2-9.4-.4-13.8Z" fill={shine} opacity=".14" />
      <Eyes cx={7.6} cy={33.4} r={4.5} />
      <ellipse cx="34.4" cy="40.4" rx="4.2" ry="2.6" fill="#ff9d9d" opacity=".55" />
      <ellipse cx="61.6" cy="40.4" rx="4.2" ry="2.6" fill="#ff9d9d" opacity=".55" />
      <path d="M42.6 42.4c1.6 2.6 3.4 3.9 5.4 3.9s3.8-1.3 5.4-3.9" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function BabyArt() {
  return (
    <svg viewBox="0 0 96 96" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="pcBabySkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe4cd" />
          <stop offset="1" stopColor="#f7c5a2" />
        </linearGradient>
        <linearGradient id="pcBabyWrap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd9ec" />
          <stop offset=".55" stopColor="#ffb7d8" />
          <stop offset="1" stopColor="#f18cbd" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M48 40c15.6 0 26 11.4 26 26.6 0 12.4-9.4 19.4-26 19.4s-26-7-26-19.4C22 51.4 32.4 40 48 40Z" fill="url(#pcBabyWrap)" />
      <path d="M28.6 52.6C33 45.2 40 40.8 48 40.8c8.2 0 15.2 4.6 19.6 12.2-5.6 4-12.4 6-19.6 6s-14-2-19.4-6.4Z" fill={shine} opacity=".34" />
      <path d="M22.4 70.6c8 4.2 16.6 6.2 25.6 6.2s17.6-2 25.6-6.2c-.6 10.2-9.4 15.4-25.6 15.4S23 80.8 22.4 70.6Z" fill={ink} opacity=".1" />
      <path d="M39 62.4c2.8 2.6 6 3.9 9 3.9s6.2-1.3 9-3.9" fill="none" stroke={shine} strokeWidth="2.6" strokeLinecap="round" opacity=".6" />
      <circle cx="26.8" cy="36" r="4.2" fill="url(#pcBabySkin)" />
      <circle cx="69.2" cy="36" r="4.2" fill="url(#pcBabySkin)" />
      <circle cx="48" cy="33" r="21.5" fill="url(#pcBabySkin)" />
      <path d="M45 12.6c4.8-2.4 9 .4 8.4 4.4-.4 2.8-3 4.2-5 3-1.8-1-1.4-3.4.4-3.8-2 .6-4.2-1.4-3.8-3.6Z" fill="#c98a5c" />
      <path d="M28 26.6c4.4-6.4 11.4-10.4 20-10.4 3 0 5.8.5 8.4 1.4-6.6.6-12.4 3-17.4 7-3.8 3-7.4 4-11 2Z" fill={shine} opacity=".2" />
      <Eyes cx={8.2} cy={34} r={5} />
      <ellipse cx="32.8" cy="41.6" rx="4.6" ry="3" fill="#ff97a8" opacity=".58" />
      <ellipse cx="63.2" cy="41.6" rx="4.6" ry="3" fill="#ff97a8" opacity=".58" />
      <ellipse cx="48" cy="44.4" rx="4" ry="4.6" fill={ink} opacity=".85" />
      <ellipse cx="48" cy="42.6" rx="2.4" ry="1.6" fill="#ff8fa6" />
    </svg>
  );
}

function PetArt() {
  return (
    <svg viewBox="0 0 96 96" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="pcPetCoat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd79a" />
          <stop offset=".55" stopColor="#f7b169" />
          <stop offset="1" stopColor="#df8f44" />
        </linearGradient>
        <linearGradient id="pcPetBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3dd" />
          <stop offset="1" stopColor="#ffe2b8" />
        </linearGradient>
      </defs>
      <Shadow />
      <path d="M74.6 60c4.6-1.2 7.4-4.6 7.4-9 0-2.6-1.2-4.6-3-4.6-2.4 0-3.6 2.6-2.4 4.6 1 1.6.2 3.4-2 4.2Z" fill="url(#pcPetCoat)" />
      <path d="M26.6 30.4c-.6-7 1.2-10.6 5.4-10.8 3.6-.2 7 3 10.2 9.6Z" fill="url(#pcPetCoat)" />
      <path d="M69.4 30.4c.6-7-1.2-10.6-5.4-10.8-3.6-.2-7 3-10.2 9.6Z" fill="url(#pcPetCoat)" />
      <path d="M31.6 24.4c2.2.6 4.4 3 6.6 7.2-3.4-.6-5.6-3-6.6-7.2Z" fill="#ff9db2" opacity=".55" />
      <path d="M64.4 24.4c-2.2.6-4.4 3-6.6 7.2 3.4-.6 5.6-3 6.6-7.2Z" fill="#ff9db2" opacity=".55" />
      <ellipse cx="48" cy="55" rx="30" ry="31" fill="url(#pcPetCoat)" />
      <ellipse cx="48" cy="66.6" rx="18.6" ry="17.4" fill="url(#pcPetBelly)" />
      <ellipse cx="34.4" cy="85" rx="8" ry="4.4" fill="#e29a4e" />
      <ellipse cx="61.6" cy="85" rx="8" ry="4.4" fill="#e29a4e" />
      <path d="M22.4 38.6C27.4 29.4 36.4 24 48 24s20.6 5.4 25.6 14.6C64.8 44 56.6 46.6 48 46.6s-16.8-2.6-25.6-8Z" fill={shine} opacity=".26" />
      <Eyes cx={11.4} cy={49} r={6} />
      <ellipse cx="29" cy="60.6" rx="5.2" ry="3.2" fill="#ff8fa6" opacity=".5" />
      <ellipse cx="67" cy="60.6" rx="5.2" ry="3.2" fill="#ff8fa6" opacity=".5" />
      <path d="M44.2 60.6c0-2.2 1.7-3.6 3.8-3.6s3.8 1.4 3.8 3.6-1.7 3.8-3.8 3.8-3.8-1.6-3.8-3.8Z" fill={ink} />
      <path d="M45.6 58.6c.7-.6 1.5-.9 2.4-.9" fill="none" stroke={shine} strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
      <path d="M48 64.4v3.2m0 0c0 2.6-2.2 4.4-4.8 4.4-1.9 0-3.5-1-4.4-2.4m9.2-2c0 2.6 2.2 4.4 4.8 4.4 1.9 0 3.5-1 4.4-2.4" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const defaultCompanionArt: Record<Exclude<CharacterKind, "">, ComponentType> = {
  person: PersonArt,
  baby: BabyArt,
  pet: PetArt,
};
