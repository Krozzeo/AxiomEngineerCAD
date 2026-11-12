// Original CAD SVG glyphs; shared action icons are copied from Axiom Game Engine (MIT).
const paths={convert:'M3 3h10v10H3zM11 11h10v10H11zM5 17h4M7 15l2 2-2 2M17 5v4M15 7l2 2 2-2','angle-0':'M4 19h16M4 19V4M9 19v-5h5M15 15l5 4-5 4','angle-90':'M4 19h16M4 19V4M4 9h5v5M1 8l3-4 3 4','angle-180':'M20 5H4M20 5v15M15 5v5h-5M9 1L4 5l5 4','angle-270':'M20 5H4M20 5v15M20 15h-5v-5M17 16l3 4 3-4',enable:'M8 4l12 8-12 8z',disable:'M6 4h4v16H6zM14 4h4v16h-4z',success:'M4 12l5 5L20 5',error:'M5 5l14 14M19 5L5 19',rotate:'M4 8a8 8 0 0 1 14-3l2 3M20 3v5h-5M20 16a8 8 0 0 1-14 3l-2-3M4 21v-5h5',edit:'M4 16L16 4l4 4L8 20l-5 1zM14 6l4 4M3 21l2-5',dimension:'M3 3v18M21 3v18M3 12h18M7 9l-4 3 4 3M17 9l4 3-4 3M10 4h4',clear:'M4 19h16M8 17l9-12-5-3L3 14zM5 13l5 4',parameters:'M3 4h18v16H3zM3 9h18M10 4v16M14 13h4M14 17h4',undo:'M9 4L3 10l6 6M3 10h11a7 7 0 0 1 7 7v3',redo:'M15 4l6 6-6 6M21 10H10a7 7 0 0 0-7 7v3',hide:'M3 3l18 18M10 5a12 12 0 0 1 12 7c-1 2-2 4-4 5M6 6C3 8 2 10 1 12c3 6 9 9 15 6M10 10a3 3 0 0 0 4 4',reveal:'M1 12c5-9 17-9 22 0-5 9-17 9-22 0M15 12a3 3 0 1 0-6 0 3 3 0 1 0 6 0',delete:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',point:'M12 3v6M12 15v6M3 12h6M15 12h6M10 10h4v4h-4z',line:'M4 20L20 4M2 18h4v4H2zM18 2h4v4h-4z',circle:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M9 12h6M12 9v6',rectangle:'M3 5h18v14H3zM1 3h4v4H1zM19 17h4v4h-4z',save:'M4 3h13l4 4v14H3V3h1zm3 0v6h9V3M7 21v-8h10v8',origin:'M5 19V3M5 19h16M2 7l3-4 3 4M17 16l4 3-4 3',axis:'M3 21l6-6m2-2 .3-.3m2-2 7-7M16 4h5v5',sketch:'M5 4l13-2v17L5 22zM2 13l19-4M12 1v22',feature:'M3 8l9-5 9 5v12H3zM3 8h18M8 8v12M16 8v12',orbit:'M3 12a9 5 0 1 0 18 0 9 5 0 1 0-18 0M12 3a5 9 0 1 0 0 18 5 9 0 1 0 0-18',pan:'M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4',fit:'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M7 7h10v10H7z',plane:'M7 5l10-3v17L7 22zM12 1v7m0 2v1m0 2v10M3 15l5-2m2-1 1-.3m2-.7 8-3',cube:'M3 7l9-5 9 5v10l-9 5-9-5zM3 7l9 5 9-5M12 12v10',face:'M4 4h16v16H4zM7 7h10v10H7z',edge:'M4 4h16v16H4zM4 20L20 4',vertex:'M4 4h16v16H4zM2 2h4v4H2zM18 18h4v4h-4z',normal:'M3 17l7-7 11 4-7 7zM12 14V2M8 6l4-4 4 4',drawing:'M5 2h10l4 4v16H5zM15 2v5h4M8 11h8M8 15h8M8 19h5',select:'M5 2l14 11-7 1-3 7z',dock:'M3 3h18v18H3zM8 3v18M8 16h13',history:'M4 4v16h16M4 7h12M4 12h16M4 17h10',inspect:'M10 3a7 7 0 1 0 0 14 7 7 0 1 0 0-14M15 15l6 6',separate:'M14 3h7v7M21 3L11 13M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',return:'M3 14v7h7M3 21l10-10M14 3h7v7',activity:'M2 12h5l3-8 4 16 3-8h5'};
Object.assign(paths,{
 extrude:'M3 9l6-4 6 4-6 4zM3 9v9l6 4 6-4V9M9 13v9M18 15V2m-3 4 3-4 3 4',
 revolve:'M12 2v20M4 6h5v12H4zM16 5c8 2 8 12 0 14m0-4v4h5',
 'boolean-none':'M2 7l6-4 6 4v9l-6 4-6-4zM8 11v9M2 7l6 4 6-4M17 7h5M19.5 4.5v5',
 'boolean-unite':'M3 4h11v6h7v11H10v-6H3zM8 10h8M12 6v8',
 'boolean-subtract':'M3 4h12v17H3zM15 8h7v9h-7M6 12h6',
 'boolean-intersect':'M3 4h12v14H3zM9 9h12v12H9zM9 9h6v9H9z',
 'limit-next':'M2 5v14M4 12h13m-4-4 4 4-4 4M20 3v18',
 'limit-offset':'M3 3v18M9 3v18M11 12h10m-4-4 4 4-4 4M3 5h6',
 'limit-all':'M4 3v18M18 3v18M1 12h21m-4-4 4 4-4 4'
});
Object.assign(paths,{'constraint-horizontal':'M3 8h18M3 16h18','constraint-vertical':'M8 3v18M16 3v18','constraint-horizontal-points':'M3 12h18M3 9v6M21 9v6','constraint-vertical-points':'M12 3v18M9 3h6M9 21h6','constraint-parallel':'M3 18L14 3M10 21L21 6','constraint-perpendicular':'M4 4v16h16M4 14h6v6','constraint-collinear':'M2 21L8 15M10 13l4-4M16 7l6-6','constraint-equal':'M4 8h16M4 16h16','constraint-concentric':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10','constraint-coradial':'M12 3a9 9 0 1 0 9 9M12 3v9h9M8 12h8M12 8v8','constraint-tangent':'M2 20h20M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16','constraint-point-on-line':'M3 21L21 3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8','constraint-point-on-circle':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M18 3h4v4h-4z','constraint-coincident':'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14M9 9l6 6M9 15l6-6','constraint-midpoint':'M2 20L22 4M9 9h6v6H9z','constraint-equal-curve-length':'M2 5h9M4 10h14M4 15h14M14 19a5 5 0 0 0 8 0','constraint-fixed':'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4'});
Object.assign(paths,{arc:'M4 18a8 8 0 0 1 16 0M4 18v2M20 18v2',polygon:'M12 2l9 5v10l-9 5-9-5V7z',trim:'M7 8L21 18M7 16L21 6M8 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0',spline:'M2 18C8 2 15 22 22 5',construction:'M3 21l4-4m3-3 4-4m3-3 4-4',split:'M2 12h7m6 0h7M12 5v14',mirror:'M12 2v20M9 6l-6 12h6zM15 6l6 12h-6z',pattern:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z','constraint-symmetry':'M12 2v20M3 10h5m-2-2 2 2-2 2m15-2h-5m2-2-2 2 2 2'});
Object.assign(paths,{
 'midpoint-line':'M3 20L21 4M10 10h4v4h-4zM19 2h4v4h-4z',
 'center-rectangle':'M3 5h18v14H3zM9 12h6M12 9v6M19 17h4v4h-4z',
 'three-rectangle':'M2 14L14 3l8 8-12 11zM1 12h4v4H1zM12 1h4v4h-4zM19 9h4v4h-4z',
 'three-circle':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M10 1h4v4h-4zM2 12h4v4H2zM17 15h4v4h-4z',
 'three-arc':'M3 18a9 9 0 0 1 18 0M1 16h4v4H1zM10 7h4v4h-4zM19 16h4v4h-4z',
 'control-spline':'M2 19C7 1 16 22 22 6M2 19L7 1M22 6l-6 16M5 1h4M14 22h4',
 'equation-curve':'M3 20h18M5 22V3M7 17c4 0 7-3 8-7s3-6 6-6M14 7h6',
 'circular-pattern':'M12 4a8 8 0 1 1-8 8M10 2h4v4h-4zM18 10h4v4h-4zM10 18h4v4h-4zM2 10h4v4H2z',
 'dim-horizontal':'M3 6v14M21 6v14M3 12h18M7 9l-4 3 4 3M17 9l4 3-4 3',
 'dim-vertical':'M5 3h14M5 21h14M12 3v18M9 7l3-4 3 4M9 17l3 4 3-4',
 'dim-angle':'M3 20h18M3 20L15 4M13 8a13 13 0 0 1 7 12',
 'dim-radius':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 12l6-6M15 6h3v3',
 'dim-diameter':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M6 18L18 6M6 15v3h3M15 6h3v3'
});
paths['constraint-equation-tangent']=paths['constraint-tangent'];
export function icon(name){return paths[name]?`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="${paths[name]}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`:`<img src="/icons/${name}.svg" width="18" height="18" alt="">`;}
