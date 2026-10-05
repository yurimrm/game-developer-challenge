// src/managers/EnemyManager.ts
import { Container, Sprite, Texture } from 'pixi.js';
import { Ship } from '../core/Ship';

export interface EnemyData {
  ship: Ship;
  type: 'shooter' | 'kamikaze';
  state: 'wandering' | 'attacking' | 'chasing' | 'escaping' | 'kamikaze';
  shootTimer: number;
  wanderAngle: number;
  escapeTimer: number;
  maxHp: number;
  hp: number;
  maxInternalWidth: number;
  healthContainer: Container;
  healthBarFill: Sprite;
  avoidanceDirection?: number;
}

export class EnemyManager {
  public static spawnSingleEnemy(
    worldContainer: Container,
    myShip: Ship,
    currentGrid: ('deep' | 'shallow' | 'land')[][],
    mapOriginTileX: number,
    mapOriginTileY: number,
    tileSize: number,
    radiusInTiles: number,
    mapMinX: number,
    mapMaxX: number,
    mapMinY: number,
    mapMaxY: number
  ): EnemyData | null {
    const minDistanceFromPlayer = 400;
    const gridWidth = radiusInTiles * 2 + 1;
    const marginFromEdge = 5;
    let attempts = 0;

    while (attempts < 50) {
      attempts++;

      const randomGridX = Math.floor(Math.random() * (gridWidth - marginFromEdge * 2)) + marginFromEdge;
      const randomGridY = Math.floor(Math.random() * (gridWidth - marginFromEdge * 2)) + marginFromEdge;

      const gridType = currentGrid[randomGridX]?.[randomGridY];
      if (!gridType || gridType === 'land') continue;

      const tileX = mapOriginTileX + randomGridX;
      const tileY = mapOriginTileY + randomGridY;
      const posX = tileX * tileSize + tileSize / 2;
      const posY = tileY * tileSize + tileSize / 2;

      if (posX < mapMinX + 100 || posX > mapMaxX - 100 || posY < mapMinY + 100 || posY > mapMaxY - 100) {
        continue;
      }

      const distX = posX - myShip.x;
      const distY = posY - myShip.y;
      const distanceToPlayer = Math.sqrt(distX * distX + distY * distY);

      if (distanceToPlayer < minDistanceFromPlayer) continue;

      const enemyType: 'shooter' | 'kamikaze' = Math.random() < 0.5 ? 'kamikaze' : 'shooter';
      const enemyShip = new Ship(enemyType === 'kamikaze' ? 'pirate' : 'red', 0);
      enemyShip.x = posX;
      enemyShip.y = posY;
      enemyShip.rotation = Math.random() * Math.PI * 2;
      enemyShip.zIndex = 10;
      worldContainer.addChild(enemyShip);

      const healthContainer = new Container();
      healthContainer.zIndex = 100; 

      const frameTex = Texture.from('enemy_health_frame');
      const greenFillTex = Texture.from('enemy_health_fill_green');

      const barWidth = 60;
      const barHeight = 15;
      const maxInternalWidth = barWidth + 5; 

      const fillSprite = new Sprite(greenFillTex);
      fillSprite.width = maxInternalWidth;
      fillSprite.height = barHeight;
      fillSprite.anchor.set(0, 0.5);
      fillSprite.x = -barWidth * 0.51; 
      fillSprite.y = 0;

      const frameSprite = new Sprite(frameTex);
      frameSprite.width = barWidth;
      frameSprite.height = barHeight;
      frameSprite.anchor.set(0.5);
      frameSprite.x = 0;
      frameSprite.y = 0;

      healthContainer.addChild(frameSprite);
      healthContainer.addChild(fillSprite);
      worldContainer.addChild(healthContainer);

      return {
        ship: enemyShip,
        type: enemyType,
        state: 'wandering',
        shootTimer: 0,
        wanderAngle: enemyShip.rotation,
        escapeTimer: 0,
        maxHp: 100,
        hp: 100,
        maxInternalWidth,
        healthContainer,
        healthBarFill: fillSprite
      };
    }

    return null;
  }
}