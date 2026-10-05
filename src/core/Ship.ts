// src/core/Ship.ts
import { Container, Sprite, ColorMatrixFilter } from 'pixi.js';
import { XMLAtlasLoader } from './XMLAtlasLoader';

export type ShipColor = 'neutral' | 'blue' | 'red' | 'yellow' | 'green' | 'pirate';
export type DamageLevel = 0 | 1 | 2; // 0: Intacto, 1: Nível 1, 2: Nível 2

interface ShipPartConfig {
  hull: [string, string, string];
  flag: string;
  sail: [string, string, string];
  smallSail: [string, string, string];
}

const SHIP_CONFIGS: Record<ShipColor, ShipPartConfig> = {
  neutral: {
    hull: ['hull_large_1.png', 'hull_large_2.png', 'hull_large_3.png'],
    flag: 'flag_1.png',
    sail: ['sail_large_7.png', 'sail_large_1.png', 'sail_large_19.png'],
    smallSail: ['-', '-', '-']
  },
  blue: {
    hull: ['hull_large_1.png', 'hull_large_2.png', 'hull_large_3.png'],
    flag: 'flag_5.png',
    sail: ['sail_large_11.png', 'sail_large_5.png', 'sail_large_23.png'],
    smallSail: ['sail_small_5.png', 'sail_small_9.png', 'sail_small_13.png']
  },
  red: {
    hull: ['hull_large_1.png', 'hull_large_2.png', 'hull_large_3.png'],
    flag: 'flag_3.png',
    sail: ['sail_large_9.png', 'sail_large_3.png', 'sail_large_21.png'],
    smallSail: ['sail_small_3.png', 'sail_small_7.png', 'sail_small_11.png']
  },
  yellow: {
    hull: ['hull_large_1.png', 'hull_large_2.png', 'hull_large_3.png'],
    flag: 'flag_6.png',
    sail: ['sail_large_12.png', 'sail_large_6.png', 'sail_large_24.png'],
    smallSail: ['sail_small_6.png', 'sail_small_10.png', 'sail_small_1.png']
  },
  green: {
    hull: ['hull_large_1.png', 'hull_large_2.png', 'hull_large_3.png'],
    flag: 'flag_4.png',
    sail: ['sail_large_10.png', 'sail_large_4.png', 'sail_large_22.png'],
    smallSail: ['sail_small_4.png', 'sail_small_8.png', 'sail_small_12.png']
  },
  pirate: {
    hull: ['hull_large_4.png', 'hull_large_4.png', 'hull_large_4.png'],
    flag: 'flag_2.png',
    sail: ['sail_large_8.png', 'sail_large_2.png', 'sail_large_20.png'],
    smallSail: ['sail_small_2.png', 'sail_small_2.png', 'sail_small_2.png']
  }
};

export class Ship extends Container {
  private shipContainer: Container; // Container interno para gerir o layout gráfico
  private hullSprite: Sprite;
  private flagSprite: Sprite;
  private nestSprite: Sprite;
  private mainSailSprite: Sprite;
  private smallSailSprite?: Sprite;

  private shipColor: ShipColor;

  public speed: number = 0;
  public maxSpeed: number = 4;
  public minSpeed: number = -1.5;      
  public acceleration: number = 0.05;
  public rotationSpeed: number = 0.03; 
  public targetRotation: number = 0;

  constructor(shipColor: ShipColor = 'blue', damageLevel: DamageLevel = 0) {
    super();
    this.shipColor = shipColor;

    const config = SHIP_CONFIGS[shipColor];

    // 1. Cria o container interno que vai agrupar todas as peças do barco
    this.shipContainer = new Container();
    this.addChild(this.shipContainer);

    // 2. Instancia os sprites principais
    this.hullSprite = new Sprite(XMLAtlasLoader.getTexture(config.hull[damageLevel]));
    this.flagSprite = new Sprite(XMLAtlasLoader.getTexture(config.flag));
    this.nestSprite = new Sprite(XMLAtlasLoader.getTexture('nest.png'));
    this.mainSailSprite = new Sprite(XMLAtlasLoader.getTexture(config.sail[damageLevel]));

    this.hullSprite.anchor.set(0.5);
    this.flagSprite.anchor.set(0.5, 1.0);
    this.nestSprite.anchor.set(0.5, 0.5);
    this.mainSailSprite.anchor.set(0.5, 0.5);

    // 3. Adiciona as peças dentro do container interno (respeitando a ordem de camadas)
    this.shipContainer.addChild(this.hullSprite);
    this.shipContainer.addChild(this.mainSailSprite);
    this.shipContainer.addChild(this.nestSprite);
    this.shipContainer.addChild(this.flagSprite);

    // Adiciona a vela pequena se existir
    const smallSailTexName = config.smallSail[damageLevel];
    if (smallSailTexName && smallSailTexName !== '-') {
      this.smallSailSprite = new Sprite(XMLAtlasLoader.getTexture(smallSailTexName));
      this.smallSailSprite.anchor.set(0.5, 0.5);
      this.shipContainer.addChild(this.smallSailSprite);
    }

    // 4. Aplica o filtro de dessaturação no ninho se for pirata
    if (shipColor === 'pirate') {
      const colorFilter = new ColorMatrixFilter();
      colorFilter.desaturate();
      this.nestSprite.filters = [colorFilter];
    }

    // 5. Posicionamento relativo das peças (mantém os offsets exatos)
    this.updateLayoutPositions();

    // 6. Rotação global do visual interno para alinhar a frente do barco com a física (-90 graus)
    this.shipContainer.rotation = -Math.PI / 2;
  }

  private updateLayoutPositions() {
    this.flagSprite.x = 0;
    this.flagSprite.y = -35;

    this.nestSprite.x = 0;
    this.nestSprite.y = -35;

    this.mainSailSprite.x = 0;
    this.mainSailSprite.y = -10;

    if (this.smallSailSprite) {
      this.smallSailSprite.x = 0;
      this.smallSailSprite.y = 25;
    }
  }

  public setDamage(level: DamageLevel) {
    const config = SHIP_CONFIGS[this.shipColor];

    this.hullSprite.texture = XMLAtlasLoader.getTexture(config.hull[level]);
    this.mainSailSprite.texture = XMLAtlasLoader.getTexture(config.sail[level]);

    if (this.smallSailSprite) {
      const smallTex = config.smallSail[level];
      if (smallTex && smallTex !== '-') {
        this.smallSailSprite.visible = true;
        this.smallSailSprite.texture = XMLAtlasLoader.getTexture(smallTex);
      } else {
        this.smallSailSprite.visible = false;
      }
    }
  }

  public accelerate(amount: number) {
    this.speed = Math.max(this.minSpeed, Math.min(this.maxSpeed, this.speed + amount));

    // Impede que a velocidade fique negativa (marcha ré) se não for desejado
    if (this.speed < 0) {
      this.speed = 0;
    }
    
  }

  public steer(direction: number) {
    this.targetRotation += direction * this.rotationSpeed;
  }

  public update(delta: number) {
    if (this.speed !== 0) {
      this.x += Math.cos(this.rotation) * this.speed * delta;
      this.y += Math.sin(this.rotation) * this.speed * delta;
    }

    let diff = this.targetRotation - this.rotation;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.rotation += diff * 0.05 * delta;
  }
}