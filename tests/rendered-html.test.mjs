import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Klassenkompass access view", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="de">/i);
  assert.match(html, /<title>Klassenkompass – das Klassenjahr im Blick<\/title>/i);
  assert.match(html, /property="og:image" content="http:\/\/localhost\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /Klassenkompass/);
  assert.match(html, /Klassenbereich öffnen/);
  assert.match(html, /lokal im Browser geprüft/i);
  assert.match(html, /noch keine echte Anmeldung oder Sicherheit/i);
  assert.doesNotMatch(html, /Schüleransicht öffnen|Lehreransicht öffnen/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps the prototype empty, temporary and free of backend wiring", async () => {
  const [app, page, layout, packageJson, css, hostingConfig] = await Promise.all([
    readFile(new URL("../app/KlassenkompassApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(app, /useState<CalendarEvent\[]>\(\[\]\)/);
  assert.match(app, /S:\s*"student"/);
  assert.match(app, /A:\s*"teacher"/);
  assert.match(app, /trim\(\)\.toUpperCase\(\)/);
  assert.match(app, /Noch keine Epoche eingetragen/);
  assert.match(app, /Noch keine Termine vorhanden/);
  assert.match(app, /Keine Daten werden dauerhaft gespeichert/);
  assert.match(app, /type === "period"/);
  assert.match(app, /endDate < startDate/);
  assert.match(app, /"Epochen"[\s\S]*"Achtklass-Projekt"[\s\S]*"Achtklass-Stück"[\s\S]*"Abgaben"[\s\S]*"Präsentationen"/);
  assert.match(app, /"Epoche \/ Zeitraum"/);
  assert.match(app, /"Abgabe oder Meilenstein"/);
  assert.match(app, /"Wichtiger Termin"/);
  assert.match(app, /"Probe oder Präsentation"/);
  assert.doesNotMatch(app, /\b20\d{2}-\d{2}-\d{2}\b|z\. B\./);
  assert.doesNotMatch(app, /localStorage|sessionStorage|fetch\(|axios|supabase|firebase/i);
  assert.match(page, /<KlassenkompassApp \/>/);
  assert.match(layout, /<html lang="de">/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton|drizzle|axios|supabase|firebase/i);
  const hosting = JSON.parse(hostingConfig);
  assert.match(hosting.project_id, /^appgprj_[a-z0-9]+$/);
  assert.deepEqual(
    { d1: hosting.d1, r2: hosting.r2 },
    { d1: null, r2: null },
  );
  assert.deepEqual(Object.keys(hosting).sort(), ["d1", "project_id", "r2"]);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /@keyframes/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await assert.rejects(access(new URL("../app/chatgpt-auth.ts", import.meta.url)));
  await assert.rejects(access(new URL("../app/api", import.meta.url)));
  await assert.rejects(access(new URL("../db", import.meta.url)));
  await assert.rejects(access(new URL("../drizzle", import.meta.url)));
  await access(new URL("../app/KlassenkompassApp.tsx", import.meta.url));
  await access(projectRoot);
});

function colorValue(css, variable) {
  const match = css.match(new RegExp(`--${variable}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `CSS-Farbvariable --${variable} fehlt.`);
  return match[1];
}

function luminance(hex) {
  const channels = hex
    .match(/[0-9a-f]{2}/gi)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

test("uses readable natural palette colors with AA text contrast", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const paper = colorValue(css, "paper");
  const surface = colorValue(css, "surface");
  const sageSoft = colorValue(css, "sage-soft");
  const ochreSoft = colorValue(css, "ochre-soft");

  const pairs = [
    [colorValue(css, "ink"), paper],
    [colorValue(css, "ink-soft"), paper],
    [colorValue(css, "ink-faint"), surface],
    [colorValue(css, "ink-faint"), sageSoft],
    [colorValue(css, "ink-faint"), ochreSoft],
    [colorValue(css, "forest"), paper],
    ["#ffffff", colorValue(css, "forest")],
  ];

  for (const [foreground, background] of pairs) {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foreground} auf ${background} unterschreitet WCAG AA.`,
    );
  }
});
