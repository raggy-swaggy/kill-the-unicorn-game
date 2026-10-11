import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { HEALTH } from '../config/gameplay';
import { PALETTE } from '../config/palette';
import { STATE } from '../systems/GameState';

const FONT = 'pixel';

/** HUD drawn on top of the game, unaffected by the game camera. */
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private livesText!: Phaser.GameObjects.BitmapText;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private cassetteText!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('UI');
  }

  create(): void {
    this.hearts = [];
    for (let i = 0; i < HEALTH.heartsPerLife; i++) this.hearts.push(this.add.image(4 + i * 9, 4, 'hud', 0).setOrigin(0));

    this.add.image(4, 14, 'hud', 3).setOrigin(0);
    this.livesText = this.add.bitmapText(14, 15, FONT, '').setTint(PALETTE.white);

    this.scoreText = this.add.bitmapText(DISPLAY.width - 4, 5, FONT, '').setOrigin(1, 0).setTint(PALETTE.cyan);
    this.add.image(DISPLAY.width - 26, 14, 'hud', 2).setOrigin(0);
    this.cassetteText = this.add.bitmapText(DISPLAY.width - 4, 15, FONT, '').setOrigin(1, 0).setTint(PALETTE.white);

    const hint = this.add
      .bitmapText(DISPLAY.width / 2, DISPLAY.height - 10, FONT, 'ARROWS/WASD MOVE  SPACE JUMP  J/X RIFF  M MUTE')
      .setOrigin(0.5, 0)
      .setTint(PALETTE.hotpink);
    this.tweens.add({ targets: hint, alpha: 0, delay: 6000, duration: 800 });

    this.refresh();
    const onChange = () => this.refresh();
    this.registry.events.on('changedata', onChange);
    const onGameOver = () => this.showGameOver();
    const onBanner = (text: string) => this.showBanner(text);
    const onGlitch = (ms: number) => this.glitch(ms);
    this.game.events.on('game-over', onGameOver);
    this.game.events.on('banner', onBanner);
    this.game.events.on('glitch', onGlitch);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata', onChange);
      this.game.events.off('game-over', onGameOver);
      this.game.events.off('banner', onBanner);
      this.game.events.off('glitch', onGlitch);
    });
  }

  private refresh(): void {
    const hearts = this.registry.get(STATE.hearts) as number;
    this.hearts.forEach((img, i) => img.setFrame(i < hearts ? 0 : 1));
    this.livesText.setText(`X${this.registry.get(STATE.lives)}`);
    this.scoreText.setText(String(this.registry.get(STATE.score)).padStart(6, '0'));
    this.cassetteText.setText(String(this.registry.get(STATE.cassettes)).padStart(2, '0'));
  }

  private banner?: Phaser.GameObjects.BitmapText;

  /** Short centred title, e.g. the section name. */
  private showBanner(text: string): void {
    this.banner?.destroy();
    const banner = this.add
      .bitmapText(DISPLAY.width / 2, 44, FONT, text)
      .setOrigin(0.5)
      .setScale(2)
      .setTint(PALETTE.cyan)
      .setAlpha(0);
    this.banner = banner;
    this.tweens.chain({
      targets: banner,
      tweens: [
        { alpha: 1, duration: 200 },
        { alpha: 1, duration: 1500 },
        { alpha: 0, duration: 400 },
      ],
      onComplete: () => banner.destroy(),
    });
  }

  /** Flickering colour bars over the whole screen for the cursed cabinet transition. */
  private glitch(ms: number): void {
    const bars = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const colors = [PALETTE.pink, PALETTE.cyan, PALETTE.white, PALETTE.violet];
    const timer = this.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        bars.clear();
        for (let i = 0; i < 7; i++) {
          bars.fillStyle(Phaser.Utils.Array.GetRandom(colors), Phaser.Math.FloatBetween(0.2, 0.7));
          const h = Phaser.Math.Between(2, 14);
          bars.fillRect(Phaser.Math.Between(-40, 40), Phaser.Math.Between(0, DISPLAY.height - h), DISPLAY.width, h);
        }
      },
    });
    this.time.delayedCall(ms, () => {
      timer.remove();
      bars.destroy();
    });
  }

  private showGameOver(): void {
    this.add
      .bitmapText(DISPLAY.width / 2, DISPLAY.height / 2, FONT, 'GAME OVER')
      .setOrigin(0.5)
      .setScale(2)
      .setTint(PALETTE.pink);
  }
}
