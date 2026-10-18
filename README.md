<p align="center">
  <img src="assets/og-image.png" alt="Interaktywny pokój 3D — CV Dariusza Masłyka" width="100%">
</p>

<h1 align="center">Dariusz Masłyk — interaktywne CV 3D</h1>
<p align="center">Analityk biznesowo-systemowy · Aplikacje mobilne · Comarch ERP · Integracje · AI</p>

<p align="center"><b>▶ <a href="https://backloghero-lang.github.io/cv-interactive-3d/">Wejdź do pokoju</a></b> · <a href="https://backloghero-lang.github.io/cv-interactive-3d/cv.html">wersja tekstowa</a></p>

<details>
<summary><strong>🧭 Jak to działa</strong></summary>

Pokój gracza-analityka w 3D. Przeciągnij, aby się rozejrzeć (na telefonie także zoom dwoma palcami), i kliknij świecące punkty — kamera najeżdża na obiekt, a z boku otwiera się panel:

| Punkt | Co pokazuje |
|---|---|
| Stanowisko pracy | kontakt i krótkie podsumowanie, przycisk „Pobierz CV (PDF)” |
| Ściana zdjęć | historia firm: Comarch, ALDI, SPECJAŁ, Komfort, Auchan |
| Tablica | umiejętności analityka |
| Konsola | projekty jako kartridże: Bourbon Hunters, PokerHouse Trainer, PriceShift |
| Regał | certyfikaty i wykształcenie |

Postać pisze przy dwóch animowanych monitorach (zgłoszenie w Jira, SQL, logi API), w telewizorze leci serwis giełdowy, a beagle krąży między kanapą, legowiskiem, miską i panem. Lampę przy kanapie można zapalić i zgasić (przycisk 💡 albo kliknięcie w lampę), żeby zobaczyć, jak świecą neony, LED-y i ekrany.
</details>

<details>
<summary><strong>🛠️ Technologie</strong></summary>

- **Blender** (skrypty w `blender/`): pokój, postać i pies modelowane skryptem, oświetlenie liczone w Cycles i zapisane w teksturach (lampa zapalona / zgaszona), eksport glTF z kompresją Draco.
- **Three.js** (WebGL): wczytuje model, dokłada animacje i bloom dla neonów; rośliny i lampka biurkowa z Poly Haven (CC0).
- **Ekrany jako tekstury canvas** rysowane na żywo (monitory, TV, tablica, certyfikaty).
- **Dźwięki syntezowane WebAudio** (ambient, klawiatura) — bez plików audio.
- **PL / EN**, wersja tekstowa i PDF generowane z jednego źródła treści (`js/content.js`).
- Czysty HTML/CSS/JS bez kroku budowania, hosting na **GitHub Pages**.
</details>

<details>
<summary><strong>🤖 Zbudowane z AI</strong></summary>

Strona powstała w parze z agentem programistycznym AI (Claude Code): od zebrania wymagań w serii pytań, przez projekt sceny, po testy na komputerze i telefonie.
</details>
