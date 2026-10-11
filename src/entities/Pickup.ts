import Phaser from 'phaser';

export type PickupKind = 'cassette' | 'heart';

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly kind: PickupKind) {
    super(scene, x, y, 'pickups', 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.baseY = y;
    this.play(kind === 'heart' ? 'pickup-heart' : 'pickup-cassette');
  }

  setupBody(): void {
    this.body.setAllowGravity(false);
    this.body.setSize(12, 10).setOffset(2, 3);
  }

  update(time: number): void {
    // Gentle bob, purely visual.
    this.y = this.baseY + Math.round(Math.sin(time / 300 + this.baseY) * 1.5);
  }
}

export class Checkpoint extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  activated = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'checkpoint', 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.play('checkpoint-off');
  }

  setupBody(): void {
    this.body.setAllowGravity(false);
    this.body.setSize(12, 32);
  }

  activate(): void {
    this.activated = true;
    this.play('checkpoint-on');
  }
}
