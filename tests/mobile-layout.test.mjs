import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appUrl = new URL("../app/KlassenkompassApp.tsx", import.meta.url);
const cssUrl = new URL("../app/globals.css", import.meta.url);
const layoutUrl = new URL("../app/layout.tsx", import.meta.url);

test("provides a dedicated portrait-phone navigation and safe viewport", async () => {
  const [app, css, layout] = await Promise.all([
    readFile(appUrl, "utf8"),
    readFile(cssUrl, "utf8"),
    readFile(layoutUrl, "utf8"),
  ]);

  assert.match(layout, /width:\s*"device-width"/);
  assert.match(layout, /initialScale:\s*1/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(layout, /themeColor:\s*"#f7f5ef"/i);

  assert.match(app, /className="mobile-tabbar"/);
  assert.match(app, /section: "ueberblick"/);
  assert.match(app, /section: "termine"/);
  assert.match(app, /section: "jahresblick"/);
  assert.match(app, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(app, /scrollIntoView/);
  assert.match(app, /id="ueberblick"/);
  assert.match(app, /id="termine"/);
  assert.match(app, /id="jahresblick"/);
  assert.match(app, /enterKeyHint="go"/);

  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.mobile-tabbar\s*\{[\s\S]*position:\s*fixed/);
  assert.match(css, /\.mobile-tabbar button\.active\s*\{/);
  assert.doesNotMatch(css, /\.mobile-tabbar a:first-child/);
  assert.match(css, /min-height:\s*50px/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /overflow-x:\s*clip/);
});

test("keeps teacher creation and the event form thumb-friendly on phones", async () => {
  const css = await readFile(cssUrl, "utf8");

  assert.match(
    css,
    /\.teacher-hero \.add-button\s*\{[\s\S]*position:\s*fixed[\s\S]*min-height:\s*54px/,
  );
  assert.match(css, /\.event-modal\s*\{[\s\S]*height:\s*100dvh/);
  assert.match(
    css,
    /\.type-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  );
  assert.match(css, /\.form-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /\.form-footer \.button-primary\s*\{[\s\S]*min-height:\s*52px/);
});
