// src/scenes/GameScene.ts
import { Application, Container, Assets, Texture, Sprite, Graphics } from 'pixi.js';
import { DamageLevel, Ship } from '../core/Ship';
import { TileHelper } from '../core/TileHelper';
import { AssetManager } from '../managers/AssetManager';
import { MapGenerator } from '../core/MapGenerator';
import { CombatManager, CannonBall } from '../managers/CombatManager';
import { EnemyManager, EnemyData } from '../managers/EnemyManager';
import { useGameStore } from '../ui/GameStore';
import { pirateApi } from '../service/apiService';

interface TrailParticle {
  sprite: Sprite;
  life: number;
  maxLife: number;
}

export class GameScene {
  private isPaused: boolean = false;
  private isGameOverTriggered: boolean = false;
  
  private app: Application;
  private worldContainer: Container;
  private myShip!: Ship;
  private keysPressed: Record<string, boolean> = {};
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
  private currentPlayerTier: DamageLevel = 0;
  
  private mobileInputAngle: number | null = null;
  private isMobileMoving: boolean = false;

  private lastShotTime: number = 0;
  private shootCooldown: number = 300; 

  private score: number = 0;
  private remainingTime: number = useGameStore.getState().matchDuration; 
  private maxAllowedEnemies: number = useGameStore.getState().maxEnemies; 
  private timeElapsedAccumulator: number = 0; 

  private cannonBalls: CannonBall[] = [];
  private enemies: EnemyData[] = [];
  
  private trails: TrailParticle[] = [];
  private particleTexture!: Texture;
  
  private playerHitFlashTimer: number = 0;
  private cameraShakeTimer: number = 0;
  private floatTimer: number = 0;

  constructor(app: Application) {
    this.app = app;
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.app.stage.addChild(this.worldContainer);

    this.initParticleTexture();
    this.init();
  }

  private initParticleTexture() {
    const graphics = new Graphics();
    graphics.circle(0, 0, 4); 
    graphics.fill(0xffffff);
    this.particleTexture = this.app.renderer.generateTexture(graphics);
    graphics.destroy();
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

      const matchDur = useGameStore.getState().matchDuration;
      useGameStore.getState().resetGameStats(matchDur);
      this.playerHp = 100;
      this.score = 0;
      this.remainingTime = matchDur;
      this.currentPlayerTier = 0;

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

      this.playSound('game_start.wav', 0.6);

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
        this.floatTimer += delta * 0.1;

        if (this.remainingTime > 0) {
          this.timeElapsedAccumulator += ticker.deltaMS;
          if (this.timeElapsedAccumulator >= 1000) {
            this.remainingTime -= 1;
            this.timeElapsedAccumulator -= 1000;
            useGameStore.getState().setRemainingTime(this.remainingTime);
          }
        }

        if (this.enemies.length < this.maxAllowedEnemies && Math.random() < 0.02) {
          this.spawnSingleEnemy();
        }

        const playerHpPct = this.playerHp / this.playerMaxHp;
        const desiredPlayerTier: DamageLevel = playerHpPct < 0.3 ? 2 : playerHpPct < 0.75 ? 1 : 0;
        if (this.currentPlayerTier !== desiredPlayerTier) {
          this.currentPlayerTier = desiredPlayerTier;
          this.myShip.setDamage(desiredPlayerTier);
        }

        if (this.playerHitFlashTimer > 0) {
          this.playerHitFlashTimer -= delta;
          this.myShip.tint = 0xff2222; 
        } else {
          this.myShip.tint = 0xffffff; 
        }

        const floatOffset = Math.sin(this.floatTimer) * 2.5;
        this.myShip.y += floatOffset * 0.05;

        const isPcActive = 
          this.keysPressed['ArrowUp'] || this.keysPressed['KeyW'] || 
          this.keysPressed['ArrowDown'] || this.keysPressed['KeyS'] || 
          this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA'] || 
          this.keysPressed['ArrowRight'] || this.keysPressed['KeyD'];

        if (this.isMobileMoving && this.mobileInputAngle !== null) {
          let angleDiff = this.mobileInputAngle - this.myShip.rotation;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          
          const deadZoneAngle = 0.08;
          if (angleDiff > deadZoneAngle) {
            this.myShip.steer(1);
          } else if (angleDiff < -deadZoneAngle) {
            this.myShip.steer(-1);
          }
          this.myShip.accelerate(0.05 * delta);
        } 
        else if (isPcActive) {
          if (this.keysPressed['ArrowUp'] || this.keysPressed['KeyW']) this.myShip.accelerate(0.05 * delta);
          if (this.keysPressed['ArrowDown'] || this.keysPressed['KeyS']) this.myShip.accelerate(-0.05 * delta);
          if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) this.myShip.steer(-1);
          if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) this.myShip.steer(1);
        } 
        else {
          this.myShip.speed *= 0.98;
        }

        const prevX = this.myShip.x;
        const prevY = this.myShip.y;
        this.myShip.update(delta);

        // --- RASTRO EM "V" FINO E LIGEIRAMENTE INCLINADO ---
        if (Math.abs(this.myShip.speed) > 0.2) {
          const sternX = this.myShip.x + Math.cos(this.myShip.rotation + Math.PI) * 18;
          const sternY = this.myShip.y + Math.sin(this.myShip.rotation + Math.PI) * 18;

          const sideOffset = 8;
          const perpAngle = this.myShip.rotation + Math.PI / 2;
          const skewAngle = 0.35; 

          const leftX = sternX + Math.cos(perpAngle) * sideOffset + Math.cos(this.myShip.rotation - skewAngle) * 4;
          const leftY = sternY + Math.sin(perpAngle) * sideOffset + Math.sin(this.myShip.rotation - skewAngle) * 4;
          const rightX = sternX - Math.cos(perpAngle) * sideOffset + Math.cos(this.myShip.rotation + skewAngle) * 4;
          const rightY = sternY - Math.sin(perpAngle) * sideOffset + Math.sin(this.myShip.rotation + skewAngle) * 4;

          const leftTrail = new Sprite(this.particleTexture);
          leftTrail.width = 5;
          leftTrail.height = 5;
          leftTrail.anchor.set(0.5);
          leftTrail.tint = 0xffffff;
          leftTrail.alpha = 0.85;
          leftTrail.x = leftX;
          leftTrail.y = leftY;
          leftTrail.zIndex = 2;
          this.worldContainer.addChild(leftTrail);
          this.trails.push({ sprite: leftTrail, life: 1.0, maxLife: 1.0 });

          const rightTrail = new Sprite(this.particleTexture);
          rightTrail.width = 5;
          rightTrail.height = 5;
          rightTrail.anchor.set(0.5);
          rightTrail.tint = 0xffffff;
          rightTrail.alpha = 0.85;
          rightTrail.x = rightX;
          rightTrail.y = rightY;
          rightTrail.zIndex = 2;
          this.worldContainer.addChild(rightTrail);
          this.trails.push({ sprite: rightTrail, life: 1.0, maxLife: 1.0 });
        }

        const stageScaleX = this.app.stage.scale.x;
        const stageScaleY = this.app.stage.scale.y;
        const screenWidth = this.app.renderer.width / stageScaleX;
        const screenHeight = this.app.renderer.height / stageScaleY;

        // --- 2. COLISÃO PROPORCIONAL À ÁREA VISÍVEL ---
        const paddingX = screenWidth * 0.08; // 8% de margem interna segura nas laterais
        const paddingY = screenHeight * 0.08; // 8% de margem interna segura no topo/fundo

        const minXLimit = this.mapMinX + paddingX;
        const maxXLimit = this.mapMaxX - paddingX;
        const minYLimit = this.mapMinY + paddingY;
        const maxYLimit = this.mapMaxY - paddingY;
        const shipRadius = 25; 

        if (this.myShip.x < minXLimit + shipRadius || 
            this.myShip.x > maxXLimit - shipRadius || 
            this.myShip.y < minYLimit + shipRadius || 
            this.myShip.y > maxYLimit - shipRadius) {
          this.myShip.x = prevX;
          this.myShip.y = prevY;
          this.myShip.speed = -this.myShip.speed * 0.4; 
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

        // --- PROJÉTEIS E RASTROS DE BALA ---
        for (let i = this.cannonBalls.length - 1; i >= 0; i--) {
          const ball = this.cannonBalls[i];
          const step = 12 * delta; 
          ball.sprite.x += ball.vx * step;
          ball.sprite.y += ball.vy * step;
          ball.distanceTraveled += step;

          const ballTrail = new Sprite(this.particleTexture);
          ballTrail.width = 5;
          ballTrail.height = 5;
          ballTrail.anchor.set(0.5);
          ballTrail.tint = 0xffffff;
          ballTrail.alpha = 0.7;
          ballTrail.x = ball.sprite.x;
          ballTrail.y = ball.sprite.y;
          ballTrail.zIndex = 6;
          this.worldContainer.addChild(ballTrail);
          this.trails.push({ sprite: ballTrail, life: 0.5, maxLife: 0.5 });

          let projectileDestroyed = false;

          if (!ball.isEnemyShot) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
              const enemyData = this.enemies[j];
              const dx = ball.sprite.x - enemyData.ship.x;
              const dy = ball.sprite.y - enemyData.ship.y;
              const distToEnemy = Math.sqrt(dx * dx + dy * dy);

              if (distToEnemy < 35) {
                enemyData.hp -= 25;
                (enemyData as any).hitFlashTimer = 20; 
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
                  useGameStore.getState().setScore(this.score);
                  this.playSound('score_point.wav');
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
              useGameStore.getState().setPlayerHp(this.playerHp);
              
              this.playerHitFlashTimer = 30;
              this.cameraShakeTimer = 35;

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
        
        // --- ATUALIZAÇÃO DOS RASTROS ---
        for (let t = this.trails.length - 1; t >= 0; t--) {
          const tr = this.trails[t];
          tr.life -= delta * 0.04;
          if (tr.life <= 0) {
            this.worldContainer.removeChild(tr.sprite);
            tr.sprite.destroy();
            this.trails.splice(t, 1);
          } else {
            tr.sprite.alpha = (tr.life / tr.maxLife) * 0.7;
            tr.sprite.scale.set(1 + (1 - tr.life / tr.maxLife) * 0.8);
          }
        }

        // --- INIMIGOS AI E TIER/DANOS ---
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemyData = this.enemies[j];
          const enemy = enemyData.ship;
          const dx = this.myShip.x - enemy.x;
          const dy = this.myShip.y - enemy.y;
          const distToPlayer = Math.sqrt(dx * dx + dy * dy);

          const prevEnemyX = enemy.x;
          const prevEnemyY = enemy.y;
          let targetSpeed = 1.5;

          const enemyHpPct = enemyData.hp / enemyData.maxHp;
          const desiredEnemyTier: DamageLevel = enemyHpPct < 0.3 ? 2 : enemyHpPct < 0.75 ? 1 : 0;
          const enemyExtended = enemyData as any;
          if (enemyExtended.currentTier !== desiredEnemyTier) {
            enemyExtended.currentTier = desiredEnemyTier;
            enemy.setDamage(desiredEnemyTier);
          }

          if (enemyExtended.hitFlashTimer && enemyExtended.hitFlashTimer > 0) {
            enemyExtended.hitFlashTimer -= delta;
            enemy.tint = 0xff2222;
          } else {
            enemy.tint = 0xffffff;
          }

          enemyData.healthContainer.x = enemy.x;
          enemyData.healthContainer.y = enemy.y - 40;

          const hpPercentage = Math.max(0, enemyData.hp / enemyData.maxHp);
          enemyData.healthBarFill.width = enemyData.maxInternalWidth * hpPercentage;
          
          if (hpPercentage >= 0.75) {
            enemyData.healthBarFill.tint = 0x2ecc71;
          } else if (hpPercentage >= 0.3) {
            enemyData.healthBarFill.tint = 0xf1c40f;
          } else {
            enemyData.healthBarFill.tint = 0xe74c3c;
          }

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

          if (enemyData.escapeTimer > 0) {
            enemyData.escapeTimer -= delta;
            enemyData.state = 'escaping';
            const turnDir = enemyData.avoidanceDirection || 1;
            enemy.rotation += 0.08 * turnDir * delta; 
            targetSpeed = 1.6;
          } 
          else if (hitCenter || hitLeft || hitRight) {
            enemyData.escapeTimer = 50;
            enemyData.state = 'escaping';
            if (hitLeft && !hitRight) {
              enemyData.avoidanceDirection = 1;
            } else if (hitRight && !hitLeft) {
              enemyData.avoidanceDirection = -1;
            } else {
              enemyData.avoidanceDirection = Math.random() > 0.5 ? 1 : -1;
            }
          } 
          else {
            if (enemyData.type === 'kamikaze') {
              if (distToPlayer <= 45) {
                this.playerHp = Math.max(0, this.playerHp - 25);
                useGameStore.getState().setPlayerHp(this.playerHp);
                this.playerHitFlashTimer = 35;
                this.cameraShakeTimer = 40;

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
                enemy.rotation += angleDiff * 0.25 * delta;
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
                enemy.rotation += angleDiff * 0.15 * delta;

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

          const enemyTileX = Math.floor(enemy.x / this.tileSize);
          const enemyTileY = Math.floor(enemy.y / this.tileSize);
          const eGridX = enemyTileX - this.mapOriginTileX;
          const eGridY = enemyTileY - this.mapOriginTileY;

          if (eGridX >= 0 && eGridX < mapGridWidth && eGridY >= 0 && eGridY < mapGridWidth) {
            if (this.currentGrid[eGridX]?.[eGridY] === 'land') {
              enemy.x = prevEnemyX;
              enemy.y = prevEnemyY;
              enemy.speed = 0;
              enemy.rotation += 0.3;
            }
          }

          this.worldContainer.sortChildren();
        }

        // --- CÂMARA COM AJUSTE PARA ELIMINAR A BORDA PRETA NA DIREITA ---
        const currentCenterX = screenWidth / 2;
        const currentCenterY = screenHeight / 2;

        let targetX = currentCenterX - this.myShip.x;
        let targetY = currentCenterY - this.myShip.y;

        // Adicionamos um deslocamento extra (-180) no minCameraX para puxar o mapa para a esquerda e tapar o preto
        const minCameraX = (screenWidth - this.mapMaxX) + 180; 
        const maxCameraX = -this.mapMinX;
        const minCameraY = screenHeight - this.mapMaxY;
        const maxCameraY = -this.mapMinY;

        targetX = Math.min(maxCameraX, Math.max(minCameraX, targetX));
        targetY = Math.min(maxCameraY, Math.max(minCameraY, targetY));

        let shakeOffsetX = 0;
        let shakeOffsetY = 0;
        if (this.cameraShakeTimer > 0) {
          this.cameraShakeTimer -= delta;
          shakeOffsetX = (Math.random() - 0.5) * 40;
          shakeOffsetY = (Math.random() - 0.5) * 40;
        }

        this.worldContainer.x += ((targetX + shakeOffsetX) - this.worldContainer.x) * 0.2;
        this.worldContainer.y += ((targetY + shakeOffsetY) - this.worldContainer.y) * 0.2;
      });

    } catch (e) {
      console.error("Erro na GameScene:", e);
    }
  }

  private fireCannon() {
    if (!this.isAssetsLoaded) return;
    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.shootCooldown) return;
    this.lastShotTime = currentTime;

    const fireSounds = ['cannon_fire_1.wav', 'cannon_fire_2.wav', 'cannon_fire_3.wav'];
    this.playSound(fireSounds[Math.floor(Math.random() * fireSounds.length)], 0.6);

    const ball = CombatManager.createCannonBall(this.myShip, this.worldContainer, false);
    if (ball) this.cannonBalls.push(ball);
  }

  private firePlayerBroadside(side: 'left' | 'right') {
    if (!this.isAssetsLoaded) return;
    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.shootCooldown) return;
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

  public setMobileJoystick(angle: number | null, isMoving: boolean) {
    this.isMobileMoving = isMoving;
    this.mobileInputAngle = angle;

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
    if (this.particleTexture) {
      this.particleTexture.destroy(true);
    }
    this.worldContainer.destroy({ children: true });
  }
}