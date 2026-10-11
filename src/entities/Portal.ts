import Phaser from 'phaser';

export type TransitionEffect = 'glitch' | 'fade';

/** Touching it moves the player to a named spawn point in another section. */
export class Portal extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sprite: string,
    readonly target: string,
    readonly effect: TransitionEffect,
  ) {
    super(scene, x, y, sprite, 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.play(`${sprite}-idle`);
  }

  setupBody(): void {
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    // A narrow trigger zone in the middle, so the player has to really step in.
    this.body.setSize(Math.max(6, this.width - 20), this.height - 8).setOffset(Math.min(10, (this.width - 6) / 2), 8);
  }
}
