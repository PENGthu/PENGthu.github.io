// Original, code-native illustrations. No third-party game assets.
const paths={mountain:'m3 19 7-13 5 9 3-5 5 9M7 12l3 2 2-3',backpack:'M8 7V5a4 4 0 0 1 8 0v2M6 8h12v14H6ZM8 13h8v6H8M3 11v8m18-8v8',coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12',weight:'M8 7a4 4 0 1 1 8 0M6 8h12l3 13H3Z',health:'M12 20S2 14 2 8a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 6-10 12-10 12Z',energy:'m14 2-9 12h7l-2 8 9-12h-7Z',warmth:'M10 3v11a5 5 0 1 0 4 0V3a2 2 0 0 0-4 0Zm2 7v8m6-13h3m-3 4h2',san:'M9 4a3 3 0 0 0-5 2 4 4 0 0 0-1 7 4 4 0 0 0 5 6l4 2V3L9 4Zm6 0a3 3 0 0 1 5 2 4 4 0 0 1 1 7 4 4 0 0 1-5 6l-4 2M7 8l5 2m5 4-5-2',satiety:'M4 3v7h6V3M7 3v19m10-19v19m0-19c-5 5-5 11 0 11',hydration:'M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13Zm-4 14a4 4 0 0 0 4 4',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 3',compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-6-3-2 4-4 2 2-4Z',journal:'M5 3h15v18H5a2 2 0 0 1 0-4h15M8 7h8m-8 4h5',trophy:'M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 3v5m-5 1h10',help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 8a3 3 0 1 1 4 3c-1 0-1 2-1 2m0 3v1',camp:'m2 21 10-18 10 18ZM12 3v18m-5 0 5-9 5 9',signal:'M12 17v5m-3-8a4 4 0 0 1 6 0m-9-3a8 8 0 0 1 12 0M3 7a12 12 0 0 1 18 0',arrow:'M4 12h16m-6-6 6 6-6 6',play:'m8 4 12 8-12 8Z',menu:'M4 6h16M4 12h16M4 18h16',snow:'M12 2v20M3 7l18 10M3 17 21 7M8 4l4 4 4-4M8 20l4-4 4 4'};
export function icon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.compass}"/></svg>`;}
const drawings={
 shell:'<path fill="#568985" d="m19 12-9 8 5 11 6-5v27h22V26l6 5 5-11-9-8-9 5-8-5Z"/><path d="M32 18v35m-9-16h5m8 0h5M25 12l7 8 7-8"/>',
 down:'<path fill="#cb965c" d="m23 10-7 12 5 7v25h22V29l5-7-7-12-9 6Z"/><path d="M32 16v38M21 27h22M21 36h22M21 45h22"/>',
 gloves:'<path fill="#869bad" d="M12 33V18q2-5 5 0v-7q3-4 5 0v-2q3-4 5 0v2q4-3 4 2v26l-5 14H13L9 41q-4-8 3-8Z"/><path fill="#627485" d="m37 25 6-12q3-2 4 1l-1 9 4-4q5 0 2 5l-1 14-8 13-11-4Z"/>',
 boots:'<path fill="#927358" d="M15 11h16v22l14 7q5 0 5 10H10V36l5-2Z"/><path d="M10 51h41M20 18h10m-10 7h10m-10 7h10M33 35l-4 7m10-4-4 7"/>',
 poles:'<path d="m19 10 16 43M36 10 20 53" stroke="#a6beb8" stroke-width="3"/><path d="m17 7 4 9m17-9-4 9M31 48h10m-25 0h10" stroke="#d1a666" stroke-width="4"/>',
 tent:'<path fill="#c29050" d="m4 50 26-34 8-5 22 39Z"/><path fill="#646659" d="m30 16-8 34h23Z"/><path d="m38 11 7 39M4 50h56m-28-8 2-12"/>',
 bag:'<path fill="#b78c57" d="M22 8h20v10q8 3 8 12v20q-3 8-18 8T14 50V30q0-9 8-12Z"/><path fill="#3d514d" d="M22 8h20v10H22Z"/><path d="M18 29h28M17 39h30M18 49h28M32 21v31"/>',
 mat:'<rect x="14" y="12" width="37" height="44" rx="7" fill="#70866b"/><path d="M18 22h29m-29 8h29m-29 8h29m-29 8h29"/><ellipse cx="32" cy="12" rx="18" ry="7" fill="#91a184"/>',
 stove:'<path fill="#879893" d="M19 37h26v16H19Z"/><path d="M32 37V24m-16-5 16 5 16-5M20 29l-8 17m32-17 8 17M23 54h18"/><path fill="#d5a45c" d="m27 18 5-9 5 9-5 7Z"/>',
 map:'<path fill="#b4b393" d="m8 14 16-4 16 5 16-5v39l-16 5-16-5-16 5Z"/><path d="M24 10v39m16-34v39m-25-20 10-10 9 17 13-11"/><circle cx="46" cy="43" r="10" fill="#687e78"/><path d="m46 36-4 12 8-4Z"/>',
 gps:'<rect x="20" y="8" width="25" height="48" rx="6" fill="#b0a66c"/><rect x="24" y="15" width="17" height="25" rx="2" fill="#435e59"/><path d="m27 33 10-11m-10 0h10v11"/><circle cx="32" cy="47" r="3"/>',
 satellite:'<path fill="#698b84" d="M20 15h25v40H20Z"/><path d="M24 15V4m5 0v11"/><rect x="25" y="20" width="15" height="17" fill="#263e3c"/><path d="M25 44h4m6 0h4m-14 6h4m6 0h4"/>',
 lamp:'<path d="M14 33q-4-25 18-25t18 25" stroke="#879e8e" stroke-width="7"/><rect x="14" y="28" width="37" height="23" rx="7" fill="#c9a55f"/><circle cx="32" cy="39" r="9" fill="#dce5d3"/>',
 filter:'<path fill="#89a5a2" d="M24 7h17v6l5 6v35H18V19l6-6Z"/><path d="M24 7h17m-17 20h17m-17 8h17m-17 8h17"/>',
 repair:'<path fill="#b7c3bd" d="m12 11 7 8 8-8-2-5q16 1 11 16L53 44q3 8-6 9L26 30Q9 33 8 18Z"/>',
 ration:'<path fill="#9c8960" d="m13 10 38 3-3 41-36-3Z"/><path d="M15 16h32M13 47h36"/><path fill="#d4c395" d="M21 24h19v15H21Z"/><path d="m24 34 6-6 7 6"/>',
 meal:'<path fill="#916f57" d="m15 10 34 1 4 43H11Z"/><path d="M16 17h32M14 48h36"/><path fill="#c7af82" d="M20 30h24q-2 13-12 13T20 30Z"/><path d="M26 26q-3-4 0-8m7 8q-3-4 0-8"/>',
 snack:'<path fill="#997743" d="m9 30 41-16 7 18-42 17Z"/><path fill="#c5ad76" d="m16 30 28-11 5 13-28 11Z"/><path d="m10 32 5 13m35-29 5 13"/>',
 water:'<path fill="#608d9d" d="M26 6h12v9l8 9v30H18V24l8-9Z"/><path fill="#a5c6c5" d="M20 33h24v13H20Z"/><path d="M26 6h12m-12 6h12m-6 24v7"/>',
 fuel:'<rect x="15" y="23" width="35" height="30" rx="9" fill="#ba8754"/><path fill="#9eaba2" d="M26 15h12v8H26Z"/><path d="M20 30h25m-19 10h12"/>',
 med:'<rect x="11" y="17" width="43" height="35" rx="6" fill="#a75c59"/><path d="M23 17V9h18v8"/><path d="M32 27v17m-8-8h17" stroke="#e5d8c8" stroke-width="5"/>',
 warmer:'<rect x="16" y="12" width="32" height="42" rx="5" fill="#b89965"/><path d="M21 18h22m-19 28q-5-6 0-12m8 12q-5-6 0-12m8 12q-5-6 0-12"/>',
 battery:'<rect x="19" y="9" width="29" height="46" rx="5" fill="#7c8f86"/><path d="M25 16h16m-9 10-6 13h7l-1 10 8-16h-8Z" fill="#dbd5ab"/>',
 patch:'<path fill="#89a38c" d="m12 17 39-7 5 38-38 9Z"/><path stroke-dasharray="3 3" d="m18 21 28-5 5 27-28 6Z"/><path d="m28 24 10 20m-13-8 18-3"/>',
 blanket:'<path fill="#b6b8a4" d="m11 12 41 6-5 40-39-7Z"/><path d="m18 17 7 9-7 8 10 6-8 11m18-33-5 10 8 6-7 10 9 8M12 31l36 6"/>'
};
export function gearIcon(id){return `<svg class="gear-art" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="#24352f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${drawings[id]||'<path fill="#688f81" d="M19 15h26v40H19ZM24 15V9h16v6"/><path d="M24 30h16v16H24"/>'}</svg>`;}
