# Phase 6 copy: old → new

Every translation key phase 6 added or changed (the six Songs-tab solo tools and the Songs tab), in en, fr, es and tr,
from master (`6266166`) to `redesign/phase6`. "—" is a new key. Keys no longer shown keep their old value (hooks.js: no key removed).

## `aiduet_after_tpl` (new)
- **en**: — → You sang {part} with the choir.
- **fr**: — → Vous avez chanté {part} avec le chœur.
- **es**: — → Cantaste {part} con el coro.
- **tr**: — → Koroyla {part} partisini söylediniz.

## `aiduet_rehearse_link` (new)
- **en**: — → Rehearse {part} in {cw}
- **fr**: — → Répéter {part} dans {cw}
- **es**: — → Ensayar {part} en {cw}
- **tr**: — → {part} partisini {cw} içinde çalışın

## `aiduet_start_btn` (new)
- **en**: — → Sing with the choir
- **fr**: — → Chanter avec le chœur
- **es**: — → Cantar con el coro
- **tr**: — → Koroyla söyle

## `emotion_measure` (new)
- **en**: — → An estimate. Dynamic contrast is how much your loudness varies while you sing: the spread of your level readings above the silence threshold, relative to their average, × 250, at most 100. It's saved as your expression score. Loudness also changes with your distance from the mic and the room, so treat it as a guide. Pitch: for each note of the Lead line, 100 minus 0.6 × your average distance from it in cents, natural vibrato taken out.
- **fr**: — → Une estimation. Le contraste dynamique mesure combien votre volume varie pendant que vous chantez : l'écart de vos niveaux au-dessus du seuil de silence, rapporté à leur moyenne, × 250, 100 au plus. Il est enregistré comme score d'expression. Le volume change aussi avec la distance au micro et la pièce : prenez-le comme un repère. Justesse : pour chaque note de la ligne principale, 100 moins 0,6 × votre écart moyen en cents, vibrato naturel retiré.
- **es**: — → Una estimación. El contraste dinámico es cuánto varía tu volumen mientras cantas: la dispersión de tus niveles por encima del umbral de silencio, relativa a su media, × 250, como máximo 100. Se guarda como tu puntuación de expresión. El volumen también cambia con la distancia al micrófono y la sala, así que tómalo como una guía. Afinación: para cada nota de la línea principal, 100 menos 0,6 × tu distancia media en cents, sin el vibrato natural.
- **tr**: — → Bir tahmin. Dinamik kontrast, söylerken ses düzeyinizin ne kadar değiştiğidir: sessizlik eşiğinin üzerindeki seviye okumalarınızın ortalamalarına göre yayılımı, × 250, en fazla 100. İfade puanınız olarak kaydedilir. Ses düzeyi mikrofona uzaklığınızla ve odayla da değişir, bu yüzden onu bir rehber olarak görün. Perde: Lead hattının her notası için 100 eksi 0,6 × sent cinsinden ortalama uzaklığınız, doğal vibrato çıkarılır.

## `emotion_result_label` (new)
- **en**: — → Dynamic contrast
- **fr**: — → Contraste dynamique
- **es**: — → Contraste dinámico
- **tr**: — → Dinamik kontrast

## `hub_songs_solo_label` (new)
- **en**: — → On your own
- **fr**: — → En solo
- **es**: — → Por tu cuenta
- **tr**: — → Tek başınıza

## `karaoke_measure` (new)
- **en**: — → Each chord is one note of the Lead line. A note's pitch: 100 minus 0.6 × your average distance from it in cents (natural vibrato taken out); a note with no voice is Not heard. Pitch is the average over the notes you sang, saved as your pitch score. Timing: 100 if your voice came in during a note's first 40 %, 50 if later, 0 if not heard, averaged over every note. Your song best is the average of Pitch and Timing.
- **fr**: — → Chaque accord est une note de la ligne principale. Justesse d'une note : 100 moins 0,6 × votre écart moyen en cents (vibrato naturel retiré) ; une note sans voix est « Pas entendue ». La justesse est la moyenne des notes chantées, enregistrée comme score de justesse. Timing : 100 si votre voix arrive dans les premiers 40 % de la note, 50 si plus tard, 0 si pas entendue, en moyenne sur toutes les notes. Votre meilleur score du morceau est la moyenne de la justesse et du timing.
- **es**: — → Cada acorde es una nota de la línea principal. Afinación de una nota: 100 menos 0,6 × tu distancia media en cents (sin el vibrato natural); una nota sin voz es «No se oyó». La afinación es la media de las notas que cantaste y se guarda como tu puntuación de afinación. Ritmo: 100 si tu voz entra en el primer 40 % de la nota, 50 si entra después, 0 si no se oyó, en promedio sobre todas las notas. Tu mejor marca de la canción es la media de la afinación y el ritmo.
- **tr**: — → Her akor Lead hattının bir notasıdır. Bir notanın perdesi: 100 eksi 0,6 × sent cinsinden ortalama uzaklığınız (doğal vibrato çıkarılır); sesinizin olmadığı nota Duyulmadı olur. Perde, söylediğiniz notaların ortalamasıdır ve perde puanınız olarak kaydedilir. Zamanlama: sesiniz notanın ilk %40'ında girerse 100, daha geç girerse 50, duyulmazsa 0, tüm notaların ortalaması. Şarkıdaki en iyi puanınız Perde ve Zamanlama'nın ortalamasıdır.

## `karaoke_not_heard` (new)
- **en**: — → Not heard
- **fr**: — → Pas entendue
- **es**: — → No se oyó
- **tr**: — → Duyulmadı

## `karaoke_note_tpl` (new)
- **en**: — → Note {n}
- **fr**: — → Note {n}
- **es**: — → Nota {n}
- **tr**: — → Nota {n}

## `karaoke_obj_done` (new)
- **en**: — → done
- **fr**: — → réussi
- **es**: — → logrado
- **tr**: — → tamamlandı

## `karaoke_obj_open` (new)
- **en**: — → not yet
- **fr**: — → pas encore
- **es**: — → todavía no
- **tr**: — → henüz değil

## `pd_dim_combined` (new)
- **en**: — → Pitch and timing together
- **fr**: — → Justesse et timing ensemble
- **es**: — → Afinación y ritmo juntos
- **tr**: — → Perde ve zamanlama birlikte

## `pd_insight_tpl` (new)
- **en**: — → Work on {dim} next: it was your lowest today ({n}).
- **fr**: — → À travailler ensuite : {dim}, votre point le plus bas aujourd'hui ({n}).
- **es**: — → Lo siguiente a trabajar: {dim}, tu punto más bajo hoy ({n}).
- **tr**: — → Sırada {dim} var: bugünkü en düşük puanınız ({n}).

## `pd_measure` (new)
- **en**: — → Each chord of the song is one note of the Lead line. Pitch: for each note you sang, 100 minus 0.6 × your average distance from it in cents (natural vibrato taken out), averaged over the notes you sang; it's saved as your pitch score. Timing: a note scores 100 if your voice came in during its first 40 %, 50 if later, averaged over the notes you sang. Dynamics: the gap between your loudest and quietest moments as a share of the loudest, × 1.5, at most 100. Pitch and timing together: the average of the two.
- **fr**: — → Chaque accord du morceau est une note de la ligne principale. Justesse : pour chaque note chantée, 100 moins 0,6 × votre écart moyen en cents (vibrato naturel retiré), en moyenne sur les notes chantées ; elle est enregistrée comme votre score de justesse. Timing : une note vaut 100 si votre voix arrive dans ses premiers 40 %, 50 si plus tard, en moyenne sur les notes chantées. Dynamique : l'écart entre vos moments les plus forts et les plus doux, en part du plus fort, × 1,5, 100 au plus. Justesse et timing ensemble : la moyenne des deux.
- **es**: — → Cada acorde de la canción es una nota de la línea principal. Afinación: para cada nota que cantaste, 100 menos 0,6 × tu distancia media en cents (sin el vibrato natural), en promedio sobre las notas cantadas; se guarda como tu puntuación de afinación. Ritmo: una nota vale 100 si tu voz entra en su primer 40 %, 50 si entra después, en promedio sobre las notas cantadas. Dinámica: la diferencia entre tus momentos más fuertes y más suaves como parte del más fuerte, × 1,5, como máximo 100. Afinación y ritmo juntos: la media de los dos.
- **tr**: — → Şarkının her akoru Lead hattının bir notasıdır. Perde: söylediğiniz her nota için 100 eksi 0,6 × sent cinsinden ortalama uzaklığınız (doğal vibrato çıkarılır), söylenen notaların ortalaması; perde puanınız olarak kaydedilir. Zamanlama: sesiniz notanın ilk %40'ında girerse 100, daha geç girerse 50, söylenen notaların ortalaması. Dinamikler: en yüksek ve en alçak anlarınız arasındaki fark, en yüksek olanın payı olarak, × 1,5, en fazla 100. Perde ve zamanlama birlikte: ikisinin ortalaması.

## `pd_start_btn` (new)
- **en**: — → Begin the performance
- **fr**: — → Commencer la performance
- **es**: — → Empezar la actuación
- **tr**: — → Performansa başla

## `staykey_coach_high` (new)
- **en**: — → You stayed on the chords almost all the way through.
- **fr**: — → Vous êtes resté sur les accords presque tout du long.
- **es**: — → Te mantuviste en los acordes casi todo el tiempo.
- **tr**: — → Neredeyse baştan sona akorların üzerinde kaldınız.

## `staykey_coach_low` (new)
- **en**: — → You drifted off the chords often. Hum along with the backing first, then sing on one of its notes.
- **fr**: — → Vous vous êtes souvent écarté des accords. Fredonnez d'abord avec l'accompagnement, puis chantez sur une de ses notes.
- **es**: — → Te saliste de los acordes a menudo. Tararea primero con el acompañamiento y luego canta en una de sus notas.
- **tr**: — → Sık sık akorların dışına çıktınız. Önce eşlikle birlikte mırıldanın, sonra notalarından birinde söyleyin.

## `staykey_coach_mid` (new)
- **en**: — → Most of it was in key. Listen for each chord change and move with it.
- **fr**: — → La plupart était dans la tonalité. Écoutez chaque changement d'accord et suivez-le.
- **es**: — → Casi todo estuvo en el tono. Escucha cada cambio de acorde y muévete con él.
- **tr**: — → Çoğu tondaydı. Her akor değişimini dinleyin ve onunla birlikte geçin.

## `staykey_coach_none` (new)
- **en**: — → Not enough of your voice was heard to score this. Sing a little louder or closer to the mic.
- **fr**: — → Votre voix n'a pas été assez entendue pour noter ceci. Chantez un peu plus fort ou plus près du micro.
- **es**: — → No se oyó tu voz lo suficiente para puntuar esto. Canta un poco más fuerte o más cerca del micrófono.
- **tr**: — → Bunu puanlamak için sesiniz yeterince duyulmadı. Biraz daha yüksek sesle ya da mikrofona daha yakın söyleyin.

## `staykey_drift_tpl` (new)
- **en**: — → Drifted: nearest {note}, {cents} ct
- **fr**: — → Écart : note la plus proche {note}, {cents} ct
- **es**: — → Desviado: nota más cercana {note}, {cents} ct
- **tr**: — → Kaydı: en yakın nota {note}, {cents} ct

## `staykey_measure` (new)
- **en**: — → Every frame your pitch is compared with the notes of the chord playing, in any octave, with natural vibrato taken out. Within 35 cents of a chord note counts as in key. The score is the share of the frames with your voice that were in key; it's saved as your pitch score when more than 10 frames had your voice.
- **fr**: — → À chaque image, votre hauteur est comparée aux notes de l'accord joué, à n'importe quelle octave, vibrato naturel retiré. À moins de 35 cents d'une note de l'accord, c'est dans la tonalité. Le score est la part des images avec votre voix qui étaient dans la tonalité ; il est enregistré comme score de justesse quand plus de 10 images avaient votre voix.
- **es**: — → En cada fotograma tu tono se compara con las notas del acorde que suena, en cualquier octava, sin el vibrato natural. A menos de 35 cents de una nota del acorde cuenta como en el tono. La puntuación es la parte de los fotogramas con tu voz que estuvieron en el tono; se guarda como tu puntuación de afinación cuando más de 10 fotogramas tenían tu voz.
- **tr**: — → Her karede sesiniz, çalan akorun notalarıyla herhangi bir oktavda, doğal vibrato çıkarılarak karşılaştırılır. Bir akor notasına 35 sent içinde olmak tonda sayılır. Puan, sesinizin olduğu karelerin tonda olan payıdır; sesinizin olduğu kare sayısı 10'u aşınca perde puanınız olarak kaydedilir.

## `studio_bpm_tpl` (new)
- **en**: — → {n} BPM
- **fr**: — → {n} BPM
- **es**: — → {n} ppm
- **tr**: — → {n} BPM

## `studio_delete_btn` (new)
- **en**: — → Delete
- **fr**: — → Supprimer
- **es**: — → Borrar
- **tr**: — → Sil

## `studio_delete_confirm` (new)
- **en**: — → Delete take {n}? This can't be undone.
- **fr**: — → Supprimer la prise {n} ? Cette action est définitive.
- **es**: — → ¿Borrar la toma {n}? No se puede deshacer.
- **tr**: — → Kayıt {n} silinsin mi? Bu işlem geri alınamaz.

## `studio_device_note` (new)
- **en**: — → Takes are kept on this device only, not in your account.
- **fr**: — → Les prises restent sur cet appareil, pas dans votre compte.
- **es**: — → Las tomas se guardan solo en este dispositivo, no en tu cuenta.
- **tr**: — → Kayıtlar yalnızca bu cihazda tutulur, hesabınızda değil.

## `studio_sub` (new)
- **en**: — → Record up to three takes of the song and listen back. No score, no XP.
- **fr**: — → Enregistrez jusqu'à trois prises du morceau et réécoutez-les. Sans score ni XP.
- **es**: — → Graba hasta tres tomas de la canción y escúchalas. Sin puntuación ni XP.
- **tr**: — → Şarkıdan en fazla üç kayıt alın ve dinleyin. Puan ya da XP yok.

## `aiduet_note_tpl`
- **en**: The AI will sing {others} — you sing {part}. → The choir sings {others}; you sing {part}.
- **fr**: L'IA chante : {others} — votre voix : {part}. → Le chœur chante {others} ; vous chantez {part}.
- **es**: La IA canta: {others} — tu voz: {part}. → El coro canta {others}; tú cantas {part}.
- **tr**: Yapay zeka şunları söyler: {others} — sizin partiniz: {part}. → Koro {others} partilerini söyler; siz {part} söylersiniz.

## `aiduet_sub`
- **en**: Pick your part. The AI genuinely sings the other four, live and in real time — the exact same synthesized progression Choir Workspace already uses, just framed simply: you're never singing alone. → Pick your part. The app's choir sings the other four with you: the same synthesised voices as in Choir World, once through the song.
- **fr**: Choisissez votre voix. L'IA chante vraiment les quatre autres, en direct et en temps réel — exactement la même progression synthétisée que l'Espace Chorale utilise déjà, juste présentée simplement : vous ne chantez jamais seul. → Choisissez votre voix. Le chœur de l'app chante les quatre autres avec vous : les mêmes voix de synthèse que dans Monde Chorale, une fois tout le morceau.
- **es**: Elige tu voz. La IA realmente canta las otras cuatro, en vivo y en tiempo real — exactamente la misma progresión sintetizada que el Espacio de Coro ya usa, solo presentada de forma simple: nunca cantas solo. → Elige tu voz. El coro de la app canta las otras cuatro contigo: las mismas voces sintetizadas que en Mundo Coral, una vez toda la canción.
- **tr**: Sesinizi seçin. Yapay zeka diğer dördünü gerçekten canlı ve gerçek zamanlı olarak söyler — Koro Çalışma Alanı'nın zaten kullandığı tamamen aynı sentezlenmiş dizi, sadece basitçe çerçevelenmiş: asla yalnız söylemezsiniz. → Partinizi seçin. Uygulamanın korosu diğer dördünü sizinle söyler: Koro Dünyası'ndaki sentez seslerin aynısı, şarkı boyunca bir kez.

## `aiduet_title`
- **en**: 🤝 AI Duet Partner → Sing With the Choir
- **fr**: 🤝 Partenaire de Duo IA → Chanter avec le chœur
- **es**: 🤝 Compañero de Dúo IA → Canta con el coro
- **tr**: 🤝 Yapay Zeka Düet Partneri → Koroyla söyle

## `emotion_sub`
- **en**: Sing the Lead line and get Pitch and dynamic contrast scored separately — "technically perfect, needs more emotion," made real, not just phrasing/breath analysis a mic can't actually do. → Sing the Lead line and see Pitch and dynamic contrast scored separately: a note can be right and still sound flat.
- **fr**: Chantez la ligne principale et obtenez la justesse et le contraste dynamique notés séparément — "techniquement parfait, a besoin de plus d'émotion," rendu réel, pas juste une analyse de phrasé/souffle qu'un micro ne peut pas vraiment faire. → Chantez la ligne principale et voyez la justesse et le contraste dynamique notés séparément : une note peut être juste et sonner plate.
- **es**: Canta la línea principal y obtén la afinación y el contraste dinámico puntuados por separado — "técnicamente perfecto, necesita más emoción," hecho real, no solo un análisis de fraseo/respiración que un micrófono no puede realmente hacer. → Canta la línea principal y mira la afinación y el contraste dinámico puntuados por separado: una nota puede estar afinada y sonar plana.
- **tr**: Lead hattını söyleyin ve Perde ile dinamik kontrastın ayrı ayrı puanlanmasını sağlayın — "teknik olarak mükemmel, daha fazla duyguya ihtiyacı var" gerçek hale getirildi, bir mikrofonun gerçekten yapamayacağı ifade/nefes analizi değil. → Lead hattını söyleyin ve Perde ile dinamik kontrastı ayrı ayrı puanlanmış görün: bir nota doğru olup yine de düz duyulabilir.

## `emotion_title`
- **en**: 🎭 Emotional Singing → Emotional Singing
- **fr**: 🎭 Chant Émotionnel → Chant Émotionnel
- **es**: 🎭 Canto Emocional → Canto Emocional
- **tr**: 🎭 Duygusal Söyleyiş → Duygusal Söyleyiş

## `hub_songs_aiduet_desc`
- **en**: Pick your part — the AI genuinely sings the other four, live, so you're never singing alone. → Pick your part; the app's choir sings the other four.
- **fr**: Choisissez votre voix — l'IA chante vraiment les quatre autres, en direct, pour que vous ne chantiez jamais seul. → Choisissez votre voix ; le chœur de l'app chante les quatre autres.
- **es**: Elige tu voz — la IA realmente canta las otras cuatro, en vivo, para que nunca cantes solo. → Elige tu voz; el coro de la app canta las otras cuatro.
- **tr**: Sesinizi seçin — yapay zeka diğer dördünü gerçekten canlı söyler, böylece asla yalnız söylemezsiniz. → Partinizi seçin; uygulamanın korosu diğer dördünü söyler.

## `hub_songs_aiduet_title`
- **en**: 🤝 AI Duet Partner → Sing With the Choir
- **fr**: 🤝 Partenaire duo IA → Chanter avec le chœur
- **es**: 🤝 Compañero de dúo IA → Canta con el coro
- **tr**: 🤝 Yapay Zeka Düet Partneri → Koroyla söyle

## `hub_songs_pd_desc`
- **en**: Real section-by-section coaching cues, live, then a real multi-dimension report. → A cue for each section as you sing, then your Pitch, Timing and Dynamics.
- **fr**: De vraies indications de coaching section par section, en direct, puis un vrai rapport multi-dimensionnel. → Une indication par section pendant que vous chantez, puis votre justesse, votre timing et votre dynamique.
- **es**: Indicaciones de coaching reales sección por sección, en vivo, y luego un informe real multidimensional. → Una indicación por sección mientras cantas y luego tu afinación, tu ritmo y tu dinámica.
- **tr**: Canlı, bölüm bölüm gerçek koçluk ipuçları, ardından gerçek çok boyutlu bir rapor. → Söylerken her bölüm için bir ipucu, ardından Perde, Zamanlama ve Dinamikleriniz.

## `hub_songs_pd_title`
- **en**: 🎤 Performance Director → Performance Director
- **fr**: 🎤 Directeur de performance → Directeur de performance
- **es**: 🎤 Director de actuación → Director de actuación
- **tr**: 🎤 Performans Yönetmeni → Performans Yönetmeni

## `hub_songs_studio_desc`
- **en**: No XP, no streak, no gamification — just record real takes and listen back. → Record takes of the song and listen back. No score.
- **fr**: Pas d'XP, pas de série, pas de ludification — juste enregistrer de vraies prises et les réécouter. → Enregistrez des prises du morceau et réécoutez-les. Sans score.
- **es**: Sin XP, sin racha, sin gamificación — solo grabar tomas reales y escucharlas. → Graba tomas de la canción y escúchalas. Sin puntuación.
- **tr**: XP yok, seri yok, oyunlaştırma yok — sadece gerçek performanslar kaydedip geri dinleyin. → Şarkının kayıtlarını alın ve dinleyin. Puan yok.

## `hub_songs_studio_title`
- **en**: 🎙️ Studio Mode → Studio Mode
- **fr**: 🎙️ Mode Studio → Mode Studio
- **es**: 🎙️ Modo Estudio → Modo Estudio
- **tr**: 🎙️ Stüdyo Modu → Stüdyo Modu

## `karaoke_mission_label`
- **en**: 🎵 Song Mission → Song Mission
- **fr**: 🎵 Mission Chanson → Mission Chanson
- **es**: 🎵 Misión de Canción → Misión de Canción
- **tr**: 🎵 Şarkı Görevi → Şarkı Görevi

## `karaoke_sub`
- **en**: Notes scroll toward you before you need to hit them — real Pitch and Timing scoring from your mic. Expression and pronunciation stay honestly unscored; no reliable signal exists for either. → The Lead line scrolls toward the NOW line before you sing it. Pitch and Timing are scored from your mic; expression and pronunciation aren't, as there's no reliable way to measure them.
- **fr**: Les notes défilent vers vous avant que vous ayez besoin de les atteindre — vraie notation de justesse et de rythme depuis votre micro. L'expression et la prononciation restent honnêtement non notées ; aucun signal fiable n'existe pour l'une ou l'autre. → La ligne principale défile vers la ligne MAINTENANT avant que vous la chantiez. La justesse et le timing sont notés depuis votre micro ; l'expression et la prononciation ne le sont pas, faute de moyen fiable de les mesurer.
- **es**: Las notas se desplazan hacia ti antes de que necesites alcanzarlas — puntuación real de afinación y ritmo desde tu micrófono. La expresión y la pronunciación permanecen honestamente sin puntuar; no existe una señal confiable para ninguna de las dos. → La línea principal avanza hacia la línea AHORA antes de que la cantes. La afinación y el ritmo se puntúan desde tu micrófono; la expresión y la pronunciación no, porque no hay una forma fiable de medirlas.
- **tr**: Notalar, onlara ulaşmanız gerekmeden önce size doğru kayar — mikrofonunuzdan gerçek Perde ve Zamanlama puanlaması. İfade ve telaffuz dürüstçe puanlanmadan kalır; ikisi için de güvenilir bir sinyal yoktur. → Lead hattı siz söylemeden önce ŞİMDİ çizgisine doğru kayar. Perde ve Zamanlama mikrofonunuzdan puanlanır; ifade ve telaffuz puanlanmaz, çünkü onları ölçmenin güvenilir bir yolu yok.

## `karaoke_title`
- **en**: 🎤 Karaoke Coach → Karaoke Coach
- **fr**: 🎤 Coach Karaoké → Coach Karaoké
- **es**: 🎤 Coach de Karaoke → Coach de Karaoke
- **tr**: 🎤 Karaoke Koçu → Karaoke Koçu

## `pd_cue_chorus`
- **en**: Don't push the high notes — trust your real technique, not extra force. → Don't push the high notes: trust your technique, not extra force.
- **fr**: Ne poussez pas les notes aiguës — faites confiance à votre vraie technique, pas à plus de force. → Ne poussez pas les notes aiguës : faites confiance à votre technique, pas à la force.
- **es**: No fuerces las notas agudas — confía en tu verdadera técnica, no en más fuerza. → No fuerces las notas agudas: confía en tu técnica, no en la fuerza.
- **tr**: Tiz notaları zorlamayın — ekstra güce değil, gerçek tekniğinize güvenin. → Tiz notaları zorlamayın: ekstra güce değil, tekniğinize güvenin.

## `pd_direction_label`
- **en**: Today's real direction → Today's direction
- **fr**: La vraie direction du jour → La direction du jour
- **es**: La dirección real de hoy → La dirección de hoy
- **tr**: Bugünün gerçek yönergesi → Bugünün yönlendirmesi

## `pd_expression_note`
- **en**: Expression isn't scored here — no reliable real detector exists for it anywhere in this app, same honest limit as everywhere else. → Expression isn't scored: there's no reliable way to measure it.
- **fr**: L'expression n'est pas notée ici — aucun vrai détecteur fiable n'existe pour elle nulle part dans cette application, même limite honnête que partout ailleurs. → L'expression n'est pas notée : il n'existe pas de moyen fiable de la mesurer.
- **es**: La expresión no se puntúa aquí — no existe un detector real confiable para ella en ninguna parte de esta app, el mismo límite honesto que en todas partes. → La expresión no se puntúa: no hay una forma fiable de medirla.
- **tr**: İfade burada puanlanmaz — bu uygulamada onun için hiçbir yerde güvenilir gerçek bir dedektör yoktur, her yerdeki aynı dürüst sınır. → İfade puanlanmaz: onu ölçmenin güvenilir bir yolu yok.

## `pd_insight_notenough`
- **en**: Not enough signal was captured to identify a real next step this time. → Not enough of your voice was heard to score this. Sing a little louder or closer to the mic.
- **fr**: Pas assez de signal capté pour identifier une vraie prochaine étape cette fois. → Votre voix n'a pas été assez entendue pour noter cette performance. Chantez un peu plus fort ou plus près du micro.
- **es**: No se captó suficiente señal para identificar un verdadero próximo paso esta vez. → No se oyó tu voz lo suficiente para puntuar esto. Canta un poco más fuerte o más cerca del micrófono.
- **tr**: Bu sefer gerçek bir sonraki adımı belirlemek için yeterli sinyal alınamadı. → Bunu puanlamak için sesiniz yeterince duyulmadı. Biraz daha yüksek sesle ya da mikrofona daha yakın söyleyin.

## `pd_insight_prefix`
- **en**: Your next real improvement isn't your top number — it's → Work on next:
- **fr**: Votre prochaine vraie amélioration n'est pas votre meilleur chiffre — c'est → À travailler ensuite :
- **es**: Tu próxima mejora real no es tu número más alto — es → Lo siguiente a trabajar:
- **tr**: Bir sonraki gerçek gelişiminiz en yüksek sayınız değil — bu: → Sıradaki çalışma:

## `pd_report_label`
- **en**: Performance Report → Your performance
- **fr**: Rapport de Performance → Votre performance
- **es**: Informe de Actuación → Tu actuación
- **tr**: Performans Raporu → Performansınız

## `pd_sub`
- **en**: Your technique is ready. Now let's perform — real section-by-section coaching cues, live, reusing the exact same pitch and timing capture as Karaoke Coach throughout. → Sing the Lead line through the song with a cue for each section, then see your Pitch, Timing and Dynamics.
- **fr**: Votre technique est prête. Maintenant, performons — de vraies indications de coaching section par section, en direct, réutilisant exactement la même capture de justesse et de rythme que le Coach Karaoké tout du long. → Chantez la ligne principale du début à la fin avec une indication pour chaque section, puis voyez votre justesse, votre timing et votre dynamique.
- **es**: Tu técnica está lista. Ahora actuemos — indicaciones de coaching reales sección por sección, en vivo, reutilizando exactamente la misma captura de afinación y ritmo que el Coach de Karaoke en todo momento. → Canta la línea principal de principio a fin con una indicación para cada sección y luego mira tu afinación, tu ritmo y tu dinámica.
- **tr**: Tekniğiniz hazır. Şimdi performans gösterelim — canlı, gerçek bölüm bölüm koçluk ipuçları, boyunca Karaoke Koçu ile tamamen aynı perde ve zamanlama yakalamayı yeniden kullanarak. → Lead hattını şarkı boyunca her bölüm için bir ipucuyla söyleyin, ardından Perde, Zamanlama ve Dinamiklerinizi görün.

## `pd_title`
- **en**: 🎤 Performance Director → Performance Director
- **fr**: 🎤 Directeur de Performance → Directeur de Performance
- **es**: 🎤 Director de Actuación → Director de Actuación
- **tr**: 🎤 Performans Yönetmeni → Performans Yönetmeni

## `staykey_feedback_text`
- **en**: of the progression spent in key → Time in key
- **fr**: de la progression passée dans la tonalité → Temps dans la tonalité
- **es**: de la progresión pasada en tono → Tiempo en el tono
- **tr**: dizinin tonda geçen kısmı → Tonda kalınan süre

## `staykey_sub`
- **en**: Sing over the backing progression and stay in the chord — checks your live pitch against the actual chord tones at each moment, not general-purpose chord recognition. → Sing over the backing chords and stay on a note of each chord. Your pitch is checked against the chord's notes as you sing.
- **fr**: Chantez sur la progression d'accompagnement et restez dans l'accord — vérifie votre justesse en direct par rapport aux vraies notes de l'accord à chaque instant, pas une reconnaissance d'accords générique. → Chantez sur les accords d'accompagnement en restant sur une note de chaque accord. Votre hauteur est comparée aux notes de l'accord pendant que vous chantez.
- **es**: Canta sobre la progresión de acompañamiento y mantente en el acorde — verifica tu afinación en vivo contra las notas reales del acorde en cada momento, no un reconocimiento de acordes genérico. → Canta sobre los acordes de acompañamiento y quédate en una nota de cada acorde. Tu tono se compara con las notas del acorde mientras cantas.
- **tr**: Eşlik akor dizisi üzerinde söyleyin ve akorda kalın — canlı perdenizi her anda gerçek akor notalarına göre kontrol eder, genel amaçlı akor tanıma değil. → Eşlik akorlarının üzerinde söyleyin ve her akorun bir notasında kalın. Sesiniz söylerken akorun notalarıyla karşılaştırılır.

## `staykey_title`
- **en**: 🎼 Stay in Key → Stay in Key
- **fr**: 🎼 Rester dans la Tonalité → Rester dans la Tonalité
- **es**: 🎼 Mantente en Tono → Mantente en Tono
- **tr**: 🎼 Tonda Kal → Tonda Kal

## `studio_limit_reached`
- **en**: Real limit: 3 takes max here — delete isn't built yet, so this keeps storage bounded. → Three takes are stored. Delete one to record another.
- **fr**: Vraie limite : 3 prises maximum ici — la suppression n'est pas encore construite, donc cela garde le stockage borné. → Trois prises sont enregistrées. Supprimez-en une pour en enregistrer une autre.
- **es**: Límite real: 3 tomas máximo aquí — eliminar aún no está implementado, así que esto mantiene el almacenamiento acotado. → Hay tres tomas guardadas. Borra una para grabar otra.
- **tr**: Gerçek sınır: burada en fazla 3 kayıt — silme henüz eklenmedi, bu yüzden bu depolamayı sınırlı tutuyor. → Üç kayıt saklı. Yenisini kaydetmek için birini silin.

## `studio_mic_connected`
- **en**: Connected ✓ → Connected
- **fr**: Connecté ✓ → Connecté
- **es**: Conectado ✓ → Conectado
- **tr**: Bağlandı ✓ → Bağlandı

## `studio_notakes`
- **en**: No real takes recorded yet. → No takes yet.
- **fr**: Aucune vraie prise enregistrée pour l'instant. → Aucune prise pour l'instant.
- **es**: Aún no se ha grabado ninguna toma real. → Aún no hay tomas.
- **tr**: Henüz gerçek bir kayıt yapılmadı. → Henüz kayıt yok.

## `studio_record_btn`
- **en**: RECORD → Record
- **fr**: ENREGISTRER → Enregistrer
- **es**: GRABAR → Grabar
- **tr**: KAYDET → Kaydet

## `studio_save_failed`
- **en**: Could not save this take (it may be too large) — try a shorter take. → This device's storage is full, so the take wasn't kept. Delete a take and try again.
- **fr**: Impossible d'enregistrer cette prise (elle est peut-être trop volumineuse) — essayez une prise plus courte. → L'espace de cet appareil est plein : la prise n'a pas été gardée. Supprimez une prise et réessayez.
- **es**: No se pudo guardar esta toma (puede ser demasiado grande) — prueba una toma más corta. → El almacenamiento de este dispositivo está lleno: la toma no se guardó. Borra una toma e inténtalo de nuevo.
- **tr**: Bu kayıt kaydedilemedi (çok büyük olabilir) — daha kısa bir kayıt deneyin. → Bu cihazın depolama alanı dolu, kayıt saklanmadı. Bir kaydı silip yeniden deneyin.

## `studio_scope_note`
- **en**: Honest scope: this app can't auto-judge which take is "better" after the fact — that needs re-analyzing a recorded file's pitch, a different capability than the live-mic scoring the rest of this app uses. Listen and decide for yourself. → The app doesn't compare takes: listen and keep the one you like.
- **fr**: Portée honnête : cette application ne peut pas juger automatiquement quelle prise est « meilleure » après coup — cela nécessite de ré-analyser la justesse d'un fichier enregistré, une capacité différente de la notation en direct par micro utilisée par le reste de cette application. Écoutez et décidez par vous-même. → L'app ne compare pas les prises : écoutez-les et gardez celle qui vous plaît.
- **es**: Alcance honesto: esta app no puede juzgar automáticamente qué toma es "mejor" después del hecho — eso necesita reanalizar la afinación de un archivo grabado, una capacidad diferente de la puntuación en vivo por micrófono que usa el resto de esta app. Escucha y decide por ti mismo. → La app no compara las tomas: escúchalas y quédate con la que te guste.
- **tr**: Dürüst kapsam: bu uygulama hangi çekimin sonradan "daha iyi" olduğuna otomatik karar veremez — bu, bu uygulamanın geri kalanının kullandığı canlı mikrofon puanlamasından farklı bir yetenek olan kaydedilmiş bir dosyanın perdesini yeniden analiz etmeyi gerektirir. Dinleyin ve kendiniz karar verin. → Uygulama kayıtları karşılaştırmaz: dinleyin ve beğendiğinizi saklayın.

## `studio_session_title`
- **en**: 🎙️ Recording Session → Recording Session
- **fr**: 🎙️ Séance d'Enregistrement → Séance d'enregistrement
- **es**: 🎙️ Sesión de Grabación → Sesión de grabación
- **tr**: 🎙️ Kayıt Oturumu → Kayıt Oturumu

## `studio_take_saved`
- **en**: saved — real audio, stored locally. → saved on this device.
- **fr**: enregistrée — audio réel, stocké localement. → enregistrée sur cet appareil.
- **es**: guardada — audio real, almacenado localmente. → guardada en este dispositivo.
- **tr**: kaydedildi — gerçek ses, yerel olarak depolandı. → bu cihaza kaydedildi.

## `studio_takes_label`
- **en**: Your real takes → Your takes
- **fr**: Vos vraies prises → Vos prises
- **es**: Tus tomas reales → Tus tomas
- **tr**: Gerçek çekimleriniz → Kayıtlarınız

