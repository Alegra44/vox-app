#!/usr/bin/env python3
"""Builds the House Lights design system page from house-lights.css + icons + mockups."""
import os, html
HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = open(os.path.join(HERE, 'house-lights-icons.svg')).read()

def ic(name, cls='hl-icon'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#hl-{name}"/></svg>'

# ---------------------------------------------------------------- shared bits
def brand_top():
    return ('<div class="m-top"><span class="m-brand"><svg class="m-mark" viewBox="0 0 28 20" aria-hidden="true"><use href="#hl-mark"/></svg>'
            '<span class="m-word">VoxCoach</span></span><button class="m-avatar" aria-label="Your profile">J</button></div>')

def tool_top(label, right='info', left='close'):
    return (f'<div class="m-tooltop"><button class="m-iconbtn" aria-label="Close">{ic(left)}</button>'
            f'<p class="hl-label">{label}</p><button class="m-iconbtn" aria-label="More">{ic(right)}</button></div>')

def tabbar(current):
    tabs = [('home','Home'),('coach','Coach'),('songs','Songs'),('world','World'),('you','You')]
    out = '<nav class="hl-tabbar" aria-label="Main">'
    for key, label in tabs:
        cur = ' aria-current="page"' if key == current else ''
        out += f'<button class="hl-tab"{cur}>{ic(key)}<span>{label}</span></button>'
    return out + '</nav>'

def row(icon, title, meta, end=''):
    return (f'<li><button class="hl-item">{ic(icon)}<span class="m-rowtext"><span class="hl-item-title">{title}</span>'
            f'<span class="hl-item-meta">{meta}</span></span><span class="hl-item-end">{end}{ic("chev","hl-icon hl-icon--s")}</span></button></li>')

# ---------------------------------------------------------------- drawings
def mini_staff():
    lines = ''.join(f'<line x1="0" x2="296" y1="{y}" y2="{y}"/>' for y in (10,18,26,34,42))
    notes = [(6,30,30),(40,22,26),(66,22,22),(92,40,26),(140,22,30),(166,22,34),(192,46,30),(244,40,26)]
    bars = ''.join(f'<rect x="{x}" y="{y-3}" width="{w}" height="6" rx="3"/>' for x,w,y in notes)
    return ('<svg class="m-staff" viewBox="0 0 296 52" role="img" aria-label="Your alto line for bars 9 to 12">'
            f'<g class="m-staff-lines">{lines}<line x1="88" x2="88" y1="10" y2="42"/><line x1="188" x2="188" y1="10" y2="42"/></g>'
            f'<g data-part="alto" class="m-notes">{bars}</g><line class="m-playhead-ink" x1="40" x2="40" y1="4" y2="48"/></svg>')

def pitch_lane():
    grid = ''
    for y, n in ((70,'B3'),(140,'A3'),(210,'G3')):
        grid += f'<line class="m-grid" x1="34" x2="320" y1="{y}" y2="{y}"/><text class="m-axis" x="0" y="{y+4}">{n}</text>'
    d = "M34 196 C60 196 74 182 96 166 S130 133 152 139 S186 152 206 146 S246 142 266 147 S296 148 312 147"
    return ('<svg class="m-lane" viewBox="0 0 320 260" role="img" aria-label="Live pitch lane: your voice approaching the target A3">'
            f'{grid}<rect class="m-band" x="34" y="128" width="286" height="24"/>'
            '<line class="m-tline" x1="34" x2="320" y1="140" y2="140"/>'
            f'<path class="m-voice" data-live="path" d="{d}"/><circle class="m-voice-dot" data-live="dot" cx="312" cy="147" r="5"/></svg>')

def cents_meter():
    ticks = ''
    for i in range(11):
        x = 20 + i*28
        big = i in (0,5,10)
        ticks += f'<line class="m-tick{" m-tick--big" if big else ""}" x1="{x}" x2="{x}" y1="{8 if big else 12}" y2="24"/>'
    labels = '<text class="m-axis" x="20" y="40" text-anchor="middle">−50</text><text class="m-axis" x="160" y="40" text-anchor="middle">0</text><text class="m-axis" x="300" y="40" text-anchor="middle">+50</text>'
    return ('<svg class="m-cents-svg" viewBox="0 0 320 44" role="img" aria-label="Cents meter, 8 cents flat">'
            f'{ticks}{labels}<line class="m-needle" data-live="needle" x1="137.6" x2="137.6" y1="2" y2="28"/></svg>')

def result_trace():
    d = "M10 104 C22 104 26 66 36 60 S60 57 90 59 S150 61 180 58 S210 62 226 66 S258 80 280 84 S296 86 302 86"
    return ('<svg class="m-trace" viewBox="0 0 312 132" role="img" aria-label="Your take against the target: on pitch until 8 seconds, then drifting flat">'
            '<rect class="m-band-paper" x="10" y="48" width="292" height="24"/>'
            '<line class="m-target-ink" x1="10" x2="302" y1="60" y2="60"/>'
            f'<path class="m-voice-paper" d="{d}"/>'
            '<rect class="m-missbar" x="226" y="112" width="76" height="4" rx="1"/>'
            '<text class="m-axis" x="10" y="128">0 s</text><text class="m-axis" x="156" y="128" text-anchor="middle">6 s</text><text class="m-axis" x="302" y="128" text-anchor="end">12 s</text>'
            '<text class="m-axis m-axis-miss" x="264" y="106" text-anchor="middle">flat</text></svg>')

def lanes():
    parts = [('sop',34,[(0,40,0),(44,36,-1),(84,60,0),(150,40,1),(196,50,0),(252,68,-1)]),
             ('lead',70,[(0,60,0),(64,40,1),(110,50,0),(166,44,-1),(214,50,0),(270,50,1)]),
             ('alto',128,[(0,46,0),(50,36,-2),(90,30,-1),(124,58,1),(186,30,0),(220,44,-1),(268,52,0)]),
             ('ten',190,[(0,58,0),(62,46,1),(112,60,0),(176,40,-1),(220,100,0)]),
             ('bass',226,[(0,80,0),(84,70,1),(158,80,0),(242,78,-1)])]
    g = ''
    for p, y, notes in parts:
        mine = p == 'alto'
        h = 12 if mine else 5
        rects = ''.join(f'<rect x="{x}" y="{y + o*(7 if mine else 3) - h/2}" width="{w-4}" height="{h}" rx="{h/2}"/>' for x,w,o in notes)
        g += f'<g data-part="{p}" class="m-lane-notes{" is-mine" if mine else ""}">{rects}</g>'
        g += f'<text class="m-axis m-lane-label{" is-mine" if mine else ""}" x="320" y="{y-10 if mine else y-7}" text-anchor="end">{dict(sop="S",lead="L",alto="A · you",ten="T",bass="B")[p]}</text>'
    voice = "M0 129 C12 128 26 127 40 128 S52 116 60 115 S80 120 90 121 S110 122 122 134 S128 136 132 136"
    return ('<svg class="m-lanes" viewBox="0 0 320 244" role="img" aria-label="Five choir parts on a timeline. Your alto line is bold, the others faint, and your voice follows the alto notes up to the playhead.">'
            f'{g}<path class="m-voice" d="{voice}"/><line class="m-playhead" x1="132" x2="132" y1="14" y2="240"/></svg>')

def xray():
    parts = [('sop',30),('lead',50),('alto',70),('ten',90),('bass',110)]
    import random
    random.seed(7)
    g = ''
    for p, y in parts:
        x = 4; rects = ''
        while x < 300:
            w = random.choice([10,14,18,24,30])
            off = random.choice([-3,-1.5,0,1.5,3])
            if x + w > 306: w = 306 - x
            rects += f'<rect x="{x}" y="{y+off-2}" width="{max(w-2,3)}" height="4" rx="1"/>'
            x += w
        g += f'<g data-part="{p}">{rects}</g>'
    secs = ''.join(f'<line class="m-xsec" x1="{x}" x2="{x}" y1="10" y2="122"/><text class="m-xlabel" x="{x+5}" y="20">{l}</text>' for x,l in ((4,'A'),(80,'B'),(160,'C'),(232,'D')))
    marks = ''.join(f'<path class="m-xmiss" d="M{x-4} 124 L{x+4} 124 L{x} 117 Z"/>' for x in (118, 204, 268))
    return ('<svg class="m-xray-svg" viewBox="0 0 310 132" role="img" aria-label="Sonic X-Ray: five part lanes across sections A to D, with three difficult moments marked">'
            f'{secs}{g}{marks}<line class="m-xsel" x1="204" x2="204" y1="10" y2="124"/></svg>')

def range_chart():
    lows = [57,56,56,55,55,56,55,55,55,55,54,55]
    highs = [71,71,72,71,72,72,73,72,74,73,74,74]
    X = lambda i: 34 + i*24.5
    Y = lambda m: round(168 - (m-48)*5.6, 1)
    top = ' '.join(f'{X(i)},{Y(h)}' for i,h in enumerate(highs))
    bot = ' '.join(f'{X(i)},{Y(l)}' for i,l in reversed(list(enumerate(lows))))
    grid = ''.join(f'<line class="m-grid-paper" x1="34" x2="304" y1="{Y(m)}" y2="{Y(m)}"/><text class="m-axis" x="0" y="{Y(m)+4}">{n}</text>' for m,n in ((48,'C3'),(60,'C4'),(72,'C5')))
    days = ''.join(f'<text class="m-axis" x="{X(i)-4 if i==0 else X(i)}" y="186" text-anchor="{a}">{t}</text>' for i,t,a in ((0,'Day 1','start'),(5,'6','middle'),(11,'12','middle')))
    hi_line = ' '.join(f'{X(i)},{Y(h)}' for i,h in enumerate(highs))
    lo_line = ' '.join(f'{X(i)},{Y(l)}' for i,l in enumerate(lows))
    mx, my = X(8), Y(74)
    return ('<svg class="m-range" viewBox="0 0 312 192" role="img" aria-label="Range over 12 days: the top note rises from B4 to D5, the bottom stays near G3">'
            f'{grid}<polygon class="m-rangeband" points="{top} {bot}"/>'
            f'<polyline class="m-rangeedge" points="{hi_line}"/><polyline class="m-rangeedge" points="{lo_line}"/>'
            f'<circle class="m-milestone" cx="{mx}" cy="{my}" r="4.5"/><text class="m-axis m-axis-ink" x="{mx-8}" y="{my-10}" text-anchor="end">Day 9 · first clean D5</text>'
            f'{days}</svg>')

# ---------------------------------------------------------------- screens
HOME = f'''
<div class="m-screen">
  {brand_top()}
  <div class="m-greet">
    <p class="hl-label">Thursday · Day 12 of 21</p>
    <h3 class="hl-h1 m-h1">Good evening, Jordan</h3>
    <p class="hl-coach">Your alto held through bar 12 yesterday. Tonight, seven minutes on the entrance at bar 9.</p>
  </div>
  <section class="m-today hl-raised" aria-label="Tonight's session">
    <div class="hl-spread"><p class="hl-label">Tonight · 7 min</p><span class="hl-mark" aria-label="Section B">B</span></div>
    <h4 class="hl-h2 m-h2">Alto entrance, bar 9</h4>
    <p class="hl-meta">Demo Hymn · I Am the Alto · Ensemble level</p>
    {mini_staff()}
    <button class="hl-btn hl-btn--sing hl-btn--block" data-demo="down">{ic("play","hl-icon hl-icon--s")}Start rehearsal</button>
  </section>
  <section class="m-week" aria-label="This week">
    <p class="hl-label">This week</p>
    <div class="m-stats">
      <div class="hl-stat"><span class="hl-meta">Range</span><span class="hl-stat-value">G3–D5</span><span class="hl-stat-change hl-delta-up">+1 semitone</span></div>
      <div class="hl-stat"><span class="hl-meta">Pitch</span><span class="hl-stat-value">84</span><span class="hl-stat-change hl-delta-up">+6</span></div>
      <div class="hl-stat"><span class="hl-meta">Practised</span><span class="hl-stat-value">5/7</span><span class="hl-stat-change hl-meta">days</span></div>
    </div>
  </section>
  <ul class="hl-list m-continue" aria-label="Pick up where you left off">
    {row("steps","Interval Match","Intermediate · last score 78")}
    {row("world","Vocal World","Pitch Highway · level 4")}
  </ul>
</div>
{tabbar("home")}'''

COACH = f'''
<div class="m-screen">
  {brand_top()}
  <h3 class="hl-h1 m-h1 m-h1--tight">Coach</h3>
  <section class="m-today hl-raised m-today--s" aria-label="Today's focus">
    <p class="hl-label">Today's focus · 12 min</p>
    <h4 class="hl-h3">Intervals, then range</h4>
    <p class="hl-meta">Picked from your Skill Profile. Your weakest area gets the most time.</p>
    <button class="hl-btn hl-btn--sing hl-btn--block">{ic("play","hl-icon hl-icon--s")}Start today's set</button>
  </section>
  <p class="hl-label m-group">Pitch</p>
  <ul class="hl-list">
    {row("coach","Tuner","Find any note, live")}
    {row("steps","Daily Exercises","Pitch, Interval, Scale Run", '<span class="m-last">78</span>')}
    {row("keys","Key Trainer","Your key and transposition")}
  </ul>
  <p class="hl-label m-group">Range and register</p>
  <ul class="hl-list">
    {row("range","Range Finder","Saved range G3–D5")}
    {row("vibrato","Register Coach","Chest, mix and head voice")}
  </ul>
  <p class="m-alltools"><button class="hl-btn hl-btn--quiet">All 23 tools{ic("chev","hl-icon hl-icon--s")}</button></p>
</div>
{tabbar("coach")}'''

LIVE = f'''
<div class="m-screen m-live">
  {tool_top("Pitch Match · Intermediate")}
  <div class="m-target"><p class="hl-label">Sing</p><p class="hl-display hl-note m-targetnote">A3</p><p class="hl-meta hl-tabular">220.0 Hz</p></div>
  {pitch_lane()}
  <div class="m-cents">{cents_meter()}<p class="m-centsread"><span class="hl-metric hl-tabular" data-live="cents">−8</span><span class="hl-meta" data-live="word">cents · a little flat</span></p></div>
  <div class="m-livefoot"><span class="hl-meta hl-tabular">0:07 / 0:12</span><button class="hl-transport" aria-label="Stop">{ic("stop")}</button><span class="m-sp"></span></div>
</div>'''

RESULT = f'''
<div class="m-screen">
  {tool_top("Pitch Match · Take 3")}
  <div class="m-score"><span class="hl-metric-l">86</span><div><p class="hl-h3">Pitch accuracy</p><p class="hl-stat-change hl-delta-up">+4 on your last take</p></div></div>
  {result_trace()}
  <dl class="m-dims">
    <div><dt>Stability</dt><dd class="hl-tabular">74</dd></div>
    <div><dt>Time to the note</dt><dd class="hl-tabular">0.4 s</dd></div>
    <div><dt>Held within ±25 cents</dt><dd class="hl-tabular">8.6 of 12 s</dd></div>
  </dl>
  <section class="m-next" aria-label="What to work on next">
    <p class="hl-label">What to work on next</p>
    <p class="hl-coach">You find the note fast, then drift flat once your breath runs low. A 12-second hold builds the support.</p>
    <button class="hl-btn hl-btn--ink hl-btn--block">Next: breath hold, 12 s{ic("chev","hl-icon hl-icon--s")}</button>
    <button class="hl-btn hl-btn--quiet hl-btn--block">Sing it again</button>
  </section>
  <details class="hl-measure"><summary>{ic("info","hl-icon hl-icon--s")}How this is measured</summary><p>Accuracy is 100 minus 0.6 × your average distance from the target, in cents. Expression isn't scored: there's no reliable way to measure it.</p></details>
</div>'''

REHEARSAL = f'''
<div class="m-screen m-reh">
  {tool_top("Demo Hymn · Alto", right="headphones")}
  <div class="m-marks"><span class="hl-mark">A</span><span class="hl-mark" aria-current="true">B</span><span class="hl-mark">C</span><span class="m-sp"></span><span class="hl-meta hl-tabular">Bar 9 of 16</span></div>
  {lanes()}
  <div class="m-guide">
    <div class="hl-spread"><p class="hl-label">Guide</p><p class="hl-meta hl-tabular">50% · Ensemble</p></div>
    <input class="hl-fader" type="range" min="0" max="4" step="1" value="2" data-part="alto" style="--val:50%" aria-label="Rehearsal level: Ensemble, guide at 50%">
    <div class="m-detents" aria-hidden="true"><span>Learn</span><span>Guided</span><span>Ensemble</span><span>Indep.</span><span>Perform</span></div>
  </div>
  <div class="m-transportrow">
    <button class="hl-key" data-key="loop" aria-pressed="true">Loop B</button>
    <button class="hl-transport hl-transport--primary" aria-label="Pause" data-demo="up">{ic("pause")}</button>
    <button class="hl-key" data-key="acappella" aria-pressed="false">A cappella</button>
  </div>
  <button class="hl-btn hl-btn--quiet hl-btn--block m-trainers">6 trainers for this song{ic("chev","hl-icon hl-icon--s")}</button>
</div>'''

SONGLAB = f'''
<div class="m-screen">
  {tool_top("Choir World", left="chev", right="info")}
  <div class="m-subnav" role="tablist" aria-label="Choir World"><button role="tab">Rehearse</button><button role="tab" aria-selected="true">Song Lab</button><button role="tab">Trainers</button><button role="tab">Your Choir</button><button role="tab">Passport</button></div>
  <h3 class="hl-h1 m-h1 m-h1--tight">Autumn Requiem</h3>
  <p class="m-scorehead"><span>A minor</span><span>12 chords</span><span>Professional</span><span>Wide leaps</span></p>
  <p class="hl-label m-group">Song DNA</p>
  <dl class="m-dna">
    <div><dt>Pitch <span>range demand</span></dt><dd><i style="--val:78%"></i></dd></div>
    <div><dt>Agility <span>jump demand</span></dt><dd><i style="--val:86%"></i></dd></div>
    <div><dt>Breath <span>pace demand</span></dt><dd><i style="--val:52%"></i></dd></div>
    <div><dt>Register <span>passaggio crossing</span></dt><dd><i style="--val:64%"></i></dd></div>
  </dl>
  <div class="m-xray" data-house="down">
    <div class="hl-spread"><p class="hl-label">Sonic X-Ray</p><p class="hl-meta">▲ difficult moment</p></div>
    {xray()}
  </div>
  <div class="m-scope">
    <div class="hl-spread"><p class="hl-label">Music Microscope · bar 14</p><p class="hl-meta">A minor</p></div>
    <table class="m-scopetable">
      <thead><tr><th>Part</th><th>Note</th><th>vs Lead</th></tr></thead>
      <tbody>
        <tr data-part="sop"><td><span class="hl-part-dot"></span>Soprano</td><td class="hl-note">E5</td><td>5th above</td></tr>
        <tr data-part="lead"><td><span class="hl-part-dot"></span>Lead</td><td class="hl-note">A4</td><td>—</td></tr>
        <tr data-part="alto"><td><span class="hl-part-dot"></span>Alto</td><td class="hl-note">C5</td><td>minor 3rd above</td></tr>
        <tr data-part="ten"><td><span class="hl-part-dot"></span>Tenor</td><td class="hl-note">E4</td><td>4th below</td></tr>
      </tbody>
    </table>
  </div>
</div>'''

PERFORM = f'''
<div class="m-screen m-perf">
  <div class="hl-spread"><p class="hl-label">Studio · Take 3</p><span class="m-tally"><i></i>REC</span></div>
  <div class="m-perfcenter">
    <p class="hl-display hl-tabular m-timecode">01:24.6</p>
    <p class="hl-meta">Autumn Requiem · Alto</p>
  </div>
  <div class="m-perfmeter"><p class="hl-label">Input</p><div class="hl-meter" style="--val:62%"><i></i></div></div>
  <div class="m-perffoot"><button class="hl-transport hl-transport--rec" aria-label="Stop recording">{ic("stop")}</button><p class="hl-meta">No scores while you sing. The report opens when you stop.</p></div>
</div>'''

PROGRESS = f'''
<div class="m-screen">
  {brand_top()}
  <p class="hl-label">Your voice · Day 12 of 21</p>
  <h3 class="hl-h1 m-h1">Your range is opening up</h3>
  <p class="hl-coach">Your top note rose from B4 to D5 since Day 1. The low end held at G3.</p>
  {range_chart()}
  <dl class="m-strengths">
    <div><dt>Pitch accuracy</dt><dd class="hl-tabular">84</dd><dd class="hl-delta-up hl-tabular">+6</dd></div>
    <div><dt>Stability</dt><dd class="hl-tabular">71</dd><dd class="hl-delta-up hl-tabular">+3</dd></div>
    <div><dt>Agility</dt><dd class="hl-tabular">58</dd><dd class="hl-delta-up hl-tabular">+9</dd></div>
    <div><dt>Breath hold</dt><dd class="hl-tabular">14.2 s</dd><dd class="hl-delta-up hl-tabular">+2.1 s</dd></div>
  </dl>
  <div class="m-compare"><button class="hl-btn">{ic("play","hl-icon hl-icon--s")}Day 1</button><button class="hl-btn">{ic("play","hl-icon hl-icon--s")}Today</button></div>
</div>
{tabbar("you")}'''

SCREENS = [
  ('home','up',HOME,'Home','House up · calm','Tonight\'s one session and its start button.','This week\'s three numbers, then what you were working on.','Everything else lives in the tabs.'),
  ('coach','up',COACH,'Coach','House up · ordered','Today\'s focus, picked by the existing Skill Profile.','The tools, grouped, each with your last result.','All 23 tools stay one tap away.'),
  ('live','down',LIVE,'Coach, while singing','House down · nothing extra','The target note and your voice line approaching it.','How far off you are, in cents.','Scores, history and explanations wait until you stop.'),
  ('result','up',RESULT,'Coach, after singing','House up · full feedback','The one number that matters, then what happened in the take.','What to work on next, with a button that goes there.',"How it's measured, folded away."),
  ('rehearsal','down',REHEARSAL,'Choir World rehearsal','House down · immersive','Your part, bold, with your voice on it.','The other four parts and where you are in the song.','The six trainers sit behind one button.'),
  ('songlab','up',SONGLAB,'Song Lab','House up, with an X-ray lightbox','The song\'s score header and its Song DNA.','The Sonic X-Ray, where the hard moments are.','The Microscope opens on whatever you tap.'),
  ('perform','down',PERFORM,'Performance','House down · cinematic','The take timecode and the red tally.','Your input level.','No scores at all until the take ends.'),
  ('progress','up',PROGRESS,'Progress','House up · reflective','Your range widening day by day.','The four skills that moved.','Day 1 against today, to hear it.'),
]

def phone(key, house, body, extra=''):
    return f'<div class="ds-phone" data-house="{house}" data-screen="{key}"{extra}>{body}</div>'

gallery = ''
for key, house, body, name, light, first, second, third in SCREENS:
    gallery += (f'<figure class="ds-shot">{phone(key, house, body)}'
                f'<figcaption><span class="ds-shot-name">{name}</span><span class="ds-shot-light">{light}</span>'
                f'<ol class="ds-order"><li>{first}</li><li>{second}</li><li>{third}</li></ol></figcaption></figure>')

demo = ('<div class="ds-phone ds-demo" aria-live="polite">'
        f'<div class="ds-layer" data-house="up" data-layer="up">{HOME}</div>'
        f'<div class="ds-layer" data-house="down" data-layer="down" hidden>{REHEARSAL}</div>'
        '<div class="ds-dim" aria-hidden="true"></div></div>')

page = open(os.path.join(HERE, 'page.html')).read()
page = page.replace('<!--ICONS-->', ICONS).replace('<!--DEMO-->', demo).replace('<!--GALLERY-->', gallery)

# icon specimen grid
import re
names = re.findall(r'<symbol id="hl-([a-z]+)"', ICONS)
grid = ''.join(f'<li><svg class="hl-icon hl-icon--l" aria-hidden="true"><use href="#hl-{n}"/></svg><span>{n}</span></li>' for n in names if n != 'mark')
page = page.replace('<!--ICONGRID-->', grid)
open(os.path.join(HERE, 'house-lights.html'), 'w').write(page)
print('built', len(page)//1024, 'KB,', len(names), 'icons')
