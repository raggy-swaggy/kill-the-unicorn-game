# Kill the Unicorn – Cursed Arcade

Kurzes Retro-Jump'n'Run als Fan-Gimmick für die Band Kill the Unicorn. Läuft im Browser auf Desktop und Smartphone.

Gebaut mit [Phaser 4](https://phaser.io), TypeScript und Vite. Interne Auflösung 320x180 Pixel.

> Stand: Meilenstein 3 (komplettes Level 1 mit vier Abschnitten, Musik und Soundeffekte). Bossfight und Rhythmus-Mechanik folgen in Meilenstein 4. Die README wird mit jedem Meilenstein ergänzt.

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
| Riff Shot (gedrückt halten = Dauerfeuer) | J oder X | X / Viereck oder B / Kreis |
| Ton an/aus | M | |

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

Alle Werte für das Spielgefühl stehen zentral in `src/config/gameplay.ts`:

- `PLAYER`: Laufgeschwindigkeit, Sprunghöhe, Coyote Time, Jump Buffer
- `CAMERA`: Nachziehen und Vorausschauen der Kamera
- `HEALTH`: Herzen pro Leben, Anzahl Leben, Unverwundbarkeit nach Treffer, Rückstoss
- `RIFF_SHOT`: Tempo, Feuerrate, Reichweite, Schaden
- `ENEMIES`: Lebenspunkte, Punkte und Verhalten pro Gegnertyp
- `SCORE`: Punkte pro Kassette Nach dem Speichern lädt `npm run dev` das Spiel sofort neu.

## Assets austauschen

Alle Grafiken liegen in `public/assets/`. Welche Datei wofür verwendet wird, steht in `public/assets/manifest.json`. Zum Austauschen einfach die PNG-Datei mit gleichem Namen und gleichem Layout überschreiben, Code muss nicht geändert werden. Wenn sich Grösse oder Frames ändern, nur das Manifest anpassen.

| Datei | Inhalt |
|---|---|
| `sprites/player.png` | Spielfigur, 8 Frames à 16x32 nebeneinander: 0–1 Stehen, 2–5 Laufen, 6 Springen, 7 Fallen. Blickrichtung nach rechts. |
| `tiles/arcade.png`, `tiles/datahighway.png`, `tiles/catacombs.png` | Tilesets der Abschnitte, je 12 Tiles à 16x16 in einer Reihe (Belegung siehe unten) |
| `backgrounds/<abschnitt>-far.png` | Hintergrund hinten pro Abschnitt (320x180, wird horizontal wiederholt) |
| `backgrounds/<abschnitt>-near.png` | Hintergrund vorne mit Transparenz (320x180) |
| `sprites/cursed-cabinet.png` | Verfluchter Automat am Ende von Abschnitt 1, 2 Frames à 32x48 |
| `sprites/portal.png` | Portal zwischen Abschnitten, 2 Frames à 16x32 |
| `sprites/enemy-popup.png` | Gegner Patrouille (Pop-up-Fenster), 2 Frames à 16x16, Blick nach links |
| `sprites/enemy-cursor.png` | Gegner Flieger (Cursor), 2 Frames à 16x16, Blick nach links |
| `sprites/enemy-card.png` | Gegner Schütze (verfluchte Karte), 2 Frames à 16x16: 0 Ruhe, 1 Schuss |
| `sprites/projectiles.png` | 8x8-Frames: 0–1 Riff Shot, 2 Gegner-Schuss |
| `sprites/pickups.png` | 16x16-Frames: 0–1 Kassette, 2 Herz |
| `sprites/checkpoint.png` | Checkpoint, 2 Frames à 16x32: 0 aus, 1 aktiv |
| `sprites/fx.png` | Treffer-Effekt, 4 Frames à 16x16 |
| `ui/hud.png` | HUD-Icons 8x8: 0 Herz voll, 1 Herz leer, 2 Kassette, 3 Leben |
| `fonts/pixel.png` | Pixel-Schrift, Zeichen à 4x6 in einem Raster mit 16 Zeichen pro Zeile, Reihenfolge wie `chars` im Manifest. Weiss zeichnen, die Farbe setzt das Spiel. |

Animationen (welche Frames, wie schnell) werden ebenfalls im Manifest unter `animations` eingestellt.

### Musik und Soundeffekte

| Datei | Verwendung |
|---|---|
| `audio/music/arcade.wav` | Abschnitt 1, Neon-Spielhalle |
| `audio/music/datahighway.wav` | Abschnitt 2, Datenautobahn |
| `audio/music/catacombs.wav` | Abschnitt 3, Katakomben |
| `audio/music/boss.wav` | Bossfight |
| `audio/sfx/*.wav` | Soundeffekte: jump, shoot, enemy-hit, enemy-die, hurt, pickup, heart, checkpoint, glitch, portal, lose-life |

Musik läuft in Endlosschleife, die Datei sollte also nahtlos loopen. Für echte Tracks empfehle ich MP3 oder OGG statt WAV (viel kleiner). Dazu die Datei ablegen und im Manifest unter `audio` die `urls` anpassen, z. B. `["audio/music/arcade.ogg", "audio/music/arcade.mp3"]`. Der Browser nimmt das erste Format, das er abspielen kann (Safari braucht MP3 oder M4A). Welcher Track in welchem Abschnitt läuft, steht in der Tiled-Map beim jeweiligen Abschnitt (Eigenschaft `music`).

Lautstärken stehen in `src/config/audio.ts`.

### Platzhalter neu erzeugen

Die Platzhalter erzeugt `npm run gen:assets`. Das Skript überschreibt keine vorhandenen Dateien. Mit `--force` (z. B. `node tools/gen-placeholders.mjs --force`, `node tools/gen-audio.mjs --force`, `node tools/build-level1.mjs --force`) wird neu erzeugt. Vorsicht: das überschreibt auch eigene Grafiken, Musik oder Level-Änderungen.

## Level in Tiled bearbeiten

Das Level ist eine Tiled-Map im JSON-Format und kann direkt in [Tiled](https://www.mapeditor.org) (1.10 oder neuer) geöffnet und gespeichert werden: `public/assets/maps/level1.json`.

Die vier Abschnitte liegen nebeneinander in derselben Map, jeweils durch Wände getrennt. Die Kamera bleibt immer im aktuellen Abschnitt.

1. Neon-Spielhalle (Tutorial), endet am verfluchten Automaten mit Glitch-Übergang
2. Datenautobahn mit Ladebalken und Fenstern über dem Nichts
3. Okkulte Katakomben mit Stacheln und verfluchten Karten
4. Boss-Arena

Konventionen:

- Tile-Ebene `decor`: nur Dekoration, keine Kollision
- Tile-Ebene `ground`: alles, worauf man stehen kann
- Objekt-Ebene `entities`: Punkt-Objekte, die Position ist dort, wo die Füsse stehen. Der Typ (in Tiled "Class") bestimmt, was entsteht:

| Typ | Eigenschaften | Bedeutung |
|---|---|---|
| `player-spawn` | | Startpunkt |
| `enemy` | `enemyType`: `patrol`, `flyer` oder `shooter`; bei `flyer` optional `patrolDistance` (Pixel) | Gegner |
| `pickup` | `kind`: `cassette` oder `heart` | Sammelobjekt |
| `checkpoint` | | Wiedereinstiegspunkt nach Verlust eines Lebens |
| `spawn` | Name des Objekts, z. B. `datahighway-start` | Zielpunkt für Portale |
| `portal` | `target` (Name eines `spawn`), `effect`: `glitch` oder `fade`, `sprite`: `cursed-cabinet` oder `portal` | Übergang in einen anderen Abschnitt |
| `boss` | | Position des Bosses (ab Meilenstein 4) |
- Objekt-Ebene `sections`: ein Rechteck pro Abschnitt mit den Eigenschaften `title` (Einblendung), `music` (Audio-Key aus dem Manifest), `background` (z. B. `arcade` für `bg-arcade-far/near`) und `bpm` (Tempo für die Rhythmus-Mechanik)
- Tile-Eigenschaften im Tileset: `collides` (fest von allen Seiten), `oneWay` (nur von oben begehbar, von unten durchspringbar), `hazard` (Stacheln, Strom usw., kostet ein Herz)

Belegung jedes Tilesets (gleich für alle Abschnitte): 0 Boden oben, 1 Boden gefüllt, 2 fester Block, 3 Plattform von unten durchspringbar, 4 Gefahr, 5–11 Dekoration.

Neue Tilesets bitte als PNG nach `public/assets/tiles/` legen, in der Map einbetten und im Manifest unter `tilesets` mit dem Tileset-Namen eintragen.

## Projektstruktur

```
public/assets/   austauschbare Assets + manifest.json
src/config/      Spielwerte, Steuerung, Palette, Anzeige
src/scenes/      Boot, Preload, Game, UI (weitere folgen)
src/entities/    Spielfigur, Gegner, Schüsse, Pickups, Checkpoints
src/systems/     Eingabe, Level-Loader, Asset-Manifest, Spielstand, Skalierung
tools/           Generatoren für Platzhalter-Grafiken, -Audio und das Start-Layout von Level 1
```
