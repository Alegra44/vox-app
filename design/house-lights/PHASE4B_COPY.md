# Phase 4b copy table (master → redesign/phase4b)

Every TRANSLATIONS key whose text differs from master, in en, fr, es and tr (— = the key does not exist on that side).
150 keys: 52 rewritten, 98 new, 0 removed (by English). copyscan.js --tools --set 4b: 0 texts with a §7 word in all four languages (one French hit, "fausse" in Emotion Mode's coach line, reworded before this table).

| key | lang | master | branch |
|---|---|---|---|
| `action_listen` | en | — | Listen |
|  | fr | — | Écoutez |
|  | es | — | Escucha |
|  | tr | — | Dinleyin |
| `beta_analysis_tag` | en | BETA ANALYSIS | Estimate |
|  | fr | ANALYSE BÊTA | Estimation |
|  | es | ANÁLISIS BETA | Estimación |
|  | tr | BETA ANALİZ | Tahmin |
| `beta_heuristic_tag` | en | BETA HEURISTIC | Estimate |
|  | fr | HEURISTIQUE BÊTA | Estimation |
|  | es | HEURÍSTICA BETA | Estimación |
|  | tr | BETA SEZGİSEL | Tahmin |
| `drill_avg_label` | en | — | Average pitch accuracy |
|  | fr | — | Justesse moyenne |
|  | es | — | Afinación media |
|  | tr | — | Ortalama perde doğruluğu |
| `drill_chest_score` | en | — | Chest score |
|  | fr | — | Score de poitrine |
|  | es | — | Puntuación de pecho |
|  | tr | — | Göğüs puanı |
| `drill_matched_label` | en | — | Register matched |
|  | fr | — | Registre atteint |
|  | es | — | Registro logrado |
|  | tr | — | Eşleşen register |
| `drill_measure` | en | — | The five notes come from the lower third of your range (Chest) or its upper third (Head). Each plays for 0.6 seconds; listening starts 0.8 seconds after it begins and lasts 1.8 seconds. Pitch accuracy is 100 minus 0.6 times your average distance from the note, in cents, with natural vibrato taken out; readings more than 3 semitones off aren't counted. The chest score reads how bright your tone's harmonics are, from 0 (light, head-like) to 100 (rich, chest-like). A note matches Chest when its average chest score is 50 or more, Head when it's under 50. The big number is the average pitch accuracy of the notes heard. |
|  | fr | — | Les cinq notes viennent du tiers inférieur de votre tessiture (Poitrine) ou de son tiers supérieur (Tête). Chacune joue 0,6 seconde ; l'écoute commence 0,8 seconde après son début et dure 1,8 seconde. La justesse vaut 100 moins 0,6 fois votre écart moyen à la note, en cents, sans le vibrato naturel ; les mesures à plus de 3 demi-tons ne comptent pas. Le score de poitrine lit la brillance des harmoniques de votre timbre, de 0 (léger, de tête) à 100 (riche, de poitrine). Une note correspond à Poitrine quand son score moyen est de 50 ou plus, à Tête quand il est sous 50. Le grand nombre est la justesse moyenne des notes entendues. |
|  | es | — | Las cinco notas salen del tercio inferior de tu tesitura (Pecho) o de su tercio superior (Cabeza). Cada una suena 0,6 segundos; la escucha empieza 0,8 segundos después y dura 1,8 segundos. La afinación es 100 menos 0,6 veces tu distancia media a la nota, en cents, sin el vibrato natural; las lecturas a más de 3 semitonos no cuentan. La puntuación de pecho lee el brillo de los armónicos de tu timbre, de 0 (ligero, de cabeza) a 100 (rico, de pecho). Una nota coincide con Pecho cuando su puntuación media es 50 o más, con Cabeza cuando es menor de 50. El número grande es la afinación media de las notas oídas. |
|  | tr | — | Beş nota, ses aralığınızın alt üçte birinden (Göğüs) ya da üst üçte birinden (Baş) gelir. Her biri 0,6 saniye çalar; dinleme başlangıcından 0,8 saniye sonra başlar ve 1,8 saniye sürer. Perde doğruluğu, doğal vibrato çıkarılarak notaya ortalama uzaklığınızın (sent cinsinden) 0,6 katının 100'den çıkarılmasıdır; 3 yarım tondan uzak ölçümler sayılmaz. Göğüs puanı, sesinizin harmoniklerinin parlaklığını 0'dan (hafif, baş sesi gibi) 100'e (zengin, göğüs sesi gibi) okur. Ortalama göğüs puanı 50 veya üstüyse nota Göğüs ile, 50'nin altındaysa Baş ile eşleşir. Büyük sayı, duyulan notaların ortalama perde doğruluğudur. |
| `drill_note_chest` | en | Five real notes from the lower third of your range — sing with real chest-dominant resonance, not just the right pitch. | Five notes from the lower third of your range. Sing them with a chest-dominant tone, not only the right pitch. |
|  | fr | Cinq vraies notes du tiers inférieur de votre tessiture — chantez avec une vraie résonance dominante de poitrine, pas seulement la bonne note. | Cinq notes du tiers inférieur de votre tessiture. Chantez-les avec un timbre dominé par la poitrine, pas seulement à la bonne hauteur. |
|  | es | Cinco notas reales del tercio inferior de tu registro — canta con una verdadera resonancia dominante de pecho, no solo la nota correcta. | Cinco notas del tercio inferior de tu tesitura. Cántalas con un timbre de pecho, no solo con la afinación correcta. |
|  | tr | Ses aralığınızın alt üçte birinden beş gerçek nota — sadece doğru perde değil, gerçek göğüs baskın rezonansıyla söyleyin. | Ses aralığınızın alt üçte birinden beş nota. Onları yalnızca doğru perdede değil, göğüs ağırlıklı bir tonla söyleyin. |
| `drill_note_head` | en | Five real notes from the upper third of your range — sing with real head-dominant resonance, not just the right pitch. | Five notes from the upper third of your range. Sing them with a head-dominant tone, not only the right pitch. |
|  | fr | Cinq vraies notes du tiers supérieur de votre tessiture — chantez avec une vraie résonance dominante de tête, pas seulement la bonne note. | Cinq notes du tiers supérieur de votre tessiture. Chantez-les avec un timbre dominé par la tête, pas seulement à la bonne hauteur. |
|  | es | Cinco notas reales del tercio superior de tu registro — canta con una verdadera resonancia dominante de cabeza, no solo la nota correcta. | Cinco notas del tercio superior de tu tesitura. Cántalas con un timbre de cabeza, no solo con la afinación correcta. |
|  | tr | Ses aralığınızın üst üçte birinden beş gerçek nota — sadece doğru perde değil, gerçek baş baskın rezonansıyla söyleyin. | Ses aralığınızın üst üçte birinden beş nota. Onları yalnızca doğru perdede değil, baş ağırlıklı bir tonla söyleyin. |
| `drill_notenoughsignal` | en | Not enough signal captured this round. | Not enough signal was caught this round. Try again a little louder or closer to the mic. |
|  | fr | Signal insuffisant capté ce tour-ci. | Pas assez de signal capté ce tour-ci. Réessayez un peu plus fort ou plus près du micro. |
|  | es | No se captó suficiente señal en esta ronda. | No se captó suficiente señal en esta ronda. Inténtalo de nuevo un poco más fuerte o más cerca del micrófono. |
|  | tr | Bu turda yeterli sinyal alınamadı. | Bu turda yeterli sinyal yakalanamadı. Biraz daha yüksek sesle ya da mikrofona daha yakın tekrar deneyin. |
| `drill_reg_chest` | en | — | Chest |
|  | fr | — | Poitrine |
|  | es | — | Pecho |
|  | tr | — | Göğüs |
| `drill_reg_head` | en | — | Head |
|  | fr | — | Tête |
|  | es | — | Cabeza |
|  | tr | — | Baş |
| `drill_result_template` | en | {matched} of {total} notes genuinely matched {register}-dominant resonance — average pitch accuracy {avg}%. | {matched} of {total} notes matched {register} resonance; average pitch accuracy {avg}%. |
|  | fr | {matched} des {total} notes ont vraiment correspondu à une résonance dominante {register} — précision moyenne de justesse {avg} %. | {matched} notes sur {total} ont correspondu à la résonance {register} ; justesse moyenne {avg} %. |
|  | es | {matched} de {total} notas coincidieron genuinamente con resonancia dominante de {register} — precisión de afinación media {avg}%. | {matched} de {total} notas coincidieron con la resonancia de {register}; afinación media {avg}%. |
|  | tr | {total} notadan {matched} tanesi gerçekten {register} baskın rezonansla eşleşti — ortalama perde doğruluğu %{avg}. | {total} notadan {matched} tanesi {register} rezonansıyla eşleşti; ortalama perde doğruluğu %{avg}. |
| `emo_begin` | en | — | Begin: sing it {name} first |
|  | fr | — | Commencer : d'abord {name} |
|  | es | — | Empezar: primero {name} |
|  | tr | — | Başla: önce {name} |
| `emo_compared` | en | — | {b} compared with {a} |
|  | fr | — | {b} comparé à {a} |
|  | es | — | {b} comparado con {a} |
|  | tr | — | {a} ile karşılaştırıldığında {b} |
| `emo_dyn_label` | en | — | Dynamic range |
|  | fr | — | Plage dynamique |
|  | es | — | Rango dinámico |
|  | tr | — | Dinamik aralık |
| `emo_loud_label` | en | — | Loudness |
|  | fr | — | Volume |
|  | es | — | Volumen |
|  | tr | — | Ses düzeyi |
| `emo_measure` | en | — | One note from the lower middle of your range, sung twice: first with your intention, then with another picked at random. Each take plays the note for 0.6 seconds, then listens for 3 seconds from 0.9 seconds after it starts. Dynamic range is your loudest moment minus your quietest (of the moments above the silence level); loudness is your average level; pitch stability is 100 minus 3 times the spread of your pitch, in cents, with natural vibrato taken out. Each row shows the second take against the first: as a percentage for dynamic range and loudness, in points for stability. Emotion itself isn't judged: only these three are measured. |
|  | fr | — | Une note du bas-milieu de votre tessiture, chantée deux fois : d'abord avec votre intention, puis avec une autre tirée au hasard. Chaque prise joue la note 0,6 seconde, puis écoute 3 secondes à partir de 0,9 seconde après son début. La plage dynamique est votre moment le plus fort moins le plus faible (parmi ceux au-dessus du seuil de silence) ; le volume est votre niveau moyen ; la stabilité de la hauteur vaut 100 moins 3 fois la dispersion de votre hauteur, en cents, sans le vibrato naturel. Chaque ligne montre la deuxième prise face à la première : en pourcentage pour la plage dynamique et le volume, en points pour la stabilité. L'émotion elle-même n'est pas jugée : seules ces trois mesures le sont. |
|  | es | — | Una nota de la parte media baja de tu tesitura, cantada dos veces: primero con tu intención y luego con otra elegida al azar. Cada toma hace sonar la nota 0,6 segundos y luego escucha 3 segundos desde 0,9 segundos después de empezar. El rango dinámico es tu momento más fuerte menos el más suave (de los que superan el umbral de silencio); el volumen es tu nivel medio; la estabilidad de la altura es 100 menos 3 veces la dispersión de tu altura, en cents, sin el vibrato natural. Cada fila muestra la segunda toma frente a la primera: en porcentaje para el rango dinámico y el volumen, en puntos para la estabilidad. La emoción en sí no se juzga: solo se miden estas tres cosas. |
|  | tr | — | Ses aralığınızın alt-orta kısmından bir nota, iki kez söylenir: önce sizin niyetinizle, sonra rastgele seçilen bir başkasıyla. Her çekim notayı 0,6 saniye çalar, ardından başlangıçtan 0,9 saniye sonra 3 saniye dinler. Dinamik aralık, en yüksek anınız eksi en sessiz anınızdır (sessizlik eşiğinin üstündeki anlar arasında); ses düzeyi ortalama seviyenizdir; perde kararlılığı, doğal vibrato çıkarılarak perdenizin yayılımının (sent) 3 katının 100'den çıkarılmasıdır. Her satır ikinci çekimi birinciye göre gösterir: dinamik aralık ve ses düzeyi için yüzde, kararlılık için puan. Duygunun kendisi değerlendirilmez: yalnızca bu üçü ölçülür. |
| `emo_note` | en | — | Neither take is right or wrong: this shows what changed between them. |
|  | fr | — | Aucune prise n'est meilleure que l'autre : ceci montre ce qui a changé entre elles. |
|  | es | — | Ninguna toma es correcta o incorrecta: esto muestra qué cambió entre ellas. |
|  | tr | — | Hiçbir çekim doğru ya da yanlış değil: bu, aralarında neyin değiştiğini gösterir. |
| `emo_notenough` | en | — | There wasn't enough signal on one of the takes to compare them. Try again a little louder or closer to the mic. |
|  | fr | — | Il n'y avait pas assez de signal sur l'une des prises pour les comparer. Réessayez un peu plus fort ou plus près du micro. |
|  | es | — | No hubo suficiente señal en una de las tomas para compararlas. Inténtalo de nuevo un poco más fuerte o más cerca del micrófono. |
|  | tr | — | Karşılaştırmak için çekimlerden birinde yeterli sinyal yoktu. Biraz daha yüksek sesle ya da mikrofona daha yakın tekrar deneyin. |
| `emo_points` | en | — | {n} points |
|  | fr | — | {n} points |
|  | es | — | {n} puntos |
|  | tr | — | {n} puan |
| `emo_selected` | en | — | Selected: {name} |
|  | fr | — | Choisi : {name} |
|  | es | — | Elegida: {name} |
|  | tr | — | Seçilen: {name} |
| `emo_sing_as` | en | — | Sing this note: {name}. |
|  | fr | — | Chantez cette note : {name}. |
|  | es | — | Canta esta nota: {name}. |
|  | tr | — | Bu notayı söyleyin: {name}. |
| `emo_stab_label` | en | — | Pitch stability |
|  | fr | — | Stabilité de la hauteur |
|  | es | — | Estabilidad de la altura |
|  | tr | — | Perde kararlılığı |
| `emo_take` | en | — | Take {n} of 2 · {name} |
|  | fr | — | Prise {n} sur 2 · {name} |
|  | es | — | Toma {n} de 2 · {name} |
|  | tr | — | Çekim {n}/2 · {name} |
| `emotion_confident` | en | 😎 Confident | Confident |
|  | fr | 😎 Confiant | Confiant |
|  | es | 😎 Confiado | Confiado |
|  | tr | 😎 Kendinden Emin | Kendinden Emin |
| `emotion_dramatic` | en | 😱 Dramatic | Dramatic |
|  | fr | 😱 Dramatique | Dramatique |
|  | es | 😱 Dramático | Dramático |
|  | tr | 😱 Dramatik | Dramatik |
| `emotion_powerful` | en | 🔥 Powerful | Powerful |
|  | fr | 🔥 Puissant | Puissant |
|  | es | 🔥 Poderoso | Poderoso |
|  | tr | 🔥 Güçlü | Güçlü |
| `emotion_tender` | en | ❤️ Tender | Tender |
|  | fr | ❤️ Tendre | Tendre |
|  | es | ❤️ Tierno | Tierno |
|  | tr | ❤️ Hassas | Hassas |
| `emotion_vulnerable` | en | 😔 Vulnerable | Vulnerable |
|  | fr | 😔 Vulnérable | Vulnérable |
|  | es | 😔 Vulnerable | Vulnerable |
|  | tr | 😔 Kırılgan | Kırılgan |
| `emotionmode_differences_label` | en | Real, measured differences | Measured differences |
|  | fr | Vraies différences mesurées | Différences mesurées |
|  | es | Diferencias reales medidas | Diferencias medidas |
|  | tr | Gerçek, ölçülen farklar | Ölçülen farklar |
| `emotionmode_pick_label` | en | Pick two intentions to compare | Pick the intention for your first take |
|  | fr | Choisissez deux intentions à comparer | Choisissez l'intention de votre première prise |
|  | es | Elige dos intenciones para comparar | Elige la intención de tu primera toma |
|  | tr | Karşılaştırmak için iki niyet seçin | İlk çekiminizin niyetini seçin |
| `emotionmode_sub` | en | Same note, two real intentions — this app never judges which "felt" more tender or powerful, only what's genuinely measurable: real dynamic range, real loudness, and real pitch stability, compared honestly between your two takes. | The same note, sung with two intentions. Nothing judges which felt more tender or powerful: only what can be measured is compared between your two takes, dynamic range, loudness and pitch stability. |
|  | fr | Même note, deux vraies intentions — cette application ne juge jamais laquelle « ressentait » plus de tendresse ou de puissance, seulement ce qui est vraiment mesurable : vraie plage dynamique, vrai volume, et vraie stabilité de justesse, comparés honnêtement entre vos deux prises. | La même note, chantée avec deux intentions. Rien ne juge laquelle était la plus tendre ou la plus puissante : seul ce qui se mesure est comparé entre vos deux prises, plage dynamique, volume et stabilité de la hauteur. |
|  | es | Misma nota, dos intenciones reales — esta app nunca juzga cuál "se sintió" más tierna o poderosa, solo lo que es genuinamente medible: rango dinámico real, volumen real, y estabilidad de afinación real, comparados honestamente entre tus dos tomas. | La misma nota, cantada con dos intenciones. Nada juzga cuál sonó más tierna o poderosa: solo se compara lo que se puede medir entre tus dos tomas, rango dinámico, volumen y estabilidad de la altura. |
|  | tr | Aynı nota, iki gerçek niyet — bu uygulama hangisinin daha hassas veya güçlü "hissettirdiğine" asla karar vermez, sadece gerçekten ölçülebilir olanı: gerçek dinamik aralık, gerçek ses düzeyi ve gerçek perde kararlılığı, iki çekiminiz arasında dürüstçe karşılaştırılır. | Aynı nota, iki niyetle söylenir. Hangisinin daha hassas ya da güçlü hissettirdiğine bakılmaz: iki çekiminiz arasında yalnızca ölçülebilen karşılaştırılır; dinamik aralık, ses düzeyi ve perde kararlılığı. |
| `emotionmode_title` | en | 🎭 Emotion Mode | Emotion Mode |
|  | fr | 🎭 Mode Émotion | Mode Émotion |
|  | es | 🎭 Modo Emoción | Modo Emoción |
|  | tr | 🎭 Duygu Modu | Duygu Modu |
| `eve_stage_step1` | en | — | Step 1 — Hear |
|  | fr | — | Étape 1 — Écouter |
|  | es | — | Paso 1 — Escuchar |
|  | tr | — | Adım 1 — Dinle |
| `eve_stage_step2` | en | — | Step 2 — Sing |
|  | fr | — | Étape 2 — Chanter |
|  | es | — | Paso 2 — Cantar |
|  | tr | — | Adım 2 — Söyle |
| `eve_stage_step3` | en | — | Step 3 — Analyze |
|  | fr | — | Étape 3 — Analyser |
|  | es | — | Paso 3 — Analizar |
|  | tr | — | Adım 3 — Analiz |
| `eve_stage_step4` | en | — | Step 4 — Hear again (harder) |
|  | fr | — | Étape 4 — Réécouter (plus difficile) |
|  | es | — | Paso 4 — Escuchar de nuevo (más difícil) |
|  | tr | — | Adım 4 — Yeniden dinle (daha zor) |
| `eve_stage_step5` | en | — | Step 5 — Sing without help |
|  | fr | — | Étape 5 — Chanter sans aide |
|  | es | — | Paso 5 — Cantar sin ayuda |
|  | tr | — | Adım 5 — Yardımsız söyle |
| `hold_one_note` | en | — | Hold one note |
|  | fr | — | Tenez une note |
|  | es | — | Sostén una nota |
|  | tr | — | Bir nota tutun |
| `lf_balanced` | en | — | Balanced tone |
|  | fr | — | Timbre équilibré |
|  | es | — | Timbre equilibrado |
|  | tr | — | Dengeli ton |
| `lf_breath_dipping` | en | — | Volume dipping |
|  | fr | — | Le volume faiblit |
|  | es | — | El volumen baja |
|  | tr | — | Ses düzeyi düşüyor |
| `lf_breath_steady` | en | — | Steady breath support |
|  | fr | — | Soutien du souffle régulier |
|  | es | — | Apoyo de aire estable |
|  | tr | — | Sabit nefes desteği |
| `lf_flat` | en | — | Flat (−{n} ct) |
|  | fr | — | Trop bas (−{n} ct) |
|  | es | — | Por debajo (−{n} ct) |
|  | tr | — | Pes (−{n} sent) |
| `lf_in_tune` | en | — | In tune |
|  | fr | — | Juste |
|  | es | — | Afinado |
|  | tr | — | Akortlu |
| `lf_pushing` | en | — | Pushing chest: try mixed |
|  | fr | — | Poitrine forcée : essayez la voix mixte |
|  | es | — | Pecho forzado: prueba la voz mixta |
|  | tr | — | Göğüs zorlanıyor: karışık sesi deneyin |
| `lf_sharp` | en | — | Sharp (+{n} ct) |
|  | fr | — | Trop haut (+{n} ct) |
|  | es | — | Por encima (+{n} ct) |
|  | tr | — | Diyez (+{n} sent) |
| `lf_steady` | en | — | Steady |
|  | fr | — | Stable |
|  | es | — | Estable |
|  | tr | — | Sabit |
| `lf_wavering` | en | — | Wavering |
|  | fr | — | Instable |
|  | es | — | Inestable |
|  | tr | — | Dalgalı |
| `livefeedback_measure` | en | — | Pitch reads In tune within 8 cents of the nearest note, allowing for natural vibrato. Stability is 100 minus 3 times the spread of your last 30 pitch readings, in cents; 75 or more reads Steady. Loudness consistency is 100 minus 140 times how much your loudness varies over the last 40 voiced readings (its standard deviation over its mean); 65 or more reads as steady breath support. Register reads as pushing chest above 60% of your range with a chest score of 62 or more, the same reading as Register Coach. Nasality isn't measured: there's no reliable detector for it. |
|  | fr | — | La justesse est jugée juste à 8 cents ou moins de la note la plus proche, en tenant compte du vibrato naturel. La stabilité vaut 100 moins 3 fois la dispersion de vos 30 dernières mesures de hauteur, en cents ; 75 ou plus se lit Stable. La régularité du volume vaut 100 moins 140 fois la variation de votre volume sur les 40 dernières mesures chantées (écart type sur moyenne) ; 65 ou plus se lit comme un soutien du souffle régulier. Le registre se lit comme poitrine forcée au-dessus de 60 % de votre tessiture avec un score de poitrine de 62 ou plus, la même mesure que le Coach de registre. La nasalité n'est pas mesurée : il n'existe pas de détecteur fiable. |
|  | es | — | La afinación se lee Afinado a 8 cents o menos de la nota más cercana, teniendo en cuenta el vibrato natural. La estabilidad es 100 menos 3 veces la dispersión de tus últimas 30 lecturas de altura, en cents; 75 o más se lee Estable. La consistencia de volumen es 100 menos 140 veces cuánto varía tu volumen en las últimas 40 lecturas cantadas (desviación típica sobre media); 65 o más se lee como apoyo de aire estable. El registro se lee como pecho forzado por encima del 60 % de tu rango con una puntuación de pecho de 62 o más, la misma lectura que el Coach de registro. La nasalidad no se mide: no hay un detector fiable. |
|  | tr | — | Perde, doğal vibrato hesaba katılarak en yakın notaya 8 sent veya daha yakınsa Akortlu okunur. Kararlılık, son 30 perde ölçümünüzün yayılımının (sent) 3 katının 100'den çıkarılmasıdır; 75 ve üzeri Sabit okunur. Ses düzeyi tutarlılığı, son 40 sesli ölçümde ses düzeyinizin değişiminin (standart sapma bölü ortalama) 140 katının 100'den çıkarılmasıdır; 65 ve üzeri sabit nefes desteği okunur. Register, aralığınızın %60'ının üstünde ve göğüs puanı 62 veya üzeriyken göğüs zorlaması okunur; Register Koçu ile aynı ölçüm. Genizsilik ölçülmez: bunun için güvenilir bir algılayıcı yok. |
| `livefeedback_sub` | en | Fuses Tuner pitch/stability, Breath Trainer's consistency approach, and Register Coach's brightness heuristic into one live checklist. Nasality is deliberately left out — no real detector for it exists. | Four live checks while you sing: pitch, stability, loudness consistency and register. |
|  | fr | Fusionne la justesse/stabilité de l'Accordeur, l'approche de régularité de l'Entraîneur de souffle, et l'heuristique de luminosité du Coach de registre en une seule liste de contrôle en direct. La nasalité est délibérément exclue — aucun vrai détecteur n'existe pour elle. | Quatre vérifications en direct pendant que vous chantez : justesse, stabilité, régularité du volume et registre. |
|  | es | Fusiona la afinación/estabilidad del Afinador, el enfoque de consistencia del Entrenador de respiración, y la heurística de brillo del Coach de registro en una sola lista de verificación en vivo. La nasalidad se deja deliberadamente fuera — no existe un detector real para ella. | Cuatro comprobaciones en vivo mientras cantas: afinación, estabilidad, consistencia de volumen y registro. |
|  | tr | Akort Cihazı'nın perde/kararlılık, Nefes Antrenörü'nün tutarlılık yaklaşımını ve Register Koçu'nun parlaklık sezgiselini tek bir canlı kontrol listesinde birleştirir. Genizsilik kasıtlı olarak dışarıda bırakılmıştır — bunun için gerçek bir dedektör yoktur. | Siz söylerken dört canlı kontrol: perde, kararlılık, ses düzeyi tutarlılığı ve register. |
| `livefeedback_title` | en | ⚡ Real-Time Feedback | Live Feedback |
|  | fr | ⚡ Retour en Temps Réel | Retour en direct |
|  | es | ⚡ Retroalimentación en Tiempo Real | Retroalimentación en vivo |
|  | tr | ⚡ Gerçek Zamanlı Geri Bildirim | Canlı geri bildirim |
| `mic_needed` | en | — | Microphone access is needed. Please allow mic permission and try again. |
|  | fr | — | L'accès au micro est nécessaire. Autorisez le micro et réessayez. |
|  | es | — | Se necesita acceso al micrófono. Permite el micrófono e inténtalo de nuevo. |
|  | tr | — | Mikrofon erişimi gerekiyor. Mikrofon iznini verip tekrar deneyin. |
| `mirror_ai_phrase` | en | AI phrase | Phrase |
|  | fr | Phrase de l'IA | Phrase |
|  | es | Frase de la IA | Frase |
|  | tr | Yapay zeka cümlesi | Cümle |
| `mirror_deviation_label` | en | Deviation | Off by |
|  | fr | Écart | Écart |
|  | es | Desviación | Desviación |
|  | tr | Sapma | Sapma |
| `mirror_measure` | en | — | The phrase is 4 synthesised notes from your range, each up to 4 semitones from the one before, 0.7 seconds each. 0.4 seconds after it ends, 2.8 seconds of listening begin. Each moment of your echo is compared with the phrase note at the same point (0.7 seconds a note). Echo accuracy is 100 minus 0.6 times your average distance from those notes, in cents, with natural vibrato taken out; each note's score uses the same formula on its own 0.7 seconds. |
|  | fr | — | La phrase compte 4 notes synthétisées de votre tessiture, chacune à 4 demi-tons au plus de la précédente, 0,7 seconde chacune. 0,4 seconde après sa fin, 2,8 secondes d'écoute commencent. Chaque instant de votre écho est comparé à la note de la phrase au même moment (0,7 seconde par note). La précision de l'écho vaut 100 moins 0,6 fois votre écart moyen à ces notes, en cents, sans le vibrato naturel ; le score de chaque note utilise la même formule sur ses 0,7 seconde. |
|  | es | — | La frase tiene 4 notas sintetizadas de tu tesitura, cada una a 4 semitonos como mucho de la anterior, 0,7 segundos cada una. 0,4 segundos después de que termina, comienzan 2,8 segundos de escucha. Cada momento de tu eco se compara con la nota de la frase en el mismo punto (0,7 segundos por nota). La precisión del eco es 100 menos 0,6 veces tu distancia media a esas notas, en cents, sin el vibrato natural; la puntuación de cada nota usa la misma fórmula en sus 0,7 segundos. |
|  | tr | — | Cümle, aralığınızdan sentezlenmiş 4 notadır; her biri bir öncekinden en fazla 4 yarım ton uzakta ve 0,7 saniyedir. Bittikten 0,4 saniye sonra 2,8 saniyelik dinleme başlar. Yankınızın her anı, cümlenin aynı andaki notasıyla karşılaştırılır (nota başına 0,7 saniye). Yankı doğruluğu, doğal vibrato çıkarılarak bu notalara ortalama uzaklığınızın (sent cinsinden) 0,6 katının 100'den çıkarılmasıdır; her notanın puanı aynı formülü kendi 0,7 saniyesinde kullanır. |
| `mirror_off_flat_ct` | en | — | {n} ct flat |
|  | fr | — | {n} ct trop bas |
|  | es | — | {n} ct por debajo |
|  | tr | — | {n} sent pes |
| `mirror_off_flat_st` | en | — | {n} semitones flat |
|  | fr | — | {n} demi-tons trop bas |
|  | es | — | {n} semitonos por debajo |
|  | tr | — | {n} yarım ton pes |
| `mirror_off_on` | en | — | On the note |
|  | fr | — | Sur la note |
|  | es | — | En la nota |
|  | tr | — | Tam notada |
| `mirror_off_sharp_ct` | en | — | {n} ct sharp |
|  | fr | — | {n} ct trop haut |
|  | es | — | {n} ct por encima |
|  | tr | — | {n} sent diyez |
| `mirror_off_sharp_st` | en | — | {n} semitones sharp |
|  | fr | — | {n} demi-tons trop haut |
|  | es | — | {n} semitonos por encima |
|  | tr | — | {n} yarım ton diyez |
| `mirror_play_btn` | en | — | Play a new phrase |
|  | fr | — | Jouer une nouvelle phrase |
|  | es | — | Reproducir una frase nueva |
|  | tr | — | Yeni bir cümle çal |
| `mirror_replay_label` | en | 🔍 Voice Replay — scrub through your real take | Replay: scrub through your take |
|  | fr | 🔍 Replay Vocal — parcourez votre vraie prise | Réécoute : parcourez votre prise |
|  | es | 🔍 Repetición de Voz — navega por tu toma real | Repetición: recorre tu toma |
|  | tr | 🔍 Ses Tekrarı — gerçek çekiminizde gezinin | Tekrar: çekiminizde gezinin |
| `mirror_result_desc` | en | how closely your real echo tracked the reference phrase | Echo accuracy |
|  | fr | à quel point votre vrai écho a suivi la phrase de référence | Précision de l'écho |
|  | es | qué tan de cerca tu eco real siguió la frase de referencia | Precisión del eco |
|  | tr | gerçek yankınızın referans cümleyi ne kadar yakından takip ettiği | Yankı doğruluğu |
| `mirror_status_listen` | en | — | Listen to the phrase. |
|  | fr | — | Écoutez la phrase. |
|  | es | — | Escucha la frase. |
|  | tr | — | Cümleyi dinleyin. |
| `mirror_status_turn` | en | — | Your turn: echo what you heard. |
|  | fr | — | À vous : répétez ce que vous avez entendu. |
|  | es | — | Tu turno: repite lo que oíste. |
|  | tr | — | Sıra sizde: duyduğunuzu tekrarlayın. |
| `mirror_step_listen` | en | — | Listen |
|  | fr | — | Écoutez |
|  | es | — | Escucha |
|  | tr | — | Dinleyin |
| `mirror_step_turn` | en | — | Your turn |
|  | fr | — | À vous |
|  | es | — | Tu turno |
|  | tr | — | Sıra sizde |
| `mirror_sub` | en | The AI sings a real 4-note phrase inside your captured range — you echo it, and your real captured contour overlays the reference so you can see exactly where you diverged. | A 4-note phrase from your range plays; you echo it, and your contour is drawn over the phrase so you can see where you drifted. |
|  | fr | L'IA chante une vraie phrase de 4 notes dans votre tessiture capturée — vous la répétez, et votre vrai contour capturé se superpose à la référence pour que vous puissiez voir exactement où vous avez divergé. | Une phrase de 4 notes de votre tessiture est jouée ; vous la répétez, et votre contour se dessine sur la phrase pour voir où vous avez dévié. |
|  | es | La IA canta una frase real de 4 notas dentro de tu rango capturado — la repites, y tu contorno real capturado se superpone a la referencia para que puedas ver exactamente dónde divergiste. | Suena una frase de 4 notas de tu tesitura; la repites, y tu contorno se dibuja sobre la frase para que veas dónde te desviaste. |
|  | tr | Yapay zeka, yakalanmış aralığınız içinde gerçek bir 4 nota cümlesi söyler — onu yankılarsınız ve gerçek yakalanmış konturunuz referansın üzerine biner, böylece nerede ayrıldığınızı tam olarak görebilirsiniz. | Aralığınızdan 4 notalık bir cümle çalar; onu tekrarlarsınız ve konturunuz cümlenin üzerine çizilir, böylece nerede kaydığınızı görürsünüz. |
| `mirror_target_label` | en | Target | Phrase |
|  | fr | Cible | Phrase |
|  | es | Objetivo | Frase |
|  | tr | Hedef | Cümle |
| `mirror_title` | en | 🪞 Mirror Mode | Mirror Mode |
|  | fr | 🪞 Mode Miroir | Mode Miroir |
|  | es | 🪞 Modo Espejo | Modo Espejo |
|  | tr | 🪞 Ayna Modu | Ayna Modu |
| `mirror_your_echo` | en | Your echo | You |
|  | fr | Votre écho | Vous |
|  | es | Tu eco | Tú |
|  | tr | Yankınız | Siz |
| `mirror_yousang_label` | en | You sang | You |
|  | fr | Vous avez chanté | Vous |
|  | es | Cantaste | Tú |
|  | tr | Söylediğiniz | Siz |
| `onetake_expression_note` | en | Expression isn't shown — no reliable real detector exists for it anywhere in this app, and this challenge won't fake one just to fill a fourth number. | Expression isn't scored: there's no reliable way to measure it. |
|  | fr | L'expression n'est pas affichée — aucun vrai détecteur fiable n'existe pour elle nulle part dans cette application, et ce défi n'en simulera pas un juste pour remplir un quatrième chiffre. | L'expression n'est pas notée : il n'existe pas de moyen fiable de la mesurer. |
|  | es | La expresión no se muestra — no existe un detector real confiable para ella en ninguna parte de esta app, y este desafío no simulará uno solo para llenar un cuarto número. | La expresión no se puntúa: no hay una forma fiable de medirla. |
|  | tr | İfade gösterilmez — bu uygulamada onun için hiçbir yerde güvenilir gerçek bir dedektör yoktur ve bu meydan okuma dördüncü bir sayıyı doldurmak için birini sahtelemeyecektir. | İfade puanlanmaz: onu ölçmenin güvenilir bir yolu yok. |
| `onetake_gate` | en | — | One take. No restarting, no pitch guide, no correction. You get one attempt today; come back tomorrow for another. |
|  | fr | — | Une seule prise. Pas de redémarrage, pas de guide de justesse, pas de correction. Vous avez une tentative aujourd'hui ; revenez demain pour la suivante. |
|  | es | — | Una sola toma. Sin reinicio, sin guía de afinación, sin corrección. Tienes un intento hoy; vuelve mañana para otro. |
|  | tr | — | Tek çekim. Yeniden başlatma, perde rehberi ve düzeltme yok. Bugün bir deneme hakkınız var; bir sonraki için yarın gelin. |
| `onetake_measure` | en | — | Today's note comes from the lower middle of your range and stays the same all day. It plays once; 1.3 seconds after it starts, 6 seconds of listening begin. Pitch accuracy is 100 minus 0.6 times your average distance from the note, in cents, with natural vibrato taken out; readings more than 3 semitones away aren't counted. Stability is 100 minus 3 times the spread of your pitch (its standard deviation, in cents). Timing is 100 minus the share of the 6 seconds that passed before your voice came in. |
|  | fr | — | La note du jour vient du bas-milieu de votre tessiture et reste la même toute la journée. Elle joue une fois ; 1,3 seconde après son début, 6 secondes d'écoute commencent. La justesse vaut 100 moins 0,6 fois votre écart moyen à la note, en cents, sans le vibrato naturel ; les mesures à plus de 3 demi-tons ne comptent pas. La stabilité vaut 100 moins 3 fois la dispersion de votre hauteur (son écart type, en cents). L'entrée vaut 100 moins la part des 6 secondes écoulée avant que votre voix n'entre. |
|  | es | — | La nota de hoy sale de la parte media baja de tu tesitura y es la misma todo el día. Suena una vez; 1,3 segundos después de empezar, comienzan 6 segundos de escucha. La afinación es 100 menos 0,6 veces tu distancia media a la nota, en cents, sin el vibrato natural; las lecturas a más de 3 semitonos no cuentan. La estabilidad es 100 menos 3 veces la dispersión de tu altura (su desviación típica, en cents). La entrada es 100 menos la parte de los 6 segundos que pasó antes de que entrara tu voz. |
|  | tr | — | Bugünün notası ses aralığınızın alt-orta kısmından gelir ve gün boyu aynı kalır. Bir kez çalar; başladıktan 1,3 saniye sonra 6 saniyelik dinleme başlar. Perde doğruluğu, doğal vibrato çıkarılarak notaya ortalama uzaklığınızın (sent cinsinden) 0,6 katının 100'den çıkarılmasıdır; 3 yarım tondan uzak ölçümler sayılmaz. Kararlılık, perdenizin yayılımının (sent cinsinden standart sapma) 3 katının 100'den çıkarılmasıdır. Zamanlama, sesiniz girmeden önce geçen sürenin 6 saniyeye oranının 100'den çıkarılmasıdır. |
| `onetake_next` | en | — | Your next take: tomorrow |
|  | fr | — | Votre prochaine prise : demain |
|  | es | — | Tu próxima toma: mañana |
|  | tr | — | Bir sonraki çekiminiz: yarın |
| `onetake_notheard` | en | — | No clear pitch was caught on today's take. It still counts as today's attempt; come back tomorrow. |
|  | fr | — | Aucune hauteur claire n'a été captée sur la prise du jour. Elle compte quand même comme la tentative du jour ; revenez demain. |
|  | es | — | No se captó una afinación clara en la toma de hoy. Cuenta igualmente como el intento de hoy; vuelve mañana. |
|  | tr | — | Bugünün çekiminde net bir perde yakalanamadı. Yine de bugünün denemesi sayılır; yarın tekrar gelin. |
| `onetake_pitch_label` | en | — | Pitch accuracy |
|  | fr | — | Justesse |
|  | es | — | Afinación |
|  | tr | — | Perde doğruluğu |
| `onetake_recording` | en | — | Recording |
|  | fr | — | Enregistrement |
|  | es | — | Grabando |
|  | tr | — | Kaydediliyor |
| `onetake_signin` | en | — | Sign in to start your daily one take. |
|  | fr | — | Connectez-vous pour commencer votre prise du jour. |
|  | es | — | Inicia sesión para empezar tu toma del día. |
|  | tr | — | Günlük tek çekiminize başlamak için giriş yapın. |
| `onetake_stability_label` | en | — | Stability |
|  | fr | — | Stabilité |
|  | es | — | Estabilidad |
|  | tr | — | Kararlılık |
| `onetake_start_btn` | en | — | Begin today's one take |
|  | fr | — | Commencer la prise du jour |
|  | es | — | Empezar la toma de hoy |
|  | tr | — | Bugünün tek çekimine başla |
| `onetake_status_listen` | en | — | It plays once, no repeats. |
|  | fr | — | Elle ne joue qu'une fois, sans répétition. |
|  | es | — | Suena una vez, sin repetición. |
|  | tr | — | Bir kez çalar, tekrar yok. |
| `onetake_status_sing` | en | — | Sing now. No live feedback: this is your one take. |
|  | fr | — | Chantez maintenant. Pas de retour en direct : c'est votre prise unique. |
|  | es | — | Canta ahora. Sin indicaciones en vivo: esta es tu toma única. |
|  | tr | — | Şimdi söyleyin. Canlı geri bildirim yok: bu sizin tek çekiminiz. |
| `onetake_step_listen` | en | — | Listen once |
|  | fr | — | Écoutez une fois |
|  | es | — | Escucha una vez |
|  | tr | — | Bir kez dinleyin |
| `onetake_step_sing` | en | — | Your one take |
|  | fr | — | Votre prise unique |
|  | es | — | Tu toma única |
|  | tr | — | Tek çekiminiz |
| `onetake_sub` | en | One real attempt per day. No restarting once you begin, no live pitch guide while you sing, no correction. Just you, one note, one honest result. | One attempt a day. Once you begin there's no restarting, no pitch guide while you sing and no correction: one note, one result. |
|  | fr | Une vraie tentative par jour. Pas de redémarrage une fois commencé, pas de guide de justesse en direct pendant que vous chantez, pas de correction. Juste vous, une note, un résultat honnête. | Une tentative par jour. Une fois commencé, pas de redémarrage, pas de guide de justesse pendant que vous chantez, pas de correction : une note, un résultat. |
|  | es | Un intento real por día. Sin reiniciar una vez que comienzas, sin guía de afinación en vivo mientras cantas, sin corrección. Solo tú, una nota, un resultado honesto. | Un intento al día. Una vez que empiezas no hay reinicio, ni guía de afinación mientras cantas, ni corrección: una nota, un resultado. |
|  | tr | Günde bir gerçek deneme. Başladıktan sonra yeniden başlatma yok, şarkı söylerken canlı perde rehberi yok, düzeltme yok. Sadece siz, bir nota, bir dürüst sonuç. | Günde bir deneme. Başladıktan sonra yeniden başlatma, şarkı söylerken perde rehberi ve düzeltme yok: bir nota, bir sonuç. |
| `onetake_timing_label` | en | — | Timing |
|  | fr | — | Entrée |
|  | es | — | Entrada |
|  | tr | — | Zamanlama |
| `onetake_title` | en | 🔥 One Take Challenge | One Take Challenge |
|  | fr | 🔥 Défi en Une Prise | Défi en Une Prise |
|  | es | 🔥 Desafío de Una Toma | Desafío de Una Toma |
|  | tr | 🔥 Tek Çekim Meydan Okuması | Tek Çekim Meydan Okuması |
| `reg_fb_chest` | en | — | Comfortably below your passaggio. |
|  | fr | — | Confortablement sous votre passaggio. |
|  | es | — | Cómodamente por debajo de tu passaggio. |
|  | tr | — | Passaggio'nuzun rahatça altında. |
| `reg_fb_head` | en | — | Light, head-dominant tone above the break. |
|  | fr | — | Timbre léger, dominé par la tête, au-dessus du passage. |
|  | es | — | Timbre ligero, de cabeza, por encima del paso. |
|  | tr | — | Geçişin üstünde hafif, baş ağırlıklı bir ton. |
| `reg_fb_mixed` | en | — | A blended tone crossing the bridge. |
|  | fr | — | Un timbre mixte qui franchit le passage. |
|  | es | — | Un timbre mezclado cruzando el puente. |
|  | tr | — | Köprüyü geçen karışık bir ton. |
| `reg_fb_pushing` | en | — | You're carrying chest voice past the break: try lightening into mixed. |
|  | fr | — | Vous portez la voix de poitrine au-delà du passage : essayez d'alléger vers la voix mixte. |
|  | es | — | Llevas la voz de pecho más allá del paso: intenta aligerar hacia la voz mixta. |
|  | tr | — | Göğüs sesini geçişin ötesine taşıyorsunuz: karışık sese doğru hafiflemeyi deneyin. |
| `reg_label_chest` | en | — | Chest voice |
|  | fr | — | Voix de poitrine |
|  | es | — | Voz de pecho |
|  | tr | — | Göğüs sesi |
| `reg_label_head` | en | — | Head voice |
|  | fr | — | Voix de tête |
|  | es | — | Voz de cabeza |
|  | tr | — | Baş sesi |
| `reg_label_mixed` | en | — | Mixed voice |
|  | fr | — | Voix mixte |
|  | es | — | Voz mixta |
|  | tr | — | Karışık ses |
| `reg_label_pushing` | en | — | Pushing chest |
|  | fr | — | Poitrine forcée |
|  | es | — | Pecho forzado |
|  | tr | — | Göğüs zorlanıyor |
| `register_best_label` | en | — | Best |
|  | fr | — | Record |
|  | es | — | Mejor |
|  | tr | — | En iyi |
| `register_last_crossing` | en | — | Last crossing |
|  | fr | — | Dernier passage |
|  | es | — | Último cruce |
|  | tr | — | Son geçiş |
| `register_measure` | en | — | Each frame, the pitch is read from the low-passed path, and a chest score from the brightness of your harmonics: the power-weighted average frequency up to 6 kHz, relative to the pitch, from 0 (light, head-like) to 100 (rich, chest-like). The passaggio is set 60% of the way up your range. Below it you're in chest voice; above it, a chest score of 62 or more reads as pushing chest, 35 or more as mixed voice, under that as head voice. A clean crossing is the time spent above the passaggio without pushing chest; your best is saved. This is a rule-based estimate from one microphone, not a trained model. |
|  | fr | — | À chaque image, la hauteur est lue sur la voie filtrée, et un score de poitrine d'après la brillance de vos harmoniques : la fréquence moyenne pondérée par la puissance jusqu'à 6 kHz, rapportée à la hauteur, de 0 (léger, de tête) à 100 (riche, de poitrine). Le passaggio est placé à 60 % de la hauteur de votre tessiture. En dessous, vous êtes en voix de poitrine ; au-dessus, un score de 62 ou plus se lit comme poitrine forcée, 35 ou plus comme voix mixte, en dessous comme voix de tête. Un passage propre est le temps passé au-dessus du passaggio sans forcer la poitrine ; votre record est enregistré. C'est une estimation à base de règles avec un seul micro, pas un modèle entraîné. |
|  | es | — | En cada fotograma, la altura se lee de la vía filtrada, y una puntuación de pecho a partir del brillo de tus armónicos: la frecuencia media ponderada por la potencia hasta 6 kHz, relativa a la altura, de 0 (ligera, de cabeza) a 100 (rica, de pecho). El passaggio se sitúa al 60 % de la subida de tu rango. Por debajo estás en voz de pecho; por encima, una puntuación de 62 o más se lee como pecho forzado, de 35 o más como voz mixta y, por debajo, como voz de cabeza. Un cruce limpio es el tiempo por encima del passaggio sin forzar el pecho; se guarda tu mejor marca. Es una estimación basada en reglas con un solo micrófono, no un modelo entrenado. |
|  | tr | — | Her karede perde, alçak geçiren yoldan okunur; göğüs puanı da harmoniklerinizin parlaklığından: 6 kHz'e kadar güçle ağırlıklandırılmış ortalama frekansın perdeye oranı, 0'dan (hafif, baş sesi gibi) 100'e (zengin, göğüs sesi gibi). Passaggio, aralığınızın %60'ına konur. Altında göğüs sesindesiniz; üstünde 62 ve üzeri puan göğüs zorlaması, 35 ve üzeri karışık ses, altı baş sesi olarak okunur. Temiz geçiş, göğsü zorlamadan passaggio'nun üstünde geçen süredir; en iyiniz kaydedilir. Bu, tek mikrofonla kurala dayalı bir tahmindir, eğitilmiş bir model değil. |
| `register_start_btn` | en | — | Start listening |
|  | fr | — | Commencer l'écoute |
|  | es | — | Empezar a escuchar |
|  | tr | — | Dinlemeye başla |
| `register_sub` | en | Build your bridge across the passaggio — reads the brightness of your vocal harmonics, a rule-based approximation, not a trained model (see PRD §3.2 / §12). Uses your Range Finder range if you've captured it, otherwise assumes A2–C5. | Slide from a low note up to a high one and see where your voice crosses the passaggio, the break between chest and head voice. It reads the brightness of your harmonics, and uses your Range Finder range if you've captured one (otherwise A2–C5). |
|  | fr | Construisez votre pont à travers le passaggio — lit la luminosité de vos harmoniques vocales, une approximation basée sur des règles, pas un modèle entraîné (voir PRD §3.2 / §12). Utilise votre tessiture du Détecteur de tessiture si vous l'avez capturée, sinon suppose A2–C5. | Glissez d'une note grave à une note aiguë et voyez où votre voix franchit le passaggio, la zone de passage entre voix de poitrine et voix de tête. La mesure lit la brillance de vos harmoniques et utilise votre tessiture du Détecteur de tessiture si vous l'avez capturée (sinon A2–C5). |
|  | es | Construye tu puente a través del passaggio — lee el brillo de tus armónicos vocales, una aproximación basada en reglas, no un modelo entrenado (ver PRD §3.2 / §12). Usa tu rango del Buscador de rango si lo has capturado, si no, asume A2–C5. | Desliza de una nota grave a una aguda y mira dónde cruza tu voz el passaggio, el paso entre la voz de pecho y la de cabeza. Lee el brillo de tus armónicos y usa tu rango del Buscador de rango si lo has capturado (si no, A2–C5). |
|  | tr | Passaggio boyunca köprünüzü kurun — vokal harmoniklerinizin parlaklığını okur, eğitilmiş bir model değil kural tabanlı bir yaklaşımdır (bkz. PRD §3.2 / §12). Yakaladıysanız Ses Aralığı Bulucu aralığınızı kullanır, aksi halde A2–C5 varsayar. | Pes bir notadan tiz bir notaya kayın ve sesinizin göğüs ile baş sesi arasındaki geçişi, passaggio'yu nerede aştığını görün. Harmoniklerinizin parlaklığını okur; yakaladıysanız Ses Aralığı Bulucu aralığınızı kullanır (yoksa A2–C5). |
| `register_title` | en | 🌉 Register Bridge | Register Coach |
|  | fr | 🌉 Pont de Registre | Coach de registre |
|  | es | 🌉 Puente de Registro | Coach de registro |
|  | tr | 🌉 Register Köprüsü | Register Koçu |
| `registercoach_nobest` | en | — | No best yet |
|  | fr | — | Pas encore de record |
|  | es | — | Aún sin récord |
|  | tr | — | Henüz en iyi yok |
| `registerdrills_results_label` | en | Real results | Drill results |
|  | fr | Résultats réels | Résultats de l'exercice |
|  | es | Resultados reales | Resultados del ejercicio |
|  | tr | Gerçek sonuçlar | Egzersiz sonuçları |
| `registerdrills_sub` | en | Real chest and head voice drills — this doesn't just confine the target note to a range, it verifies your actual spectral brightness during capture, the same real detection used in Register Coach. | Chest and head voice drills: besides the note, each one checks the brightness of your tone while you sing, the same reading Register Coach uses. |
|  | fr | De vrais exercices de voix de poitrine et de tête — ceci ne se contente pas de confiner la note cible à une plage, cela vérifie votre vraie luminosité spectrale pendant la capture, la même détection réelle utilisée dans le Coach de registre. | Des exercices de voix de poitrine et de tête : en plus de la note, chacun vérifie la brillance de votre timbre pendant que vous chantez, la même mesure que le Coach de registre. |
|  | es | Ejercicios reales de voz de pecho y cabeza — esto no solo confina la nota objetivo a un rango, verifica tu brillo espectral real durante la captura, la misma detección real usada en el Coach de registro. | Ejercicios de voz de pecho y de cabeza: además de la nota, cada uno comprueba el brillo de tu timbre mientras cantas, la misma lectura que usa el Coach de registro. |
|  | tr | Gerçek göğüs ve baş sesi egzersizleri — bu sadece hedef notayı bir aralığa sınırlamaz, yakalama sırasında gerçek spektral parlaklığınızı doğrular, Register Koçu'nda kullanılan aynı gerçek algılama. | Göğüs ve baş sesi egzersizleri: notanın yanında her biri, siz söylerken sesinizin parlaklığını da ölçer; Register Koçu'nun kullandığı ölçümün aynısı. |
| `registerdrills_title` | en | 🎯 Register Drills | Register Drills |
|  | fr | 🎯 Exercices de Registre | Exercices de Registre |
|  | es | 🎯 Ejercicios de Registro | Ejercicios de Registro |
|  | tr | 🎯 Register Egzersizleri | Register Egzersizleri |
| `res_calm` | en | — | Calm |
|  | fr | — | Calme |
|  | es | — | Tranquila |
|  | tr | — | Sakin |
| `res_canvas_label` | en | — | Your voice as particles: the colour shows your register, the spread your pitch steadiness |
|  | fr | — | Votre voix en particules : la couleur montre votre registre, l'étalement la stabilité de votre hauteur |
|  | es | — | Tu voz en partículas: el color muestra tu registro y la dispersión la estabilidad de tu altura |
|  | tr | — | Parçacıklar olarak sesiniz: renk register'ınızı, yayılım perde kararlılığınızı gösterir |
| `res_rippling` | en | — | Rippling |
|  | fr | — | Ondulante |
|  | es | — | Ondulante |
|  | tr | — | Dalgalı |
| `res_zone_chest` | en | — | Chest |
|  | fr | — | Poitrine |
|  | es | — | Pecho |
|  | tr | — | Göğüs |
| `res_zone_head` | en | — | Head |
|  | fr | — | Tête |
|  | es | — | Cabeza |
|  | tr | — | Baş |
| `res_zone_mixed` | en | — | Mixed |
|  | fr | — | Mixte |
|  | es | — | Mixta |
|  | tr | — | Karışık |
| `resonance_limits_note` | en | Honest about limits: "oscillation" here is a live proxy (rolling pitch variance + zero-crossing rate), not lab-grade vibrato analysis — for that, see the Vibrato Analyzer, which runs a real peak-detection pass on a captured take. | Ripple is a live proxy (the rolling spread of your pitch and how often it crosses its average), not a vibrato analysis: for that, use Vibrato, which finds the peaks of a held note. |
|  | fr | Honnête sur les limites : « oscillation » ici est un proxy en direct (variance de justesse glissante + taux de passage à zéro), pas une analyse de vibrato de qualité laboratoire — pour cela, voir l'Analyseur de vibrato, qui exécute une vraie passe de détection de crêtes sur une prise capturée. | L'ondulation est un indicateur en direct (la dispersion glissante de votre hauteur et la fréquence à laquelle elle croise sa moyenne), pas une analyse du vibrato : pour cela, utilisez Vibrato, qui trouve les crêtes d'une note tenue. |
|  | es | Honestos sobre los límites: "oscilación" aquí es un proxy en vivo (varianza de afinación continua + tasa de cruce por cero), no un análisis de vibrato de grado laboratorio — para eso, ve el Analizador de vibrato, que ejecuta una pasada real de detección de picos en una toma capturada. | La ondulación es un indicador en vivo (la dispersión móvil de tu altura y cuántas veces cruza su media), no un análisis de vibrato: para eso, usa Vibrato, que encuentra los picos de una nota sostenida. |
|  | tr | Sınırlar konusunda dürüz: buradaki "salınım" canlı bir vekildir (kayan perde varyansı + sıfır geçiş oranı), laboratuvar kalitesinde vibrato analizi değil — bunun için, yakalanmış bir alım üzerinde gerçek bir tepe-algılama geçişi çalıştıran Vibrato Analizörüne bakın. | Dalgalanma canlı bir göstergedir (perdenizin kayan yayılımı ve ortalamasını ne sıklıkla kestiği), vibrato analizi değildir: bunun için tutulan bir notanın tepelerini bulan Vibrato'yu kullanın. |
| `resonance_measure` | en | — | The register comes from the chest score, the same reading as Register Coach (the brightness of your harmonics): 62 or more reads Chest, 35 or more Mixed, under 35 Head. Steadiness is 100 minus 2.2 times the spread of your last 45 pitch readings, in cents (their standard deviation). Ripple counts how often your pitch crosses its average over those readings: 3 or more crossings reads Rippling. |
|  | fr | — | Le registre vient du score de poitrine, la même mesure que le Coach de registre (la brillance de vos harmoniques) : 62 ou plus se lit Poitrine, 35 ou plus Mixte, sous 35 Tête. La stabilité vaut 100 moins 2,2 fois la dispersion de vos 45 dernières mesures de hauteur, en cents (leur écart type). L'ondulation compte combien de fois votre hauteur croise sa moyenne sur ces mesures : 3 croisements ou plus se lisent Ondulante. |
|  | es | — | El registro sale de la puntuación de pecho, la misma lectura que el Coach de registro (el brillo de tus armónicos): 62 o más se lee Pecho, 35 o más Mixta, por debajo de 35 Cabeza. La estabilidad es 100 menos 2,2 veces la dispersión de tus últimas 45 lecturas de altura, en cents (su desviación típica). La ondulación cuenta cuántas veces tu altura cruza su media en esas lecturas: 3 cruces o más se leen Ondulante. |
|  | tr | — | Register, Register Koçu ile aynı ölçüm olan göğüs puanından gelir (harmoniklerinizin parlaklığı): 62 ve üzeri Göğüs, 35 ve üzeri Karışık, 35'in altı Baş okunur. Sabitlik, son 45 perde ölçümünüzün yayılımının (sent cinsinden standart sapma) 2,2 katının 100'den çıkarılmasıdır. Dalgalanma, perdenizin bu ölçümlerde ortalamasını kaç kez kestiğini sayar: 3 veya daha fazla kesişim Dalgalı okunur. |
| `resonance_oscillation_label` | en | Oscillation | Ripple |
|  | fr | Oscillation | Ondulation |
|  | es | Oscilación | Ondulación |
|  | tr | Salınım | Dalgalanma |
| `resonance_sub` | en | Sing freely — real signals given visual form: amber for chest, cyan for head, violet for mixed voice. Particles contract when your pitch is steady and ripple when it's genuinely oscillating, not a preset animation. | Sing freely and see your voice as a field of particles: the colour follows your register (chest, mixed or head), and the particles gather when your pitch is steady and ripple when it moves. |
|  | fr | Chantez librement — de vrais signaux prenant forme visuelle : ambre pour la poitrine, cyan pour la tête, violet pour la voix mixte. Les particules se contractent quand votre justesse est stable et ondulent quand elle oscille vraiment, pas une animation préréglée. | Chantez librement et voyez votre voix comme un nuage de particules : la couleur suit votre registre (poitrine, mixte ou tête), et les particules se resserrent quand votre hauteur est stable et ondulent quand elle bouge. |
|  | es | Canta libremente — señales reales tomando forma visual: ámbar para pecho, cian para cabeza, violeta para voz mixta. Las partículas se contraen cuando tu afinación es estable y ondulan cuando realmente está oscilando, no una animación preestablecida. | Canta libremente y mira tu voz como un campo de partículas: el color sigue tu registro (pecho, mixto o cabeza) y las partículas se juntan cuando tu altura es estable y ondulan cuando se mueve. |
|  | tr | Özgürce söyleyin — gerçek sinyaller görsel forma bürünür: göğüs için kehribar, baş için camgöbeği, karma ses için mor. Perdeniz sabitken parçacıklar büzülür ve gerçekten salınırken dalgalanır, önceden ayarlanmış bir animasyon değil. | Özgürce söyleyin ve sesinizi bir parçacık alanı olarak görün: renk register'ınızı izler (göğüs, karışık ya da baş); perdeniz sabitken parçacıklar toplanır, oynadığında dalgalanır. |
| `resonance_title` | en | 🎨 Resonance Visualizer | Resonance Visualizer |
|  | fr | 🎨 Visualiseur de Résonance | Visualiseur de Résonance |
|  | es | 🎨 Visualizador de Resonancia | Visualizador de Resonancia |
|  | tr | 🎨 Rezonans Görselleştirici | Rezonans Görselleştirici |
| `rhythm_caught_label` | en | — | Beats caught |
|  | fr | — | Temps captés |
|  | es | — | Tiempos captados |
|  | tr | — | Yakalanan vuruşlar |
| `rhythm_chart_label` | en | — | Each beat's timing: above the line late, below early |
|  | fr | — | Le timing de chaque temps : au-dessus de la ligne en retard, en dessous en avance |
|  | es | — | El tiempo de cada pulso: por encima de la línea tarde, por debajo antes |
|  | tr | — | Her vuruşun zamanlaması: çizginin üstü geç, altı erken |
| `rhythm_countin` | en | — | Count-in |
|  | fr | — | Décompte |
|  | es | — | Conteo |
|  | tr | — | Sayım |
| `rhythm_desc` | en | A 2-beat count-in, then 8 real scored beats. Sing, tap, or say "ta" right on each click — any sound works, this only measures timing, not pitch. | A 2-beat count-in, then 8 scored beats. Sing, tap or say "ta" right on each click: any sound works, this measures timing only, not pitch. |
|  | fr | Un décompte de 2 temps, puis 8 vrais temps notés. Chantez, tapez, ou dites "ta" juste sur chaque clic — n'importe quel son fonctionne, ceci ne mesure que le rythme, pas la justesse. | Un décompte de 2 temps, puis 8 temps notés. Chantez, tapez ou dites « ta » juste sur chaque clic : tout son convient, seul le rythme est mesuré, pas la justesse. |
|  | es | Un conteo de 2 tiempos, luego 8 tiempos reales puntuados. Canta, toca, o di "ta" justo en cada clic — cualquier sonido funciona, esto solo mide el ritmo, no la afinación. | Un conteo de 2 tiempos y luego 8 tiempos puntuados. Canta, da un toque o di «ta» justo en cada clic: sirve cualquier sonido, solo se mide el ritmo, no la afinación. |
|  | tr | 2 vuruşluk bir sayım, ardından 8 gerçek puanlı vuruş. Her tıklamada tam üzerinde şarkı söyleyin, vurun veya "ta" deyin — herhangi bir ses işe yarar, bu sadece zamanlamayı ölçer, perdeyi değil. | 2 vuruşluk bir sayım, ardından 8 puanlı vuruş. Her tıklamada tam üstüne söyleyin, vurun ya da "ta" deyin: her ses olur, yalnızca zamanlama ölçülür, perde değil. |
| `rhythm_listen_instructions` | en | Listen for 2 clicks, then sing on each of the next 8… | Sing on each click |
|  | fr | Écoutez 2 clics, puis chantez sur chacun des 8 suivants… | Chantez sur chaque clic |
|  | es | Escucha 2 clics, luego canta en cada uno de los siguientes 8… | Canta en cada clic |
|  | tr | 2 tıklama dinleyin, sonra sonraki 8'in her birinde şarkı söyleyin… | Her tıklamada söyleyin |
| `rhythm_measure` | en | — | Two count-in clicks, then 8 scored clicks at 70, 100 or 130 beats a minute. Each time your loudness rises past the onset level, that onset goes to the nearest scored beat not yet caught, if it's within half a beat of it. A beat scores 100 minus 0.6 times how far off it was, in milliseconds (above the line late, below it early); the result is the average of the beats caught. A beat with no onset is missed and left out of the average. The delay of your speaker and microphone isn't taken out. |
|  | fr | — | Deux clics de décompte, puis 8 clics notés à 70, 100 ou 130 temps par minute. Chaque fois que votre volume dépasse le seuil d'attaque, cette attaque va au temps noté le plus proche pas encore capté, s'il est à moins d'un demi-temps. Un temps vaut 100 moins 0,6 fois son écart, en millisecondes (au-dessus de la ligne en retard, en dessous en avance) ; le résultat est la moyenne des temps captés. Un temps sans attaque est manqué et ne compte pas dans la moyenne. Le délai de votre haut-parleur et de votre micro n'est pas retiré. |
|  | es | — | Dos clics de conteo y luego 8 clics puntuados a 70, 100 o 130 pulsos por minuto. Cada vez que tu volumen supera el umbral de ataque, ese ataque va al tiempo puntuado más cercano aún no captado, si está a menos de medio tiempo. Un tiempo puntúa 100 menos 0,6 veces su desvío, en milisegundos (por encima de la línea tarde, por debajo antes); el resultado es la media de los tiempos captados. Un tiempo sin ataque es perdido y no cuenta en la media. No se descuenta el retardo de tu altavoz y tu micrófono. |
|  | tr | — | İki sayım tıklaması, ardından dakikada 70, 100 ya da 130 vuruşta 8 puanlı tıklama. Ses düzeyiniz giriş eşiğini her aştığında o giriş, henüz yakalanmamış en yakın puanlı vuruşa gider; yarım vuruştan yakınsa. Bir vuruş, sapmasının (milisaniye cinsinden) 0,6 katının 100'den çıkarılmasıyla puanlanır (çizginin üstü geç, altı erken); sonuç yakalanan vuruşların ortalamasıdır. Girişi olmayan vuruş kaçırılmış sayılır ve ortalamaya girmez. Hoparlörünüzün ve mikrofonunuzun gecikmesi çıkarılmaz. |
| `rhythm_ms_early` | en | — | {n} ms early |
|  | fr | — | {n} ms en avance |
|  | es | — | {n} ms antes |
|  | tr | — | {n} ms erken |
| `rhythm_ms_late` | en | — | {n} ms late |
|  | fr | — | {n} ms en retard |
|  | es | — | {n} ms tarde |
|  | tr | — | {n} ms geç |
| `rhythm_ms_on` | en | — | On the beat |
|  | fr | — | Sur le temps |
|  | es | — | En el tiempo |
|  | tr | — | Tam vuruşta |
| `rhythm_none` | en | — | No onset was caught on a beat. Sing, tap or say "ta" right on each click. |
|  | fr | — | Aucune attaque n’a été captée sur un temps. Chantez, tapez ou dites « ta » juste sur chaque clic. |
|  | es | — | No se captó ningún ataque en un tiempo. Canta, da un toque o di «ta» justo en cada clic. |
|  | tr | — | Hiçbir vuruşta giriş yakalanamadı. Her tıklamada tam üstüne söyleyin, vurun ya da "ta" deyin. |
| `rhythm_result_desc` | en | average timing accuracy across 8 real beats | Average timing accuracy |
|  | fr | précision de rythme moyenne sur 8 vrais temps | Précision rythmique moyenne |
|  | es | precisión de ritmo promedio en 8 tiempos reales | Precisión rítmica media |
|  | tr | 8 gerçek vuruş boyunca ortalama zamanlama doğruluğu | Ortalama zamanlama doğruluğu |
| `rhythm_sub` | en | Genuinely different from every other tool here — this measures WHEN you sing, not pitch. Real onset detection against a real metronome, not a fixed animation. | This one measures when you sing, not pitch: your onsets against a metronome. |
|  | fr | Vraiment différent de tous les autres outils ici — ceci mesure QUAND vous chantez, pas la justesse. Vraie détection d'attaque contre un vrai métronome, pas une animation fixe. | Celui-ci mesure quand vous chantez, pas la justesse : vos attaques face à un métronome. |
|  | es | Genuinamente diferente de cualquier otra herramienta aquí — esto mide CUÁNDO cantas, no la afinación. Detección real de ataque contra un metrónomo real, no una animación fija. | Este mide cuándo cantas, no la afinación: tus ataques frente a un metrónomo. |
|  | tr | Buradaki diğer her araçtan gerçekten farklı — bu, NE ZAMAN söylediğinizi ölçer, perdeyi değil. Sabit bir animasyon değil, gerçek bir metronoma karşı gerçek başlangıç algılama. | Bu, perdeyi değil ne zaman söylediğinizi ölçer: bir metronoma karşı girişleriniz. |
| `rhythm_title` | en | 🥁 Rhythm Trainer | Rhythm Trainer |
|  | fr | 🥁 Entraîneur de Rythme | Entraîneur de Rythme |
|  | es | 🥁 Entrenador de Ritmo | Entrenador de Ritmo |
|  | tr | 🥁 Ritim Antrenörü | Ritim Antrenörü |
| `stage_seconds_left` | en | — | {n} s left |
|  | fr | — | Encore {n} s |
|  | es | — | Quedan {n} s |
|  | tr | — | {n} sn kaldı |
| `tool_live_feedback` | en | Live Feedback | Live Feedback |
|  | fr | Retour en direct | Retour en direct |
|  | es | Retroalimentación en vivo | Retroalimentación en vivo |
|  | tr | Canlı Geri Bildirim | Canlı geri bildirim |
| `vibrato_fb_inrange` | en | — | {rate} Hz is within the commonly cited natural range. |
|  | fr | — | {rate} Hz est dans la plage naturelle généralement citée. |
|  | es | — | {rate} Hz está dentro del rango natural citado con frecuencia. |
|  | tr | — | {rate} Hz, sık belirtilen doğal aralığın içinde. |
| `vibrato_fb_none` | en | — | No clear vibrato: that's expected for a straight tone, or the hold may need to be steadier or longer. |
|  | fr | — | Pas de vibrato net : c'est normal pour un son droit, ou la tenue doit être plus stable ou plus longue. |
|  | es | — | Sin vibrato claro: es lo esperado en un sonido recto, o el sostenido necesita ser más estable o más largo. |
|  | tr | — | Belirgin vibrato yok: düz bir ses için beklenen budur ya da tutuşun daha sabit veya daha uzun olması gerekebilir. |
| `vibrato_fb_nopitch` | en | — | Didn't catch a clear held pitch. Try again, closer to the mic. |
|  | fr | — | Aucune hauteur tenue nette n'a été captée. Réessayez, plus près du micro. |
|  | es | — | No se captó una altura sostenida clara. Inténtalo de nuevo, más cerca del micrófono. |
|  | tr | — | Net, tutulan bir perde yakalanamadı. Mikrofona daha yakın tekrar deneyin. |
| `vibrato_fb_outrange` | en | — | {rate} Hz is outside the commonly cited natural range (about 5 to 6.5 Hz): not necessarily wrong, just worth noticing. |
|  | fr | — | {rate} Hz est hors de la plage naturelle généralement citée (environ 5 à 6,5 Hz) : pas forcément faux, mais à remarquer. |
|  | es | — | {rate} Hz está fuera del rango natural citado con frecuencia (unos 5 a 6,5 Hz): no es necesariamente un error, pero conviene notarlo. |
|  | tr | — | {rate} Hz, sık belirtilen doğal aralığın (yaklaşık 5–6,5 Hz) dışında: yanlış olmak zorunda değil, yalnızca dikkat etmeye değer. |
| `vibrato_fb_wide` | en | — | The depth is quite wide: if it feels forced, try releasing some tension. |
|  | fr | — | L'amplitude est assez large : si elle vous semble forcée, essayez de relâcher un peu. |
|  | es | — | La profundidad es bastante amplia: si se siente forzada, intenta soltar algo de tensión. |
|  | tr | — | Derinlik oldukça geniş: zorlanmış hissettiriyorsa biraz gerginliği bırakmayı deneyin. |
| `vibrato_measure` | en | — | Your pitch is read about 60 times a second over a 4-second hold, from the microphone's low-passed pitch path. Readings more than 3 semitones from the middle of the hold are left out (the detector slipping). The rate is 1 over the average time between the peaks of your pitch curve (peaks at least 0.1 seconds apart); consistency is 100 minus 160 times how much those times vary (their standard deviation over their mean). Depth is the median swing from each peak to the troughs either side, halved, and corrected for the detector's averaging. Under 8 cents of depth it isn't counted as vibrato: a straight tone. The trace shows ±100 cents around the hold's average. The natural range commonly cited is about 5 to 6.5 Hz. With one microphone this is an estimate: a coaching cue, not a lab measurement. |
|  | fr | — | Votre hauteur est lue environ 60 fois par seconde pendant une tenue de 4 secondes, sur la voie de hauteur filtrée du micro. Les mesures à plus de 3 demi-tons du milieu de la tenue sont écartées (des erreurs du détecteur). La fréquence est 1 divisé par le temps moyen entre les crêtes de votre courbe de hauteur (crêtes espacées d'au moins 0,1 seconde) ; la régularité vaut 100 moins 160 fois la variation de ces temps (leur écart type sur leur moyenne). L'amplitude est l'écart médian entre chaque crête et les creux qui l'entourent, divisé par deux et corrigé de la moyenne du détecteur. Sous 8 cents d'amplitude, ce n'est pas compté comme du vibrato : un son droit. Le tracé montre ±100 cents autour de la moyenne de la tenue. La plage naturelle généralement citée est d'environ 5 à 6,5 Hz. Avec un seul micro, c'est une estimation : un repère de coaching, pas une mesure de laboratoire. |
|  | es | — | Tu altura se lee unas 60 veces por segundo durante un sostenido de 4 segundos, desde la vía de afinación filtrada del micrófono. Las lecturas a más de 3 semitonos del centro del sostenido se descartan (fallos del detector). La frecuencia es 1 dividido por el tiempo medio entre los picos de tu curva de altura (picos separados al menos 0,1 segundos); la consistencia es 100 menos 160 veces cuánto varían esos tiempos (su desviación típica sobre su media). La profundidad es la oscilación mediana de cada pico a los valles de cada lado, dividida por dos y corregida por el promedio del detector. Por debajo de 8 cents de profundidad no cuenta como vibrato: un sonido recto. El trazo muestra ±100 cents alrededor de la media del sostenido. El rango natural citado con frecuencia es de unos 5 a 6,5 Hz. Con un solo micrófono es una estimación: una referencia de entrenamiento, no una medición de laboratorio. |
|  | tr | — | Perdeniz, 4 saniyelik tutuş boyunca mikrofonun alçak geçiren perde yolundan saniyede yaklaşık 60 kez okunur. Tutuşun ortasından 3 yarım tondan uzak ölçümler atılır (algılayıcı kaymaları). Hız, perde eğrinizdeki tepeler arasındaki ortalama sürenin tersidir (tepeler en az 0,1 saniye arayla); tutarlılık, bu sürelerin değişiminin (standart sapma bölü ortalama) 160 katının 100'den çıkarılmasıdır. Derinlik, her tepeden iki yanındaki çukurlara olan medyan salınımın yarısıdır ve algılayıcının ortalamasına göre düzeltilir. 8 sentin altındaki derinlik vibrato sayılmaz: düz bir ses. İz, tutuşun ortalaması çevresinde ±100 senti gösterir. Sık belirtilen doğal aralık yaklaşık 5–6,5 Hz'dir. Tek mikrofonla bu bir tahmindir: laboratuvar ölçümü değil, bir koçluk ipucu. |
| `vibrato_rate_label` | en | Rate | Vibrato rate |
|  | fr | Fréquence | Fréquence du vibrato |
|  | es | Frecuencia | Frecuencia del vibrato |
|  | tr | Hız | Vibrato hızı |
| `vibrato_start_btn` | en | — | Hold a note for 4 s |
|  | fr | — | Tenez une note 4 s |
|  | es | — | Sostén una nota 4 s |
|  | tr | — | Bir notayı 4 sn tutun |
| `vibrato_sub` | en | Hold a note and let natural vibrato happen. Real peak-detection on your live pitch trace over a ~4 second hold, not a preset animation — single-mic tracking makes this an approximation, so treat it as a coaching cue, not a lab measurement. | Hold a note and let your natural vibrato happen. |
|  | fr | Tenez une note et laissez le vibrato naturel se produire. Vraie détection de crêtes sur votre trace de justesse en direct sur ~4 secondes de tenue, pas une animation préréglée — le suivi mono-micro fait de ceci une approximation, traitez-le comme une indication de coaching, pas une mesure de laboratoire. | Tenez une note et laissez venir votre vibrato naturel. |
|  | es | Sostén una nota y deja que ocurra el vibrato natural. Detección real de picos en tu trazo de afinación en vivo durante ~4 segundos de sostenido, no una animación preestablecida — el seguimiento con un solo micrófono hace de esto una aproximación, trátalo como una señal de coaching, no una medición de laboratorio. | Sostén una nota y deja que aparezca tu vibrato natural. |
|  | tr | Bir notayı tutun ve doğal vibratonun oluşmasına izin verin. ~4 saniyelik tutuş boyunca canlı perde izinizde gerçek tepe-algılama, önceden ayarlanmış bir animasyon değil — tek mikrofonlu izleme bunu bir yaklaşım yapar, bunu bir laboratuvar ölçümü değil koçluk ipucu olarak değerlendirin. | Bir notayı tutun ve doğal vibratonuzun gelmesine izin verin. |
| `vibrato_title` | en | 🌊 Vibrato | Vibrato |
|  | fr | 🌊 Vibrato | Vibrato |
|  | es | 🌊 Vibrato | Vibrato |
|  | tr | 🌊 Vibrato | Vibrato |
| `vq_fine` | en | These are training estimates from your microphone, not a medical assessment. Mic, room, distance, vowel and pitch all move them, so compare yourself on the same setup, note and vowel. The bands (for example, 20 dB or more reads as clear) are rough guides for this tool, not clinical norms. If hoarseness or breathiness persists, or singing hurts, a voice teacher or voice professional is the right person to ask. | These are training estimates from your microphone, not a medical assessment. |
|  | fr | Ce sont des estimations d’entraînement tirées de votre micro, pas un bilan médical. Le micro, la pièce, la distance, la voyelle et la hauteur les font varier : comparez-vous avec le même matériel, la même note et la même voyelle. Les seuils (par exemple, 20 dB ou plus = clair) sont des repères approximatifs propres à cet outil, pas des normes cliniques. Si un enrouement ou un souffle persiste, ou si chanter fait mal, un professeur de chant ou un professionnel de la voix est la bonne personne à consulter. | Ce sont des estimations d’entraînement tirées de votre micro, pas un bilan médical. |
|  | es | Son estimaciones de entrenamiento a partir de tu micrófono, no una evaluación médica. El micrófono, la sala, la distancia, la vocal y la altura las cambian, así que compárate con el mismo equipo, la misma nota y la misma vocal. Los umbrales (por ejemplo, 20 dB o más se lee como claro) son guías aproximadas de esta herramienta, no normas clínicas. Si la ronquera o el aire en la voz persisten, o si cantar duele, un profesor de canto o un profesional de la voz es la persona adecuada a quien consultar. | Son estimaciones de entrenamiento a partir de tu micrófono, no una evaluación médica. |
|  | tr | Bunlar mikrofonunuzdan elde edilen antrenman tahminleridir, tıbbi bir değerlendirme değildir. Mikrofon, oda, mesafe, ünlü ve perde hepsini etkiler; kendinizi aynı düzen, aynı nota ve aynı ünlüyle karşılaştırın. Eşikler (örneğin 20 dB ve üzeri net sayılır) bu araca özgü kaba ölçütlerdir, klinik normlar değildir. Ses kısıklığı ya da nefeslilik sürerse veya şarkı söylemek acı veriyorsa, bir şan öğretmenine ya da ses uzmanına danışmak doğru olur. | Bunlar mikrofonunuzdan elde edilen antrenman tahminleridir, tıbbi bir değerlendirme değildir. |
| `vq_fine_more` | en | — | Mic, room, distance, vowel and pitch all move them, so compare yourself on the same setup, note and vowel. The bands (for example, 20 dB or more reads as clear) are rough guides for this tool, not clinical norms. If hoarseness or breathiness persists, or singing hurts, a voice teacher or voice professional is the right person to ask. |
|  | fr | — | Le micro, la pièce, la distance, la voyelle et la hauteur les font varier : comparez-vous avec le même matériel, la même note et la même voyelle. Les seuils (par exemple, 20 dB ou plus = clair) sont des repères approximatifs propres à cet outil, pas des normes cliniques. Si un enrouement ou un souffle persiste, ou si chanter fait mal, un professeur de chant ou un professionnel de la voix est la bonne personne à consulter. |
|  | es | — | El micrófono, la sala, la distancia, la vocal y la altura las cambian, así que compárate con el mismo equipo, la misma nota y la misma vocal. Los umbrales (por ejemplo, 20 dB o más se lee como claro) son guías aproximadas de esta herramienta, no normas clínicas. Si la ronquera o el aire en la voz persisten, o si cantar duele, un profesor de canto o un profesional de la voz es la persona adecuada a quien consultar. |
|  | tr | — | Mikrofon, oda, mesafe, ünlü ve perde hepsini etkiler; kendinizi aynı düzen, aynı nota ve aynı ünlüyle karşılaştırın. Eşikler (örneğin 20 dB ve üzeri net sayılır) bu araca özgü kaba ölçütlerdir, klinik normlar değildir. Ses kısıklığı ya da nefeslilik sürerse veya şarkı söylemek acı veriyorsa, bir şan öğretmenine ya da ses uzmanına danışmak doğru olur. |
| `vq_how` | en | How it's measured: vibrato is the timing of the peaks in your pitch trace and the swing of each cycle (± cents). Breathiness compares the energy at your harmonics with the noise floor between them, up to 5 kHz, as a harmonics-to-noise ratio (higher = clearer). Brightness is the spectral centroid, the energy-weighted average frequency up to 6 kHz; it's also shown as a multiple of your pitch, because it rises with the note. Noise suppression is off for this measurement so breath noise isn't filtered out. | Vibrato is the timing of the peaks in your pitch trace and the swing of each cycle (± cents). Breathiness compares the energy at your harmonics with the noise floor between them, up to 5 kHz, as a harmonics-to-noise ratio (higher = clearer). Brightness is the spectral centroid, the energy-weighted average frequency up to 6 kHz; it's also shown as a multiple of your pitch, because it rises with the note. Noise suppression is off for this measurement so breath noise isn't filtered out. |
|  | fr | Comment c’est mesuré : le vibrato est le rythme des crêtes de votre tracé de hauteur et l’amplitude de chaque cycle (± cents). Le souffle compare l’énergie de vos harmoniques au bruit de fond qui les sépare, jusqu’à 5 kHz, sous forme de rapport harmoniques/bruit (plus élevé = plus clair). La brillance est le centroïde spectral, la fréquence moyenne pondérée par l’énergie jusqu’à 6 kHz ; elle est aussi affichée en multiple de votre hauteur, car elle monte avec la note. La réduction de bruit est désactivée pour cette mesure afin de ne pas filtrer le bruit du souffle. | Le vibrato est le rythme des crêtes de votre tracé de hauteur et l’amplitude de chaque cycle (± cents). Le souffle compare l’énergie de vos harmoniques au bruit de fond qui les sépare, jusqu’à 5 kHz, sous forme de rapport harmoniques/bruit (plus élevé = plus clair). La brillance est le centroïde spectral, la fréquence moyenne pondérée par l’énergie jusqu’à 6 kHz ; elle est aussi affichée en multiple de votre hauteur, car elle monte avec la note. La réduction de bruit est désactivée pour cette mesure afin de ne pas filtrer le bruit du souffle. |
|  | es | Cómo se mide: el vibrato es el ritmo de los picos de tu trazo de afinación y la oscilación de cada ciclo (± cents). El aire en la voz compara la energía de tus armónicos con el ruido de fondo entre ellos, hasta 5 kHz, como relación armónicos/ruido (más alto = más claro). El brillo es el centroide espectral, la frecuencia media ponderada por la energía hasta 6 kHz; también se muestra como múltiplo de tu altura, porque sube con la nota. La supresión de ruido está desactivada en esta medición para no filtrar el ruido del aire. | El vibrato es el ritmo de los picos de tu trazo de afinación y la oscilación de cada ciclo (± cents). El aire en la voz compara la energía de tus armónicos con el ruido de fondo entre ellos, hasta 5 kHz, como relación armónicos/ruido (más alto = más claro). El brillo es el centroide espectral, la frecuencia media ponderada por la energía hasta 6 kHz; también se muestra como múltiplo de tu altura, porque sube con la nota. La supresión de ruido está desactivada en esta medición para no filtrar el ruido del aire. |
|  | tr | Nasıl ölçülür: vibrato, perde izinizdeki tepelerin zamanlaması ve her döngünün salınımıdır (± sent). Nefeslilik, harmoniklerinizdeki enerjiyi aralarındaki gürültü tabanıyla 5 kHz'e kadar karşılaştırır ve harmonik/gürültü oranı olarak verir (yüksek = daha net). Parlaklık, 6 kHz'e kadar enerjiyle ağırlıklandırılmış ortalama frekans olan spektral ağırlık merkezidir; notayla birlikte yükseldiği için perdenizin katı olarak da gösterilir. Nefes gürültüsü filtrelenmesin diye bu ölçümde gürültü bastırma kapalıdır. | Vibrato, perde izinizdeki tepelerin zamanlaması ve her döngünün salınımıdır (± sent). Nefeslilik, harmoniklerinizdeki enerjiyi aralarındaki gürültü tabanıyla 5 kHz'e kadar karşılaştırır ve harmonik/gürültü oranı olarak verir (yüksek = daha net). Parlaklık, 6 kHz'e kadar enerjiyle ağırlıklandırılmış ortalama frekans olan spektral ağırlık merkezidir; notayla birlikte yükseldiği için perdenizin katı olarak da gösterilir. Nefes gürültüsü filtrelenmesin diye bu ölçümde gürültü bastırma kapalıdır. |
| `vq_start_btn` | en | Hold a note for 4s | Hold a note for 4 s |
|  | fr | Tenez une note 4 s | Tenez une note 4 s |
|  | es | Sostén una nota 4 s | Sostén una nota 4 s |
|  | tr | Bir notayı 4 sn tutun | Bir notayı 4 sn tutun |
| `vq_sub` | en | Hold one comfortable note on an open vowel ("ah") for 4 seconds. Three estimates come from your live microphone signal: vibrato, breathiness and brightness. They are training cues, not a lab or medical measurement. | Hold one comfortable note on an open vowel ("ah") for 4 seconds. Three estimates come from your microphone: vibrato, breathiness and brightness. |
|  | fr | Tenez une note confortable sur une voyelle ouverte (« a ») pendant 4 secondes. Trois estimations viennent du signal de votre micro en direct : vibrato, souffle et brillance. Ce sont des repères d’entraînement, pas une mesure de laboratoire ni une mesure médicale. | Tenez une note confortable sur une voyelle ouverte (« a ») pendant 4 secondes. Trois estimations viennent de votre micro : vibrato, souffle et brillance. |
|  | es | Sostén una nota cómoda en una vocal abierta («a») durante 4 segundos. Tres estimaciones salen de la señal de tu micrófono en vivo: vibrato, aire en la voz y brillo. Son referencias de entrenamiento, no una medición de laboratorio ni médica. | Sostén una nota cómoda en una vocal abierta («a») durante 4 segundos. Tres estimaciones salen de tu micrófono: vibrato, aire en la voz y brillo. |
|  | tr | Rahat bir notayı açık bir ünlüyle ("a") 4 saniye tutun. Canlı mikrofon sinyalinizden üç tahmin çıkarılır: vibrato, nefeslilik ve parlaklık. Bunlar antrenman ipuçlarıdır; laboratuvar ya da tıbbi ölçüm değildir. | Rahat bir notayı açık bir ünlüyle ("a") 4 saniye tutun. Mikrofonunuzdan üç tahmin çıkarılır: vibrato, nefeslilik ve parlaklık. |
| `vq_title` | en | 🔬 Voice Quality | Voice Quality |
|  | fr | 🔬 Qualité vocale | Qualité vocale |
|  | es | 🔬 Calidad vocal | Calidad vocal |
|  | tr | 🔬 Ses Kalitesi | Ses Kalitesi |
