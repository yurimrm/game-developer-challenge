// src/scenes/GameScene.ts
import { Application, Container, Text, Sprite, Assets, Texture, Graphics } from 'pixi.js';

import { Ship } from '../core/Ship';
import { SeedRandom } from '../core/SeedRandom';
import { TileHelper } from '../core/TileHelper';
import { TILE_COORDS } from '../core/TileMapConfig';
import { AssetManager } from '../core/AssetManager';
import { XMLAtlasLoader } from '../core/XMLAtlasLoader';
import { useGameStore } from '../ui/GameStore';

export class GameScene {
  
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  
  private app: Application;
  private worldContainer: Container;
  private myShip!: Ship;
  private keysPressed: Record<string, boolean> = {};
  private infoText?: Text;
  private isAssetsLoaded: boolean = false;

  // Propriedades do mapa e combate
  private tileSize: number = 64;
  private radiusInTiles: number = 30;
  private currentGrid: ('deep' | 'shallow' | 'land')[][] = [];
  private mapOriginTileX: number = 0;
  private mapOriginTileY: number = 0;

  // Limites dinâmicos reais do mapa gerado
  private mapMinX: number = 0;
  private mapMaxX: number = 4000;
  private mapMinY: number = 0;
  private mapMaxY: number = 4000;

  // Vida do Jogador
  private playerMaxHp: number = 100;
  private playerHp: number = 100;
  private playerHealthContainer!: Container;
  private playerHealthBarFill!: Sprite;
  private playerHealthMask!: Graphics;
  private playerMaxInternalWidth: number = 165;
  private playerHealthText!: Text;

  // Sistema de Jogo (Pontuação e Tempo)
  private score: number = 0;
  private remainingTime: number = 180; // 180 segundos iniciais
  private timeElapsedAccumulator: number = 0; 
  private scoreText!: Text;
  private timerText!: Text;
  private statsContainer!: Container;
  
  // Lista de projéteis ativos
  private cannonBalls: { 
    sprite: Sprite; 
    vx: number; 
    vy: number; 
    distanceTraveled: number; 
    landTilesPenetrated: number;
    hasExploded: boolean;
    lastLandTileKey: string;
    isEnemyShot?: boolean;
  }[] = [];

  // Inimigos
  private enemies: {
    ship: Ship;
    state: 'wandering' | 'attacking' | 'chasing' | 'escaping';
    shootTimer: number;
    wanderAngle: number;
    escapeTimer: number;
    maxHp: number;
    hp: number;
    maxInternalWidth: number;
    healthContainer: Container;
    healthBarFill: Sprite;
  }[] = [];

  constructor(app: Application) {
    this.app = app;
    
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.app.stage.addChild(this.worldContainer);

    this.init();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  private async init() {
    try {
      await AssetManager.getInstance().loadGameAssets();

      const tileSheetTexture = Assets.get('/assets/tilesheet/tiles_sheet.png');
      TileHelper.init(tileSheetTexture);
      this.isAssetsLoaded = true;

      this.myShip = new Ship('blue', 0);
      this.myShip.x = 1000;
      this.myShip.y = 1000; 
      this.myShip.zIndex = 10;

      this.generateTestMap();
      this.spawnEnemies(); 

      this.worldContainer.addChild(this.myShip);

      // Cria a HUD fixa de vida e o painel de estatísticas do jogador na tela
      this.createPlayerHUD();
      this.createStatsHUD();

      this.infoText = new Text({
        text: 'Carregando dados de depuração...',
        style: { fill: '#000', fontSize: 14, align: 'left' }
      });
      this.infoText.x = 20;
      this.infoText.y = 80; 
      this.app.stage.addChild(this.infoText);

      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);

      const screenCenterX = (this.app.screen.width / this.app.stage.scale.x) / 2;
      const screenCenterY = (this.app.screen.height / this.app.stage.scale.y) / 2;

      this.worldContainer.x = screenCenterX - this.myShip.x;
      this.worldContainer.y = screenCenterY - this.myShip.y;

      this.app.ticker.add((ticker) => {
        

        // --- MENU DE PAUSE ---
        if (this.isPaused) return;

        // --- CONDIÇÃO DE GAME OVER ---
        if (this.playerHp <= 0 || this.remainingTime <= 0) {
          this.isGameOver = true;
          // Atualiza o score e o tempo restante usando o método que você já tem na store
          useGameStore.getState().setCurrentGameStats(this.score, this.remainingTime);
          
          // Altera a tela global para game_over
          useGameStore.getState().setScreen('game_over');
          return;
        }

        const delta = ticker.deltaTime;

        // --- ATUALIZAÇÃO DO CRONÔMETRO (TEMPO) ---
        if (this.remainingTime > 0) {
          this.timeElapsedAccumulator += ticker.deltaMS;
          if (this.timeElapsedAccumulator >= 1000) {
            this.remainingTime -= 1;
            this.timeElapsedAccumulator -= 1000;
          }

          const minutes = Math.floor(this.remainingTime / 60);
          const seconds = this.remainingTime % 60;
          const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          
          if (this.timerText) {
            this.timerText.text = `${formattedTime}`;
          }
        } else {
          if (this.timerText) {
            this.timerText.text = `Tempo Esgotado!`;
          }
        }

        // --- SISTEMA DE RESPAWN AUTOMÁTICO DE INIMIGOS ---
        if (this.enemies.length < 4) {
          if (Math.random() < 0.02) { 
            this.spawnSingleEnemy();
          }
        }

        if (this.keysPressed['ArrowUp'] || this.keysPressed['KeyW']) {
          this.myShip.accelerate(0.05 * delta);
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['KeyS']) {
          this.myShip.accelerate(-0.05 * delta);
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) {
          this.myShip.steer(-1);
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) {
          this.myShip.steer(1);
        }

        if (!this.keysPressed['ArrowUp'] && !this.keysPressed['KeyW'] && !this.keysPressed['ArrowDown'] && !this.keysPressed['KeyS']) {
          this.myShip.speed *= 0.98; 
        }

        const prevX = this.myShip.x;
        const prevY = this.myShip.y;

        this.myShip.update(delta);

        // --- 1. VERIFICAÇÃO DE COLISÃO COM OS LIMITES REAIS DO MAPA ---
        const margin = 40; 
        const mapMinXLimit = this.mapMinX + margin;
        const mapMaxXLimit = this.mapMaxX - margin;
        const mapMinYLimit = this.mapMinY + margin;
        const mapMaxYLimit = this.mapMaxY - margin;

        if (this.myShip.x < mapMinXLimit || this.myShip.x > mapMaxXLimit || this.myShip.y < mapMinYLimit || this.myShip.y > mapMaxYLimit) {
          this.myShip.x = prevX;
          this.myShip.y = prevY;
          this.myShip.speed = -this.myShip.speed * 0.5; 
        }

        // --- 2. VERIFICAÇÃO DE COLISÃO COM O TERRENO (ILHA) ---
        const shipTileX = Math.floor(this.myShip.x / this.tileSize);
        const shipTileY = Math.floor(this.myShip.y / this.tileSize);

        const gridX = shipTileX - this.mapOriginTileX;
        const gridY = shipTileY - this.mapOriginTileY;
        const width = this.radiusInTiles * 2 + 1;

        if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < width) {
          if (this.currentGrid[gridX]?.[gridY] === 'land') {
            this.myShip.x = prevX;
            this.myShip.y = prevY;
            this.myShip.speed = -this.myShip.speed * 0.5;
          }
        }

        // --- 3. ATUALIZAÇÃO DOS PROJÉTEIS (CANNON BALLS) ---
        for (let i = this.cannonBalls.length - 1; i >= 0; i--) {
          const ball = this.cannonBalls[i];
          const step = 12 * delta; 
          ball.sprite.x += ball.vx * step;
          ball.sprite.y += ball.vy * step;
          ball.distanceTraveled += step;

          let projectileDestroyed = false;

          if (!ball.isEnemyShot) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
              const enemyData = this.enemies[j];
              const dx = ball.sprite.x - enemyData.ship.x;
              const dy = ball.sprite.y - enemyData.ship.y;
              const distToEnemy = Math.sqrt(dx * dx + dy * dy);

              if (distToEnemy < 35) {
                enemyData.hp -= 25;
                this.createExplosion(ball.sprite.x, ball.sprite.y);

                this.worldContainer.removeChild(ball.sprite);
                ball.sprite.destroy();
                this.cannonBalls.splice(i, 1);
                projectileDestroyed = true;

                if (enemyData.hp <= 0) {
                  this.worldContainer.removeChild(enemyData.ship);
                  enemyData.ship.destroy();

                  this.worldContainer.removeChild(enemyData.healthContainer);
                  enemyData.healthContainer.destroy({ children: true });

                  this.enemies.splice(j, 1);
                  
                  // Incrementa pontuação ao destruir inimigo
                  this.score += 1;
                  if (this.scoreText) {
                    this.scoreText.text = `${this.score}`;
                  }

                  console.log("Navio inimigo destruído! Pontos:", this.score);
                }
                break;
              }
            }
          } else {
            const dx = ball.sprite.x - this.myShip.x;
            const dy = ball.sprite.y - this.myShip.y;
            const distToPlayer = Math.sqrt(dx * dx + dy * dy);

            if (distToPlayer < 30) {
              this.playerHp = Math.max(0, this.playerHp - 15);
              this.createExplosion(ball.sprite.x, ball.sprite.y);

              this.worldContainer.removeChild(ball.sprite);
              ball.sprite.destroy();
              this.cannonBalls.splice(i, 1);
              projectileDestroyed = true;
              break;
            }
          }

          if (projectileDestroyed) continue; 

          const ballTileX = Math.floor(ball.sprite.x / this.tileSize);
          const ballTileY = Math.floor(ball.sprite.y / this.tileSize);
          const ballGridX = ballTileX - this.mapOriginTileX;
          const ballGridY = ballTileY - this.mapOriginTileY;
          const gridWidth = this.radiusInTiles * 2 + 1;

          let hitLand = false;
          if (ballGridX >= 0 && ballGridX < gridWidth && ballGridY >= 0 && ballGridY < gridWidth) {
            if (this.currentGrid[ballGridX]?.[ballGridY] === 'land') {
              hitLand = true;
            }
          }

          if (hitLand) {
            const currentTileKey = `${ballTileX}_${ballTileY}`;
            
            if (ball.lastLandTileKey !== currentTileKey) {
              ball.lastLandTileKey = currentTileKey;
              ball.landTilesPenetrated++; 
            }
          }

          const maxDistance = 350;
          const maxLandPenetration = 3; 

          if (ball.landTilesPenetrated >= maxLandPenetration || ball.distanceTraveled > maxDistance) {
            this.createExplosion(ball.sprite.x, ball.sprite.y);

            this.worldContainer.removeChild(ball.sprite);
            ball.sprite.destroy();
            this.cannonBalls.splice(i, 1);
          }
        }
        
        // --- 4. ATUALIZAÇÃO DA IA DOS INIMIGOS, INÉRCIA E Fuga de Obstáculos ---
        for (const enemyData of this.enemies) {
          const enemy = enemyData.ship;
          const dx = this.myShip.x - enemy.x;
          const dy = this.myShip.y - enemy.y;
          const distToPlayer = Math.sqrt(dx * dx + dy * dy);

          const prevEnemyX = enemy.x;
          const prevEnemyY = enemy.y;

          let targetSpeed = 1.5;

          const healthOffsetY = -40; 
          enemyData.healthContainer.x = enemy.x;
          enemyData.healthContainer.y = enemy.y + healthOffsetY;

          const hpPercentage = Math.max(0, enemyData.hp / enemyData.maxHp);
          enemyData.healthBarFill.width = enemyData.maxInternalWidth * hpPercentage;

          const currentFillTexName = hpPercentage < 0.3 ? 'enemy_health_fill_red' : 'enemy_health_fill_green';
          const newTex = Texture.from(currentFillTexName);
          
          if (newTex && enemyData.healthBarFill.texture !== newTex) {
            enemyData.healthBarFill.texture = newTex;
          }

          if (enemyData.escapeTimer > 0) {
            enemyData.escapeTimer -= delta;
            enemyData.state = 'escaping';

            let angleDiff = enemyData.wanderAngle - enemy.rotation;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            enemy.rotation += angleDiff * 0.15 * delta;

            targetSpeed = 2.0; 
          } else {
            const detectionRange = 650; 
            const attackRange = 280;    

            if (distToPlayer <= detectionRange) {
              const targetAngle = Math.atan2(dy, dx);
              
              let angleDiff = targetAngle - enemy.rotation;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              enemy.rotation += angleDiff * 0.28 * delta;

              if (distToPlayer > attackRange) {
                enemyData.state = 'chasing';
                targetSpeed = 1.5; 
              } else {
                enemyData.state = 'attacking';
                targetSpeed = 0;   

                enemyData.shootTimer += delta;
                if (enemyData.shootTimer > 75) { 
                  enemyData.shootTimer = 0;
                  if (Math.abs(angleDiff) < 0.4) {
                    this.fireEnemyCannon(enemy);
                  }
                }
              }
            } else {
              enemyData.state = 'wandering';

              if (Math.random() < 0.03) {
                enemyData.wanderAngle += (Math.random() - 0.5) * 2.0;
              }

              let angleDiff = enemyData.wanderAngle - enemy.rotation;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              enemy.rotation += angleDiff * 0.08 * delta;

              targetSpeed = 1.5;
            }
          }

          enemy.speed += (targetSpeed - enemy.speed) * 0.08 * delta;
          enemy.update(delta);

          const mapMargin = 40;
          const mapMinXLimit = this.mapMinX + mapMargin;
          const mapMaxXLimit = this.mapMaxX - mapMargin;
          const mapMinYLimit = this.mapMinY + mapMargin;
          const mapMaxYLimit = this.mapMaxY - mapMargin;

          let hitBorder = false;
          if (enemy.x < mapMinXLimit) { enemy.x = mapMinXLimit; hitBorder = true; }
          else if (enemy.x > mapMaxXLimit) { enemy.x = mapMaxXLimit; hitBorder = true; }
          if (enemy.y < mapMinYLimit) { enemy.y = mapMinYLimit; hitBorder = true; }
          else if (enemy.y > mapMaxYLimit) { enemy.y = mapMaxYLimit; hitBorder = true; }

          if (hitBorder) {
            enemyData.state = 'escaping';
            
            const centerX = (this.mapMinX + this.mapMaxX) / 2;
            const centerY = (this.mapMinY + this.mapMaxY) / 2;
            
            const angleToCenter = Math.atan2(centerY - enemy.y, centerX - enemy.x);
            enemyData.wanderAngle = angleToCenter + (Math.random() - 0.5) * 0.5;
            enemy.rotation = enemyData.wanderAngle;
            
            enemy.speed = 2.0;
            enemyData.escapeTimer = 45; 
          }

          const enemyTileX = Math.floor(enemy.x / this.tileSize);
          const enemyTileY = Math.floor(enemy.y / this.tileSize);
          const eGridX = enemyTileX - this.mapOriginTileX;
          const eGridY = enemyTileY - this.mapOriginTileY;
          const gridWidth = this.radiusInTiles * 2 + 1;

          let collidedWithLand = false;
          if (eGridX >= 0 && eGridX < gridWidth && eGridY >= 0 && eGridY < gridWidth) {
            if (this.currentGrid[eGridX]?.[eGridY] === 'land') {
              collidedWithLand = true;
            }
          }

          if (collidedWithLand) {
            enemyData.state = 'escaping';

            const turnDirection = (enemyData.ship.x % 2 === 0) ? 0.08 : -0.08; 
            enemy.rotation += turnDirection * delta;
            enemyData.wanderAngle = enemy.rotation;

            targetSpeed = 1.6; 
            enemyData.escapeTimer = 25; 
          }

          const collisionDistance = 45; 
          if (distToPlayer < collisionDistance) {
            enemy.x = prevEnemyX;
            enemy.y = prevEnemyY;
            enemy.speed = -enemy.speed * 0.5;

            this.myShip.x = prevX;
            this.myShip.y = prevY;
            this.myShip.speed = -this.myShip.speed * 0.5;
          }
        }

        this.worldContainer.sortChildren();

        const stageScaleX = this.app.stage.scale.x;
        const stageScaleY = this.app.stage.scale.y;

        const currentCenterX = (this.app.renderer.width / stageScaleX) / 2;
        const currentCenterY = (this.app.renderer.height / stageScaleY) / 2;

        let targetX = currentCenterX - this.myShip.x;
        let targetY = currentCenterY - this.myShip.y;

        const screenWidth = this.app.renderer.width / stageScaleX;
        const screenHeight = this.app.renderer.height / stageScaleY;

        const minContainerX = screenWidth - this.mapMaxX;
        const maxContainerX = -this.mapMinX;
        const minContainerY = screenHeight - this.mapMaxY;
        const maxContainerY = -this.mapMinY;

        targetX = Math.max(minContainerX, Math.min(maxContainerX, targetX));
        targetY = Math.max(minContainerY, Math.min(maxContainerY, targetY));

        this.worldContainer.x += (targetX - this.worldContainer.x) * 0.1;
        this.worldContainer.y += (targetY - this.worldContainer.y) * 0.1;

        let enemyInfoText = '';
        this.enemies.forEach((enemyData, index) => {
          enemyInfoText += `Inimigo ${index + 1} (${enemyData.state}) -> HP: ${enemyData.hp}\n`;
        });

        if (this.infoText) {
          this.infoText.text = 
            `Controles:\n` +
            `[W/S] Acelerar | [A/D] Leme | [Espaço] Atirar\n` +
            `---------------------------\n` +
            `HP do Jogador: ${this.playerHp}/${this.playerMaxHp}\n` +
            `Inimigos Ativos: ${this.enemies.length}\n` +
            enemyInfoText;
        }

        // --- ATUALIZAÇÃO DA HUD DE VIDA DO JOGADOR ---
        const playerHpPercentage = Math.max(0, this.playerHp / this.playerMaxHp);
        
        const currentMaskWidth = this.playerMaxInternalWidth * playerHpPercentage;

        if (this.playerHealthText) {
          this.playerHealthText.text = `${Math.round(this.playerHp)} / ${this.playerMaxHp}`;
        }
        
        if (this.playerHealthMask) {
          this.playerHealthMask.clear();
          this.playerHealthMask.rect(
            80 - (this.playerMaxInternalWidth / 2), 
            15 - (this.playerHealthBarFill.height / 2), 
            currentMaskWidth, 
            this.playerHealthBarFill.height
          );
          this.playerHealthMask.fill(0xffffff);
        }

        let playerTexName = 'health_fill_green';
        if (playerHpPercentage < 0.41) {
          playerTexName = 'health_fill_red';
        } else if (playerHpPercentage < 0.71) {
          playerTexName = 'health_fill_amber';
        }

        const newPlayerTex = Texture.from(playerTexName);
        if (newPlayerTex && this.playerHealthBarFill.texture !== newPlayerTex) {
          this.playerHealthBarFill.texture = newPlayerTex;
        }
        
      });

    } catch (e) {
      console.error("Erro ao inicializar a GameScene ou carregar a tilesheet:", e);
    }
  }

  // Método auxiliar para disparar a rajada lateral do jogador usando o array cannonBalls existente
  private firePlayerBroadside(side: 'left' | 'right') {

    if (!this.isAssetsLoaded) return;

    const cannonTexture = XMLAtlasLoader.getTexture('cannon_ball.png');
    if (!cannonTexture || cannonTexture === Texture.EMPTY) return;

    // Define o deslocamento do flanco (-90° para esquerda, +90° para direita)
    const sideOffset = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    const baseRotation = this.myShip.rotation + sideOffset;

    // Os 3 ângulos da rajada
    const spreadAngles = [ -Math.PI / 22, 0, Math.PI / 22 ];

    spreadAngles.forEach((angleOffset) => {
      const finalRotation = baseRotation + angleOffset;

      const ballSprite = new Sprite(cannonTexture);
      ballSprite.anchor.set(0.5);
      ballSprite.width = 10;
      ballSprite.height = 10;
      ballSprite.zIndex = 15;

      const spawnDistance = 30; 
      ballSprite.x = this.myShip.x + Math.cos(finalRotation) * spawnDistance;
      ballSprite.y = this.myShip.y + Math.sin(finalRotation) * spawnDistance;

      this.worldContainer.addChild(ballSprite);

      const vx = Math.cos(finalRotation);
      const vy = Math.sin(finalRotation);

      this.cannonBalls.push({
        sprite: ballSprite,
        vx,
        vy,
        distanceTraveled: 0,
        landTilesPenetrated: 0,
        hasExploded: false,
        lastLandTileKey: '',
        isEnemyShot: false
      });
    });
  }

  private fireCannon() {
    if (!this.isAssetsLoaded) return;

    const cannonTexture = XMLAtlasLoader.getTexture('cannon_ball.png');
    if (!cannonTexture || cannonTexture === Texture.EMPTY) {
      console.warn("Textura 'cannon_ball.png' não encontrada no XMLAtlasLoader!");
      return;
    }

    const ballSprite = new Sprite(cannonTexture);

    ballSprite.anchor.set(0.5);
    ballSprite.width = 10;
    ballSprite.height = 10;
    ballSprite.zIndex = 15;

    const offset = 30;
    ballSprite.x = this.myShip.x + Math.cos(this.myShip.rotation) * offset;
    ballSprite.y = this.myShip.y + Math.sin(this.myShip.rotation) * offset;

    this.worldContainer.addChild(ballSprite);

    const vx = Math.cos(this.myShip.rotation);
    const vy = Math.sin(this.myShip.rotation);

    this.cannonBalls.push({
      sprite: ballSprite,
      vx,
      vy,
      distanceTraveled: 0,
      landTilesPenetrated: 0,
      hasExploded: false,
      lastLandTileKey: '',
      isEnemyShot: false
    });
  }

  private fireEnemyCannon(enemyShip: Ship) {
    if (!this.isAssetsLoaded) return;

    const cannonTexture = XMLAtlasLoader.getTexture('cannon_ball.png');
    if (!cannonTexture || cannonTexture === Texture.EMPTY) return;

    const ballSprite = new Sprite(cannonTexture);
    ballSprite.anchor.set(0.5);
    ballSprite.width = 10;
    ballSprite.height = 10;
    ballSprite.zIndex = 15;

    const offset = 30;
    ballSprite.x = enemyShip.x + Math.cos(enemyShip.rotation) * offset;
    ballSprite.y = enemyShip.y + Math.sin(enemyShip.rotation) * offset;

    this.worldContainer.addChild(ballSprite);

    const vx = Math.cos(enemyShip.rotation);
    const vy = Math.sin(enemyShip.rotation);

    this.cannonBalls.push({
      sprite: ballSprite,
      vx,
      vy,
      distanceTraveled: 0,
      landTilesPenetrated: 0,
      hasExploded: false,
      lastLandTileKey: '',
      isEnemyShot: true 
    });
  }

  private createExplosion(x: number, y: number) {
    const explosionTexture = XMLAtlasLoader.getTexture('explosion_3.png');
    if (!explosionTexture || explosionTexture === Texture.EMPTY) {
      console.warn("Textura 'explosion_3.png' não encontrada no XMLAtlasLoader!");
      return;
    }

    const explosionSprite = new Sprite(explosionTexture);
    explosionSprite.anchor.set(0.5);
    explosionSprite.width = 48;
    explosionSprite.height = 48;
    explosionSprite.x = x;
    explosionSprite.y = y;
    explosionSprite.zIndex = 20;

    this.worldContainer.addChild(explosionSprite);

    setTimeout(() => {
      if (explosionSprite && !explosionSprite.destroyed) {
        this.worldContainer.removeChild(explosionSprite);
        explosionSprite.destroy();
      }
    }, 400);
  }

  private spawnSingleEnemy() {
    if (!this.isAssetsLoaded) return;

    const minDistanceFromPlayer = 400;
    const gridWidth = this.radiusInTiles * 2 + 1;
    const marginFromEdge = 5;
    let attempts = 0;

    while (attempts < 50) {
      attempts++;

      const randomGridX = Math.floor(Math.random() * (gridWidth - marginFromEdge * 2)) + marginFromEdge;
      const randomGridY = Math.floor(Math.random() * (gridWidth - marginFromEdge * 2)) + marginFromEdge;

      // VERIFICAÇÃO DE SEGURANÇA: Impede spawn em cima de terra (ilhas)
      const gridType = this.currentGrid[randomGridX]?.[randomGridY];
      if (!gridType || gridType === 'land') continue;

      const tileX = this.mapOriginTileX + randomGridX;
      const tileY = this.mapOriginTileY + randomGridY;
      const posX = tileX * this.tileSize + this.tileSize / 2;
      const posY = tileY * this.tileSize + this.tileSize / 2;

      if (posX < this.mapMinX + 100 || posX > this.mapMaxX - 100 || posY < this.mapMinY + 100 || posY > this.mapMaxY - 100) {
        continue;
      }

      const distX = posX - this.myShip.x;
      const distY = posY - this.myShip.y;
      const distanceToPlayer = Math.sqrt(distX * distX + distY * distY);

      if (distanceToPlayer < minDistanceFromPlayer) continue;

      const enemyShip = new Ship('red', 0);
      enemyShip.x = posX;
      enemyShip.y = posY;
      enemyShip.rotation = Math.random() * Math.PI * 2;
      enemyShip.zIndex = 10;
      this.worldContainer.addChild(enemyShip);

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
      
      this.worldContainer.addChild(healthContainer);

      this.enemies.push({
        ship: enemyShip,
        state: 'wandering',
        shootTimer: 0,
        wanderAngle: enemyShip.rotation,
        escapeTimer: 0,
        maxHp: 100,
        hp: 100,
        maxInternalWidth,
        healthContainer,
        healthBarFill: fillSprite
      });

      break;
    }
  }

  private spawnEnemies() {
    if (!this.isAssetsLoaded) return;
    const numberOfEnemies = 4;
    for (let i = 0; i < numberOfEnemies; i++) {
      this.spawnSingleEnemy();
    }
    console.log(`${numberOfEnemies} navios inimigos gerados com barras de vida!`);
  }

  private createPlayerHUD() {
    this.playerHealthContainer = new Container();
    this.playerHealthContainer.zIndex = 1000; 

    this.playerHealthContainer.x = 80;
    this.playerHealthContainer.y = 30;

    const frameIcon = Texture.from('icon_heart');
    const frameTex = Texture.from('health_frame');
    const greenFillTex = Texture.from('health_fill_green');

    const barWidth = 205;
    const barHeight = 38;
    this.playerMaxInternalWidth = 165; 

    const iconSprite = new Sprite(frameIcon);
    iconSprite.width = 38;
    iconSprite.height = 38;
    iconSprite.anchor.set(0.0);
    iconSprite.x = -60;
    iconSprite.y = -2;

    const frameSprite = new Sprite(frameTex);
    frameSprite.width = barWidth;
    frameSprite.height = barHeight;
    frameSprite.anchor.set(0.5);
    frameSprite.x = 80;
    frameSprite.y = 15;

    this.playerHealthBarFill = new Sprite(greenFillTex);
    this.playerHealthBarFill.width = this.playerMaxInternalWidth + 39;
    this.playerHealthBarFill.height = barHeight * 1.1;
    this.playerHealthBarFill.anchor.set(0, 0.5);
    this.playerHealthBarFill.x = 60 - (this.playerMaxInternalWidth / 2);
    this.playerHealthBarFill.y = 15;

    // --- MÁSCARA CORRIGIDA PARA O PIXIJS v8 ---
    const maskGraphics = new Graphics();
    maskGraphics.rect(
      80 - (this.playerMaxInternalWidth / 2), 
      15 - (this.playerHealthBarFill.height / 2), 
      this.playerMaxInternalWidth, 
      this.playerHealthBarFill.height
    );
    maskGraphics.fill(0xffffff);

    this.playerHealthBarFill.mask = maskGraphics;
    this.playerHealthMask = maskGraphics;

    this.playerHealthText = new Text({
      text: `${this.playerHp} / ${this.playerMaxHp}`,
      style: {
        fill: '#ffffff',
        fontSize: 12,
        align: 'center'
      }
    });

    this.playerHealthText.anchor.set(0.5); 
    this.playerHealthText.x = 80;          
    this.playerHealthText.y = 15;          

    this.playerHealthContainer.addChild(iconSprite);
    this.playerHealthContainer.addChild(frameSprite);
    this.playerHealthContainer.addChild(this.playerHealthBarFill);
    this.playerHealthContainer.addChild(maskGraphics);
    this.playerHealthContainer.addChild(this.playerHealthText);

    this.app.stage.addChild(this.playerHealthContainer);
  }

  private createStatsHUD() {
    this.statsContainer = new Container();
    this.statsContainer.zIndex = 1000;
    
    // Teste temporário: posicionamento centralizado no topo da tela (visível garantido)
    this.statsContainer.x = (this.app.screen.width / 2) - 140; 
    this.statsContainer.y = 20;

    const frameiconScore = Texture.from('icon_score');
    const frameiconTime = Texture.from('icon_time');
    const panelTexture = Texture.from('counter_panel');

    // Painel de Pontuação

    const iconScore = new Sprite(frameiconScore);
    iconScore.width = 38;
    iconScore.height = 38;
    iconScore.anchor.set(0.0);
    iconScore.x = 175;
    iconScore.y = 2;

    const scorePanel = new Sprite(panelTexture);
    scorePanel.width = 130;
    scorePanel.height = 45;
    scorePanel.x = 210;
    scorePanel.y = 0;

    this.scoreText = new Text({
      text: `0`,
      style: { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' }
    });
    this.scoreText.anchor.set(0.5);
    this.scoreText.x = scorePanel.x + scorePanel.width / 2;
    this.scoreText.y = scorePanel.y + scorePanel.height / 2;

    // Painel de Tempo

    const iconTime = new Sprite(frameiconTime);
    iconTime.width = 38;
    iconTime.height = 38;
    iconTime.anchor.set(0.0);
    iconTime.x = 345;
    iconTime.y = 2;

    const timerPanel = new Sprite(panelTexture);
    timerPanel.width = 130;
    timerPanel.height = 45;
    timerPanel.x = 380; 
    timerPanel.y = 0;

    this.timerText = new Text({
      text: `03:00`,
      style: { fill: '#ffffff', fontSize: 14 }
    });
    this.timerText.anchor.set(0.5);
    this.timerText.x = timerPanel.x + timerPanel.width / 2;
    this.timerText.y = timerPanel.y + timerPanel.height / 2;

    this.statsContainer.addChild(iconScore);
    this.statsContainer.addChild(iconTime);
    this.statsContainer.addChild(scorePanel);
    this.statsContainer.addChild(this.scoreText);
    this.statsContainer.addChild(timerPanel);
    this.statsContainer.addChild(this.timerText);

    // Certifique-se de adicionar ao stage principal da aplicação
    this.app.stage.addChild(this.statsContainer);
  }

  private generateTestMap() {
    if (!this.isAssetsLoaded) return;

    const seed = "meu-oceano-2026";
    this.tileSize = 64; 
    this.radiusInTiles = 30; 

    const startTileX = Math.floor(this.myShip.x / this.tileSize);
    const startTileY = Math.floor(this.myShip.y / this.tileSize);
    
    this.mapOriginTileX = startTileX - this.radiusInTiles;
    this.mapOriginTileY = startTileY - this.radiusInTiles;

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
    const width = this.radiusInTiles * 2 + 1;

    for (let x = 0; x < width; x++) {
      grid[x] = [];
      for (let y = 0; y < width; y++) {
        const tileX = startTileX + (x - this.radiusInTiles);
        const tileY = startTileY + (y - this.radiusInTiles);
        grid[x][y] = calculateRawType(tileX, tileY);
      }
    }

    this.currentGrid = grid;

    this.mapMinX = this.mapOriginTileX * this.tileSize;
    this.mapMaxX = (this.mapOriginTileX + width) * this.tileSize;
    this.mapMinY = this.mapOriginTileY * this.tileSize;
    this.mapMaxY = (this.mapOriginTileY + width) * this.tileSize;

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
        const tileX = startTileX + (x - this.radiusInTiles);
        const tileY = startTileY + (y - this.radiusInTiles);
        const tileType = grid[x][y];

        const deepWaterSprite = new Sprite(TileHelper.getTextureByCoords(TILE_COORDS.DEEP_WATER));
        deepWaterSprite.width = this.tileSize;
        deepWaterSprite.height = this.tileSize;
        deepWaterSprite.x = tileX * this.tileSize;
        deepWaterSprite.y = tileY * this.tileSize;
        deepWaterSprite.zIndex = 0;
        this.worldContainer.addChildAt(deepWaterSprite, 0);

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
          shallowSprite.width = this.tileSize;
          shallowSprite.height = this.tileSize;
          shallowSprite.x = tileX * this.tileSize;
          shallowSprite.y = tileY * this.tileSize;
          shallowSprite.zIndex = 1;
          this.worldContainer.addChild(shallowSprite);
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
          sandSprite.width = this.tileSize;
          sandSprite.height = this.tileSize;
          sandSprite.x = tileX * this.tileSize;
          sandSprite.y = tileY * this.tileSize;
          sandSprite.zIndex = 2;
          this.worldContainer.addChild(sandSprite);

          const poiRng = new SeedRandom(`${seed}_poi_${tileX}_${tileY}`);
          if (poiRng.next() < 0.02 && !isBorder) {
            const towerSprite = new Sprite(TileHelper.getTextureByCoords(TILE_COORDS.STRUCTURES.TOWER_1));
            towerSprite.width = this.tileSize;
            towerSprite.height = this.tileSize;
            towerSprite.x = tileX * this.tileSize;
            towerSprite.y = tileY * this.tileSize;
            towerSprite.zIndex = 4;
            this.worldContainer.addChild(towerSprite);
          }
        }
      }
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {

    if (this.isPaused && e.code !== 'Escape') return;
    
    if (this.keysPressed[e.code]) return; 
    this.keysPressed[e.code] = true;

    if (e.code === 'Space') {
      this.fireCannon();
    } 
    
    if (e.code === 'Escape' && this.isGameOver === false) {
      // Altera a tela no Zustand para 'paused'
      useGameStore.getState().setScreen('paused');
    }

    if (e.code === 'KeyQ') {
      // Usa o navio correto (this.myShip) e dispara para a esquerda
      this.firePlayerBroadside('left');
    } 
    else if (e.code === 'KeyE') {
      // Usa o navio correto (this.myShip) e dispara para a direita
      this.firePlayerBroadside('right');
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = false;
  };

  public destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.myShip) {
      this.myShip.destroy();
    }
    if (this.playerHealthContainer && !this.playerHealthContainer.destroyed) {
      this.playerHealthContainer.destroy({ children: true });
    }
    if (this.statsContainer && !this.statsContainer.destroyed) {
      this.statsContainer.destroy({ children: true });
    }
    for (const ball of this.cannonBalls) {
      ball.sprite.destroy();
    }
    for (const enemyData of this.enemies) {
      enemyData.ship.destroy();
      if (enemyData.healthContainer && !enemyData.healthContainer.destroyed) {
        enemyData.healthContainer.destroy({ children: true });
      }
    }
    this.enemies = [];
    this.cannonBalls = [];
  }
}