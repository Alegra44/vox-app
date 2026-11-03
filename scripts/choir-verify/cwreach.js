// Phase 5: Choir World's song page shows one tab at a time (see harness.js cwTab / cwFor), and the Songs hub's old entries
// into the choir panels are hidden: a user goes Songs → Open Choir World → a song's tab. enterHub(page, entrySel, startSel)
// clicks the hub entry where it shows (master: as before); where it is hidden it takes that route instead, through the
// landing, to the tab (and trainer) that holds startSel. No side effects on require (the vocal-load and warm-up scripts use it).
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CW_SHOW = ({ tab, trainer, sel }) => {
  if (typeof cwShowTab !== 'function') return null;
  const TAB_PANEL = { rehearse: 'partrehearsal', songlab: 'choir', trainers: 'partrehearsal', yourchoir: 'choir', passport: 'choirpassport' };
  if (sel) {
    const el = document.querySelector(sel), sec = el && el.closest('[data-cw-sec]'), panel = el && el.closest('section.panel');
    if (!sec || !panel) return null;
    tab = sec.dataset.cwSec.split(' ').find(k => TAB_PANEL[k] === panel.id.replace('panel-', '')) || null;
    trainer = (el.closest('[data-cw-card]') || {}).dataset?.cwCard || null;
    if (!tab) return null;
  }
  const panel = document.getElementById('panel-' + TAB_PANEL[tab]);
  if (panel.classList.contains('active')) {
    panel.dataset.cwTab = tab;
    if (tab === 'trainers' && trainer) panel.dataset.cwTrainer = trainer; else delete panel.dataset.cwTrainer;
    renderCwStructure();
  } else cwShowTab(tab, trainer);
  return { tab, trainer };
};
const shown = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); return !!e && e.offsetParent !== null; }, sel);
async function enterHub(page, entrySel, startSel) {
  const hub = await shown(page, entrySel) || !(await shown(page, '[data-cw-landing]'));
  await page.locator(hub ? entrySel : '[data-cw-landing]').first().click(); await sleep(800);
  // the entry can itself be Open Choir World (the first [data-enter-panel="choir"]): the start's tab, if it isn't showing
  if (!(await shown(page, startSel)) && await page.evaluate(CW_SHOW, { sel: startSel })) await sleep(500);
  return hub ? 'hub' : 'choir world';
}
module.exports = { CW_SHOW, enterHub };
