// Release C, deploy step b: a vocal-load checkpoint with tzOffsetMin saves, and one without it (an old client) saves too.
// A throwaway account (deleted at exit, with its vocal-load rows) on the backend the page talks to (production unless
// VOX_BACKEND=local). The day each body carries: the local day at the offset (with it), the UTC day (without it).
require('../runguard').auto();
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
(async () => {
  const b = await C.chromium.launch(); let bad = 0;
  try {
    const { page } = await C.openPage(b, { timezoneId: 'America/Los_Angeles' }); await C.signUp(page, 'dcapi', 'Api Check');
    const uid = await page.evaluate(() => profile.id);
    const res = await page.evaluate(async () => {
      await vlRefreshToken();
      const put = async (id, body) => { const r = await fetch(API_BASE + '/me/vocal-load/sessions/' + id, { method: 'PUT', body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + vlToken, apikey: SUPABASE_ANON_KEY } }); return { status: r.status, text: (await r.text()).slice(0, 200) }; };
      const now = Date.now(), base = { activeSeconds: 30, load: 45, medianRms: 0.02, p5Midi: 57, p95Midi: 69, ended: true };
      const off = -new Date(now).getTimezoneOffset();
      const withTz = await put(crypto.randomUUID(), { ...base, day: localDayOf(now), startedAt: new Date(now).toISOString(), tzOffsetMin: off });
      const noTz = await put(crypto.randomUUID(), { ...base, day: new Date(now).toISOString().slice(0, 10), startedAt: new Date(now).toISOString() });
      return { off, withTz, noTz };
    });
    console.log('offset', res.off, '· with tzOffsetMin:', res.withTz.status, res.withTz.text, '· without:', res.noTz.status, res.noTz.text);
    const rows = db(`select day, tz_offset_min from public.vocal_load_sessions where user_id = '${uid}' order by tz_offset_min nulls last`);
    console.log('rows', JSON.stringify(rows));
    const ok = res.withTz.status < 300 && res.noTz.status < 300 && rows.length === 2 && rows[0].tz_offset_min === res.off && rows[1].tz_offset_min === null;
    console.log(ok ? 'PASS both saved' : 'FAIL'); if (!ok) bad++;
  } finally { await b.close(); C.cleanup(); }
  process.exit(bad ? 1 : 0);
})();
