# Phase 7 copy: old → new

Every TRANSLATIONS key phase 7 added or rewrote on the You screens (PHASE7.md 2.1–2.10), in en, fr, es and tr. "old" is
master 170c145 (phase 6 live); "new" is redesign/phase7. A key with no old value is new. Written by the build helper
scripts/design-verify/survey7/keys7.py; 2.10 removes every §7 word and emoji on the seven screens (copyscan --you:
145 texts with a §7 word and 142 with an emoji before, 0 and 0 after, across the four languages). Also changed in code
(no key): the Journey milestone's ✓ marks became the sprite's check; the achievements' and the timeline's emoji
icons became sprite icons; the Voice Card lost its 🎤 and 🔥.

## 2.1

### `you_signedout_h`
- en: (new) Your progress lives here
- fr: (new) Votre progression est ici
- es: (new) Tu progreso está aquí
- tr: (new) İlerlemen burada

### `you_signedout_desc`
- en: (new) Sign in and this page shows your level, your Skill Profile, your records and your 21-Day Journey, from what you sing.
- fr: (new) Connectez-vous : cette page montre votre niveau, votre profil de compétences, vos records et votre parcours de 21 jours, d'après ce que vous chantez.
- es: (new) Inicia sesión y esta página mostrará tu nivel, tu perfil de habilidades, tus récords y tu recorrido de 21 días, a partir de lo que cantas.
- tr: (new) Giriş yap: bu sayfa söylediklerine göre seviyeni, beceri profilini, rekorlarını ve 21 günlük yolculuğunu gösterir.

### `you_level_tpl`
- en: (new) Level {n} · {name}
- fr: (new) Niveau {n} · {name}
- es: (new) Nivel {n} · {name}
- tr: (new) Seviye {n} · {name}

### `you_xp_tpl`
- en: (new) {xp} XP · {left} to level {next}
- fr: (new) {xp} XP · {left} avant le niveau {next}
- es: (new) {xp} XP · {left} para el nivel {next}
- tr: (new) {xp} XP · seviye {next} için {left}

### `you_notstarted`
- en: (new) Not started
- fr: (new) Pas commencé
- es: (new) Sin empezar
- tr: (new) Başlamadı

### `you_week_tpl`
- en: (new) {p}% this week
- fr: (new) {p} % cette semaine
- es: (new) {p} % esta semana
- tr: (new) bu hafta %{p}

### `you_records_tpl`
- en: (new) {n} records
- fr: (new) {n} records
- es: (new) {n} récords
- tr: (new) {n} rekor

### `you_load_tpl`
- en: (new) {p}% vocal load
- fr: (new) charge vocale {p} %
- es: (new) carga vocal {p} %
- tr: (new) ses yükü %{p}

### `you_passport_title`
- en: (new) Vocal Passport
- fr: (new) Passeport vocal
- es: (new) Pasaporte vocal
- tr: (new) Vokal Pasaportu

### `you_passport_desc`
- en: (new) Your range, level and breakthroughs, in one place.
- fr: (new) Votre tessiture, votre niveau et vos progrès marquants, au même endroit.
- es: (new) Tu registro, tu nivel y tus avances, en un solo lugar.
- tr: (new) Ses aralığın, seviyen ve dönüm noktaların tek yerde.

### `you_choir_desc`
- en: (new) Your parts' readiness
- fr: (new) La préparation de vos voix
- es: (new) La preparación de tus voces
- tr: (new) Partilerinin hazırlığı

### `skill_status_label`
- en: (new) Status
- fr: (new) État
- es: (new) Estado
- tr: (new) Durum

### `skill_nodata`
- en: (new) No scores yet: try an exercise or the Range Finder.
- fr: (new) Pas encore de score : essayez un exercice ou le Détecteur de tessiture.
- es: (new) Aún no hay puntuaciones: prueba un ejercicio o el Buscador de registro.
- tr: (new) Henüz puan yok: bir egzersiz ya da Ses Aralığı Bulucu'yu dene.

### `skill_read_label`
- en: (new) Level read
- fr: (new) Niveau estimé
- es: (new) Nivel estimado
- tr: (new) Seviye tahmini

### `skill_level_pro`
- en: (new) Professional
- fr: (new) Professionnel
- es: (new) Profesional
- tr: (new) Profesyonel

### `skill_level_mid`
- en: (new) Intermediate
- fr: (new) Intermédiaire
- es: (new) Intermedio
- tr: (new) Orta

### `skill_level_beg`
- en: (new) Beginner
- fr: (new) Débutant
- es: (new) Principiante
- tr: (new) Başlangıç

### `skill_strongest_label`
- en: (new) Strongest
- fr: (new) Point fort
- es: (new) Punto fuerte
- tr: (new) En güçlü

### `skill_needswork_label`
- en: (new) Needs work
- fr: (new) À travailler
- es: (new) A mejorar
- tr: (new) Çalışılmalı

### `skill_notscored_label`
- en: (new) Not scored yet
- fr: (new) Pas encore noté
- es: (new) Sin puntuar aún
- tr: (new) Henüz puanlanmadı

### `skill_notinprofile`
- en: (new) Not in your profile yet.
- fr: (new) Pas encore dans votre profil.
- es: (new) Aún no está en tu perfil.
- tr: (new) Henüz profilinde değil.

### `you_skill_measure`
- en: (new) Pitch: the average of your last 20 pitch scores from Pitch Match, Interval Match, Stay in Key, Karaoke Coach, Performance Director and the other pitch trainers, together with your last 20 Choir World runs (Harmony Memory and the challenges: each run's Performance Report pitch). Range: your saved range, where 30 semitones (two and a half octaves) is 100. Breath: Breath Control. Agility: Scale Run, the Rhythm Trainer, Vocal Puzzle and Rift. Expression isn't in your profile yet: its measurement is being improved first. The level read is the average of the scored rings: 80 and above Professional, 55 and above Intermediate.
- fr: (new) Justesse : la moyenne de vos 20 derniers scores de justesse issus de Précision de note, Reconnaissance d'intervalles, Rester dans la tonalité, Coach Karaoké, Directeur de performance et des autres exercices de justesse, avec vos 20 derniers passages dans Choir World (Harmony Memory et les défis : la justesse du rapport de performance de chaque passage). Tessiture : votre tessiture enregistrée, où 30 demi-tons (deux octaves et demie) valent 100. Souffle : Contrôle du souffle. Agilité : Gamme, l'Entraîneur de Rythme, Puzzle Vocal et Rift. L'expression n'est pas encore dans votre profil : sa mesure est d'abord améliorée. Le niveau estimé est la moyenne des anneaux notés : 80 et plus Professionnel, 55 et plus Intermédiaire.
- es: (new) Afinación: la media de tus últimas 20 puntuaciones de afinación de Precisión de nota, Reconocimiento de intervalos, Mantente en tono, Coach de Karaoke, Director de actuación y los demás ejercicios de afinación, junto con tus últimas 20 pasadas en Choir World (Harmony Memory y los retos: la afinación del informe de actuación de cada pasada). Registro: tu registro guardado, donde 30 semitonos (dos octavas y media) valen 100. Respiración: Control de respiración. Agilidad: Escala, el Entrenador de Ritmo, Rompecabezas Vocal y Rift. La expresión aún no está en tu perfil: primero se está mejorando su medición. El nivel estimado es la media de los anillos puntuados: 80 o más Profesional, 55 o más Intermedio.
- tr: (new) Perde: Nota Eşleştirme, Aralık Eşleştirme, Tonda Kal, Karaoke Koçu, Performans Yönetmeni ve diğer perde çalışmalarından son 20 perde puanının, Choir World'deki son 20 koşunla (Harmony Memory ve görevler: her koşunun performans raporundaki perde) birlikte ortalaması. Ses Aralığı: kayıtlı aralığın; 30 yarım ses (iki buçuk oktav) 100 sayılır. Nefes: Nefes Kontrolü. Çeviklik: Gam Çalışması, Ritim Antrenörü, Vokal Bulmaca ve Rift. İfade henüz profilinde değil: önce ölçümü iyileştiriliyor. Seviye tahmini, puanlanmış halkaların ortalamasıdır: 80 ve üzeri Profesyonel, 55 ve üzeri Orta.

## 2.2

### `dashboard_title`
- en: ~~📊 Dashboard~~ → Progress
- fr: ~~📊 Tableau de Bord~~ → Progrès
- es: ~~📊 Panel~~ → Progreso
- tr: ~~📊 Panel~~ → İlerleme

### `hub_you_dashboard_title`
- en: ~~Dashboard & Skill Profile~~ → Progress
- fr: ~~Tableau de bord et Profil de compétences~~ → Progrès
- es: ~~Panel y Perfil de habilidades~~ → Progreso
- tr: ~~Panel ve Yetenek Profili~~ → İlerleme

### `dashboard_signedout_label`
- en: ~~Progress Dashboard~~ → Progress
- fr: ~~Tableau de bord des progrès~~ → Progrès
- es: ~~Panel de progreso~~ → Progreso
- tr: ~~İlerleme Paneli~~ → İlerleme

### `profile_opendashboard_btn`
- en: ~~Open full Dashboard~~ → Open Progress
- fr: ~~Ouvrir le tableau de bord complet~~ → Ouvrir Progrès
- es: ~~Abrir panel completo~~ → Abrir Progreso
- tr: ~~Tam Paneli aç~~ → İlerleme'yi aç

### `dashboard_sub`
- en: ~~Your 5-score Skill Profile, Today's Plan, and the adaptive engine that reweights your training from real results.~~ → Today's Plan, this week's challenge, your range and your practice over time.
- fr: ~~Votre Profil de compétences à 5 scores, le Plan du jour, et le moteur adaptatif qui repondère votre entraînement à partir de vrais résultats.~~ → Le plan du jour, le défi de la semaine, votre tessiture et votre pratique dans le temps.
- es: ~~Tu Perfil de habilidades de 5 puntuaciones, el Plan de hoy, y el motor adaptativo que reajusta tu entrenamiento a partir de resultados reales.~~ → El plan de hoy, el reto de la semana, tu registro y tu práctica a lo largo del tiempo.
- tr: ~~5 puanlı Yetenek Profiliniz, Bugünün Planı ve gerçek sonuçlardan antrenmanınızı yeniden ağırlıklandıran uyarlanabilir motor.~~ → Bugünün planı, haftanın görevi, ses aralığın ve zaman içindeki çalışman.

### `hub_you_dashboard_desc`
- en: ~~5 real scores, Today's Plan, Weekly Challenge, adaptive weighting.~~ → Today's Plan, the weekly challenge, your range and activity.
- fr: ~~5 scores réels, Plan du jour, Défi hebdomadaire, pondération adaptative.~~ → Le plan du jour, le défi de la semaine, votre tessiture et votre activité.
- es: ~~5 puntuaciones reales, Plan de hoy, Desafío semanal, ponderación adaptativa.~~ → El plan de hoy, el reto semanal, tu registro y tu actividad.
- tr: ~~5 gerçek puan, Bugünün Planı, Haftalık Meydan Okuma, uyarlanabilir ağırlıklandırma.~~ → Bugünün planı, haftalık görev, ses aralığın ve etkinliğin.

### `dashboard_signedout_desc`
- en: ~~Once signed in, your range, practice streak, and session history save locally and show up here — the same shape as the real per-user dashboard in the PRD.~~ → Once signed in, your range, practice streak and session history show up here.
- fr: ~~Une fois connecté, votre tessiture, votre série de pratique et votre historique de sessions s'enregistrent localement et apparaissent ici — la même forme que le vrai tableau de bord par utilisateur du PRD.~~ → Une fois connecté, votre tessiture, votre série de pratique et l'historique de vos séances apparaissent ici.
- es: ~~Una vez que inicies sesión, tu rango, racha de práctica e historial de sesiones se guardan localmente y aparecen aquí — la misma forma que el panel real por usuario del PRD.~~ → Cuando inicies sesión, tu registro, tu racha de práctica y tu historial de sesiones aparecerán aquí.
- tr: ~~Oturum açtıktan sonra, ses aralığınız, pratik seriniz ve oturum geçmişiniz yerel olarak kaydedilir ve burada görünür — PRD'deki gerçek kullanıcı başına panelle aynı şekil.~~ → Giriş yaptığında ses aralığın, çalışma serin ve oturum geçmişin burada görünür.

### `progress_plan_measure`
- en: (new) Rule-based: a warm-up first, then the lowest ring of your Skill Profile, Register Coach if your longest register crossing is under 3 seconds, then this week's challenge.
- fr: (new) Fondé sur des règles : d'abord un échauffement, puis l'anneau le plus bas de votre profil de compétences, le Coach de registre si votre plus long passage de registre dure moins de 3 secondes, puis le défi de la semaine.
- es: (new) Basado en reglas: primero un calentamiento, luego el anillo más bajo de tu perfil de habilidades, el Coach de registro si tu paso de registro más largo dura menos de 3 segundos, y después el reto de la semana.
- tr: (new) Kurallara dayanır: önce ısınma, sonra beceri profilindeki en düşük halka, en uzun register geçişin 3 saniyenin altındaysa Register Koçu, ardından haftanın görevi.

## 2.3

### `profile_title`
- en: (new) Profile & settings
- fr: (new) Profil et réglages
- es: (new) Perfil y ajustes
- tr: (new) Profil ve ayarlar

### `profile_sub`
- en: (new) Your Voice Card, your language and theme, and your account.
- fr: (new) Votre carte vocale, votre langue et votre thème, et votre compte.
- es: (new) Tu tarjeta vocal, tu idioma y tema, y tu cuenta.
- tr: (new) Ses kartın, dilin ve temanın yanı sıra hesabın.

### `profile_signedout_desc`
- en: (new) Sign in to see your Voice Card and your account settings.
- fr: (new) Connectez-vous pour voir votre carte vocale et les réglages de votre compte.
- es: (new) Inicia sesión para ver tu tarjeta vocal y los ajustes de tu cuenta.
- tr: (new) Ses kartını ve hesap ayarlarını görmek için giriş yap.

### `profile_account_title`
- en: (new) Account
- fr: (new) Compte
- es: (new) Cuenta
- tr: (new) Hesap

### `profile_account_sub`
- en: (new) Reset local data erases the progress saved on your account: range, streak, sessions, scores and history. It can't be undone. Signing out keeps everything.
- fr: (new) Réinitialiser les données efface la progression enregistrée sur votre compte : tessiture, série, séances, scores et historique. C'est irréversible. Se déconnecter garde tout.
- es: (new) Restablecer los datos borra el progreso guardado en tu cuenta: registro, racha, sesiones, puntuaciones e historial. No se puede deshacer. Cerrar sesión lo conserva todo.
- tr: (new) Verileri sıfırlamak hesabında kayıtlı ilerlemeyi siler: ses aralığı, seri, oturumlar, puanlar ve geçmiş. Geri alınamaz. Çıkış yapmak her şeyi korur.

### `profile_reset_confirm`
- en: (new) Erase the progress saved on your account? This can't be undone.
- fr: (new) Effacer la progression enregistrée sur votre compte ? C'est irréversible.
- es: (new) ¿Borrar el progreso guardado en tu cuenta? No se puede deshacer.
- tr: (new) Hesabında kayıtlı ilerleme silinsin mi? Bu geri alınamaz.

## 2.4

### `achievement_unlocked`
- en: (new) Unlocked
- fr: (new) Débloqué
- es: (new) Desbloqueado
- tr: (new) Açıldı

### `achievement_locked`
- en: (new) Locked
- fr: (new) Verrouillé
- es: (new) Bloqueado
- tr: (new) Kilitli

### `journey_step_auto`
- en: (new) Done: from your saved result
- fr: (new) Fait : d'après votre résultat enregistré
- es: (new) Hecho: según tu resultado guardado
- tr: (new) Tamam: kayıtlı sonucuna göre

### `journey_step_done`
- en: (new) Done
- fr: (new) Fait
- es: (new) Hecho
- tr: (new) Tamam

## 2.5

### `records_cat_voice`
- en: ~~🎤 Vocal Range & Technique~~ → Vocal Range & Technique
- fr: ~~🎤 Tessiture vocale et technique~~ → Tessiture vocale et technique
- es: ~~🎤 Rango vocal y técnica~~ → Rango vocal y técnica
- tr: ~~🎤 Ses Aralığı ve Teknik~~ → Ses Aralığı ve Teknik

### `records_cat_world`
- en: ~~🗺️ Vocal World~~ → Vocal World
- fr: ~~🗺️ Monde Vocal~~ → Monde Vocal
- es: ~~🗺️ Mundo Vocal~~ → Mundo Vocal
- tr: ~~🗺️ Vokal Dünyası~~ → Vokal Dünyası

### `records_cat_songs`
- en: ~~🎵 Songs~~ → Songs
- fr: ~~🎵 Chansons~~ → Chansons
- es: ~~🎵 Canciones~~ → Canciones
- tr: ~~🎵 Şarkılar~~ → Şarkılar

### `record_label_best_pitch_last20`
- en: (new) Best pitch (of your last 20)
- fr: (new) Meilleure justesse (sur vos 20 dernières)
- es: (new) Mejor afinación (de tus últimas 20)
- tr: (new) En iyi perde (son 20 puanından)

### `record_label_song_best`
- en: (new) Best song (Karaoke Coach)
- fr: (new) Meilleure chanson (Coach Karaoké)
- es: (new) Mejor canción (Coach de Karaoke)
- tr: (new) En iyi şarkı (Karaoke Koçu)

### `record_label_cw_best_run`
- en: (new) Best run score
- fr: (new) Meilleur score de passage
- es: (new) Mejor puntuación de pasada
- tr: (new) En iyi koşu puanı

### `record_label_cw_bosses`
- en: (new) Bosses beaten
- fr: (new) Boss vaincus
- es: (new) Jefes vencidos
- tr: (new) Yenilen boss'lar

### `record_label_cw_ready`
- en: (new) Parts Ready
- fr: (new) Voix prêtes
- es: (new) Voces listas
- tr: (new) Hazır partiler

### `record_note_cw_none`
- en: (new) None yet
- fr: (new) Aucun pour l'instant
- es: (new) Ninguno aún
- tr: (new) Henüz yok

## 2.6

### `passport_updated_tpl`
- en: (new) Last change: {date}
- fr: (new) Dernière modification : {date}
- es: (new) Último cambio: {date}
- tr: (new) Son değişiklik: {date}

## 2.7

### `voicecard_footer`
- en: ~~Real data, real progress — VoxCoach~~ → Measured from your singing with VoxCoach
- fr: ~~Données réelles, progrès réel — VoxCoach~~ → Mesuré à partir de votre chant avec VoxCoach
- es: ~~Datos reales, progreso real — VoxCoach~~ → Medido a partir de tu canto con VoxCoach
- tr: ~~Gerçek veri, gerçek ilerleme — VoxCoach~~ → VoxCoach ile şarkı söyleyişinden ölçüldü

## 2.8

### `voicehealth_load_h2`
- en: (new) Vocal load today
- fr: (new) Charge vocale aujourd'hui
- es: (new) Carga vocal hoy
- tr: (new) Bugünkü ses yükü

### `voicehealth_load_rule`
- en: (new) Your load is measured while you sing, against a daily budget. At 80% of it the app suggests a break; at 100% it suggests resting your voice for the rest of the day or keeping your singing light. It never stops you.
- fr: (new) Votre charge est mesurée pendant que vous chantez, par rapport à un budget quotidien. À 80 % de celui-ci, l'application suggère une pause ; à 100 %, elle suggère de reposer votre voix pour le reste de la journée ou de chanter légèrement. Elle ne vous arrête jamais.
- es: (new) Tu carga se mide mientras cantas, frente a un presupuesto diario. Al 80 % la app sugiere una pausa; al 100 % sugiere descansar la voz el resto del día o cantar suave. Nunca te detiene.
- tr: (new) Yükün şarkı söylerken günlük bir bütçeye göre ölçülür. Bütçenin %80'inde uygulama mola önerir; %100'de günün geri kalanında sesini dinlendirmeni ya da hafif söylemeni önerir. Seni asla durdurmaz.

### `voicehealth_load14_h2`
- en: (new) Vocal load — last 14 days
- fr: (new) Charge vocale — 14 derniers jours
- es: (new) Carga vocal — últimos 14 días
- tr: (new) Ses yükü — son 14 gün

### `voicehealth_warn_minutes_tpl`
- en: (new) You've been singing for {n} minutes straight. Consider a short break before continuing.
- fr: (new) Vous chantez depuis {n} minutes d'affilée. Pensez à faire une courte pause avant de continuer.
- es: (new) Llevas {n} minutos seguidos cantando. Considera una pausa corta antes de seguir.
- tr: (new) {n} dakikadır aralıksız söylüyorsun. Devam etmeden önce kısa bir mola vermeyi düşün.

### `voicehealth_warn_stability_tpl`
- en: (new) Your pitch stability has dropped {n} points since you started this session. A short break before continuing might help.
- fr: (new) Votre stabilité de justesse a baissé de {n} points depuis le début de cette séance. Une courte pause avant de continuer pourrait aider.
- es: (new) Tu estabilidad de afinación ha bajado {n} puntos desde que empezaste esta sesión. Una pausa corta antes de seguir podría ayudar.
- tr: (new) Bu oturumun başından beri perde kararlılığın {n} puan düştü. Devam etmeden önce kısa bir mola işe yarayabilir.

## 2.10

### `hub_you_records_desc`
- en: ~~Every real best, in one place — range, pitch, breath, and every Vocal World game.~~ → Your bests in one place: range, pitch, breath, songs, Vocal World and Choir World.
- fr: ~~Chaque record réel, au même endroit — tessiture, justesse, souffle, et chaque jeu du Monde Vocal.~~ → Vos meilleurs résultats au même endroit : tessiture, justesse, souffle, chansons, Monde Vocal et Choir World.
- es: ~~Cada récord real, en un solo lugar — rango, afinación, respiración, y cada juego del Mundo Vocal.~~ → Tus mejores marcas en un solo lugar: registro, afinación, respiración, canciones, Mundo Vocal y Choir World.
- tr: ~~Her gerçek rekor tek bir yerde — ses aralığı, perde, nefes ve her Vokal Dünyası oyunu.~~ → En iyilerin tek yerde: ses aralığı, perde, nefes, şarkılar, Vokal Dünyası ve Choir World.

### `hub_you_teacher_desc`
- en: ~~Real roster and assignment tracking — Teacher plan.~~ → Your students and their assignments. Teacher plan.
- fr: ~~Suivi réel des élèves et des devoirs — forfait Enseignant.~~ → Vos élèves et leurs devoirs. Forfait Enseignant.
- es: ~~Seguimiento real de alumnos y tareas — plan Profesor.~~ → Tus alumnos y sus tareas. Plan Profesor.
- tr: ~~Gerçek öğrenci listesi ve ödev takibi — Öğretmen planı.~~ → Öğrencilerin ve ödevleri. Öğretmen planı.

### `hub_you_profile_title`
- en: ~~🎤 Profile~~ → Profile & settings
- fr: ~~🎤 Profil~~ → Profil et réglages
- es: ~~🎤 Perfil~~ → Perfil y ajustes
- tr: ~~🎤 Profil~~ → Profil ve ayarlar

### `hub_you_profile_desc`
- en: ~~Your singer identity in one place — level, range, strengths, achievements, records, all real.~~ → Your Voice Card, language, theme and account.
- fr: ~~Votre identité de chanteur en un seul endroit — niveau, tessiture, points forts, succès, records, tout est réel.~~ → Votre carte vocale, votre langue, votre thème et votre compte.
- es: ~~Tu identidad de cantante en un solo lugar — nivel, rango, fortalezas, logros, récords, todo real.~~ → Tu tarjeta vocal, idioma, tema y cuenta.
- tr: ~~Şarkıcı kimliğiniz tek bir yerde — seviye, ses aralığı, güçlü yönler, başarılar, rekorlar, hepsi gerçek.~~ → Ses kartın, dilin, temanın ve hesabın.

### `hub_you_teacher_title`
- en: ~~👩\u200d🏫 Teacher Dashboard~~ → Teacher Dashboard
- fr: ~~👩\u200d🏫 Tableau de bord enseignant~~ → Tableau de bord enseignant
- es: ~~👩\u200d🏫 Panel del profesor~~ → Panel del profesor
- tr: ~~👩\u200d🏫 Öğretmen Paneli~~ → Öğretmen Paneli

### `hub_you_voicehealth_desc`
- en: ~~14-day trend on stability and breath — not single-session panic.~~ → Vocal load, stability and breath over the last 14 days.
- fr: ~~Tendance sur 14 jours de la stabilité et du souffle — pas la panique d'une seule séance.~~ → Charge vocale, stabilité et souffle sur les 14 derniers jours.
- es: ~~Tendencia de 14 días en estabilidad y respiración — no el pánico de una sola sesión.~~ → Carga vocal, estabilidad y respiración en los últimos 14 días.
- tr: ~~Kararlılık ve nefeste 14 günlük eğilim — tek oturumluk panik değil.~~ → Son 14 günde ses yükü, kararlılık ve nefes.

### `journey_sub`
- en: ~~Not a trial countdown — a structured baseline, three themed weeks, and an honest before/after at the end. Every number here comes from tools already built elsewhere in this app, sequenced into one guided path.~~ → A baseline on Day 1, three themed weeks, and a before/after at the end. Every number comes from the tools you already use, in one guided path.
- fr: ~~Pas un compte à rebours d'essai — une base structurée, trois semaines thématiques, et un vrai avant/après honnête à la fin. Chaque chiffre ici provient d'outils déjà construits ailleurs dans cette application, séquencés en un seul chemin guidé.~~ → Un point de départ au jour 1, trois semaines à thème et un avant/après à la fin. Chaque chiffre vient des outils que vous utilisez déjà, sur un seul parcours guidé.
- es: ~~No es una cuenta regresiva de prueba — una línea base estructurada, tres semanas temáticas, y un antes/después honesto al final. Cada número aquí proviene de herramientas ya construidas en otra parte de esta app, secuenciadas en un camino guiado.~~ → Un punto de partida el día 1, tres semanas temáticas y un antes/después al final. Cada número viene de las herramientas que ya usas, en un solo recorrido guiado.
- tr: ~~Bir deneme geri sayımı değil — yapılandırılmış bir başlangıç noktası, üç temalı hafta ve sonunda dürüst bir öncesi/sonrası. Buradaki her sayı, uygulamanın başka yerinde zaten oluşturulmuş araçlardan gelir, tek bir rehberli yola dizilmiştir.~~ → 1. günde bir başlangıç ölçümü, üç temalı hafta ve sonunda bir önce/sonra. Her sayı zaten kullandığın araçlardan gelir, tek bir rehberli yolda.

### `journey_day1_h2`
- en: ~~Five quick real measurements, then a personal goal~~ → Five quick measurements, then a personal goal
- fr: ~~Cinq vraies mesures rapides, puis un objectif personnel~~ → Cinq mesures rapides, puis un objectif personnel
- es: ~~Cinco mediciones reales rápidas, luego un objetivo personal~~ → Cinco mediciones rápidas y luego un objetivo personal
- tr: ~~Beş hızlı gerçek ölçüm, ardından kişisel bir hedef~~ → Beş hızlı ölçüm, ardından kişisel bir hedef

### `journey_step_breath_sub`
- en: ~~Breath Trainer — see your real sustain time~~ → Breath Control: see how long you can sustain a note
- fr: ~~Entraîneur de souffle — voyez votre vrai temps de tenue~~ → Contrôle du souffle : voyez combien de temps vous tenez une note
- es: ~~Entrenador de respiración — mira tu tiempo real de sostenido~~ → Control de respiración: mira cuánto tiempo sostienes una nota
- tr: ~~Nefes Antrenörü — gerçek sürdürme sürenizi görün~~ → Nefes Kontrolü: bir notayı ne kadar uzun tutabildiğini gör

### `journey_open_hint`
- en: ~~Each "Open" jumps to the real tool. Come back here and mark it done once you've tried it — this page doesn't auto-detect across tabs, so it asks honestly instead of guessing.~~ → Each Open goes to the tool. A step ticks itself once that tool has a saved result (Interval Match shares its results with Pitch Match, so tick it yourself); you can also tick any step by hand.
- fr: ~~Chaque « Ouvrir » vous amène au vrai outil. Revenez ici et marquez-le comme fait une fois essayé — cette page ne détecte pas automatiquement entre les onglets, alors elle demande honnêtement plutôt que de deviner.~~ → Chaque Ouvrir mène à l'outil. Une étape se coche d'elle-même dès que l'outil a un résultat enregistré (Reconnaissance d'intervalles partage ses résultats avec Précision de note : cochez-la vous-même) ; vous pouvez aussi cocher une étape à la main.
- es: ~~Cada "Abrir" te lleva a la herramienta real. Vuelve aquí y márcalo como hecho una vez que lo hayas probado — esta página no detecta automáticamente entre pestañas, así que pregunta honestamente en lugar de adivinar.~~ → Cada Abrir lleva a la herramienta. Un paso se marca solo cuando esa herramienta tiene un resultado guardado (Reconocimiento de intervalos comparte sus resultados con Precisión de nota: márcalo tú); también puedes marcar cualquier paso a mano.
- tr: ~~Her "Aç" gerçek araca gider. Denedikten sonra buraya dönün ve tamamlandı olarak işaretleyin — bu sayfa sekmeler arasında otomatik algılama yapmaz, bu yüzden tahmin etmek yerine dürüstçe sorar.~~ → Her Aç düğmesi araca gider. O aracın kayıtlı bir sonucu olduğunda adım kendiliğinden işaretlenir (Aralık Eşleştirme sonuçlarını Nota Eşleştirme ile paylaşır, onu kendin işaretle); istediğin adımı elle de işaretleyebilirsin.

### `journey_sequence_label`
- en: ~~Real sequence~~ → Sequence
- fr: ~~Séquence réelle~~ → Séquence
- es: ~~Secuencia real~~ → Secuencia
- tr: ~~Gerçek dizi~~ → Sıra

### `journey_achievements_h2`
- en: ~~Every one of these is computed from real logged data — none are hand-awarded~~ → Each one unlocks from your saved results.
- fr: ~~Chacun de ceux-ci est calculé à partir de vraies données enregistrées — aucun n'est attribué à la main~~ → Chacun se débloque d'après vos résultats enregistrés.
- es: ~~Cada uno de estos se calcula a partir de datos reales registrados — ninguno se otorga manualmente~~ → Cada uno se desbloquea con tus resultados guardados.
- tr: ~~Bunların her biri gerçek kayıtlı verilerden hesaplanır — hiçbiri elle verilmez~~ → Her biri kayıtlı sonuçlarınla açılır.

### `journey_day1vtoday_h2`
- en: ~~Real numeric comparison — no audio replay yet~~ → Your Day 1 numbers next to today's
- fr: ~~Vraie comparaison numérique — pas encore de relecture audio~~ → Vos chiffres du jour 1 à côté de ceux d'aujourd'hui
- es: ~~Comparación numérica real — aún sin repetición de audio~~ → Tus números del día 1 junto a los de hoy
- tr: ~~Gerçek sayısal karşılaştırma — henüz ses tekrarı yok~~ → 1. gün sayıların bugünküyle yan yana

### `journey_day1vtoday_desc`
- en: ~~Honest scope: this compares your stored Day 1 Skill Profile snapshot to today's, numerically. Hearing your actual Day 1 vs. today recording side-by-side isn't built — that needs take storage this prototype doesn't have (see PRD §18.6).~~ → Your Skill Profile as it was when you set your baseline, next to today's. A recording of Day 1 to play beside today's isn't kept.
- fr: ~~Portée honnête : ceci compare numériquement votre instantané de Profil de compétences du Jour 1 stocké à celui d'aujourd'hui. Entendre côte à côte votre enregistrement réel du Jour 1 vs aujourd'hui n'est pas construit — cela nécessite un stockage de prises que ce prototype n'a pas (voir PRD §18.6).~~ → Votre profil de compétences tel qu'il était quand vous avez fixé votre point de départ, à côté de celui d'aujourd'hui. Aucun enregistrement du jour 1 n'est conservé pour l'écouter à côté.
- es: ~~Alcance honesto: esto compara numéricamente tu instantánea guardada del Perfil de habilidades del Día 1 con la de hoy. Escuchar tu grabación real del Día 1 frente a hoy en paralelo no está construido — eso necesita almacenamiento de tomas que este prototipo no tiene (ver PRD §18.6).~~ → Tu perfil de habilidades tal como estaba al fijar tu punto de partida, junto al de hoy. No se guarda una grabación del día 1 para escucharla al lado.
- tr: ~~Dürüst kapsam: bu, saklanan 1. Gün Yetenek Profili anlık görüntünüzü bugünküyle sayısal olarak karşılaştırır. Gerçek 1. Gün ile bugünün kaydını yan yana duymak inşa edilmedi — bu, bu prototipin sahip olmadığı çekim depolaması gerektirir (bkz. PRD §18.6).~~ → Başlangıç ölçümünü yaptığın günkü beceri profilin, bugünküyle yan yana. 1. günün bir kaydı yanında dinlemek için saklanmıyor.

### `journey_complete_theme`
- en: ~~Program complete — real continued practice from here~~ → Program complete: keep practising from here
- fr: ~~Programme terminé — la vraie pratique continue à partir d'ici~~ → Programme terminé : continuez à pratiquer à partir d'ici
- es: ~~Programa completado — la práctica real continúa a partir de aquí~~ → Programa completado: sigue practicando desde aquí
- tr: ~~Program tamamlandı — gerçek antrenman buradan devam ediyor~~ → Program tamamlandı: buradan çalışmaya devam et

### `dashboard_backend_note`
- en: ~~— needs a real multi-user backend, same honesty note as the Director Dashboard.~~ → Hidden until people can compare with each other's actual results.
- fr: ~~— nécessite un vrai backend multi-utilisateur, même remarque honnête que le Tableau de bord du directeur.~~ → Masqué tant qu'on ne peut pas se comparer aux résultats des autres.
- es: ~~— necesita un backend real multiusuario, misma nota de honestidad que el Panel del director.~~ → Oculto hasta que se pueda comparar con los resultados de otras personas.
- tr: ~~— gerçek bir çok kullanıcılı arka uç gerektirir, Yönetmen Paneli ile aynı dürüstlük notu.~~ → Başkalarının sonuçlarıyla karşılaştırma mümkün olana kadar gizli.

### `profile_unifiedprogress_label`
- en: ~~📈 Unified Progress~~ → Unified Progress
- fr: ~~📈 Progrès unifié~~ → Progrès unifié
- es: ~~📈 Progreso unificado~~ → Progreso unificado
- tr: ~~📈 Birleşik İlerleme~~ → Birleşik İlerleme

### `profile_unifiedprogress_desc`
- en: ~~One real trend view across your three most-tracked categories — pulled from the same real weekly log every exercise already writes to, not a separate tracker.~~ → Pitch, breath and agility day by day over the last 14 days, from the log each exercise writes to.
- fr: ~~Une vraie vue de tendance sur vos trois catégories les plus suivies — tirée du même vrai journal hebdomadaire dans lequel chaque exercice écrit déjà, pas un tracker séparé.~~ → Justesse, souffle et agilité jour par jour sur les 14 derniers jours, d'après le journal que chaque exercice remplit.
- es: ~~Una vista de tendencia real en tus tres categorías más rastreadas — extraída del mismo registro semanal real en el que ya escribe cada ejercicio, no un rastreador separado.~~ → Afinación, respiración y agilidad día a día en los últimos 14 días, según el registro que escribe cada ejercicio.
- tr: ~~En çok izlenen üç kategoriniz genelinde tek bir gerçek eğilim görünümü — her egzersizin zaten yazdığı aynı gerçek haftalık günlükten alınır, ayrı bir izleyici değil.~~ → Son 14 günde gün gün perde, nefes ve çeviklik; her egzersizin yazdığı kayıttan.

### `records_title`
- en: ~~🏆 Personal Records~~ → Personal Records
- fr: ~~🏆 Records Personnels~~ → Records personnels
- es: ~~🏆 Récords Personales~~ → Récords personales
- tr: ~~🏆 Kişisel Rekorlar~~ → Kişisel Rekorlar

### `records_sub`
- en: ~~Every real best, consolidated — nothing here is invented if the underlying activity hasn't happened yet.~~ → Your bests, from what you've sung. A record appears once you've done the activity.
- fr: ~~Chaque vrai record, consolidé — rien ici n'est inventé si l'activité sous-jacente n'a pas encore eu lieu.~~ → Vos meilleurs résultats, d'après ce que vous avez chanté. Un record apparaît une fois l'activité faite.
- es: ~~Cada récord real, consolidado — nada aquí se inventa si la actividad subyacente aún no ha ocurrido.~~ → Tus mejores marcas, según lo que has cantado. Un récord aparece cuando has hecho la actividad.
- tr: ~~Her gerçek rekor, birleştirilmiş — temel etkinlik henüz gerçekleşmediyse burada hiçbir şey uydurulmaz.~~ → Söylediklerinden en iyilerin. Bir rekor, o etkinliği yaptığında görünür.

### `records_signin_msg`
- en: ~~Sign in to start building real personal records.~~ → Sign in to start keeping your personal records.
- fr: ~~Connectez-vous pour commencer à établir vos vrais records personnels.~~ → Connectez-vous pour commencer à garder vos records personnels.
- es: ~~Inicia sesión para empezar a construir tus verdaderos récords personales.~~ → Inicia sesión para empezar a guardar tus récords personales.
- tr: ~~Gerçek kişisel rekorlarınızı oluşturmaya başlamak için oturum açın.~~ → Kişisel rekorlarını tutmaya başlamak için giriş yap.

### `passport_title`
- en: ~~🪪 Vocal Passport~~ → Vocal Passport
- fr: ~~🪪 Passeport Vocal~~ → Passeport vocal
- es: ~~🪪 Pasaporte Vocal~~ → Pasaporte vocal
- tr: ~~🪪 Vokal Pasaportu~~ → Vokal Pasaportu

### `passport_signin`
- en: ~~Sign in to start building your real Vocal Passport.~~ → Sign in to start your Vocal Passport.
- fr: ~~Connectez-vous pour commencer à construire votre vrai Passeport vocal.~~ → Connectez-vous pour commencer votre passeport vocal.
- es: ~~Inicia sesión para empezar a construir tu verdadero Pasaporte Vocal.~~ → Inicia sesión para empezar tu pasaporte vocal.
- tr: ~~Gerçek Vokal Pasaportunuzu oluşturmaya başlamak için oturum açın.~~ → Vokal Pasaportunu başlatmak için giriş yap.

### `passport_bestkey_note`
- en: ~~Honest about scope: Best Key isn't shown here — with only a couple of songs and no real per-key attempt history yet, a "best key" field would be more guess than measurement. It'll appear once there's real data to back it.~~ → Best key isn't shown: with only a few songs and no attempts per key yet, it would be a guess. It will appear once there's enough data.
- fr: ~~Honnête sur la portée : la Meilleure tonalité n'est pas affichée ici — avec seulement quelques chansons et pas encore de vrai historique de tentatives par tonalité, un champ « meilleure tonalité » serait plus une supposition qu'une mesure. Il apparaîtra une fois qu'il y aura de vraies données pour l'appuyer.~~ → La meilleure tonalité n'est pas affichée : avec peu de chansons et pas encore d'essais par tonalité, ce serait une supposition. Elle apparaîtra quand il y aura assez de données.
- es: ~~Honestos sobre el alcance: el Mejor tono no se muestra aquí — con solo un par de canciones y sin historial real de intentos por tono todavía, un campo de "mejor tono" sería más una suposición que una medición. Aparecerá una vez que haya datos reales que lo respalden.~~ → La mejor tonalidad no se muestra: con pocas canciones y aún sin intentos por tonalidad, sería una suposición. Aparecerá cuando haya datos suficientes.
- tr: ~~Kapsam konusunda dürüz: En İyi Ton burada gösterilmiyor — sadece birkaç şarkı ve henüz gerçek tona özgü deneme geçmişi olmadan, bir "en iyi ton" alanı ölçümden çok tahmin olurdu. Onu destekleyecek gerçek veri olduğunda görünecek.~~ → En iyi ton gösterilmiyor: az sayıda şarkı ve henüz tona göre deneme olmadan bu bir tahmin olurdu. Yeterli veri olunca görünecek.

### `passport_timeline_label`
- en: ~~🌱 Your Breakthrough Timeline~~ → Your Breakthrough Timeline
- fr: ~~🌱 Votre Chronologie de Percées~~ → Votre chronologie de progrès
- es: ~~🌱 Tu Cronología de Avances~~ → Tu cronología de avances
- tr: ~~🌱 Atılım Zaman Çizelgeniz~~ → Atılım Zaman Çizelgen

### `passport_timeline_desc`
- en: ~~The real story of your voice, in order — every entry here fired for a real reason, logged the moment it happened.~~ → The moments of your voice, in order, each logged when it happened.
- fr: ~~La vraie histoire de votre voix, dans l'ordre — chaque entrée ici s'est déclenchée pour une vraie raison, enregistrée au moment où c'est arrivé.~~ → Les moments de votre voix, dans l'ordre, chacun noté au moment où il s'est produit.
- es: ~~La historia real de tu voz, en orden — cada entrada aquí se activó por una razón real, registrada en el momento en que sucedió.~~ → Los momentos de tu voz, en orden, cada uno anotado cuando ocurrió.
- tr: ~~Sesinizin gerçek hikayesi, sırayla — buradaki her giriş gerçek bir nedenle tetiklendi, gerçekleştiği anda kaydedildi.~~ → Sesinin anları sırayla; her biri olduğu anda kaydedildi.

### `passport_needrangefinder`
- en: ~~Run the Range Finder and a few real exercises first — your Passport builds from that same real data.~~ → Run the Range Finder and a few exercises first: your Passport is built from them.
- fr: ~~Lancez d'abord le Buscador de rango et quelques vrais exercices — votre Passeport se construit à partir de ces mêmes données réelles.~~ → Faites d'abord le Détecteur de tessiture et quelques exercices : votre passeport en est construit.
- es: ~~Ejecuta primero el Buscador de rango y algunos ejercicios reales — tu Pasaporte se construye a partir de esos mismos datos reales.~~ → Haz primero el Buscador de rango y algunos ejercicios: tu pasaporte se construye con ellos.
- tr: ~~Önce Ses Aralığı Bulucu'yu ve birkaç gerçek egzersizi çalıştırın — Pasaportunuz aynı gerçek verilerden inşa edilir.~~ → Önce Ses Aralığı Bulucu'yu ve birkaç egzersizi yap: pasaportun bunlardan oluşur.

### `timeline_empty`
- en: ~~Nothing logged yet — your first real assessment, breakthrough, or level-up will start the story here.~~ → Nothing logged yet: your first assessment, breakthrough or level-up starts the timeline.
- fr: ~~Rien à afficher pour le moment — votre première vraie évaluation, percée ou montée de niveau commencera l'histoire ici.~~ → Rien pour l'instant : votre première évaluation, percée ou montée de niveau lance la chronologie.
- es: ~~Nada registrado todavía — tu primera evaluación, avance o subida de nivel real empezará la historia aquí.~~ → Nada todavía: tu primera evaluación, avance o subida de nivel inicia la cronología.
- tr: ~~Henüz bir şey kaydedilmedi — ilk gerçek değerlendirmeniz, atılımınız ya da seviye atlamanız hikayeyi burada başlatacak.~~ → Henüz bir şey yok: ilk değerlendirmen, atılımın ya da seviye atlaman çizelgeyi başlatır.

### `fingerprint_all5tracked`
- en: ~~All 5 categories tracked — updated from your real, current Skill Profile.~~ → All 5 categories scored, from your current Skill Profile.
- fr: ~~Les 5 catégories sont suivies — mis à jour depuis votre vrai Profil de compétences actuel.~~ → Les 5 catégories sont notées, d'après votre profil de compétences actuel.
- es: ~~Las 5 categorías están registradas — actualizado desde tu verdadero Perfil de habilidades actual.~~ → Las 5 categorías puntuadas, según tu perfil de habilidades actual.
- tr: ~~Tüm 5 kategori takip ediliyor — gerçek, güncel Yetenek Profilinizden güncellendi.~~ → 5 kategorinin tamamı puanlandı; güncel beceri profilinden.

### `fingerprint_of5_suffix`
- en: ~~of 5 categories have real data so far — dashed points mean genuinely not tracked yet, not a zero score.~~ → of 5 categories scored so far. A dashed point means not scored yet, not a zero.
- fr: ~~catégories sur 5 ont de vraies données jusqu'ici — les points en pointillés signifient qu'ils ne sont vraiment pas encore suivis, pas un score nul.~~ → catégories sur 5 notées pour l'instant. Un point en pointillé signifie pas encore noté, pas zéro.
- es: ~~de 5 categorías tienen datos reales hasta ahora — los puntos discontinuos significan que genuinamente aún no están registrados, no una puntuación de cero.~~ → de 5 categorías puntuadas por ahora. Un punto discontinuo significa sin puntuar aún, no un cero.
- tr: ~~/5 kategoride şimdiye kadar gerçek veri var — kesikli noktalar gerçekten henüz takip edilmediği anlamına gelir, sıfır puan değil.~~ → /5 kategori şimdilik puanlandı. Kesikli nokta, sıfır değil, henüz puanlanmadı demektir.

### `voicehealth_title`
- en: ~~🩺 Voice Health~~ → Voice Health
- fr: ~~🩺 Santé Vocale~~ → Santé vocale
- es: ~~🩺 Salud Vocal~~ → Salud vocal
- tr: ~~🩺 Ses Sağlığı~~ → Ses Sağlığı

### `voicehealth_sub`
- en: ~~Trends across sessions, not one-off warnings — a single rough day never triggers anything here, only a real multi-day decline.~~ → Trends across days, not one-off warnings: one rough day never triggers anything here, only a decline over several days.
- fr: ~~Des tendances à travers les séances, pas des avertissements ponctuels — une seule journée difficile ne déclenche jamais rien ici, seul un vrai déclin sur plusieurs jours le fait.~~ → Des tendances sur plusieurs jours, pas des alertes ponctuelles : une mauvaise journée ne déclenche rien ici, seulement une baisse sur plusieurs jours.
- es: ~~Tendencias a través de sesiones, no advertencias puntuales — un solo día difícil nunca activa nada aquí, solo un declive real de varios días lo hace.~~ → Tendencias a lo largo de los días, no avisos sueltos: un mal día nunca activa nada aquí, solo un descenso durante varios días.
- tr: ~~Tek seferlik uyarılar değil, oturumlar arası eğilimler — tek bir kötü gün burada hiçbir şeyi tetiklemez, yalnızca gerçek çok günlü bir düşüş tetikler.~~ → Tek seferlik uyarılar değil, günler boyunca eğilimler: kötü bir gün burada hiçbir şeyi tetiklemez, yalnızca birkaç güne yayılan bir düşüş.

### `profile_sharevoicecard_label`
- en: ~~🎤 Share Your Voice Card~~ → Share your Voice Card
- fr: ~~🎤 Partagez votre carte vocale~~ → Partagez votre carte vocale
- es: ~~🎤 Comparte tu tarjeta de voz~~ → Comparte tu tarjeta vocal
- tr: ~~🎤 Ses Kartınızı Paylaşın~~ → Ses Kartını Paylaş

### `profile_voicecard_desc`
- en: ~~A real snapshot of your actual progress — every number on it comes straight from your real tracked data, nothing staged for the screenshot.~~ → A picture of your current scores, made from your saved results.
- fr: ~~Un vrai instantané de vos progrès réels — chaque chiffre provient directement de vos vraies données suivies, rien n'est mis en scène pour la capture d'écran.~~ → Une image de vos scores actuels, faite à partir de vos résultats enregistrés.
- es: ~~Una instantánea real de tu progreso real — cada número proviene directamente de tus datos reales rastreados, nada preparado para la captura de pantalla.~~ → Una imagen de tus puntuaciones actuales, hecha con tus resultados guardados.
- tr: ~~Gerçek ilerlemenizin gerçek bir anlık görüntüsü — üzerindeki her sayı doğrudan gerçek izlenen verilerinizden gelir, ekran görüntüsü için hazırlanmış hiçbir şey yok.~~ → Kayıtlı sonuçlarından yapılmış, güncel puanlarının bir resmi.

### `voicecard_note_real`
- en: ~~Every number above is real — nothing staged for the screenshot.~~ → Every number on the card comes from your saved results.
- fr: ~~Chaque chiffre ci-dessus est réel — rien n'est mis en scène pour la capture d'écran.~~ → Chaque chiffre de la carte vient de vos résultats enregistrés.
- es: ~~Cada número de arriba es real — nada preparado para la captura de pantalla.~~ → Cada número de la tarjeta viene de tus resultados guardados.
- tr: ~~Yukarıdaki her sayı gerçek — ekran görüntüsü için hiçbir şey ayarlanmadı.~~ → Karttaki her sayı kayıtlı sonuçlarından gelir.

### `voicecard_note_practice`
- en: ~~Practice a bit first — this card is honest, so it needs real numbers to show.~~ → Practise a little first: the card shows only measured numbers.
- fr: ~~Pratiquez un peu d'abord — cette carte est honnête, elle a donc besoin de vrais chiffres à afficher.~~ → Pratiquez un peu d'abord : la carte n'affiche que des chiffres mesurés.
- es: ~~Practica un poco primero — esta tarjeta es honesta, así que necesita números reales para mostrar.~~ → Practica un poco primero: la tarjeta solo muestra números medidos.
- tr: ~~Önce biraz pratik yapın — bu kart dürüst, bu yüzden gösterecek gerçek sayılara ihtiyacı var.~~ → Önce biraz çalış: kart yalnızca ölçülmüş sayıları gösterir.

### `profile_fingerprint_label`
- en: ~~🫆 Your Voice Fingerprint~~ → Your Voice Fingerprint
- fr: ~~🫆 Votre empreinte vocale~~ → Votre empreinte vocale
- es: ~~🫆 Tu huella de voz~~ → Tu huella vocal
- tr: ~~🫆 Ses Parmak İziniz~~ → Ses Parmak İzin

### `profile_fingerprint_desc`
- en: ~~The real shape of your Skill Profile — same five categories as everywhere else, just drawn as one identity rather than five separate bars.~~ → The shape of your Skill Profile: the same five categories, drawn as one shape.
- fr: ~~La vraie forme de votre Profil de compétences — mêmes cinq catégories que partout ailleurs, juste dessinée comme une seule identité plutôt que cinq barres séparées.~~ → La forme de votre profil de compétences : les mêmes cinq catégories, dessinées en une seule forme.
- es: ~~La forma real de tu Perfil de habilidades — las mismas cinco categorías que en todas partes, solo dibujada como una identidad en lugar de cinco barras separadas.~~ → La forma de tu perfil de habilidades: las mismas cinco categorías, dibujadas como una sola forma.
- tr: ~~Yetenek Profilinizin gerçek şekli — her yerdeki aynı beş kategori, sadece beş ayrı çubuk yerine tek bir kimlik olarak çizilmiş.~~ → Beceri profilinin şekli: aynı beş kategori, tek bir şekil olarak çizilmiş.

### `profile_viewpassport_btn`
- en: ~~🪪 View my Vocal Passport~~ → View my Vocal Passport
- fr: ~~🪪 Voir mon passeport vocal~~ → Voir mon passeport vocal
- es: ~~🪪 Ver mi pasaporte vocal~~ → Ver mi pasaporte vocal
- tr: ~~🪪 Vokal Pasaportumu görüntüle~~ → Vokal Pasaportumu görüntüle

### `profile_vocalstats_h2`
- en: ~~Strengths & weaknesses, from your real Skill Profile~~ → Strengths and weaknesses, from your Skill Profile
- fr: ~~Forces et faiblesses, à partir de votre vrai Profil de compétences~~ → Points forts et points faibles, d'après votre profil de compétences
- es: ~~Fortalezas y debilidades, de tu Perfil de habilidades real~~ → Puntos fuertes y débiles, según tu perfil de habilidades
- tr: ~~Gerçek Yetenek Profilinizden güçlü ve zayıf yönler~~ → Beceri profilinden güçlü ve zayıf yönler

### `settings_language_title`
- en: ~~🌐 Language~~ → Language
- fr: ~~🌐 Langue~~ → Langue
- es: ~~🌐 Idioma~~ → Idioma
- tr: ~~🌐 Dil~~ → Dil

### `lang_select_disclosure`
- en: ~~Honest about scope: the whole app — navigation, every tool, exercises, games, and account screens — is fully translated. The one deliberate exception is the 21-Day Journey's day-by-day curriculum text, which stays English-only for now.~~ → The whole app is translated: navigation, every tool, exercises, games and account screens. One exception for now: the 21-Day Journey's day-by-day curriculum text is in English.
- fr: ~~En toute honnêteté sur la portée : toute l'application — navigation, chaque outil, exercices, jeux et écrans de compte — est entièrement traduite. La seule exception délibérée est le contenu jour par jour du Programme de 21 jours, qui reste en anglais pour l'instant.~~ → Toute l'application est traduite : navigation, chaque outil, exercices, jeux et écrans de compte. Une exception pour l'instant : le texte du programme jour par jour du parcours de 21 jours est en anglais.
- es: ~~Honestidad sobre el alcance: toda la app — navegación, cada herramienta, ejercicios, juegos y pantallas de cuenta — está totalmente traducida. La única excepción deliberada es el contenido día a día del Programa de 21 días, que por ahora sigue solo en inglés.~~ → Toda la app está traducida: navegación, cada herramienta, ejercicios, juegos y pantallas de cuenta. Una excepción por ahora: el texto del programa día a día del recorrido de 21 días está en inglés.
- tr: ~~Kapsam konusunda dürüstüz: uygulamanın tamamı — gezinme, her araç, egzersizler, oyunlar ve hesap ekranları — tamamen çevrildi. Tek bilinçli istisna, 21 Günlük Yolculuk'un gün gün müfredat metnidir; bu şimdilik yalnızca İngilizce kalıyor.~~ → Uygulamanın tamamı çevrildi: gezinme, her araç, egzersizler, oyunlar ve hesap ekranları. Şimdilik bir istisna: 21 günlük yolculuğun gün gün program metni İngilizce.

### `settings_playback_title`
- en: ~~🔊 Playback volume~~ → Playback volume
- fr: ~~🔊 Volume de lecture~~ → Volume de lecture
- es: ~~🔊 Volumen de reproducción~~ → Volumen de reproducción
- tr: ~~🔊 Çalma sesi~~ → Çalma sesi

### `settings_feedback_title`
- en: ~~💬 Feedback~~ → Feedback
- fr: ~~💬 Avis~~ → Avis
- es: ~~💬 Comentarios~~ → Comentarios
- tr: ~~💬 Geri Bildirim~~ → Geri Bildirim

### `settings_feedback_sub`
- en: ~~Real, specific feedback — stored so we can actually act on it, not a mailbox that goes nowhere.~~ → Specific feedback is stored so it can be acted on.
- fr: ~~Des retours réels et précis — enregistrés pour qu'on puisse vraiment agir dessus, pas une boîte mail qui ne mène nulle part.~~ → Les avis précis sont enregistrés pour pouvoir y donner suite.
- es: ~~Comentarios reales y específicos — guardados para que realmente podamos actuar, no un buzón que no lleva a ninguna parte.~~ → Los comentarios concretos se guardan para poder actuar en consecuencia.
- tr: ~~Gerçek, somut geri bildirim — gerçekten üzerinde çalışabilmemiz için saklanır, hiçbir yere gitmeyen bir posta kutusu değil.~~ → Belirli geri bildirimler, üzerinde çalışılabilsin diye saklanır.

### `unifiedprogress_nodata`
- en: ~~No real data yet in the last 14 days — practice a bit to see your trend here.~~ → No scores in the last 14 days yet: practise a bit to see your trend here.
- fr: ~~Pas encore de vraies données sur les 14 derniers jours — pratiquez un peu pour voir votre tendance ici.~~ → Pas encore de score sur les 14 derniers jours : pratiquez un peu pour voir votre tendance ici.
- es: ~~Aún no hay datos reales en los últimos 14 días — practica un poco para ver tu tendencia aquí.~~ → Aún no hay puntuaciones en los últimos 14 días: practica un poco para ver tu tendencia aquí.
- tr: ~~Son 14 günde henüz gerçek veri yok — eğiliminizi burada görmek için biraz pratik yapın.~~ → Son 14 günde henüz puan yok: eğilimini burada görmek için biraz çalış.

### `unifiedprogress_trackedof3`
- en: ~~of 3 tracked categories have real data in the last 14 days.~~ → of 3 categories have scores in the last 14 days.
- fr: ~~des 3 catégories suivies ont de vraies données sur les 14 derniers jours.~~ → catégories sur 3 ont des scores sur les 14 derniers jours.
- es: ~~de 3 categorías registradas tienen datos reales en los últimos 14 días.~~ → de 3 categorías tienen puntuaciones en los últimos 14 días.
- tr: ~~/3 takip edilen kategoride son 14 günde gerçek veri var.~~ → /3 kategorinin son 14 günde puanı var.

### `skilltree_signin`
- en: ~~Sign in to grow your real skill tree.~~ → Sign in to grow your skill tree.
- fr: ~~Connectez-vous pour développer votre vrai arbre de compétences.~~ → Connectez-vous pour faire pousser votre arbre de compétences.
- es: ~~Inicia sesión para hacer crecer tu verdadero árbol de habilidades.~~ → Inicia sesión para hacer crecer tu árbol de habilidades.
- tr: ~~Gerçek yetenek ağacınızı büyütmek için oturum açın.~~ → Beceri ağacını büyütmek için giriş yap.

### `skilltree_fullyunlocked_desc`
- en: ~~Every node reflects a real, currently-held skill level — not a one-time achievement. Scores can drift back down if a category's recent average drops.~~ → Every node shows a skill level you hold now, not a one-time achievement: it can drop if a category's recent average drops.
- fr: ~~Chaque nœud reflète un niveau de compétence réel actuellement détenu — pas une réussite ponctuelle. Les scores peuvent redescendre si la moyenne récente d'une catégorie baisse.~~ → Chaque nœud montre un niveau que vous tenez maintenant, pas un succès ponctuel : il peut baisser si la moyenne récente d'une catégorie baisse.
- es: ~~Cada nodo refleja un nivel de habilidad real que tienes actualmente — no un logro puntual. Las puntuaciones pueden volver a bajar si el promedio reciente de una categoría cae.~~ → Cada nodo muestra un nivel que tienes ahora, no un logro de una vez: puede bajar si baja la media reciente de una categoría.
- tr: ~~Her düğüm, o anda sahip olunan gerçek bir yetenek seviyesini yansıtır — tek seferlik bir başarı değil. Bir kategorinin son ortalaması düşerse puanlar tekrar geri düşebilir.~~ → Her düğüm şu an sahip olduğun bir seviyeyi gösterir, tek seferlik bir başarıyı değil: bir kategorinin son ortalaması düşerse düşebilir.

### `todaysplan_signin`
- en: ~~Sign in to get a plan built from your actual practice data.~~ → Sign in to get a plan built from your practice.
- fr: ~~Connectez-vous pour obtenir un plan basé sur vos vraies données de pratique.~~ → Connectez-vous pour obtenir un plan construit d'après votre pratique.
- es: ~~Inicia sesión para obtener un plan basado en tus datos reales de práctica.~~ → Inicia sesión para obtener un plan hecho a partir de tu práctica.
- tr: ~~Gerçek pratik verilerinize dayalı bir plan almak için oturum açın.~~ → Çalışmana göre hazırlanmış bir plan için giriş yap.

### `journey_record_btn`
- en: ~~🎙️ Record~~ → Record
- fr: ~~🎙️ Enregistrer~~ → Enregistrer
- es: ~~🎙️ Grabar~~ → Grabar
- tr: ~~🎙️ Kaydet~~ → Kaydet

### `journey_cw_label`
- en: ~~🎼 Choir World milestone~~ → Choir World milestone
- fr: ~~🎼 Étape du Monde Chorale~~ → Étape Choir World
- es: ~~🎼 Hito de Mundo Coral~~ → Hito de Choir World
- tr: ~~🎼 Koro Dünyası kilometre taşı~~ → Choir World kilometre taşı

