import Phaser from 'phaser';
import { TOUCH } from '../config/controls';
import { type Action, registerTouchSource } from '../systems/InputManager';

const FRAMES: Record<Action, number> = { left: 0, right: 1, up: 2, down: 3, jump: 4, attack: 5, start: 6 };

/** True once the player has touched the screen, or on phones and tablets from the start. */
let touchUsed = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

/**
 * On-screen buttons for touch devices. Multitouch: every finger on the screen is checked
 * against every button each frame, so sliding a thumb from left to right just works.
 * Buttons are hidden until the device is known to have touch.
 */
export class TouchControls {
  private held = new Set<Action>();
  private buttons: { action: Action; x: number; y: number; r: number; image: Phaser.GameObjects.Image }[] = [];
  private unregister: () => void;

  constructor(
    private scene: Phaser.Scene,
    layout: 'game' | 'menu',
  ) {
    scene.input.addPointer(Math.max(0, 4 - scene.input.manager.pointersTotal));
    for (const [action, b] of Object.entries(TOUCH[layout]) as [Action, { x: number; y: number; r: number }][]) {
      const image = scene.add
        .image(b.x, b.y, 'touch', FRAMES[action])
        .setScrollFactor(0)
        .setDepth(1000)
        .setAlpha(TOUCH.alpha)
        .setScale(action === 'start' ? 0.67 : 1);
      this.buttons.push({ action, ...b, image });
    }
    this.setVisible(touchUsed);
    this.unregister = registerTouchSource(this.held);

    const onDown = (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch || touchUsed) return;
      touchUsed = true;
      this.setVisible(true);
    };
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, onDown);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.release, this);
    scene.events.on(Phaser.Scenes.Events.SLEEP, this.release, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.release();
      this.unregister();
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      scene.events.off(Phaser.Scenes.Events.PAUSE, this.release, this);
      scene.events.off(Phaser.Scenes.Events.SLEEP, this.release, this);
    });
  }

  static get active(): boolean {
    return !!touchUsed;
  }

  private setVisible(visible: boolean): void {
    for (const b of this.buttons) b.image.setVisible(visible);
  }

  private release(): void {
    this.held.clear();
    for (const b of this.buttons) b.image.setAlpha(TOUCH.alpha);
  }

  private update(): void {
    this.held.clear();
    if (!touchUsed) return;
    const pointers = this.scene.input.manager.pointers.filter((p) => p.isDown && p.wasTouch);
    for (const b of this.buttons) {
      const pressed = pointers.some((p) => Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r);
      if (pressed) this.held.add(b.action);
      b.image.setAlpha(pressed ? TOUCH.pressedAlpha : TOUCH.alpha);
    }
  }
}
