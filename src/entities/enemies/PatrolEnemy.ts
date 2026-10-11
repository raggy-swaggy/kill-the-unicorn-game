import Phaser from 'phaser';
import { ENEMIES } from '../../config/gameplay';
import { Enemy, type EnemyContext } from './Enemy';

/** Walks back and forth, turns at walls and ledges. */
export class PatrolEnemy extends Enemy {
  private dir = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, ctx: EnemyContext) {
    super(scene, x, y, 'enemy-popup', ENEMIES.patrol, ctx);
    this.play('enemy-popup-walk');
  }

  setupBody(): void {
    this.body.setSize(12, 14).setOffset(2, 2);
  }

  protected behave(): void {
    const body = this.body;
    if (!body.blocked.down) return;

    const hitWall = (this.dir < 0 && body.blocked.left) || (this.dir > 0 && body.blocked.right);
    const ahead = this.ctx.ground.getTileAtWorldXY(this.x + this.dir * 8, this.y + 2);
    if (hitWall || !ahead?.collides) this.dir *= -1;

    body.setVelocityX(this.dir * ENEMIES.patrol.speed);
    this.setFlipX(this.dir > 0);
  }
}
