// Builds public/embed/study-planner.html from the client's WordPress planner
// block (IMAT-Study-Plan-Planner-code.txt), adapted to the platform:
//   - a full HTML page, embedded by /study-planner in a same-origin iframe
//   - platform colours (dark default + light, following the app's switch),
//     Inter font, plain corners, no tilts / tape / handwriting
//   - links go to platform pages in the main window; share links point at
//     /study-planner; analytics off; search-engine metadata dropped
// The plan logic, syllabus, holidays and PDF export are left exactly as sent.
//
// Usage (re-run when the client sends a new version):
//   node scripts/build-study-planner.mjs "<path to the client's .txt file>"
// Every edit must match the expected number of times, so a changed source
// fails loudly instead of being half-adapted.

import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) {
    console.error('Usage: node scripts/build-study-planner.mjs <client planner .txt>');
    process.exit(1);
}
const html = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

// ---------- Split the block into its parts ----------
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>') + '</style>'.length;
if (styleStart === -1 || styleEnd < styleStart) throw new Error('No <style> block found');
let css = html.slice(styleStart, styleEnd);
const body = html.slice(styleEnd);

// ---------- Colours: cream/light-only values → theme variables ----------
function cssEdit(label, find, replace, expected) {
    const count = (css.match(find) || []).length;
    if (expected !== undefined && count !== expected) throw new Error(`css ${label}: expected ${expected}, found ${count}`);
    if (count === 0) throw new Error(`css ${label}: no matches`);
    css = css.replace(find, replace);
}
cssEdit('white backgrounds', /background:#fff(?=[;}!])/g, 'background:var(--p-raised)');
cssEdit('yellow notes', /#FFF4B8/g, 'var(--p-hl)');
cssEdit('pale yellows', /#FFF9E0|#FFF9E2/g, 'var(--p-hl)');
cssEdit('yellow borders', /#F1DE86|#F1E3A6/g, 'var(--p-hl-line)');
cssEdit('warning background', /#FFF6E3/g, 'var(--p-warn-bg)');
cssEdit('warning text', /#6B4A00|#4A3300/g, 'var(--p-warn-tx)');
cssEdit('error background', /#FDECEC/g, 'var(--p-err-bg)');
cssEdit('error text', /#8A1C1C/g, 'var(--p-err-tx)');
cssEdit('mock row', /#FBF1F0/g, 'var(--p-mock)');
cssEdit('break row', /#FBF9F4/g, 'var(--p-inner)');
cssEdit('bar track', /#F0ECE2/g, 'var(--p-track)');
cssEdit('cream/lavender borders', /#E2DCCB|#D9D2C2|#CFC8B6|#E4DEFA|#D9D2F5/g, 'var(--p-line-strong)');
cssEdit('done background', /#F4FBF6/g, 'var(--p-ok-bg)');
cssEdit('text on navy', /#CFCAEF/g, 'rgba(255,255,255,.75)');
cssEdit('navy shadows', /rgba\(21,12,73,/g, 'rgba(0,0,0,');
cssEdit('violet glows', /rgba\(109,92,232,/g, 'rgba(37,99,235,');

// ---------- The platform layer: tokens + look, appended after the original ----------
const platformCss = `<style>
/* ===== Platform theme (added for the LOCOMOTIVE app; see scripts/build-study-planner.mjs) ===== */
:root{color-scheme:dark;
  --p-page:#020e1f;--p-card:#051a33;--p-inner:#071f3d;--p-raised:#0a2748;
  --p-text:#f1f5f9;--p-body:#cbd5e1;--p-muted:#94a3b8;
  --p-line:rgba(255,255,255,.08);--p-line-strong:rgba(255,255,255,.16);
  --p-accent:#2563EB;--p-accent-l:#3b82f6;--p-accent-d:#1d4ed8;--p-tint:rgba(37,99,235,.14);
  --p-gold:#fbbf24;--p-hl:rgba(251,191,36,.14);--p-hl-line:rgba(251,191,36,.35);
  --p-warn-bg:rgba(245,158,11,.12);--p-warn-tx:#fcd34d;--p-err-bg:rgba(239,68,68,.12);--p-err-tx:#fca5a5;
  --p-ok:#10b981;--p-ok-bg:rgba(16,185,129,.1);--p-mock:rgba(239,68,68,.08);--p-track:rgba(255,255,255,.06);
  --p-shadow:0 10px 30px -12px rgba(0,0,0,.6);
  --p-hero:radial-gradient(60% 90% at 85% 10%,rgba(37,99,235,.35),transparent 60%),radial-gradient(50% 70% at 0% 100%,rgba(37,99,235,.18),transparent 60%),#011838}
:root[data-theme=light]{color-scheme:light;
  --p-page:#eef1f6;--p-card:#ffffff;--p-inner:#f8fafc;--p-raised:#ffffff;
  --p-text:#0f172a;--p-body:#334155;--p-muted:#475569;
  --p-line:rgba(15,23,42,.10);--p-line-strong:rgba(15,23,42,.18);--p-tint:rgba(37,99,235,.08);
  --p-hl:#fef3c7;--p-hl-line:#fde68a;--p-warn-bg:#fffbeb;--p-warn-tx:#92400e;--p-err-bg:#fef2f2;--p-err-tx:#991b1b;
  --p-ok-bg:#ecfdf5;--p-mock:#fef2f2;--p-track:#e2e8f0;--p-shadow:0 10px 30px -18px rgba(15,23,42,.35)}
html,body{margin:0;background:var(--p-page)}
#lcp{--ink:var(--p-text);--ink-d:var(--p-accent-d);--ink-l:var(--p-tint);--ink-m:var(--p-line-strong);--txt:var(--p-body);--mut:var(--p-muted);
  --line:var(--p-line);--bg:var(--p-inner);--gold:var(--p-gold);--ok:var(--p-ok);--violet:var(--p-accent-l);--lav:#93c5fd;
  --heading:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--pen:var(--heading);--navy-glow:var(--p-hero);
  font-family:var(--heading);font-size:15px}
#lcp a{color:var(--p-accent-l)}
#lcp .lcp-link{color:var(--p-accent-l)!important}
/* Plain shapes: no tilts, tape strips, scribbles or handwriting */
#lcp .lcp-chips,#lcp .lcp-bnr,#lcp .lcp-bnote,#lcp .lcp-m,#lcp .lcp-stat,#lcp .lcp-k,#lcp .lcp-eyebrow,#lcp .lcp-hnote,#lcp .lcp-pnote,#lcp .lcp-now::after{transform:none!important}
#lcp .lcp-chips::before,#lcp .lcp-chips::after,#lcp #lcp-setup::before,#lcp .lcp-bnr::before,#lcp .lcp-bnote::before,#lcp .lcp-hnote::before,
#lcp .lcp-card>h2::after,#lcp .lcp-sketch svg,#lcp .lcp-bnr h2 em::after,#lcp .lcp-exam b::after{display:none}
#lcp .lcp-k,#lcp .lcp-eyebrow,#lcp .lcp-pn-out,#lcp .lcp-bnote .pn,#lcp .lcp-grp{font:700 12px/1.4 var(--heading);letter-spacing:.12em;text-transform:uppercase;color:var(--p-accent-l)}
#lcp .lcp-eyebrow{color:#93c5fd}
#lcp .lcp-pnote,#lcp .lcp-hnote,#lcp .lcp-pn-out{font:500 13px/1.4 var(--heading);letter-spacing:0;text-transform:none;color:var(--mut)}
#lcp .lcp-pn-out{margin:-6px 0 14px 0}
#lcp .lcp-hero h1 span{font:500 .5em/1.3 var(--heading);color:#93c5fd;margin-top:10px}
#lcp .lcp-now::after{font:700 11px/1 var(--heading);letter-spacing:.1em;text-transform:uppercase;background:var(--p-card);color:var(--p-gold);top:-7px}
#lcp .lcp-m::before,#lcp .lcp-tbl td.pass .n,#lcp .lcp-rung .dd{font:700 26px/1 var(--heading);color:var(--p-accent-l)}
#lcp .lcp-life .c b{font:600 15px/1.2 var(--heading)}
#lcp h1,#lcp h2,#lcp h3,#lcp h4{letter-spacing:-.01em}
#lcp .lcp-card h2,#lcp .lcp-bnr h2{font-size:clamp(22px,2.4vw,28px)}
/* Cards and corners like the platform */
#lcp .lcp-card{background:var(--p-card);border:1px solid var(--p-line);border-radius:16px;box-shadow:none}
#lcp .lcp-hero,#lcp .lcp-cta{border-radius:16px;border:1px solid var(--p-line)}
#lcp .lcp-hero{background:var(--p-hero)}
#lcp .lcp-stat,#lcp .lcp-now,#lcp .lcp-rec-card,#lcp .lcp-dl,#lcp .lcp-m,#lcp .lcp-st,#lcp .lcp-bk,#lcp .lcp-bnr,#lcp .lcp-bnote,#lcp .lcp-chips{border-radius:12px}
#lcp .lcp-chips{background:var(--p-card);color:var(--p-text);box-shadow:var(--p-shadow);padding:18px 22px}
#lcp .lcp-chips li{border-bottom-color:var(--p-line-strong)}
#lcp .lcp-bnr{background:var(--p-card);border:1px solid var(--p-line);box-shadow:none}
#lcp .lcp-bnote{background:var(--p-inner);border:1px solid var(--p-line);box-shadow:none}
#lcp .lcp-bchips li{background:var(--p-inner);border-color:var(--p-line)}
#lcp .lcp-m,#lcp .lcp-m:first-child,#lcp .lcp-m:nth-child(5){background:var(--p-inner);border-color:var(--p-line)}
#lcp .lcp-rec-card{background:var(--p-tint);border-color:var(--p-line);border-left-color:var(--p-accent)}
#lcp .lcp-now{background:var(--p-hl);border-color:var(--p-gold)}
#lcp details.lcp-topics[open],#lcp details.lcp-wk[open],#lcp details.lcp-faq[open]{border-color:var(--p-line-strong)}
/* Buttons like the platform */
#lcp .lcp-btn{border-radius:8px!important;min-height:44px;padding:0 20px;font-weight:600;font-size:15px}
#lcp .lcp-btn-p,#lcp .lcp-btn-g{background:var(--p-accent)!important;color:#fff!important;box-shadow:0 0 20px rgba(37,99,235,.3)}
#lcp .lcp-btn-p:hover,#lcp .lcp-btn-g:hover{background:var(--p-accent-l)!important}
#lcp .lcp-btn-s{background:var(--p-raised)!important;color:var(--p-text)!important;border:1px solid var(--p-line-strong)}
#lcp .lcp-btn-s:hover{border-color:var(--p-accent)}
/* Selected states use the platform blue */
#lcp .lcp-seg button[aria-pressed=true],#lcp .lcp-days button[aria-pressed=true],#lcp .lcp-syl-tabs button[aria-selected=true],
#lcp .lcp-jump a.go,#lcp .lcp-pc input:checked+span,#lcp .lcp-rung.first,#lcp .lcp-tbl th,#lcp .lcp-toast{background:var(--p-accent)!important;border-color:var(--p-accent)!important;color:#fff!important}
#lcp .lcp-seg button[aria-pressed=true]{box-shadow:0 4px 12px -4px rgba(37,99,235,.6)}
#lcp .lcp-pc input:checked+span i{background:#fff;border-color:#fff;color:var(--p-accent)}
#lcp .pill.today-pill{color:#011838}
#lcp .lcp-ck input,#lcp .lcp-b input,#lcp .lcp-dl input{accent-color:var(--p-accent)}
/* Inputs */
#lcp input[type=text],#lcp input[type=date],#lcp input[type=number],#lcp input[type=time],#lcp select,#lcp input.lcp-syl-q{background:var(--p-inner);border:1px solid var(--p-line-strong);color:var(--p-text);font-weight:400}
#lcp input[type=text],#lcp input[type=date],#lcp input[type=number],#lcp input[type=time],#lcp select{border-radius:10px;min-height:46px}
#lcp input:focus,#lcp select:focus,#lcp input.lcp-syl-q:focus{border-color:var(--p-accent);background:var(--p-inner);box-shadow:0 0 0 3px rgba(37,99,235,.25);outline:none}
#lcp input::placeholder{color:var(--p-muted)}
#lcp .lcp-btn:focus-visible,#lcp summary:focus-visible{outline-color:var(--p-accent-l)}
</style>`;

// ---------- Body: platform wording and links ----------
let bodyHtml = body;
function bodyEdit(label, find, replace, expected = 1) {
    const count = bodyHtml.split(find).length - 1;
    if (count !== expected) throw new Error(`body ${label}: expected ${expected}, found ${count}`);
    bodyHtml = bodyHtml.split(find).join(replace);
}
// Signed-in students: no "free, no sign-up" pitch.
bodyEdit('hero title', 'Free IMAT Study Plan Generator <span class="lcp-sketch">Build your IMAT study plan in 30 seconds', 'IMAT Study Planner <span class="lcp-sketch">Build your study plan in 30 seconds');
bodyEdit('hero note', '<span class="lcp-hnote">free, no sign-up</span>', '');
bodyEdit('actions note', 'Free. Your plan is built in your browser', 'Your plan is built in your browser');
// Course and help links → platform pages, opened in the main window (not inside the frame).
bodyEdit('banner courses', 'data-bn="courses" href="https://thisislocomotive.com/imat-course/"', 'data-bn="courses" href="/upgrade" target="_top"');
bodyEdit('banner starter', 'data-bn="starter" href="https://thisislocomotive.com/imat-starter/"', 'data-bn="starter" href="/starter-pack" target="_top"');
bodyEdit('banner consultation', 'data-bn="consultation" href="https://thisislocomotive.com/imat-consultation/"', 'data-bn="consultation" href="/contact" target="_top"');
bodyEdit('cta courses', 'id="lcp-cta-main" href="https://thisislocomotive.com/imat-course/" style="color:#150C49!important"', 'id="lcp-cta-main" href="/upgrade" target="_top"');
bodyEdit('cta starter', 'id="lcp-cta-starter" href="https://thisislocomotive.com/imat-starter/"', 'id="lcp-cta-starter" href="/starter-pack" target="_top"');
bodyEdit('recommended course links', 'href="\' + esc(LINKS[x[0]] || LINKS.courses || \'https://thisislocomotive.com/\') + \'" style="color:#fff!important"', 'href="\' + esc(LINKS[x[0]] || LINKS.courses || \'/upgrade\') + \'" target="_top" style="color:#fff!important"');
// Settings: platform course page, no Google Analytics.
bodyEdit('config links',
    "courses: 'https://thisislocomotive.com/imat-course/',\n    school: 'https://thisislocomotive.com/imat-course/',\n    classes: 'https://thisislocomotive.com/imat-course/',\n    physmath: 'https://thisislocomotive.com/imat-course/',\n    review: 'https://thisislocomotive.com/imat-course/'",
    "courses: '/upgrade',\n    school: '/upgrade',\n    classes: '/upgrade',\n    physmath: '/upgrade',\n    review: '/upgrade'");
bodyEdit('analytics off', '  analytics: true\n', '  analytics: false\n');
// "Copy link to this plan" → the platform page, which passes #plan=… to the frame.
bodyEdit('share link', "var url = location.href.split('#')[0] + '#plan='", "var url = (window.top !== window ? window.top.location.href : location.href).split('#')[0] + '#plan='");
// Colours drawn by the scripts that would vanish on a dark page.
bodyEdit('mixed subject colour', "mix:   { name: 'Mixed (all subjects)', short: 'Mixed', color: '#150C49' }", "mix:   { name: 'Mixed (all subjects)', short: 'Mixed', color: '#64748b' }");
bodyEdit('muted span 1', '<span style="color:#625E7E">', '<span style="color:var(--mut)">');
bodyEdit('muted span 2', '<span style="color:#6E6858">', '<span style="color:var(--mut)">');
bodyEdit('chart baseline', 'stroke="#E8E3D7"', 'style="stroke:var(--line)"');
bodyEdit('chart line', 'stroke="#6D5CE8"', 'style="stroke:var(--violet)"');
bodyEdit('chart points', 'fill="#150C49"', 'style="fill:var(--violet)"');
// Search-engine metadata is for the public page only.
const ld = bodyHtml.indexOf('<script type="application/ld+json">');
if (ld === -1) throw new Error('ld+json block not found');
bodyHtml = bodyHtml.slice(0, ld).trimEnd() + '\n';

// ---------- Assemble the page ----------
const head = `<!doctype html>
<!-- Generated by scripts/build-study-planner.mjs from the client's IMAT study planner. Edit the script, not this file. -->
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>IMAT Study Planner · LOCOMOTIVE</title>
<script>
  // Match the app's light/dark theme before anything paints; /study-planner
  // keeps it in sync when the student switches.
  try { var t = window.parent.document.documentElement.getAttribute('data-theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
`;
const out = head + css + '\n' + platformCss + '\n</head>\n<body>\n' + bodyHtml.trimStart() + '</body>\n</html>\n';

// The client's fonts are replaced by Inter (the PDF embeds its own font, so it's unaffected).
if (/fonts\.googleapis\.com\/css2\?family=Fraunces/.test(out)) throw new Error('old font link still present');

const dest = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'public', 'embed', 'study-planner.html');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log(`Wrote ${dest} (${(out.length / 1024).toFixed(0)} KB)`);
