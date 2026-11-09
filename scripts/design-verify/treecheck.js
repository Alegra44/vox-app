// Phase 8 (PHASE8.md §1c): the Vocal Skill Tree on master (--base, default master) and the branch (the working copy, or
// --branch-ref), for youSeed.js's seeded "new" and "active" states (and signed out): per node, unlocked or not and which
// one is "next" (from SKILL_TREE_NODES, the model both builds keep), the nodes the SVG draws as unlocked
// (.st-node-bg.unlocked) and next (.next), and the detail panel: the next node's label and every number in it (as a sorted set,
// so a reworded panel that shows the same values passes: "Current: 58% / 60%" and "Breath ≥ 60% · now 58%" are equal).
// Gate: all equal. No page errors. Out: logs/treecheck-<stamp>.json.
// Usage: node scripts/design-verify/treecheck.js [--base <ref>] [--branch-ref <ref>]
const fs = require('fs'), path = require('path');
const C = require('./common'), { seedInPage } = require('./youSeed');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'master';
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), OUT = path.join(__dirname, 'logs', `treecheck-${stamp}.json`);

const READ = () => {
  showArcadeGame('skilltree'); renderSkillTree();
  const det = document.getElementById('skillTreeDetail'), text = det ? det.innerText : '';
  if (!profile) return { signedIn: false, text: text || document.getElementById('skillTreeSvg').textContent.trim() };
  let next = null;
  const nodes = SKILL_TREE_NODES.map(n => {
    const unlocked = n.isUnlocked(), parents = n.requires.every(r => SKILL_TREE_NODES.find(x => x.id === r).isUnlocked());
    const isNext = !unlocked && parents && !next; if (isNext) next = n.id;
    return `${n.id}:${unlocked ? 'unlocked' : isNext ? 'next' : 'locked'}`;
  });
  const drawnUnlocked = document.querySelectorAll('#skillTreeSvg .st-node-bg.unlocked').length, drawnNext = document.querySelectorAll('#skillTreeSvg .st-node-bg.next').length;
  const nextLabel = next ? SKILL_TREE_NODES.find(n => n.id === next).label : null;
  return { signedIn: true, nodes, next, drawnUnlocked, drawnNext, nextLabelShown: nextLabel ? text.toLowerCase().includes(nextLabel.toLowerCase()) : null,
    numbers: [...new Set((text.match(/\d+/g) || []).map(Number))].sort((a, b) => a - b), text };
};

(async () => {
  const dirs = { master: C.buildDir(BASE), branch: C.buildDir(arg('--branch-ref') || null) };
  const b = await C.chromium.launch(); const res = {}; let fail = 0;
  try {
    const o = await C.openPage(b, { dir: dirs.master }); await C.signUp(o.page, 'dvtc', 'Tree Check'); const state = await o.ctx.storageState(); await o.ctx.close();
    console.log(`== treecheck · ${BASE} vs ${arg('--branch-ref') || 'working copy'}`);
    for (const st of ['signedout', 'new', 'active']) {
      const v = {};
      for (const side of ['master', 'branch']) {
        const { ctx, page, errors } = await C.openPage(b, { dir: dirs[side], storageState: st === 'signedout' ? undefined : state });
        try {
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await C.clearOverlays(page);
          if (st !== 'signedout') await page.evaluate(seedInPage, st);
          await C.showPanel(page, 'arcade'); await C.clearOverlays(page);
          v[side] = await page.evaluate(READ); v[side].errors = errors.slice();
        } finally { await ctx.close(); }
      }
      res[st] = v; const m = v.master, br = v.branch;
      const same = k => JSON.stringify(m[k]) === JSON.stringify(br[k]);
      const checks = m.signedIn ? ['nodes', 'next', 'drawnUnlocked', 'drawnNext', 'nextLabelShown', 'numbers'] : ['signedIn'];
      console.log(`-- ${st}`);
      for (const k of checks) { const ok = same(k); if (!ok) fail++; console.log(`   ${ok ? '✓' : '✗'} ${k.padEnd(15)} ${JSON.stringify(m[k])}${ok ? '' : ` → ${JSON.stringify(br[k])}`}`); }
      if (!m.signedIn && !br.text) { fail++; console.log('   ✗ the branch shows nothing signed out'); }
      for (const side of ['master', 'branch']) if (v[side].errors.length) { fail++; console.log(`   ✗ ${side} page errors: ${v[side].errors.slice(0, 2).join(' | ')}`); }
      console.log(`   master panel: ${JSON.stringify(m.text)}\n   branch panel: ${JSON.stringify(br.text)}`);
    }
    console.log(`\nTREECHECK: ${fail ? `FAIL: ${fail}` : 'PASS'}`); process.exitCode = fail ? 1 : 0;
  } finally { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(`json: ${path.relative(C.ROOT, OUT)}`); await b.close(); C.cleanup(); }
})();
