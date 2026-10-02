// src/core/XMLAtlasLoader.ts
import { Texture, Rectangle, Assets } from 'pixi.js';

export class XMLAtlasLoader {
  // Um dicionário global ou estático para guardar todas as texturas carregadas dos XMLs
  public static textures: Record<string, Texture> = {};

  public static async loadAtlas(xmlPath: string, imagePath: string): Promise<void> {
    try {
      // 1. Carrega o XML como texto e a imagem base em paralelo
      const [xmlText, baseTexture] = await Promise.all([
        fetch(xmlPath).then(res => res.text()),
        Assets.load(imagePath)
      ]);

      // 2. Usa o DOMParser nativo do browser para ler o XML perfeitamente
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // 3. Pega todas as tags <SubTexture>
      const subTextures = xmlDoc.getElementsByTagName('SubTexture');

      for (let i = 0; i < subTextures.length; i++) {
        const node = subTextures[i];
        const name = node.getAttribute('name');
        
        if (name) {
          const x = parseFloat(node.getAttribute('x') || '0');
          const y = parseFloat(node.getAttribute('y') || '0');
          const width = parseFloat(node.getAttribute('width') || '0');
          const height = parseFloat(node.getAttribute('height') || '0');

          // Cria a sub-textura recortada com base nas coordenadas do XML
          const texture = new Texture({
            source: baseTexture.source,
            frame: new Rectangle(x, y, width, height)
          });

          // Armazena no dicionário com o nome original do arquivo (ex: 'ship_1.png')
          this.textures[name] = texture;
        }
      }

      console.log(`Atlas ${xmlPath} parseado com sucesso! Total de frames:`, subTextures.length);
    } catch (e) {
      console.error(`Erro ao fazer o parse do atlas ${xmlPath}:`, e);
    }
  }

  // Atalho para resgatar texturas facilmente em qualquer lugar do jogo
  public static getTexture(name: string): Texture {
    const texture = this.textures[name];
    if (!texture) {
      console.warn(`Textura '${name}' não encontrada no cache do XMLAtlasLoader!`);
      return Texture.EMPTY;
    }
    return texture;
  }
}