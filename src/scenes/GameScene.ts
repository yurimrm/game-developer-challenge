// src/scenes/GameScene.ts
import { Application, Container, Text, Assets, Texture } from 'pixi.js';
import { Ship } from '../core/Ship';
import { TileHelper } from '../core/TileHelper';
import { AssetManager } from '../managers/AssetManager';
import { MapGenerator } from '../core/MapGenerator';
import { CombatManager, CannonBall } from '../managers/CombatManager';
import { EnemyManager, EnemyData } from '../managers/EnemyManager';
import { GameHud } from '../ui/GameHud';
import { useGameStore } from '../ui/GameStore';
import { pirateApi } from '../service/apiService';

export class GameScene {
  private isPaused: boolean = false;
  private isGameOverTriggered: boolean = false;
  
  private app: Application;
  private worldContainer: Container;
  private myShip!: Ship;
  private keysPressed: Record<string, boolean> = {};
  private infoText?: Text;
  private isAssetsLoaded: boolean = false;

  private tileSize: number = 64;
  private radiusInTiles: number = 30;
  private currentGrid: ('deep' | 'shallow' | 'land')[][] = [];
  private mapOriginTileX: number = 0;
  private mapOriginTileY: number = 0;

  private mapMinX: number = 0;
  private mapMaxX: number = 4000;
  private mapMinY: number = 0;
  private mapMaxY: number = 4000;

  private playerMaxHp: number = 100;
  private playerHp: number = 100;
  private playerHealthBarFill!: any;
  private playerHealthMask!: any;
  private playerMaxInternalWidth: number = 165;
  private playerHealthText!: Text;

  private mobileInputAngle: number | null = null;
  private isMobileMoving: boolean = false;
  private lastMobileAngle: number = 0;

  private lastShotTime: number = 0;
  private shootCooldown: number = 300; // Milissegundos entre cada tiro (ajuste se quiser mais lento/rápido)

  private score: number = 0;
  private remainingTime: number = useGameStore.getState().matchDuration; 
  private maxAllowedEnemies: number = useGameStore.getState().maxEnemies; 
  private timeElapsedAccumulator: number = 0; 
  private scoreText!: Text;
  private timerText!: Text;

  private cannonBalls: CannonBall[] = [];
  private enemies: EnemyData[] = [];

  constructor(app: Application) {
    this.app = app;
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.app.stage.addChild(this.worldContainer);

    this.init();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    this.playSound(paused ? 'game_pause.wav' : 'game_resume.wav');
  }

  private playSound(filename: string, volume: number = 0.5) {
    try {
      const audio = new Audio(`assets/sounds/${filename}`);
      audio.volume = volume;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  private async init() {
    try {
      this.isGameOverTriggered = false;

      await AssetManager.getInstance().loadGameAssets();
      TileHelper.init(Assets.get('assets/tilesheet/tiles_sheet.png'));
      this.isAssetsLoaded = true;

      this.myShip = new Ship('blue', 0);
      this.myShip.x = 1000;
      this.myShip.y = 1000; 
      this.myShip.zIndex = 10;

      const mapRes = MapGenerator.generate(this.worldContainer, this.myShip.x, this.myShip.y, this.tileSize, this.radiusInTiles);
      this.currentGrid = mapRes.currentGrid;
      this.mapOriginTileX = mapRes.mapOriginTileX;
      this.mapOriginTileY = mapRes.mapOriginTileY;
      this.mapMinX = mapRes.mapMinX;
      this.mapMaxX = mapRes.mapMaxX;
      this.mapMinY = mapRes.mapMinY;
      this.mapMaxY = mapRes.mapMaxY;

      this.spawnEnemies(); 

      this.worldContainer.addChild(this.myShip);

      const pHud = GameHud.createPlayerHUD(this.app, this.playerHp, this.playerMaxHp);
      this.playerHealthBarFill = pHud.healthBarFill;
      this.playerHealthMask = pHud.healthMask;
      this.playerHealthText = pHud.healthText;
      this.playerMaxInternalWidth = pHud.maxInternalWidth;

      const sHud = GameHud.createStatsHUD(this.app);
      this.scoreText = sHud.scoreText;
      this.timerText = sHud.timerText;

      this.playSound('game_start.wav', 0.6);

      this.infoText = new Text({
        text: 'Carregando dados de depuração...',
        style: { fill: '#ffffff', fontSize: 14, align: 'left' }
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

      const handleGameOverSubmission = async (playerName: string, score: number, timeSurvived: any, enemiesDefeated: number) => {
        try {
          const token = await pirateApi.login(playerName);
          await pirateApi.saveMatchRecord({ playerName, score, timeSurvived, enemiesDefeated }, token);
        } catch (err) {}
      };

      this.app.ticker.add((ticker) => {
        if (this.isPaused) return;

        if ((this.playerHp <= 0 || this.remainingTime <= 0) && !this.isGameOverTriggered) {
          this.isGameOverTriggered = true;
          this.playSound('game_over.wav', 0.7);

          const { playerName, matchDuration } = useGameStore.getState();
          const timeLeft = this.remainingTime;
          const timeSpentSeconds = matchDuration - timeLeft;
          const timeFormatted = `${String(Math.floor(timeSpentSeconds / 60)).padStart(2, '0')}:${String(timeSpentSeconds % 60).padStart(2, '0')}`;

          useGameStore.getState().addMatchRecord({ playerName, score: this.score, timeSurvived: timeFormatted, enemiesDefeated: this.score });
          handleGameOverSubmission(playerName, this.score, timeFormatted, this.score);
          useGameStore.getState().addRanking(playerName, this.score);
          useGameStore.getState().setCurrentGameStats(this.score, timeLeft);
          useGameStore.getState().setScreen('game_over');
          return;
        }

        if (this.isGameOverTriggered) return;
        const delta = ticker.deltaTime;

        if (this.remainingTime > 0) {
          this.timeElapsedAccumulator += ticker.deltaMS;
          if (this.timeElapsedAccumulator >= 1000) {
            this.remainingTime -= 1;
            this.timeElapsedAccumulator -= 1000;
          }
          if (this.timerText) {
            this.timerText.text = `${String(Math.floor(this.remainingTime / 60)).padStart(2, '0')}:${String(this.remainingTime % 60).padStart(2, '0')}`;
          }
        }

        if (this.enemies.length < this.maxAllowedEnemies && Math.random() < 0.02) {
          this.spawnSingleEnemy();
        }

        // Tratamento de Movimento (Joystick Direcional do Telemóvel)
        if (this.isMobileMoving && this.mobileInputAngle !== null) {
          // A a apontar ativamente para o joystick
          let angleDiff = this.mobileInputAngle - this.myShip.rotation;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          this.myShip.rotation += angleDiff * 0.2 * delta;

          this.myShip.accelerate(0.05 * delta);
        } else if (!this.isMobileMoving && this.mobileInputAngle === null && !this.keysPressed['KeyW'] && !this.keysPressed['KeyS']) {
          // 🚀 SOLTOU O JOYSTICK: Mantém o barco a deslizar na última direção guardada enquanto desacelera
          let angleDiff = this.lastMobileAngle - this.myShip.rotation;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          this.myShip.rotation += angleDiff * 0.1 * delta; // Trajetória firme sem guinadas

          this.myShip.speed *= 0.98; // Desaceleração suave
        } else {
          // Controles de Teclado tradicionais (PC)
          if (this.keysPressed['ArrowUp'] || this.keysPressed['KeyW']) this.myShip.accelerate(0.05 * delta);
          if (this.keysPressed['ArrowDown'] || this.keysPressed['KeyS']) this.myShip.accelerate(-0.05 * delta);
          if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) this.myShip.steer(-1);
          if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) this.myShip.steer(1);

          if (!this.keysPressed['ArrowUp'] && !this.keysPressed['KeyW'] && !this.keysPressed['ArrowDown'] && !this.keysPressed['KeyS']) {
            this.myShip.speed *= 0.98; 
          }
        }

        const prevX = this.myShip.x;
        const prevY = this.myShip.y;
        this.myShip.update(delta);

        const margin = 40; 
        if (this.myShip.x < this.mapMinX + margin || this.myShip.x > this.mapMaxX - margin || this.myShip.y < this.mapMinY + margin || this.myShip.y > this.mapMaxY - margin) {
          this.myShip.x = prevX;
          this.myShip.y = prevY;
          this.myShip.speed = -this.myShip.speed * 0.5; 
        }

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

        // Projéteis
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
                CombatManager.createExplosion(this.worldContainer, ball.sprite.x, ball.sprite.y);
                this.playSound('ship_wood_hit_1.wav');

                this.worldContainer.removeChild(ball.sprite);
                ball.sprite.destroy();
                this.cannonBalls.splice(i, 1);
                projectileDestroyed = true;

                if (enemyData.hp <= 0) {
                  this.playSound('ship_sinking.wav');
                  this.worldContainer.removeChild(enemyData.ship);
                  enemyData.ship.destroy();
                  this.worldContainer.removeChild(enemyData.healthContainer);
                  enemyData.healthContainer.destroy({ children: true });
                  this.enemies.splice(j, 1);
                  
                  this.score += 1;
                  this.playSound('score_point.wav');
                  if (this.scoreText) this.scoreText.text = `${this.score}`;
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
              CombatManager.createExplosion(this.worldContainer, ball.sprite.x, ball.sprite.y);
              this.playSound('ship_wood_hit_2.wav');

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

          let hitLand = false;
          if (ballGridX >= 0 && ballGridX < width && ballGridY >= 0 && ballGridY < width) {
            if (this.currentGrid[ballGridX]?.[ballGridY] === 'land') hitLand = true;
          }

          if (hitLand) {
            const currentTileKey = `${ballTileX}_${ballTileY}`;
            if (ball.lastLandTileKey !== currentTileKey) {
              ball.lastLandTileKey = currentTileKey;
              ball.landTilesPenetrated++; 
            }
          }

          if (ball.landTilesPenetrated >= 3 || ball.distanceTraveled > 350) {
            CombatManager.createExplosion(this.worldContainer, ball.sprite.x, ball.sprite.y);
            this.playSound('cannonball_water_hit_1.wav', 0.4);
            this.worldContainer.removeChild(ball.sprite);
            ball.sprite.destroy();
            this.cannonBalls.splice(i, 1);
          }
        }
        
        // Inimigos AI
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemyData = this.enemies[j];
          const enemy = enemyData.ship;
          const dx = this.myShip.x - enemy.x;
          const dy = this.myShip.y - enemy.y;
          const distToPlayer = Math.sqrt(dx * dx + dy * dy);

          const prevEnemyX = enemy.x;
          const prevEnemyY = enemy.y;

          let targetSpeed = 1.5;

          enemyData.healthContainer.x = enemy.x;
          enemyData.healthContainer.y = enemy.y - 40;

          const hpPercentage = Math.max(0, enemyData.hp / enemyData.maxHp);
          enemyData.healthBarFill.width = enemyData.maxInternalWidth * hpPercentage;
          enemyData.healthBarFill.texture = Texture.from(hpPercentage < 0.3 ? 'enemy_health_fill_red' : 'enemy_health_fill_green');

          const mapGridWidth = this.radiusInTiles * 2 + 1;
          const checkIsLand = (px: number, py: number) => {
            const tX = Math.floor(px / this.tileSize);
            const tY = Math.floor(py / this.tileSize);
            const gX = tX - this.mapOriginTileX;
            const gY = tY - this.mapOriginTileY;
            if (gX >= 0 && gX < mapGridWidth && gY >= 0 && gY < mapGridWidth) {
              return this.currentGrid[gX]?.[gY] === 'land';
            }
            return false;
          };

          // Sensores de desvio um pouco mais distantes para antecipar a curva
          const lookAheadDist = 90;
          const sideOffsetAngle = 0.5;
          const aheadX = enemy.x + Math.cos(enemy.rotation) * lookAheadDist;
          const aheadY = enemy.y + Math.sin(enemy.rotation) * lookAheadDist;
          const leftAheadX = enemy.x + Math.cos(enemy.rotation - sideOffsetAngle) * (lookAheadDist * 0.8);
          const leftAheadY = enemy.y + Math.sin(enemy.rotation - sideOffsetAngle) * (lookAheadDist * 0.8);
          const rightAheadX = enemy.x + Math.cos(enemy.rotation + sideOffsetAngle) * (lookAheadDist * 0.8);
          const rightAheadY = enemy.y + Math.sin(enemy.rotation + sideOffsetAngle) * (lookAheadDist * 0.8);

          const hitCenter = checkIsLand(aheadX, aheadY);
          const hitLeft = checkIsLand(leftAheadX, leftAheadY);
          const hitRight = checkIsLand(rightAheadX, rightAheadY);

          // Se ainda está no tempo de fuga/desvio
          if (enemyData.escapeTimer > 0) {
            enemyData.escapeTimer -= delta;
            enemyData.state = 'escaping';
            
            // Mantém firmemente a direção de desvio escolhida (sem recalcular a cada frame)
            const turnDir = enemyData.avoidanceDirection || 1;
            enemy.rotation += 0.08 * turnDir * delta; 
            targetSpeed = 1.6;
          } 
          else if (hitCenter || hitLeft || hitRight) {
            // Acabou de detetar a ilha: inicia o desvio com tempo fixo para garantir estabilidade
            enemyData.escapeTimer = 50; // Tempo maior de curva para contornar limpo
            enemyData.state = 'escaping';

            // Define a direção fixa com base em qual lado bateu (evita indecisão)
            if (hitLeft && !hitRight) {
              enemyData.avoidanceDirection = 1;  // Força curva para a direita
            } else if (hitRight && !hitLeft) {
              enemyData.avoidanceDirection = -1; // Força curva para a esquerda
            } else {
              enemyData.avoidanceDirection = Math.random() > 0.5 ? 1 : -1;
            }
          } 
          else {
            // --- MOVIMENTO NORMAL (SEM OBSTÁCULOS PRÓXIMOS) ---
            if (enemyData.type === 'kamikaze') {
              if (distToPlayer <= 45) {
                this.playerHp = Math.max(0, this.playerHp - 25);
                CombatManager.createExplosion(this.worldContainer, enemy.x, enemy.y);
                this.playSound('ship_explosion_1.wav', 0.8);

                this.worldContainer.removeChild(enemy);
                enemy.destroy();
                this.worldContainer.removeChild(enemyData.healthContainer);
                enemyData.healthContainer.destroy({ children: true });
                this.enemies.splice(j, 1);
                continue;
              }

              if (distToPlayer <= 700) {
                enemyData.state = 'kamikaze';
                let angleDiff = Math.atan2(dy, dx) - enemy.rotation;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                enemy.rotation += angleDiff * 0.25 * delta; // Rotação mais suave rumo ao player
                targetSpeed = 3.0; 
              } else {
                enemyData.state = 'wandering';
                if (Math.random() < 0.05) enemyData.wanderAngle += (Math.random() - 0.5) * 2.0;
                let angleDiff = enemyData.wanderAngle - enemy.rotation;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                enemy.rotation += angleDiff * 0.08 * delta;
                targetSpeed = 1.8;
              }
            } else {
              if (distToPlayer <= 650) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - enemy.rotation;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                enemy.rotation += angleDiff * 0.15 * delta; // Suavizado para evitar guinadas bruscas

                if (distToPlayer > 280) {
                  enemyData.state = 'chasing';
                  targetSpeed = 1.5; 
                } else {
                  enemyData.state = 'attacking';
                  targetSpeed = 0;   
                  enemyData.shootTimer += delta;
                  if (enemyData.shootTimer > 75) { 
                    enemyData.shootTimer = 0;
                    if (Math.abs(angleDiff) < 0.4) {
                      const ball = CombatManager.createCannonBall(enemy, this.worldContainer, true);
                      if (ball) {
                        this.playSound('cannon_fire_1.wav', 0.4);
                        this.cannonBalls.push(ball);
                      }
                    }
                  }
                }
              } else {
                enemyData.state = 'wandering';
                if (Math.random() < 0.03) enemyData.wanderAngle += (Math.random() - 0.5) * 2.0;
                let angleDiff = enemyData.wanderAngle - enemy.rotation;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                enemy.rotation += angleDiff * 0.08 * delta;
                targetSpeed = 1.5;
              }
            }
          }

          enemy.speed += (targetSpeed - enemy.speed) * 0.08 * delta;
          enemy.update(delta);         

          // Salvaguarda caso encoste na terra
          const enemyTileX = Math.floor(enemy.x / this.tileSize);
          const enemyTileY = Math.floor(enemy.y / this.tileSize);
          const eGridX = enemyTileX - this.mapOriginTileX;
          const eGridY = enemyTileY - this.mapOriginTileY;

          if (eGridX >= 0 && eGridX < mapGridWidth && eGridY >= 0 && eGridY < mapGridWidth) {
            if (this.currentGrid[eGridX]?.[eGridY] === 'land') {
              enemy.x = prevEnemyX;
              enemy.y = prevEnemyY;
              enemy.speed = 0;
              enemy.rotation += 0.3; // Força um pequeno giro para escapar se tocar na borda
            }
          }

          this.worldContainer.sortChildren();
        }

        let enemyInfoText = '';
        this.enemies.forEach((enemyData, index) => {
          enemyInfoText += `Inimigo ${index + 1} [${enemyData.type}] (${enemyData.state}) -> HP: ${enemyData.hp}\n`;
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

        const stageScaleX = this.app.stage.scale.x;
        const stageScaleY = this.app.stage.scale.y;
        const currentCenterX = (this.app.renderer.width / stageScaleX) / 2;
        const currentCenterY = (this.app.renderer.height / stageScaleY) / 2;

        let targetX = currentCenterX - this.myShip.x;
        let targetY = currentCenterY - this.myShip.y;
        const screenWidth = this.app.renderer.width / stageScaleX;
        const screenHeight = this.app.renderer.height / stageScaleY;

        targetX = Math.max(screenWidth - this.mapMaxX, Math.min(-this.mapMinX, targetX));
        targetY = Math.max(screenHeight - this.mapMaxY, Math.min(-this.mapMinY, targetY));

        this.worldContainer.x += (targetX - this.worldContainer.x) * 0.1;
        this.worldContainer.y += (targetY - this.worldContainer.y) * 0.1;

        const pPct = Math.max(0, this.playerHp / this.playerMaxHp);
        if (this.playerHealthText) this.playerHealthText.text = `${Math.round(this.playerHp)} / ${this.playerMaxHp}`;
        if (this.playerHealthMask) {
          this.playerHealthMask.clear();
          this.playerHealthMask.rect(80 - (this.playerMaxInternalWidth / 2), 15 - (this.playerHealthBarFill.height / 2), this.playerMaxInternalWidth * pPct, this.playerHealthBarFill.height);
          this.playerHealthMask.fill(0xffffff);
        }
      });

    } catch (e) {
      console.error("Erro na GameScene:", e);
    }
  }

  private fireCannon() {
    if (!this.isAssetsLoaded) return;

    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.shootCooldown) return; // Impede o tiro se estiver no cooldown
    this.lastShotTime = currentTime;

    const fireSounds = ['cannon_fire_1.wav', 'cannon_fire_2.wav', 'cannon_fire_3.wav'];
    this.playSound(fireSounds[Math.floor(Math.random() * fireSounds.length)], 0.6);

    const ball = CombatManager.createCannonBall(this.myShip, this.worldContainer, false);
    if (ball) this.cannonBalls.push(ball);
  }

  private firePlayerBroadside(side: 'left' | 'right') {
    if (!this.isAssetsLoaded) return;

    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.shootCooldown) return; // Impede o broadside se estiver no cooldown
    this.lastShotTime = currentTime;

    this.playSound('cannon_broadside.wav', 0.7);
    const sideOffset = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    [ -Math.PI / 22, 0, Math.PI / 22 ].forEach((angleOffset) => {
      const ball = CombatManager.createCannonBall(this.myShip, this.worldContainer, false, sideOffset + angleOffset);
      if (ball) this.cannonBalls.push(ball);
    });
  }

  private spawnSingleEnemy() {
    if (!this.isAssetsLoaded) return;
    const enemy = EnemyManager.spawnSingleEnemy(
      this.worldContainer, this.myShip, this.currentGrid,
      this.mapOriginTileX, this.mapOriginTileY, this.tileSize,
      this.radiusInTiles, this.mapMinX, this.mapMaxX, this.mapMinY, this.mapMaxY
    );
    if (enemy) this.enemies.push(enemy);
  }

  private spawnEnemies() {
    if (!this.isAssetsLoaded) return;
    for (let i = 0; i < this.maxAllowedEnemies; i++) {
      this.spawnSingleEnemy();
    }
  }

  // Novo controle direcional livre (o ângulo vem direto do joystick virtual)
  public setMobileJoystick(angle: number | null, isMoving: boolean) {
    this.isMobileMoving = isMoving;
    this.mobileInputAngle = angle;

    if (angle !== null) {
      this.lastMobileAngle = angle; // Guarda sempre a última direção apontada
    }

    if (!isMoving) {
      this.keysPressed['KeyW'] = false;
      this.keysPressed['KeyS'] = false;
      this.keysPressed['KeyA'] = false;
      this.keysPressed['KeyD'] = false;
      this.keysPressed['ArrowUp'] = false;
      this.keysPressed['ArrowDown'] = false;
      this.keysPressed['ArrowLeft'] = false;
      this.keysPressed['ArrowRight'] = false;
    }
  }

  public fireCannonMobile() { 
    this.fireCannon(); 
  }

  public firePlayerBroadsideMobile(side: 'left' | 'right') { 
    this.firePlayerBroadside(side); 
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isPaused && e.code !== 'Escape') return;
    
    // Removemos o bloqueio 'if (this.keysPressed[e.code]) return' apenas para teclas de tiro 
    // se quisermos gerir pelo cooldown de tempo, mas mantemos para evitar spam contínuo 
    // ou deixamos o cooldown tratar disso. O cooldown por tempo já resolve perfeitamente!
    
    if (this.keysPressed[e.code]) return; 
    this.keysPressed[e.code] = true;

    if (e.code === 'Space') { this.fireCannon(); } 
    if (e.code === 'Escape') { useGameStore.getState().setScreen('paused'); }
    if (e.code === 'KeyQ') { this.firePlayerBroadside('left'); } 
    if (e.code === 'KeyE') { this.firePlayerBroadside('right'); }
  };

  private onKeyUp = (e: KeyboardEvent) => { 
    this.keysPressed[e.code] = false; 
  };

  public destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.worldContainer.destroy({ children: true });
  }
}