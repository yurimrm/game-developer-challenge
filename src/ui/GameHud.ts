// src/ui/GameHud.ts
import { Application, Container, Sprite, Texture, Text, Graphics } from 'pixi.js';

export interface PlayerHudElements {
  container: Container;
  healthBarFill: Sprite;
  healthMask: Graphics;
  healthText: Text;
  maxInternalWidth: number;
}

export interface StatsHudElements {
  container: Container;
  scoreText: Text;
  timerText: Text;
}

export class GameHud {
  public static createPlayerHUD(app: Application, playerHp: number, playerMaxHp: number): PlayerHudElements {
    const playerHealthContainer = new Container();
    playerHealthContainer.zIndex = 1000; 
    playerHealthContainer.x = 80;
    playerHealthContainer.y = 30;

    const frameIcon = Texture.from('icon_heart');
    const frameTex = Texture.from('health_frame');
    const greenFillTex = Texture.from('health_fill_green');

    const barWidth = 205;
    const barHeight = 38;
    const playerMaxInternalWidth = 165; 

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

    const playerHealthBarFill = new Sprite(greenFillTex);
    playerHealthBarFill.width = playerMaxInternalWidth + 39;
    playerHealthBarFill.height = barHeight * 1.1;
    playerHealthBarFill.anchor.set(0, 0.5);
    playerHealthBarFill.x = 60 - (playerMaxInternalWidth / 2);
    playerHealthBarFill.y = 15;

    const maskGraphics = new Graphics();
    maskGraphics.rect(
      80 - (playerMaxInternalWidth / 2), 
      15 - (playerHealthBarFill.height / 2), 
      playerMaxInternalWidth, 
      playerHealthBarFill.height
    );
    maskGraphics.fill(0xffffff);

    playerHealthBarFill.mask = maskGraphics;

    const playerHealthText = new Text({
      text: `${playerHp} / ${playerMaxHp}`,
      style: { fill: '#ffffff', fontSize: 12, align: 'center' }
    });
    playerHealthText.anchor.set(0.5); 
    playerHealthText.x = 80;          
    playerHealthText.y = 15;          

    playerHealthContainer.addChild(iconSprite);
    playerHealthContainer.addChild(frameSprite);
    playerHealthContainer.addChild(playerHealthBarFill);
    playerHealthContainer.addChild(maskGraphics);
    playerHealthContainer.addChild(playerHealthText);

    app.stage.addChild(playerHealthContainer);

    return {
      container: playerHealthContainer,
      healthBarFill: playerHealthBarFill,
      healthMask: maskGraphics,
      healthText: playerHealthText,
      maxInternalWidth: playerMaxInternalWidth
    };
  }

  public static createStatsHUD(app: Application): StatsHudElements {
    const statsContainer = new Container();
    statsContainer.zIndex = 1000;
    statsContainer.x = (app.screen.width / 2) - 140; 
    statsContainer.y = 20;

    const frameiconScore = Texture.from('icon_score');
    const frameiconTime = Texture.from('icon_time');
    const panelTexture = Texture.from('counter_panel');

    const iconScore = new Sprite(frameiconScore);
    iconScore.width = 38;
    iconScore.height = 38;
    iconScore.anchor.set(0.0);
    iconScore.x = 205;
    iconScore.y = 2;

    const scorePanel = new Sprite(panelTexture);
    scorePanel.width = 130;
    scorePanel.height = 45;
    scorePanel.x = 240;
    scorePanel.y = 0;

    const scoreText = new Text({
      text: `0`,
      style: { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' }
    });
    scoreText.anchor.set(0.5);
    scoreText.x = scorePanel.x + scorePanel.width / 2;
    scoreText.y = scorePanel.y + scorePanel.height / 2;

    const iconTime = new Sprite(frameiconTime);
    iconTime.width = 38;
    iconTime.height = 38;
    iconTime.anchor.set(0.0);
    iconTime.x = 375;
    iconTime.y = 2;

    const timerPanel = new Sprite(panelTexture);
    timerPanel.width = 130;
    timerPanel.height = 45;
    timerPanel.x = 410; 
    timerPanel.y = 0;

    const timerText = new Text({
      text: `03:00`,
      style: { fill: '#ffffff', fontSize: 14 }
    });
    timerText.anchor.set(0.5);
    timerText.x = timerPanel.x + timerPanel.width / 2;
    timerText.y = timerPanel.y + timerPanel.height / 2;

    statsContainer.addChild(iconScore);
    statsContainer.addChild(iconTime);
    statsContainer.addChild(scorePanel);
    statsContainer.addChild(scoreText);
    statsContainer.addChild(timerPanel);
    statsContainer.addChild(timerText);

    app.stage.addChild(statsContainer);

    return {
      container: statsContainer,
      scoreText,
      timerText
    };
  }
}