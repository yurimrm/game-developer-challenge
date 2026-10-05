// src/core/AssetManager.ts
import { Assets } from 'pixi.js';
import { XMLAtlasLoader } from '../core/XMLAtlasLoader';

export class AssetManager {
  private static instance: AssetManager;

  private constructor() {}

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  public async loadGameAssets(): Promise<void> {
    const isRetina = window.devicePixelRatio > 1;

    const shipsXml = isRetina 
      ? 'assets/spritesheet/ships_miscellaneous_sheet_retina.xml' 
      : 'assets/spritesheet/ships_miscellaneous_sheet.xml';

    const shipsImg = isRetina 
      ? 'assets/spritesheet/ships_miscellaneous_sheet_retina.png' 
      : 'assets/spritesheet/ships_miscellaneous_sheet.png';

    const mapTileSheet = 'assets/tilesheet/tiles_sheet.png';

    // Seleção dinâmica do atlas JSON e da imagem correspondente da UI
    const uiSheetJson = isRetina
      ? 'assets/spritesheet/ui_sheet_retina.json'
      : 'assets/spritesheet/ui_sheet.json';

    const uiSheetImg = isRetina
      ? 'assets/spritesheet/ui_sheet_retina.png'
      : 'assets/spritesheet/ui_sheet.png';

    // 1. Processa o atlas XML do barco
    await XMLAtlasLoader.loadAtlas(shipsXml, shipsImg);

    // 2. Carrega a tilesheet do mapa, o JSON da UI e a imagem da UI em conjunto
    await Assets.load([mapTileSheet, uiSheetJson, uiSheetImg]);

    // 3. CONFIGURAÇÃO DE BORDAS DO MAPA
    const mapTexture = Assets.get(mapTileSheet);
    if (mapTexture && mapTexture.source) {
      mapTexture.source.scaleMode = 'nearest';
    }

    console.log('Atlas, tiles e folha de UI processados com sucesso!');
  }
}