// src/core/MapGenerator.ts
import { Container, Sprite } from 'pixi.js';
import { SeedRandom } from './SeedRandom';
import { TileHelper } from './TileHelper';
import { TILE_COORDS } from './TileMapConfig';

export interface MapGenerationResult {
  currentGrid: ('deep' | 'shallow' | 'land')[][];
  mapOriginTileX: number;
  mapOriginTileY: number;
  mapMinX: number;
  mapMaxX: number;
  mapMinY: number;
  mapMaxY: number;
}

export class MapGenerator {
  public static generate(
    worldContainer: Container,
    playerX: number,
    playerY: number,
    tileSize: number,
    radiusInTiles: number
  ): MapGenerationResult {
    const seed = "meu-oceano-2026";
    const startTileX = Math.floor(playerX / tileSize);
    const startTileY = Math.floor(playerY / tileSize);
    
    const mapOriginTileX = startTileX - radiusInTiles;
    const mapOriginTileY = startTileY - radiusInTiles;
    const cellSize = 10;

    const calculateRawType = (tileX: number, tileY: number): 'deep' | 'shallow' | 'land' => {
      const distToSpawnX = Math.abs(tileX - startTileX);
      const distToSpawnY = Math.abs(tileY - startTileY);
      if (distToSpawnX <= 1 && distToSpawnY <= 1) {
        return 'shallow'; 
      }

      const cellX = Math.floor(tileX / cellSize);
      const cellY = Math.floor(tileY / cellSize);
      let closestDist = 999;

      for (let cx = -1; cx <= 1; cx++) {
        for (let cy = -1; cy <= 1; cy++) {
          const neighborCellX = cellX + cx;
          const neighborCellY = cellY + cy;
          const cellRng = new SeedRandom(`${seed}_cell_${neighborCellX}_${neighborCellY}`);
          
          if (cellRng.next() < 0.55) {
            const islandCenterX = neighborCellX * cellSize + Math.floor(cellRng.range(2, cellSize - 2));
            const islandCenterY = neighborCellY * cellSize + Math.floor(cellRng.range(2, cellSize - 2));

            const baseDist = Math.sqrt(Math.pow(tileX - islandCenterX, 2) + Math.pow(tileY - islandCenterY, 2));
            const angle = Math.atan2(tileY - islandCenterY, tileX - islandCenterX);
            const irregularity = Math.sin(angle * 3 + islandCenterX) * 0.5 + Math.cos(angle * 5 + islandCenterY) * 0.5;
            const effectiveDist = baseDist + irregularity;

            if (effectiveDist < closestDist) {
              closestDist = effectiveDist;
            }
          }
        }
      }

      if (closestDist <= 3.0) return 'land';
      if (closestDist <= 4.6) return 'shallow';
      return 'deep';
    };

    const grid: ('deep' | 'shallow' | 'land')[][] = [];
    const width = radiusInTiles * 2 + 1;

    for (let x = 0; x < width; x++) {
      grid[x] = [];
      for (let y = 0; y < width; y++) {
        const tileX = startTileX + (x - radiusInTiles);
        const tileY = startTileY + (y - radiusInTiles);
        grid[x][y] = calculateRawType(tileX, tileY);
      }
    }

    const mapMinX = mapOriginTileX * tileSize;
    const mapMaxX = (mapOriginTileX + width) * tileSize;
    const mapMinY = mapOriginTileY * tileSize;
    const mapMaxY = (mapOriginTileY + width) * tileSize;

    for (let x = 1; x < width - 1; x++) {
      for (let y = 1; y < width - 1; y++) {
        const current = grid[x][y];

        if (current === 'land') {
          let orthoLand = 0;
          if (grid[x + 1][y] === 'land') orthoLand++;
          if (grid[x - 1][y] === 'land') orthoLand++;
          if (grid[x][y + 1] === 'land') orthoLand++;
          if (grid[x][y - 1] === 'land') orthoLand++;

          if (orthoLand < 2) {
            grid[x][y] = 'shallow';
          }
        } else if (current === 'shallow') {
          let connections = 0;
          if (grid[x + 1][y] === 'land' || grid[x + 1][y] === 'shallow') connections++;
          if (grid[x - 1][y] === 'land' || grid[x - 1][y] === 'shallow') connections++;
          if (grid[x][y + 1] === 'land' || grid[x][y + 1] === 'shallow') connections++;
          if (grid[x][y - 1] === 'land' || grid[x][y - 1] === 'shallow') connections++;

          if (connections < 2) {
            grid[x][y] = 'deep';
          }
        } else {
          let landSurround = 0;
          for (let nx = -1; nx <= 1; nx++) {
            for (let ny = -1; ny <= 1; ny++) {
              if (grid[x + nx]?.[y + ny] === 'land') landSurround++;
            }
          }
          if (landSurround >= 7) {
            grid[x][y] = 'land';
          }
        }
      }
    }

    const getGridType = (gx: number, gy: number): 'deep' | 'shallow' | 'land' => {
      if (gx < 0 || gx >= width || gy < 0 || gy >= width) return 'deep';
      return grid[gx][gy];
    };

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < width; y++) {
        const tileX = startTileX + (x - radiusInTiles);
        const tileY = startTileY + (y - radiusInTiles);
        const tileType = grid[x][y];

        const deepWaterSprite = new Sprite(TileHelper.getTextureByCoords(TILE_COORDS.DEEP_WATER));
        deepWaterSprite.width = tileSize;
        deepWaterSprite.height = tileSize;
        deepWaterSprite.x = tileX * tileSize;
        deepWaterSprite.y = tileY * tileSize;
        deepWaterSprite.zIndex = 0;
        worldContainer.addChildAt(deepWaterSprite, 0);

        const top = getGridType(x, y - 1);
        const bottom = getGridType(x, y + 1);
        const left = getGridType(x - 1, y);
        const right = getGridType(x + 1, y);

        const isNorthWater = top !== 'land';
        const isSouthWater = bottom !== 'land';
        const isWestWater = left !== 'land';
        const isEastWater = right !== 'land';

        const isBorder = isNorthWater || isSouthWater || isWestWater || isEastWater;

        if (tileType === 'shallow' || (tileType === 'land' && isBorder)) {
          let shallowCoords = TILE_COORDS.SHALLOW_WATER.CENTER;
          
          if (tileType === 'shallow') {
            const isNorthDeep = top === 'deep';
            const isSouthDeep = bottom === 'deep';
            const isWestDeep = left === 'deep';
            const isEastDeep = right === 'deep';

            if (isNorthDeep && isWestDeep) shallowCoords = TILE_COORDS.SHALLOW_WATER.NW;
            else if (isNorthDeep && isEastDeep) shallowCoords = TILE_COORDS.SHALLOW_WATER.NE;
            else if (isSouthDeep && isWestDeep) shallowCoords = TILE_COORDS.SHALLOW_WATER.SW;
            else if (isSouthDeep && isEastDeep) shallowCoords = TILE_COORDS.SHALLOW_WATER.SE;
            else if (isNorthDeep) shallowCoords = TILE_COORDS.SHALLOW_WATER.N;
            else if (isSouthDeep) shallowCoords = TILE_COORDS.SHALLOW_WATER.S;
            else if (isWestDeep) shallowCoords = TILE_COORDS.SHALLOW_WATER.W;
            else if (isEastDeep) shallowCoords = TILE_COORDS.SHALLOW_WATER.E;
          }

          const shallowSprite = new Sprite(TileHelper.getTextureByCoords(shallowCoords));
          shallowSprite.width = tileSize;
          shallowSprite.height = tileSize;
          shallowSprite.x = tileX * tileSize;
          shallowSprite.y = tileY * tileSize;
          shallowSprite.zIndex = 1;
          worldContainer.addChild(shallowSprite);
        }

        if (tileType === 'land') {
          let sandCoords = TILE_COORDS.SAND.CENTER;

          if (isBorder) {
            if (isNorthWater && isWestWater) sandCoords = TILE_COORDS.SAND.NW;
            else if (isNorthWater && isEastWater) sandCoords = TILE_COORDS.SAND.NE;
            else if (isSouthWater && isWestWater) sandCoords = TILE_COORDS.SAND.SW;
            else if (isSouthWater && isEastWater) sandCoords = TILE_COORDS.SAND.SE;
            else if (isNorthWater) sandCoords = TILE_COORDS.SAND.N;
            else if (isSouthWater) sandCoords = TILE_COORDS.SAND.S;
            else if (isWestWater) sandCoords = TILE_COORDS.SAND.W;
            else if (isEastWater) sandCoords = TILE_COORDS.SAND.E;
          }

          const sandSprite = new Sprite(TileHelper.getTextureByCoords(sandCoords));
          sandSprite.width = tileSize;
          sandSprite.height = tileSize;
          sandSprite.x = tileX * tileSize;
          sandSprite.y = tileY * tileSize;
          sandSprite.zIndex = 2;
          worldContainer.addChild(sandSprite);

          const poiRng = new SeedRandom(`${seed}_poi_${tileX}_${tileY}`);
          if (poiRng.next() < 0.02 && !isBorder) {
            const towerSprite = new Sprite(TileHelper.getTextureByCoords(TILE_COORDS.STRUCTURES.TOWER_1));
            towerSprite.width = tileSize;
            towerSprite.height = tileSize;
            towerSprite.x = tileX * tileSize;
            towerSprite.y = tileY * tileSize;
            towerSprite.zIndex = 4;
            worldContainer.addChild(towerSprite);
          }
        }
      }
    }

    return {
      currentGrid: grid,
      mapOriginTileX,
      mapOriginTileY,
      mapMinX,
      mapMaxX,
      mapMinY,
      mapMaxY
    };
  }
}