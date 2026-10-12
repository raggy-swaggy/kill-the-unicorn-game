import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { PALETTE } from '../config/palette';
import { AudioManager, setMuted } from '../systems/AudioManager';
import { getSettings } from '../systems/Settings';
import { toggleCrt } from '../systems/CrtFilter';
import { InputManager } from '../systems/InputManager';
import { pixelText } from '../ui/pixelText';
import { TouchControls } from '../ui/TouchControls';

interface Item {
  label: () => string;
  run: () => void;
}

/** Overlay over the paused Game and UI scenes. */
export class PauseScene extends Phaser.Scene {
  private inputs!: InputManager;
  private audio!: AudioManager;
  private items: Item[] = [];
  private texts: Phaser.GameObjects.BitmapText[] = [];
  private index = 0;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.inputs = new InputManager(this);
    this.audio = new AudioManager(this);
    this.index = 0;
    this.sound.pauseAll();
    new TouchControls(this, 'menu');

    const cx = DISPLAY.width / 2;
    this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, PALETTE.void, 0.75).setOrigin(0);
    pixelText(this, cx, 40, 'PAUSE', { scale: 3, tint: PALETTE.pink });

    this.items = [
      { label: () => 'RESUME', run: () => this.resume() },
      { label: () => `SOUND ${getSettings().muted ? 'OFF' : 'ON'}`, run: () => setMuted(this.game, !getSettings().muted) },
      { label: () => `CRT FILTER ${getSettings().crt ? 'ON' : 'OFF'}`, run: () => toggleCrt() },
    ];
    if (this.sys.game.device.fullscreen.available) {
      this.items.push({ label: () => (this.scale.isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'), run: () => this.scale.toggleFullscreen() });
    }
    this.items.push({ label: () => 'QUIT TO TITLE', run: () => this.quit() });
    this.texts = this.items.map((_, i) => pixelText(this, cx, 70 + i * 14, '', { tint: PALETTE.white }));
    this.refresh();

    // Tapping a menu line selects and runs it.
    this.texts.forEach((t, i) =>
      t.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_UP, () => {
        this.index = i;
        this.activate();
      }),
    );
  }

  update(): void {
    this.inputs.update();
    if (this.inputs.justPressed('start')) return this.resume();
    const step = (this.inputs.repeated('down') ? 1 : 0) - (this.inputs.repeated('up') ? 1 : 0);
    if (step) {
      this.index = Phaser.Math.Wrap(this.index + step, 0, this.items.length);
      this.audio.sfx('menu-move');
      this.refresh();
    }
    if (this.inputs.justPressed('jump') || this.inputs.justPressed('attack')) this.activate();
    // Hotkeys (M, C, F) can change a setting while the menu is open.
    if (this.texts.some((t, i) => !t.text.includes(this.items[i].label()))) this.refresh();
  }

  private activate(): void {
    this.items[this.index].run();
    if (this.scene.isActive()) {
      this.audio.sfx('menu-select');
      this.refresh();
    }
  }

  private refresh(): void {
    this.texts.forEach((t, i) => {
      const selected = i === this.index;
      t.setText(`${selected ? '> ' : ''}${this.items[i].label()}${selected ? ' <' : ''}`);
      t.setTint(selected ? PALETTE.cyan : PALETTE.white);
    });
  }

  private resume(): void {
    this.sound.resumeAll();
    this.scene.resume('Game');
    this.scene.resume('UI');
    this.scene.stop();
  }

  private quit(): void {
    this.sound.resumeAll();
    new AudioManager(this).stopMusic();
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.start('Title');
  }
}
