# Gestaltung von Chatbot-Interfaces und Avataren

Dieses Repository enthält die Seminararbeit und zugehörige Materialien für das Projekt **"Gestaltung von Chatbot-Interfaces und Avataren"** im Rahmen des Moduls Mensch-Computer-Interaktion (MCI) an der Hochschule Aalen.

## 📄 Projektbeschreibung

Chatbots sind aus der heutigen digitalen Welt kaum noch wegzudenken. Neben rein funktionalen Aspekten gewinnen die **soziale Gestaltung**, das **visuelle Erscheinungsbild** und die **Ausarbeitung von Avataren** zunehmend an Bedeutung, um eine hochwertige und nutzerorientierte Mensch-Computer-Interaktion zu ermöglichen.

Dieses Projekt untersucht die theoretischen Grundlagen der sozialen und visuellen Chatbot-Gestaltung. Es analysiert, wie Designentscheidungen das Nutzererlebnis, das Vertrauen und die Interaktionsqualität beeinflussen.

### Themenbereiche
*   **Theoretischer Hintergrund**: Generative Architektur und Funktionsweise moderner Chatbots.
*   **Soziotechnische Gestaltung**: Chatbots als soziale Akteure und soziale Signale.
*   **Avatar-Design**: Erscheinungsformen, Realitätsgrad ("Uncanny Valley"), Anthropomorphismus und Personalisierung.
*   **Stimmengestaltung**: Einfluss von synthetischen Stimmen und deren Menschlichkeit auf die Akzeptanz.
*   **Interface-Positionierung**: Visuelle Hierarchie und Platzierung von Avataren im UI.
*   **Altersabhängige Präferenzen**: Unterschiedliche Anforderungen verschiedener Nutzergruppen.

## 👥 Autoren

*   **Jan Herbst**
*   **Gabriel Roth**
*   **Florian Merlau**

**Institution**: Hochschule Aalen  
**Datum**: Januar 2026

## 📂 Ordnerstruktur

Das Repository ist wie folgt strukturiert:

*   **`Latex/`**: Enthält den LaTeX-Quellcode für die schriftliche Ausarbeitung (Paper) und das Poster.
    *   `Paper/`: Hauptdokument der Seminararbeit (`Main.tex`).
    *   `Poster/`: LaTeX-Quellcode für das Projektposter.
*   **`Präsentation/`**: Enthält das exportierte Poster als PDF und PPTX.
*   **`Videos/`**: Video-Materialien, die im Rahmen des Projekts erstellt oder referenziert wurden.
*   **`Paper/`**: (Optional) Abgelegte PDF-Versionen oder Referenzmaterialien.

## 🛠️ Kompilierung (LaTeX)

Um das Paper oder das Poster lokal zu generieren, wird eine LaTeX-Distribution (z.B. TeX Live, MiKTeX) benötigt.

**Voraussetzungen:**
*   `pdflatex` oder `lualatex`/`xelatex`
*   `biber` (für das Literaturverzeichnis)
*   Pakete: `acmart`, `tikz`, `pgfplots`, `babel`, etc. (siehe `Main.tex`)

**Build-Prozess (Beispiel für das Paper):**
1.  Navigiere in den Ordner `Latex/Paper`.
2.  Führe folgende Befehle aus:
    ```bash
    pdflatex Main.tex
    biber Main
    pdflatex Main.tex
    pdflatex Main.tex
    ```

## 📚 Literatur

Die verwendete Literatur ist in der Datei `MeineBibliothek.bib` zu finden und wird im Paper referenziert.
