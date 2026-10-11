# Kill the Unicorn – Cursed Arcade

Kurzes Retro-Jump'n'Run als Fan-Gimmick für die Band Kill the Unicorn. Läuft im Browser auf Desktop und Smartphone.

Gebaut mit [Phaser 4](https://phaser.io), TypeScript und Vite. Interne Auflösung 320x180 Pixel.

> Stand: Meilenstein 1 (Bewegung, Kamera, Testlevel). Die README wird mit jedem Meilenstein ergänzt.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

```bash
npm install
npm run dev
```

Dann die angezeigte Adresse (meist http://localhost:5173) im Browser öffnen.
Mit `?debug` hinter der Adresse werden die Physik-Hitboxen angezeigt.

## Steuerung

| Aktion | Tastatur | Gamepad |
|---|---|---|
| Laufen | Pfeiltasten links/rechts oder A/D | Steuerkreuz oder linker Stick |
| Springen | Leertaste (kurz drücken = kleiner Sprung) | A / Kreuz |
| Angriff (ab Meilenstein 2) | J oder X | X / Viereck |

Die Belegung steht in `src/config/controls.ts`.

## Bauen

```bash
npm run build     # erzeugt den fertigen Build im Ordner dist/
npm run preview   # testet den Build lokal
```

Der Build verwendet relative Pfade und läuft deshalb ohne Anpassung auf GitHub Pages, Netlify und itch.io.

## Deployment auf GitHub Pages

Jeder Push auf `main` baut das Spiel und veröffentlicht es automatisch (`.github/workflows/deploy.yml`).
Einmalig nötig: im Repository unter **Settings → Pages → Build and deployment → Source** den Eintrag **GitHub Actions** wählen.

## Spielwerte anpassen

Alle Werte für das Spielgefühl stehen zentral in `src/config/gameplay.ts`, z. B. Laufgeschwindigkeit, Sprunghöhe, Coyote Time, Jump Buffer und Kamera-Verhalten. Nach dem Speichern lädt `npm run dev` das Spiel sofort neu.

## Assets austauschen

Alle Grafiken liegen in `public/assets/`. Welche Datei wofür verwendet wird, steht in `public/assets/manifest.json`. Zum Austauschen einfach die PNG-Datei mit gleichem Namen und gleichem Layout überschreiben, Code muss nicht geändert werden. Wenn sich Grösse oder Frames ändern, nur das Manifest anpassen.

| Datei | Inhalt |
|---|---|
| `sprites/player.png` | Spielfigur, 8 Frames à 16x32 nebeneinander: 0–1 Stehen, 2–5 Laufen, 6 Springen, 7 Fallen. Blickrichtung nach rechts. |
| `tiles/arcade.png` | Tileset Neon-Spielhalle, 8 Tiles à 16x16 in einer Reihe |
| `backgrounds/arcade-far.png` | Hintergrund hinten (320x180, wird horizontal wiederholt) |
| `backgrounds/arcade-near.png` | Hintergrund vorne mit Transparenz (320x180) |

Animationen (welche Frames, wie schnell) werden ebenfalls im Manifest unter `animations` eingestellt.

Die Platzhalter erzeugt `npm run gen:assets`. Das Skript überschreibt keine vorhandenen Dateien; nur mit `node tools/gen-placeholders.mjs --force` werden alle Platzhalter neu erzeugt (Vorsicht: überschreibt auch eigene Grafiken und das Testlevel).

## Level in Tiled bearbeiten

Die Level sind Tiled-Maps im JSON-Format und können direkt in [Tiled](https://www.mapeditor.org) (1.10 oder neuer) geöffnet und gespeichert werden: `public/assets/maps/testlevel.json`.

Konventionen:

- Tile-Ebene `decor`: nur Dekoration, keine Kollision
- Tile-Ebene `ground`: alles, worauf man stehen kann
- Objekt-Ebene `entities`: Punkt-Objekt mit Typ `player-spawn` für den Startpunkt (später auch Gegner, Sammelobjekte, Checkpoints)
- Tile-Eigenschaften im Tileset: `collides` (fest von allen Seiten) und `oneWay` (nur von oben begehbar, von unten durchspringbar)

Neue Tilesets bitte als PNG nach `public/assets/tiles/` legen, in der Map einbetten und im Manifest unter `tilesets` mit dem Tileset-Namen eintragen.

## Projektstruktur

```
public/assets/   austauschbare Assets + manifest.json
src/config/      Spielwerte, Steuerung, Palette, Anzeige
src/scenes/      Boot, Preload, Game (weitere folgen)
src/entities/    Spielfigur (Gegner folgen)
src/systems/     Eingabe, Level-Loader, Asset-Manifest, Skalierung
tools/           Generator für Platzhalter-Assets
```
