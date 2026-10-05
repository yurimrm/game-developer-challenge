// src/managers/CombatManager.ts
import { Container, Sprite, Texture } from 'pixi.js';
import { Ship } from '../core/Ship';
import { XMLAtlasLoader } from '../core/XMLAtlasLoader';

export interface CannonBall {
  sprite: Sprite;
  vx: number;
  vy: number;
  distanceTraveled: number;
  landTilesPenetrated: number;
  hasExploded: boolean;
  lastLandTileKey: string;
  isEnemyShot?: boolean;
}

export class CombatManager {
  public static createCannonBall(
    ship: Ship,
    worldContainer: Container,
    isEnemy: boolean = false,
    customRotationOffset: number = 0
  ): CannonBall | null {
    const cannonTexture = XMLAtlasLoader.getTexture('cannon_ball.png');
    if (!cannonTexture || cannonTexture === Texture.EMPTY) return null;

    const finalRotation = ship.rotation + customRotationOffset;

    const ballSprite = new Sprite(cannonTexture);
    ballSprite.anchor.set(0.5);
    ballSprite.width = 10;
    ballSprite.height = 10;
    ballSprite.zIndex = 15;

    const spawnDistance = 30;
    ballSprite.x = ship.x + Math.cos(finalRotation) * spawnDistance;
    ballSprite.y = ship.y + Math.sin(finalRotation) * spawnDistance;

    worldContainer.addChild(ballSprite);

    return {
      sprite: ballSprite,
      vx: Math.cos(finalRotation),
      vy: Math.sin(finalRotation),
      distanceTraveled: 0,
      landTilesPenetrated: 0,
      hasExploded: false,
      lastLandTileKey: '',
      isEnemyShot: isEnemy
    };
  }

  public static createExplosion(worldContainer: Container, x: number, y: number) {
    const explosionTexture = XMLAtlasLoader.getTexture('explosion_3.png');
    if (!explosionTexture || explosionTexture === Texture.EMPTY) return;

    const explosionSprite = new Sprite(explosionTexture);
    explosionSprite.anchor.set(0.5);
    explosionSprite.width = 48;
    explosionSprite.height = 48;
    explosionSprite.x = x;
    explosionSprite.y = y;
    explosionSprite.zIndex = 20;

    worldContainer.addChild(explosionSprite);

    setTimeout(() => {
      if (explosionSprite && !explosionSprite.destroyed) {
        worldContainer.removeChild(explosionSprite);
        explosionSprite.destroy();
      }
    }, 400);
  }
}