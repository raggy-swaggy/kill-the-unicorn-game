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
      .bitmapText(DISPLAY.width / 2, DISPLAY.height - 10, FONT, 'ARROWS/WASD MOVE  SPACE JUMP  J/X RIFF')
      .setOrigin(0.5, 0)
      .setTint(PALETTE.hotpink);
    this.tweens.add({ targets: hint, alpha: 0, delay: 6000, duration: 800 });

    this.refresh();
    const onChange = () => this.refresh();
    this.registry.events.on('changedata', onChange);
    const onGameOver = () => this.showGameOver();
    this.game.events.on('game-over', onGameOver);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata', onChange);
      this.game.events.off('game-over', onGameOver);
    });
  }

  private refresh(): void {
    const hearts = this.registry.get(STATE.hearts) as number;
    this.hearts.forEach((img, i) => img.setFrame(i < hearts ? 0 : 1));
    this.livesText.setText(`X${this.registry.get(STATE.lives)}`);
    this.scoreText.setText(String(this.registry.get(STATE.score)).padStart(6, '0'));
    this.cassetteText.setText(String(this.registry.get(STATE.cassettes)).padStart(2, '0'));
  }

  private showGameOver(): void {
    this.add
      .bitmapText(DISPLAY.width / 2, DISPLAY.height / 2, FONT, 'GAME OVER')
      .setOrigin(0.5)
      .setScale(2)
      .setTint(PALETTE.pink);
  }
}
