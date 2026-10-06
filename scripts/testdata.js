// Where the verify scripts keep their test data: the recordings (VocalSet clips, the noise-gate sources), the stimuli
// built from them, and scratch copies. Outside $TMPDIR, which macOS clears of files not used for a few days (on
// 2026-10-06 it deleted the VocalSet clips and the noise stimuli overnight), and outside the repo (about 620 MB).
// Override with VOXCOACH_TESTDATA. Fetch the recordings with scripts/vq-verify/fetchdata.py.
const path = require('path'), os = require('os'), fs = require('fs');
const TESTDATA = process.env.VOXCOACH_TESTDATA || path.join(os.homedir(), 'VoxCoachTestData');
fs.mkdirSync(TESTDATA, { recursive: true });
module.exports = { TESTDATA };
