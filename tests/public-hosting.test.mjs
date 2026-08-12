import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds a public GitHub Pages version without an OpenAI login", async () => {
  const [html, workflow, config] = await Promise.all([
    readFile(new URL("../public-dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../vite.public.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<html lang="de">/i);
  assert.match(html, /Klassenkompass – das Klassenjahr im Blick/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /\/klassenkompass\/assets\//);
  assert.doesNotMatch(html, /signin-with-chatgpt|auth\.openai\.com/i);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /npm run build:public/);
  assert.match(config, /base: "\/klassenkompass\/"/);

  await access(new URL("../public-dist/og.png", import.meta.url));
});
