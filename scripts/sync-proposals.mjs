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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GoatCounter's API is rate-limited to 4 req/s (token bucket). On 429 or a
// transient 5xx, back off and retry instead of failing the whole run.
async function fetchWithRetry(url, opts, { retries = 5, baseDelayMs = 1000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, opts);

    if (res.ok) return res;

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === retries) {
      const body = await res.text().catch(() => "");
      throw new Error(`GoatCounter API error ${res.status}: ${body}`);
    }

    const resetHeader = res.headers.get("X-Rate-Limit-Reset");
    const resetMs = resetHeader ? Number(resetHeader) * 1000 : null;
    const backoffMs = resetMs && !Number.isNaN(resetMs)
      ? resetMs + 100
      : baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);

    console.warn(
      `GoatCounter API returned ${res.status} (attempt ${attempt + 1}/${retries + 1}), ` +
      `retrying in ${backoffMs}ms`
    );
    await sleep(backoffMs);
  }
}

async function fetchAllPaths() {
  let all = [];
  let after = null;
  for (let page = 0; page < 10; page++) {
    const url = GC_BASE + "/api/v0/paths" + (after ? ("?after=" + after) : "");
    const res = await fetchWithRetry(url, { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    const list = data.paths || (Array.isArray(data) ? data : []);
    all = all.concat(list);
    if (!data.more || !list.length) break;
    after = list[list.length - 1].id;
    // Small courtesy gap between pages so we don't lean on the retry logic
    // for something we can just avoid.
    if (page < 9) await sleep(300);
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
