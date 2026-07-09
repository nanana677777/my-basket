// Polls GoatCounter's authenticated /api/v0/paths endpoint (server-side, so
// CORS doesn't apply) and writes out a filtered proposals.json that the
// admin page can fetch same-origin from GitHub Pages.
//
// Run by .github/workflows/sync-proposals.yml on a schedule. Requires
// GOATCOUNTER_API_TOKEN as an env var (kept as a GitHub Actions secret,
// never committed).

const GC_BASE = "https://nana677.goatcounter.com";
const token = process.env.GOATCOUNTER_API_TOKEN;

if (!token) {
  console.error("Missing GOATCOUNTER_API_TOKEN env var");
  process.exit(1);
}

async function fetchAllPaths() {
  let all = [];
  let after = null;
  for (let page = 0; page < 10; page++) {
    const url = GC_BASE + "/api/v0/paths" + (after ? ("?after=" + after) : "");
    const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GoatCounter API error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const list = data.paths || (Array.isArray(data) ? data : []);
    all = all.concat(list);
    if (!data.more || !list.length) break;
    after = list[list.length - 1].id;
  }
  return all;
}

function slim(p) {
  // Keep only what the admin page actually reads.
  return { id: p.id, path: p.path, title: p.title || "" };
}

async function main() {
  const all = await fetchAllPaths();

  const outfitProposals = all
    .filter(p => p.path && /^\/?outfit-proposal\//.test(p.path))
    .map(slim);
  const pendingComments = all
    .filter(p => p.path && /^\/?comment-proposal\//.test(p.path))
    .map(slim);
  const pendingAMA = all
    .filter(p => p.path && /^\/?ama-proposal\//.test(p.path))
    .map(slim);
  const selections = all
    .filter(p => p.path && /^\/?selection\//.test(p.path))
    .map(slim);

  const out = {
    updatedAt: new Date().toISOString(),
    outfitProposals,
    pendingComments,
    pendingAMA,
    selections,
  };

  const fs = await import("node:fs/promises");
  await fs.writeFile("proposals.json", JSON.stringify(out, null, 2) + "\n");
  console.log(
    `Synced ${outfitProposals.length} outfit proposals, ${pendingComments.length} comments, ` +
    `${pendingAMA.length} AMA questions, ${selections.length} selections.`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
