// src/core/TileHelper.ts
import { Texture, Rectangle } from 'pixi.js';
import { TILE_COORDS } from './TileMapConfig';

export class TileHelper {
  private static tileSize = 64;
  private static tileSheetTexture: Texture | null = null;

  public static init(texture: Texture) {
    this.tileSheetTexture = texture;
  }

  // Método genérico caso queira passar coordenadas diretas
  public static getTextureByCoords(coords: { x: number; y: number }): Texture {
    if (!this.tileSheetTexture) {
      throw new Error("TileHelper não foi inicializado com a textura da tilesheet!");
    }

    const margin = 0.5;

    return new Texture({
      source: this.tileSheetTexture.source,
      frame: new Rectangle(
        (coords.x * this.tileSize) + margin,
        (coords.y * this.tileSize) + margin,
        this.tileSize - (margin * 2),
        this.tileSize - (margin * 2)
      )
    });

  }

  // Atalho direto usando o TILE_COORDS para Água Profunda
  public static getDeepWaterTexture(): Texture {
    return this.getTextureByCoords(TILE_COORDS.DEEP_WATER);
  }

  // Atalho para elementos de decoração e estruturas
  public static getDecorationTexture(type: 'BOAT' | 'ROCK', index: number = 0): Texture {
    if (type === 'BOAT') {
      return this.getTextureByCoords(TILE_COORDS.DECORATION.STRANDED_BOAT);
    }
    const rockCoords = TILE_COORDS.DECORATION.ROCKS[index] || TILE_COORDS.DECORATION.ROCKS[0];
    return this.getTextureByCoords(rockCoords);
  }

  public static getStructureTexture(structureKey: keyof typeof TILE_COORDS.STRUCTURES): Texture {
    const coords = TILE_COORDS.STRUCTURES[structureKey];
    return this.getTextureByCoords(coords);
  }
}