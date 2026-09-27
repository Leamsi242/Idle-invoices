import { chromium } from "playwright";
const B = "http://localhost:3458";
const browser = await chromium.launch();
for (const lang of (process.argv[2] ? [process.argv[2]] : ["fr", "en"])) {
  const ctx = await browser.newContext({ viewport: { width: 1270, height: 760 }, deviceScaleFactor: 2, locale: lang === "fr" ? "fr-FR" : "en-US", timezoneId: "Europe/Paris" });
  await ctx.addCookies([{ name: "sd_lang", value: lang, url: B }]);
  const p = await ctx.newPage();
  await p.goto(B + "/report");
  await p.getByRole("button", { name: lang === "fr" ? "Essayer avec des données fictives" : "Try with made-up data" }).first().click();
  await p.waitForURL("**/report"); await p.waitForTimeout(3000);
  // The demo banner is for testers, not for a store listing.
  const hideBanner = () => p.addStyleTag({ content: "body > div > div > div:has(> div > span > span.uppercase){display:none!important}" }).catch(() => {});
  await p.screenshot({ path: `out/galerie-1-vue-ensemble-${lang}.png` });
  await p.goto(B + "/subscriptions"); await p.waitForTimeout(1200);
  await p.screenshot({ path: `out/galerie-2-abonnements-${lang}.png` });
  await p.getByRole("button", { name: /Adobe/ }).first().click(); await p.waitForTimeout(1300);
  await p.screenshot({ path: `out/galerie-3-detail-${lang}.png` });
  await p.goto(B + "/calendar"); await p.waitForTimeout(1200);
  await p.screenshot({ path: `out/galerie-4-calendrier-${lang}.png` });
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: lang === "fr" ? "fr-FR" : "en-US" });
  await m.addCookies(await ctx.cookies());
  const mp = await m.newPage();
  await mp.goto(B + "/report"); await mp.waitForTimeout(3000);
  await mp.screenshot({ path: `out/galerie-5-mobile-${lang}.png` });
  await m.close(); await ctx.close();
  console.log(lang, "ok");
}
await browser.close();
