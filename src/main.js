import {
  Application,
  Assets,
  BlurFilter,
  Color,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  AnimatedSprite,
} from 'pixi.js';
import { createPaytable } from './paytable.js';
import { createGamble } from './gamble.js';
import { GlowFilter } from 'pixi-filters';

(async () => {
  const app = new Application();
  await app.init({ background: 'transparent', resizeTo: window });
  await Assets.load('./images/fire/fire.json');
  document.body.appendChild(app.canvas);

  let texturesLoaded = true;
  try {
    await Assets.load([
      './images/cherries.png',
      './images/grape.png',
      './images/jack-pot.png',
      './images/lemon.png',
      './images/orange.png',
      './images/plum.png',
      './images/seven.png',
      './images/watermelon.png',
      './images/background.jpg',
      './images/redcard.png',
      './images/blackcard.png',
    ]);
  } catch (error) {
    console.error('Failed to load assets:', error);
    texturesLoaded = false;
  }

  const background = texturesLoaded
    ? new Sprite(Texture.from('./images/background.jpg'))
    : new Graphics()
        .rect(0, 0, app.screen.width, app.screen.height)
        .fill({ color: 0x333333 });
  background.width = app.screen.width;
  background.height = app.screen.height;
  app.stage.addChild(background);

  const REEL_COUNT = 5;
  const ROW_COUNT = 3;
  const REEL_WIDTH = app.screen.width * 0.12;
  const REEL_HEIGHT = app.screen.height * 0.7;
  const SQUARE_HEIGHT = REEL_HEIGHT / ROW_COUNT;
  const REEL_SPACING = app.screen.width * 0.01;
  const SYMBOL_SCALE = 0.7;
  const LINE_COLORS = [
    0x3399ff, // Сина за линија 1
    0xff0000, // Црвена за линија 2
    0x00ff00, // Жолта за линија 3
    0xffff00, // Зелена за линија 4
    0xff69b4, // Розева за линија 5
  ];
  const JACKPOT_BORDER_COLOR = 0x8b4513;

  const clickSound = new Audio('./audio/clicksound.wav');
  const winSound = new Audio('./audio/winsound.mp3');
  const collectSound = new Audio('./audio/collectsound.mp3');
  const reelStopSound = new Audio('./audio/audio1.mp3');
  const autoplaySound = new Audio('./audio/autoplaysound.mp3');
  const finishTransferSound = new Audio('./audio/finishtransfer.mp3');
  const ffOfaKind = new Audio('./audio/ffofakind.wav');
  reelStopSound.load();
  finishTransferSound.load();

  function playSound(sound) {
    try {
      sound.currentTime = 0;
      sound.play().catch((err) => console.warn('Audio playback failed:', err));
    } catch (err) {
      console.warn('Error playing sound:', err);
    }
  }

  const slotTextures = texturesLoaded
    ? {
        cherries: Texture.from('./images/cherries.png'),
        grape: Texture.from('./images/grape.png'),
        jackpot: Texture.from('./images/jack-pot.png'),
        lemon: Texture.from('./images/lemon.png'),
        orange: Texture.from('./images/orange.png'),
        plum: Texture.from('./images/plum.png'),
        seven: Texture.from('./images/seven.png'),
        watermelon: Texture.from('./images/watermelon.png'),
      }
    : {
        cherries: Texture.WHITE,
        grape: Texture.WHITE,
        jackpot: Texture.WHITE,
        lemon: Texture.WHITE,
        orange: Texture.WHITE,
        plum: Texture.WHITE,
        seven: Texture.WHITE,
        watermelon: Texture.WHITE,
      };

  const textureArray = Object.values(slotTextures);

  function getRandomSymbol(currentSymbols, slotTextures, textureArray) {
    const hasSeven = currentSymbols.some(
      (symbol) => symbol.texture === slotTextures.seven
    );
    const hasJackpot = currentSymbols.some(
      (symbol) => symbol.texture === slotTextures.jackpot
    );

    const availableTextures = textureArray.filter((texture) => {
      if (hasSeven && texture === slotTextures.seven) return false;
      if (hasJackpot && texture === slotTextures.jackpot) return false;
      return true;
    });

    return availableTextures[
      Math.floor(Math.random() * availableTextures.length)
    ];
  }

  const reels = [];
  const reelContainer = new Container();

  for (let i = 0; i < REEL_COUNT; i++) {
    const rc = new Container();
    rc.x = i * (REEL_WIDTH + REEL_SPACING);
    reelContainer.addChild(rc);

    const reelBackground = new Graphics()
      .rect(0, 0, REEL_WIDTH, REEL_HEIGHT)
      .fill({ color: 0x2c003e })
      .stroke({ color: 0xffffff, width: 4 });
    rc.addChild(reelBackground);

    const reel = {
      container: rc,
      symbols: [],
      squares: [],
      position: 0,
      previousPosition: 0,
      blur: new BlurFilter(),
    };
    reel.blur.blurX = 0;
    reel.blur.blurY = 0;
    rc.filters = [reel.blur];

    for (let j = 0; j < ROW_COUNT; j++) {
      const square = new Graphics();
      square.position.set(0, j * SQUARE_HEIGHT);
      square.visible = false;
      rc.addChild(square);
      reel.squares.push(square);
    }

    for (let j = 0; j < 4; j++) {
      const symbol = new Sprite(
        getRandomSymbol(reel.symbols, slotTextures, textureArray)
      );
      symbol.y = j * SQUARE_HEIGHT;
      symbol.scale.x = symbol.scale.y = Math.min(
        (SQUARE_HEIGHT / symbol.width) * SYMBOL_SCALE,
        (SQUARE_HEIGHT / symbol.height) * SYMBOL_SCALE
      );
      symbol.x = Math.round((REEL_WIDTH - symbol.width) / 2);
      const glowFilter = new GlowFilter({
        distance: 5,
        outerStrength: 7,
        innerStrength: 0,
        color: 0xffffff,
        quality: 0.5,
      });
      symbol.filters = [glowFilter];
      reel.symbols.push(symbol);
      rc.addChild(symbol);
    }

    reels.push(reel);
  }

  app.stage.addChild(reelContainer);

  const totalReelWidth =
    REEL_COUNT * (REEL_WIDTH + REEL_SPACING) - REEL_SPACING;
  const centerX = (app.screen.width - totalReelWidth) / 2;
  const headerMargin = app.screen.height * 0.1;
  const footerMargin = app.screen.height * 0.2;

  reelContainer.x = centerX;
  reelContainer.y = headerMargin;

  const gambleContainer = createGamble(app, 0, (finalWin) => {
    if (winText) {
      const currentWin = parseInt(winText.text) || 0;
      winText.text = (currentWin + finalWin).toString();
    }
    hasWin = false;
    hasPendingWin = false;
    pendingWinAmount = 0;
    isGambleOpen = false;
    reelContainer.visible = true;
    gambleContainer.visible = false;
    paytableContainer.visible = false;
    gambleText.text = 'Gamble';
    const currentCredits = parseInt(winText.text) || 0;
    betText.text =
      currentCredits === 0 ? 'No more credits!' : 'Please place your bet';
    startText.text = 'Start';
    gambleButton.eventMode = 'none';
    gambleButton.cursor = 'default';
    drawButton(gambleButton, buttonWidth, buttonHeight, cornerRadius, [
      '#666666',
      '#333333',
    ]);
    startButton.eventMode = 'static';
    startButton.cursor = 'pointer';
    drawButton(
      startButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonNormal
    );
    updateButtonStates();
  });
  gambleContainer.x = centerX;
  gambleContainer.y = headerMargin;

  const winLines = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
  ];

  let running = false;
  let isAutoplayActive = false;
  let hasWin = false;
  let hasPendingWin = false;
  let pendingWinAmount = 0;
  let isCollecting = false;
  let transferredAmount = 0;
  let collectStartTime = 0;
  let lastUpdateTime = 0;
  let startClickCount = 0;

  const gradient = new FillGradient({
    type: 'linear',
    colorStops: [
      { offset: 0, color: 0xd2042d },
      { offset: 1, color: 0x800020 },
    ],
  });

  const top = new Graphics()
    .rect(0, 0, app.screen.width, headerMargin)
    .fill(gradient);

  const fill = new FillGradient(0, 0, 0, 2);
  const colors = [0xff0000, 0xffff00].map((color) =>
    Color.shared.setValue(color).toNumber()
  );
  colors.forEach((number, index) => {
    fill.addColorStop(index / colors.length, number);
  });

  const style = new TextStyle({
    fontFamily: 'Arial',
    fontSize: app.screen.width * 0.03,
    fontStyle: 'italic',
    fontWeight: 'bold',
    fill: { fill },
    stroke: { color: 0x000000, width: 4 },
    dropShadow: 2,
  });

  const headerText = new Text('Explosion Hot', style);
  headerText.x = Math.round((top.width - headerText.width) / 2);
  headerText.y = Math.round((headerMargin - headerText.height) / 2);
  top.addChild(headerText);
  app.stage.addChild(top);

  const bottom = new Container();
  const bottomBackground = new Graphics()
    .rect(0, 0, app.screen.width, app.screen.height * 0.2)
    .fill(gradient);
  bottom.addChild(bottomBackground);

  const buttonWidth = REEL_WIDTH;
  const buttonHeight = footerMargin * 0.27;
  const buttonSpacing = 5;
  const extraSpacing = 30;
  const cornerRadius = 10;
  const textStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: app.screen.width * 0.015,
    fill: 0x000000,
    fontWeight: 'bold',
  });

  const fifthReelX = reelContainer.x + 4 * (REEL_WIDTH + REEL_SPACING);
  const firstReelX = reelContainer.x;
  const fieldWidth = 4 * REEL_WIDTH + 3 * REEL_SPACING;
  const buttonX = fifthReelX;
  const fourthReelX = reelContainer.x + 3 * (REEL_WIDTH + REEL_SPACING);

  const buttonYStart = footerMargin * 0.1;
  const autoplayY = buttonYStart;
  const startY = buttonYStart + buttonHeight + buttonSpacing + extraSpacing;
  const paytableY = startY;
  const gambleY = startY;

  const betField = new Graphics()
    .roundRect(0, autoplayY, fieldWidth, buttonHeight, cornerRadius)
    .stroke({ color: 0xc0c0c0, width: 2 })
    .fill(
      new FillGradient({
        type: 'linear',
        colorStops: [
          { offset: 0, color: 0x333333 },
          { offset: 1, color: 0x000000 },
        ],
      })
    );
  betField.x = firstReelX;
  const betTextStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: app.screen.width * 0.015,
    fill: 0xffff00,
    fontWeight: 'bold',
  });
  const betText = new Text('Please place your bet', betTextStyle);
  betText.anchor.set(0.5);
  betText.x = fieldWidth / 2;
  betText.y = autoplayY + buttonHeight / 2;
  betField.addChild(betText);
  bottom.addChild(betField);

  function drawButton(graphics, width, height, radius, gradientColors) {
    graphics
      .clear()
      .roundRect(0, 0, width, height, radius)
      .fill(
        new FillGradient({
          type: 'linear',
          colorStops: [
            { offset: 0, color: gradientColors[0] },
            { offset: 1, color: gradientColors[1] },
          ],
        })
      )
      .stroke({ color: 0xc0c0c0, width: 2 });
  }

  const buttonNormal = ['yellow', 'green'];
  const buttonHover = ['#ffff99', '#66ff66'];
  const buttonPressed = ['#cccc00', '#006600'];
  const buttonNormalBlue = ['#add8e6', '#0000ff'];
  const buttonHoverBlue = ['#e6f0fa', '#6666ff'];
  const buttonPressedBlue = ['#8080ff', '#000080'];
  const buttonActiveAutoplay = ['#006400', '#003300'];

  const autoplayButton = new Graphics();
  drawButton(
    autoplayButton,
    buttonWidth,
    buttonHeight,
    cornerRadius,
    buttonNormal
  );
  autoplayButton.position.set(buttonX, autoplayY);
  const autoplayText = new Text('Autoplay', textStyle);
  autoplayText.anchor.set(0.5);
  autoplayText.x = buttonWidth / 2;
  autoplayText.y = buttonHeight / 2;
  autoplayButton.addChild(autoplayText);
  autoplayButton.eventMode = 'static';
  autoplayButton.cursor = 'pointer';

  autoplayButton.on('pointerover', () => {
    drawButton(
      autoplayButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      isAutoplayActive ? buttonActiveAutoplay : buttonHover
    );
  });
  autoplayButton.on('pointerout', () => {
    drawButton(
      autoplayButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      isAutoplayActive ? buttonActiveAutoplay : buttonNormal
    );
  });
  autoplayButton.on('pointerdown', () => {
    drawButton(
      autoplayButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonPressed
    );
  });
  autoplayButton.on('pointerup', () => {
    playSound(autoplaySound);
    isAutoplayActive = !isAutoplayActive;
    autoplayText.text = 'Autoplay';
    drawButton(
      autoplayButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      isAutoplayActive ? buttonActiveAutoplay : buttonHover
    );
    updateButtonStates();
  });
  bottom.addChild(autoplayButton);

  const paytableButton = new Graphics();
  drawButton(
    paytableButton,
    buttonWidth,
    buttonHeight,
    cornerRadius,
    buttonNormalBlue
  );
  paytableButton.position.set(
    fourthReelX - (buttonWidth + buttonSpacing),
    paytableY
  );
  const paytableText = new Text('Paytable', textStyle);
  paytableText.anchor.set(0.5);
  paytableText.x = buttonWidth / 2;
  paytableText.y = buttonHeight / 2;
  paytableButton.addChild(paytableText);
  paytableButton.eventMode = 'static';
  paytableButton.cursor = 'pointer';

  let isPaytableOpen = false;
  paytableButton.on('pointerover', () => {
    drawButton(
      paytableButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonHoverBlue
    );
  });
  paytableButton.on('pointerout', () => {
    drawButton(
      paytableButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonNormalBlue
    );
  });
  paytableButton.on('pointerdown', () => {
    drawButton(
      paytableButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonPressedBlue
    );
  });
  paytableButton.on('pointerup', () => {
    drawButton(
      paytableButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonHoverBlue
    );
    playSound(clickSound);
    isPaytableOpen = !isPaytableOpen;
    paytableText.text = isPaytableOpen ? 'Close' : 'Paytable';
    reelContainer.visible = !isPaytableOpen;
    paytableContainer.visible = isPaytableOpen;
  });
  bottom.addChild(paytableButton);

  const gambleButton = new Graphics();
  drawButton(gambleButton, buttonWidth, buttonHeight, cornerRadius, [
    '#666666',
    '#333333',
  ]);
  gambleButton.position.set(fourthReelX, gambleY);
  const gambleText = new Text('Gamble', textStyle);
  gambleText.anchor.set(0.5);
  gambleText.x = buttonWidth / 2;
  gambleText.y = buttonHeight / 2;
  gambleButton.addChild(gambleText);
  gambleButton.eventMode = 'none';
  gambleButton.cursor = 'default';

  let isGambleOpen = false;
  gambleButton.on('pointerover', () => {
    if (hasWin && !isGambleOpen && !running && !isCollecting) {
      drawButton(
        gambleButton,
        buttonWidth,
        buttonHeight,
        cornerRadius,
        buttonHoverBlue
      );
    }
  });
  gambleButton.on('pointerout', () => {
    if (hasWin && !isGambleOpen && !running && !isCollecting) {
      drawButton(
        gambleButton,
        buttonWidth,
        buttonHeight,
        cornerRadius,
        buttonNormalBlue
      );
    } else {
      drawButton(gambleButton, buttonWidth, buttonHeight, cornerRadius, [
        '#666666',
        '#333333',
      ]);
    }
  });
  gambleButton.on('pointerdown', () => {
    if (hasWin && !isGambleOpen && !running && !isCollecting) {
      drawButton(
        gambleButton,
        buttonWidth,
        buttonHeight,
        cornerRadius,
        buttonPressedBlue
      );
    }
  });
  gambleButton.on('pointerup', () => {
    if (hasWin && !isGambleOpen && !running && !isCollecting) {
      drawButton(
        gambleButton,
        buttonWidth,
        buttonHeight,
        cornerRadius,
        buttonHoverBlue
      );
      playSound(clickSound);
      gamblePlay();
    }
  });
  bottom.addChild(gambleButton);

  const startButton = new Graphics();
  drawButton(
    startButton,
    buttonWidth,
    buttonHeight,
    cornerRadius,
    buttonNormal
  );
  startButton.position.set(buttonX, startY);
  const startText = new Text('Start', textStyle);
  startText.anchor.set(0.5);
  startText.x = buttonWidth / 2;
  startText.y = buttonHeight / 2;
  startButton.addChild(startText);
  startButton.eventMode = 'static';
  startButton.cursor = 'pointer';

  startButton.on('pointerover', () => {
    drawButton(
      startButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonHover
    );
  });
  startButton.on('pointerout', () => {
    drawButton(
      startButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonNormal
    );
  });
  startButton.on('pointerdown', () => {
    drawButton(
      startButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonPressed
    );
  });
  startButton.on('pointerup', () => {
    drawButton(
      startButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      buttonHover
    );
    playSound(clickSound);
    console.log('Start button clicked, states:', {
      hasPendingWin,
      isCollecting,
      isGambleOpen,
      running,
      isAutoplayActive,
      startClickCount,
      credits: winText?.text,
      payout: payoutText?.text,
    });

    startClickCount++;

    allLines.forEach((line) => {
      line.visible = false;
    });

    if (hasPendingWin && !isCollecting && !isGambleOpen) {
      isCollecting = true;
      transferredAmount = 0;
      collectStartTime = Date.now();
      lastUpdateTime = collectStartTime;
      playSound(collectSound);
      startClickCount = 1;
      updateButtonStates();
    } else if (isCollecting && startClickCount === 2) {
      if (winText) {
        const currentWin = parseInt(winText.text) || 0;
        const remainingAmount = pendingWinAmount - transferredAmount;
        winText.text = (currentWin + remainingAmount).toString();
      }
      betText.text = 'Please place your bet';
      startText.text = 'Start';
      gambleText.text = 'Gamble';
      hasWin = false;
      hasPendingWin = false;
      transferredAmount = 0;
      pendingWinAmount = 0;
      isCollecting = false;
      collectSound.pause();
      collectSound.currentTime = 0;
      playSound(finishTransferSound);
      gambleButton.eventMode = 'none';
      gambleButton.cursor = 'default';
      drawButton(gambleButton, buttonWidth, buttonHeight, cornerRadius, [
        '#666666',
        '#333333',
      ]);
      startButton.eventMode = 'static';
      startButton.cursor = 'pointer';
      drawButton(
        startButton,
        buttonWidth,
        buttonHeight,
        cornerRadius,
        buttonNormal
      );
      startClickCount = 0;
      updateButtonStates();
    } else if (
      running &&
      ((isAutoplayActive && startClickCount === 1) ||
        (!isAutoplayActive && startClickCount <= 2))
    ) {
      function playEchoSound() {
        const sound1 = new Audio('./audio/audio1.mp3');
        const sound2 = new Audio('./audio/audio1.mp3');
        const sound3 = new Audio('./audio/audio1.mp3');

        try {
          sound1.currentTime = 0;
          sound1.volume = 1.0;
          sound1
            .play()
            .catch((err) => console.warn('Audio playback failed (1):', err));

          setTimeout(() => {
            sound2.currentTime = 0;
            sound2.volume = 0.7;
            sound2
              .play()
              .catch((err) => console.warn('Audio playback failed (2):', err));
          }, 50);

          setTimeout(() => {
            sound3.currentTime = 0;
            sound3.volume = 0.4;
            sound3
              .play()
              .catch((err) => console.warn('Audio playback failed (3):', err));
          }, 100);
        } catch (err) {
          console.warn('Error playing echo sound:', err);
        }
      }
      playEchoSound();

      const tweensToRemove = tweening.filter(
        (tween) => reels.includes(tween.object) && tween.property === 'position'
      );
      tweensToRemove.forEach((tween) => {
        tweening.splice(tweening.indexOf(tween), 1);
      });

      let completedReels = 0;
      const totalReels = reels.length;
      const bounceDuration = 1000;

      for (let i = 0; i < reels.length; i++) {
        const r = reels[i];
        const spinTarget = Math.round(r.position);
        for (let j = 0; j < r.symbols.length; j++) {
          const s = r.symbols[j];
          s.y = ((r.position + j) % r.symbols.length) * SQUARE_HEIGHT;
          if (s.y > REEL_HEIGHT) s.y -= r.symbols.length * SQUARE_HEIGHT;
          s.y += (SQUARE_HEIGHT - s.height) / 2;
          if (s.y < 0) {
            s.texture = getRandomSymbol(r.symbols, slotTextures, textureArray);
            s.scale.x = s.scale.y = Math.min(
              (SQUARE_HEIGHT / s.texture.width) * SYMBOL_SCALE,
              (SQUARE_HEIGHT / s.texture.height) * SYMBOL_SCALE
            );
            s.x = Math.round((REEL_WIDTH - s.width) / 2);
          }
        }
        tweenTo(
          r,
          'position',
          spinTarget + 0.25,
          bounceDuration * 0.2,
          easeOutQuad,
          null,
          () => {
            tweenTo(
              r,
              'position',
              spinTarget - 0.02,
              bounceDuration * 0.25,
              easeOutQuad,
              null,
              () => {
                tweenTo(
                  r,
                  'position',
                  spinTarget,
                  bounceDuration * 0.4,
                  easeOutQuad,
                  null,
                  () => {
                    completedReels++;
                    if (completedReels === totalReels) {
                      resetReels();
                      reelsComplete();
                    }
                  }
                );
              }
            );
          }
        );
      }
      if (isAutoplayActive) {
        startClickCount = 2;
      }
      updateButtonStates();
    } else if (
      !isAutoplayActive &&
      !isCollecting &&
      !isGambleOpen &&
      startClickCount === 1
    ) {
      startPlay();
      updateButtonStates();
    } else {
      console.log(
        'Cannot start play: conditions not met or click limit reached',
        {
          isAutoplayActive,
          isCollecting,
          isGambleOpen,
          startClickCount,
        }
      );
    }
  });
  bottom.addChild(startButton);

  const gapLabelStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: app.screen.width * 0.01,
    fill: 0xffffff,
  });

  const gapLabels = ['Credit', 'Lines', 'Bet/Line', 'Bet'];
  const labelBoxHeight = buttonHeight * 0.4;
  const labelGap = 10;
  const labelBoxWidth = (REEL_WIDTH - labelGap) / 2;
  const cornerRadius2 = Math.min(labelBoxWidth * 0.2, 10);
  const yOffset = -15;

  gapLabels.forEach((label, index) => {
    const labelContainer = new Container();
    const gapText = new Text(label, gapLabelStyle);
    gapText.anchor.set(0.5);
    const labelBox = new Graphics()
      .roundRect(0, 0, labelBoxWidth, labelBoxHeight, cornerRadius2)
      .stroke({ color: 0xc0c0c0, width: 2 })
      .fill(
        new FillGradient({
          type: 'linear',
          colorStops: [
            { offset: 0, color: 0x333333 },
            { offset: 1, color: 0x000000 },
          ],
        })
      );
    gapText.x = labelBoxWidth / 2;
    gapText.y = labelBoxHeight / 2;
    labelContainer.addChild(labelBox);
    labelContainer.addChild(gapText);

    let labelX;
    if (index === 0) {
      labelX = firstReelX;
    } else if (index === 1) {
      labelX = firstReelX + labelBoxWidth + labelGap;
    } else if (index === 2) {
      labelX = firstReelX + REEL_WIDTH + REEL_SPACING;
    } else {
      labelX =
        firstReelX + REEL_WIDTH + REEL_SPACING + labelBoxWidth + labelGap;
    }

    labelContainer.x = labelX;
    labelContainer.y = startY - labelBoxHeight / 2 + yOffset;
    bottom.addChild(labelContainer);
  });

  const newGapLabels = ['Win', 'Balance', 'Stake', 'Payout'];
  const initialValues = ['10000', '5', '5', '25'];
  const yellowTextStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: app.screen.width * 0.015,
    fill: 0xffff00,
    fontWeight: 'bold',
  });
  const allowedStakeValues = [5, 10, 15, 20, 40, 80];
  const stakeToPayout = { 5: 25, 10: 50, 15: 75, 20: 100, 40: 200, 80: 400 };
  const stakeValue = { current: parseInt(initialValues[2]) };
  let payoutText = null;
  let winText = null;

  function updateButtonStates() {
    const currentCredits = parseInt(winText?.text) || 0;
    const currentPayout = parseInt(payoutText?.text) || 0;
    const canPlay =
      currentCredits >= currentPayout &&
      currentCredits > 0 &&
      !isCollecting &&
      !isGambleOpen &&
      startClickCount < 2;
    const canCollect =
      canPlay ||
      (hasPendingWin && !isGambleOpen) ||
      (isCollecting && startClickCount === 1);
    startButton.eventMode = canCollect ? 'static' : 'none';
    startButton.cursor = canCollect ? 'pointer' : 'default';
    drawButton(
      startButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      canCollect ? buttonNormal : ['#666666', '#333333']
    );

    autoplayButton.eventMode =
      currentCredits >= currentPayout && currentCredits > 0 ? 'static' : 'none';
    autoplayButton.cursor =
      currentCredits >= currentPayout && currentCredits > 0
        ? 'pointer'
        : 'default';
    drawButton(
      autoplayButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      currentCredits >= currentPayout && currentCredits > 0
        ? isAutoplayActive
          ? buttonActiveAutoplay
          : buttonNormal
        : ['#666666', '#333333']
    );

    gambleButton.eventMode =
      hasWin && !isGambleOpen && !running && !isCollecting ? 'static' : 'none';
    gambleButton.cursor =
      hasWin && !isGambleOpen && !running && !isCollecting
        ? 'pointer'
        : 'default';
    drawButton(
      gambleButton,
      buttonWidth,
      buttonHeight,
      cornerRadius,
      hasWin && !isGambleOpen && !running && !isCollecting
        ? buttonNormalBlue
        : ['#666666', '#333333']
    );

    console.log('updateButtonStates:', {
      currentCredits,
      currentPayout,
      canPlay,
      canCollect,
      running,
      isCollecting,
      isGambleOpen,
      startClickCount,
      startButtonEventMode: startButton.eventMode,
    });
  }

  newGapLabels.forEach((label, index) => {
    const labelContainer = new Container();
    const textColorStyle = index <= 3 ? yellowTextStyle : textStyle;
    const gapText = new Text(initialValues[index], textColorStyle);
    gapText.anchor.set(0.5);
    const labelBox = new Graphics()
      .roundRect(0, 0, labelBoxWidth, buttonHeight, cornerRadius)
      .stroke({ color: 0xc0c0c0, width: 2 })
      .fill(
        new FillGradient({
          type: 'linear',
          colorStops: [
            { offset: 0, color: 0x333333 },
            { offset: 1, color: 0x000000 },
          ],
        })
      );
    gapText.x = labelBoxWidth / 2;
    gapText.y = buttonHeight / 2;
    labelContainer.addChild(labelBox);
    labelContainer.addChild(gapText);

    if (index === 3) {
      payoutText = gapText;
    }
    if (index === 0) {
      winText = gapText;
    }

    if (index === 2) {
      const smallButtonSize = buttonHeight * 0.5;
      const buttonOffset = 5;
      const disabledGradient = ['#666666', '#333333'];

      const minusButton = new Graphics();
      drawButton(
        minusButton,
        smallButtonSize,
        smallButtonSize,
        cornerRadius * 0.5,
        stakeValue.current === 5 ? disabledGradient : buttonNormal
      );
      minusButton.position.set(
        buttonOffset,
        (buttonHeight - smallButtonSize) / 2
      );
      const minusText = new Text('-', textStyle);
      minusText.anchor.set(0.5);
      minusText.x = smallButtonSize / 2;
      minusText.y = smallButtonSize / 2;
      minusButton.addChild(minusText);
      minusButton.eventMode = stakeValue.current === 5 ? 'none' : 'static';
      minusButton.cursor = stakeValue.current === 5 ? 'default' : 'pointer';

      minusButton.on('pointerover', () => {
        if (allowedStakeValues.indexOf(stakeValue.current) > 0) {
          drawButton(
            minusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            buttonHover
          );
        }
      });
      minusButton.on('pointerout', () => {
        if (allowedStakeValues.indexOf(stakeValue.current) > 0) {
          drawButton(
            minusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            buttonNormal
          );
        }
      });
      minusButton.on('pointerdown', () => {
        if (allowedStakeValues.indexOf(stakeValue.current) > 0) {
          drawButton(
            minusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            buttonPressed
          );
        }
      });
      minusButton.on('pointerup', () => {
        if (allowedStakeValues.indexOf(stakeValue.current) > 0) {
          drawButton(
            minusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            buttonHover
          );
          playSound(clickSound);
          const currentIndex = allowedStakeValues.indexOf(stakeValue.current);
          stakeValue.current = allowedStakeValues[currentIndex - 1];
          gapText.text = stakeValue.current.toString();
          if (payoutText) {
            payoutText.text = stakeToPayout[stakeValue.current].toString();
            if (paytableContainer.updatePayouts) {
              paytableContainer.updatePayouts(
                stakeToPayout[stakeValue.current]
              );
            }
          }
          minusButton.eventMode = currentIndex - 1 === 0 ? 'none' : 'static';
          minusButton.cursor = currentIndex - 1 === 0 ? 'default' : 'pointer';
          drawButton(
            minusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            currentIndex - 1 === 0 ? disabledGradient : buttonNormal
          );
          plusButton.eventMode =
            currentIndex - 1 === allowedStakeValues.length - 1
              ? 'none'
              : 'static';
          plusButton.cursor =
            currentIndex - 1 === allowedStakeValues.length - 1
              ? 'default'
              : 'pointer';
          drawButton(
            plusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            currentIndex - 1 === allowedStakeValues.length - 1
              ? disabledGradient
              : buttonNormal
          );
          allLines.forEach((line) => {
            line.visible = true;
          });
          updateButtonStates();
        }
      });

      const plusButton = new Graphics();
      drawButton(
        plusButton,
        smallButtonSize,
        smallButtonSize,
        cornerRadius * 0.5,
        buttonNormal
      );
      plusButton.position.set(
        labelBoxWidth - smallButtonSize - buttonOffset,
        (buttonHeight - smallButtonSize) / 2
      );
      const plusText = new Text('+', textStyle);
      plusText.anchor.set(0.5);
      plusText.x = smallButtonSize / 2;
      plusText.y = smallButtonSize / 2;
      plusButton.addChild(plusText);
      plusButton.eventMode = 'static';
      plusButton.cursor = 'pointer';

      plusButton.on('pointerover', () => {
        if (
          allowedStakeValues.indexOf(stakeValue.current) <
          allowedStakeValues.length - 1
        ) {
          drawButton(
            plusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            buttonHover
          );
        }
      });
      plusButton.on('pointerout', () => {
        if (
          allowedStakeValues.indexOf(stakeValue.current) <
          allowedStakeValues.length - 1
        ) {
          drawButton(
            plusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            buttonNormal
          );
        }
      });
      plusButton.on('pointerdown', () => {
        if (
          allowedStakeValues.indexOf(stakeValue.current) <
          allowedStakeValues.length - 1
        ) {
          drawButton(
            plusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            buttonPressed
          );
        }
      });
      plusButton.on('pointerup', () => {
        if (
          allowedStakeValues.indexOf(stakeValue.current) <
          allowedStakeValues.length - 1
        ) {
          drawButton(
            plusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            buttonHover
          );
          playSound(clickSound);
          const currentIndex = allowedStakeValues.indexOf(stakeValue.current);
          stakeValue.current = allowedStakeValues[currentIndex + 1];
          gapText.text = stakeValue.current.toString();
          if (payoutText) {
            payoutText.text = stakeToPayout[stakeValue.current].toString();
            if (paytableContainer.updatePayouts) {
              paytableContainer.updatePayouts(
                stakeToPayout[stakeValue.current]
              );
            }
          }
          minusButton.eventMode = currentIndex + 1 === 0 ? 'none' : 'static';
          minusButton.cursor = currentIndex + 1 === 0 ? 'default' : 'pointer';
          drawButton(
            minusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            currentIndex + 1 === 0 ? disabledGradient : buttonNormal
          );
          plusButton.eventMode =
            currentIndex + 1 === allowedStakeValues.length - 1
              ? 'none'
              : 'static';
          plusButton.cursor =
            currentIndex + 1 === allowedStakeValues.length - 1
              ? 'default'
              : 'pointer';
          drawButton(
            plusButton,
            smallButtonSize,
            smallButtonSize,
            cornerRadius * 0.5,
            currentIndex + 1 === allowedStakeValues.length - 1
              ? disabledGradient
              : buttonNormal
          );
          allLines.forEach((line) => {
            line.visible = true;
          });
          updateButtonStates();
        }
      });

      labelContainer.addChild(minusButton);
      labelContainer.addChild(plusButton);
    }

    let labelX;
    if (index === 0) {
      labelX = firstReelX;
    } else if (index === 1) {
      labelX = firstReelX + labelBoxWidth + labelGap;
    } else if (index === 2) {
      labelX = firstReelX + REEL_WIDTH + REEL_SPACING;
    } else {
      labelX =
        firstReelX + REEL_WIDTH + REEL_SPACING + labelBoxWidth + labelGap;
    }

    labelContainer.x = labelX;
    labelContainer.y = paytableY;
    bottom.addChild(labelContainer);
  });

  updateButtonStates();

  bottom.y = app.screen.height - footerMargin;
  app.stage.addChild(bottom);

  const paytableContainer = createPaytable(
    app,
    slotTextures,
    {
      x: centerX,
      y: headerMargin,
    },
    parseInt(payoutText.text)
  );
  paytableContainer.visible = false;

  const totalCollectDuration = 3000;

  let lastAutoplayTime = 0;
  const autoplayDelay = 1000;

  const payoutTable = {
    cherries: { 2: 1, 3: 4, 4: 10, 5: 40 },
    plum: { 3: 4, 4: 10, 5: 40 },
    lemon: { 3: 4, 4: 10, 5: 40 },
    orange: { 3: 4, 4: 10, 5: 40 },
    grape: { 3: 10, 4: 40, 5: 100 },
    watermelon: { 3: 10, 4: 40, 5: 100 },
    seven: { 3: 20, 4: 200, 5: 1000 },
  };

  app.ticker.add((delta) => {
    if (
      isAutoplayActive &&
      !running &&
      !hasPendingWin &&
      !isCollecting &&
      !isGambleOpen
    ) {
      const now = Date.now();
      if (now - lastAutoplayTime >= autoplayDelay) {
        startPlay();
        lastAutoplayTime = now;
      }
    }

    if (isCollecting) {
      const now = Date.now();
      const elapsed = now - collectStartTime;
      const phase = Math.min(
        1,
        (now - collectStartTime) / totalCollectDuration
      );
      const easeInQuad = (t) => t * t;
      const targetTransferred = Math.floor(
        pendingWinAmount * easeInQuad(phase)
      );
      const increment = targetTransferred - transferredAmount;
      if (increment > 0 && now - lastUpdateTime >= 16) {
        transferredAmount += increment;
        if (winText) {
          const currentWin = parseInt(winText.text) || 0;
          winText.text = (currentWin + increment).toString();
        }
        const remaining = pendingWinAmount - transferredAmount;
        betText.text = `Win: ${Math.floor(remaining)}`;
        lastUpdateTime = now;
      }

      if (elapsed === 0) {
        playSound(collectSound);
      }
      if (elapsed >= totalCollectDuration) {
        if (winText) {
          const currentWin = parseInt(winText.text) || 0;
          const remainingAmount = pendingWinAmount - transferredAmount;
          winText.text = (currentWin + remainingAmount).toString();
        }
        betText.text = 'Please place your bet';
        startText.text = 'Start';
        gambleText.text = 'Gamble';
        hasWin = false;
        hasPendingWin = false;
        transferredAmount = 0;
        pendingWinAmount = 0;
        isCollecting = false;
        collectSound.pause();
        collectSound.currentTime = 0;
        playSound(finishTransferSound);

        gambleButton.eventMode = 'none';
        gambleButton.cursor = 'default';
        drawButton(gambleButton, buttonWidth, buttonHeight, cornerRadius, [
          '#666666',
          '#333333',
        ]);
        startButton.eventMode = 'static';
        startButton.cursor = 'pointer';
        drawButton(
          startButton,
          buttonWidth,
          buttonHeight,
          cornerRadius,
          buttonNormal
        );
        startClickCount = 0;
        updateButtonStates();
      }
    }
  });

  function startPlay() {
    if (
      running ||
      hasPendingWin ||
      isCollecting ||
      isGambleOpen ||
      startClickCount > 1
    ) {
      console.log(
        'Cannot start play: game is running, in another state, or click limit reached',
        {
          running,
          hasPendingWin,
          isCollecting,
          isGambleOpen,
          startClickCount,
        }
      );
      return;
    }

    const currentCredits = parseInt(winText.text) || 0;
    const currentPayout = parseInt(payoutText.text) || 0;

    if (currentCredits === 0) {
      betText.text = 'No more credits';
      startClickCount = 0;
      updateButtonStates();
      return;
    }

    if (currentCredits < currentPayout) {
      betText.text = 'Not enough credits';
      startClickCount = 0;
      updateButtonStates();
      return;
    }

    running = true;
    updateButtonStates();

    reels.forEach((reel) => {
      reel.symbols.forEach((symbol) => {
        symbol.alpha = 1.0;
      });
      reel.squares.forEach((square) => {
        square.visible = false;
      });
    });

    if (winText && payoutText) {
      const currentWin = parseInt(winText.text) || 0;
      const newWin = Math.max(0, currentWin - currentPayout);
      winText.text = newWin.toString();
      updateButtonStates();
    }

    betText.text = 'Good luck!';
    startText.text = 'Stop';

    let completedReels = 0;
    const totalReels = reels.length;
    const baseDuration = 1500;
    const bounceDuration = 1000;
    const stopDelay = 300;

    for (let i = 0; i < reels.length; i++) {
      const r = reels[i];
      const extra = Math.floor(Math.random() * 3);
      const spinTarget = r.position + 20 + extra;
      const spinDuration = baseDuration + i * stopDelay;

      tweenTo(
        r,
        'position',
        spinTarget,
        spinDuration - bounceDuration,
        (t) => t,
        null,
        () => {
          playSound(reelStopSound);
          tweenTo(
            r,
            'position',
            spinTarget + 0.25,
            bounceDuration * 0.2,
            easeOutQuad,
            null,
            () => {
              tweenTo(
                r,
                'position',
                spinTarget - 0.02,
                bounceDuration * 0.25,
                easeOutQuad,
                null,
                () => {
                  tweenTo(
                    r,
                    'position',
                    Math.round(spinTarget),
                    bounceDuration * 0.4,
                    easeOutQuad,
                    null,
                    () => {
                      completedReels++;
                      if (
                        completedReels === totalReels &&
                        startClickCount < 2
                      ) {
                        resetReels();
                        reelsComplete();
                      }
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  }

  function easeOutQuad(t) {
    return t * (2 - t);
  }

  function getSymbolName(texture, slotTextures) {
    for (const [name, tex] of Object.entries(slotTextures)) {
      if (tex === texture) return name;
    }
    return 'unknown';
  }

  function resetReels() {
    reels.forEach((reel) => {
      reel.position = Math.round(reel.position);
      reel.previousPosition = reel.position;
      reel.blur.blurY = 0;
      for (let j = 0; j < reel.symbols.length; j++) {
        const s = reel.symbols[j];
        s.y = ((reel.position + j) % reel.symbols.length) * SQUARE_HEIGHT;
        if (s.y > REEL_HEIGHT) s.y -= reel.symbols.length * SQUARE_HEIGHT;
        s.y += (SQUARE_HEIGHT - s.height) / 2;
        if (s.y < 0) {
          s.texture = getRandomSymbol(reel.symbols, slotTextures, textureArray);
          s.scale.x = s.scale.y = Math.min(
            (SQUARE_HEIGHT / s.texture.width) * SYMBOL_SCALE,
            (SQUARE_HEIGHT / s.texture.height) * SYMBOL_SCALE
          );
          s.x = Math.round((REEL_WIDTH - s.width) / 2);
        }
      }
      reel.squares.forEach((square) => {
        square.removeChildren();
        square.clear();
        square.visible = false;
      });
    });
    const tweensToRemove = tweening.filter(
      (tween) => reels.includes(tween.object) && tween.property === 'position'
    );
    tweensToRemove.forEach((tween) => {
      tweening.splice(tweening.indexOf(tween), 1);
    });
  }

  function reelsComplete() {
    try {
      running = false;
      resetReels();

      const symbolGrid = reels.map((reel) => {
        const squareYs = [0, SQUARE_HEIGHT, 2 * SQUARE_HEIGHT];
        return squareYs.map((targetY) => {
          let closestSymbol = null;
          let minDistance = Infinity;
          reel.symbols.forEach((symbol) => {
            if (!symbol || !symbol.y || !symbol.texture) {
              console.warn('Invalid symbol detected:', symbol);
              return;
            }
            let effectiveY = symbol.y;
            if (effectiveY < -SQUARE_HEIGHT / 2) {
              effectiveY += reel.symbols.length * SQUARE_HEIGHT;
            } else if (effectiveY > REEL_HEIGHT + SQUARE_HEIGHT / 2) {
              effectiveY -= reel.symbols.length * SQUARE_HEIGHT;
            }
            const distance = Math.abs(
              effectiveY + (SQUARE_HEIGHT - symbol.height) / 2 - targetY
            );
            if (distance < minDistance) {
              minDistance = distance;
              closestSymbol = symbol;
            }
          });
          return closestSymbol
            ? {
                name: getSymbolName(closestSymbol.texture, slotTextures),
                symbol: closestSymbol,
              }
            : { name: 'none', symbol: null };
        });
      });

      symbolGrid.forEach((reelSymbols, reelIndex) => {
        reelSymbols.forEach((symbol, rowIndex) => {});
      });

      let totalWin = 0;
      const currentPayout = parseInt(payoutText.text) || 0;
      const winningSquares = new Map();
      let playFFOfaKind = false;

      const jackpotCount = symbolGrid
        .flat()
        .filter((symbol) => symbol.name === 'jackpot').length;
      let hasJackpotWin = false;
      let jackpotPayout = 0;
      if (jackpotCount >= 3) {
        hasJackpotWin = true;
        switch (jackpotCount) {
          case 3:
            jackpotPayout = currentPayout * 2;
            break;
          case 4:
            jackpotPayout = currentPayout * 10;
            playFFOfaKind = true;
            break;
          case 5:
            jackpotPayout = currentPayout * 50;
            playFFOfaKind = true;
            break;
          default:
            jackpotPayout = 0;
        }
        totalWin += jackpotPayout;
        symbolGrid.forEach((reelSymbols, reelIndex) => {
          reelSymbols.forEach((symbol, rowIndex) => {
            if (symbol.name === 'jackpot') {
              winningSquares.set(`${reelIndex}-${rowIndex}`, -1);
            }
          });
        });
      }

      let hasLineWin = false;
      winLines.forEach((line, lineIndex) => {
        const lineSymbols = line.map(
          (row, reelIndex) => symbolGrid[reelIndex][row]
        );
        let linePayout = 0;
        const firstSymbol = lineSymbols[0].name;
        let symbolCount = 0;
        for (let i = 0; i < lineSymbols.length; i++) {
          if (lineSymbols[i].name === firstSymbol && firstSymbol !== 'none') {
            symbolCount++;
          } else {
            break;
          }
        }

        if (
          payoutTable[firstSymbol] &&
          symbolCount >= (firstSymbol === 'cherries' ? 2 : 3)
        ) {
          hasLineWin = true;
          const payouts = payoutTable[firstSymbol];
          if (payouts[symbolCount]) {
            linePayout = currentPayout * payouts[symbolCount];
            for (let i = 0; i < symbolCount; i++) {
              const row = line[i];
              winningSquares.set(`${i}-${row}`, lineIndex);
            }
            if (symbolCount >= 4) {
              playFFOfaKind = true;
            }
          }
        }
        totalWin += linePayout;
      });

      if (winningSquares.size > 0) {
        const fireTextures = Object.values(
          Assets.cache.get('./images/fire/fire.json').textures
        );

        const winningLineIndices = new Set(
          Array.from(winningSquares.values()).filter((idx) => idx >= 0)
        );
        allLines.forEach((line, index) => {
          const lineNumber = index + 1;
          line.visible = winningLineIndices.has(index);
        });

        winningSquares.forEach((lineIndex, squareKey) => {
          const [reelIndex, rowIndex] = squareKey.split('-').map(Number);
          if (reels[reelIndex] && reels[reelIndex].squares[rowIndex]) {
            const square = reels[reelIndex].squares[rowIndex];
            square.clear();

            const fireAnimation = new AnimatedSprite(fireTextures);
            fireAnimation.x = REEL_WIDTH / 2;
            fireAnimation.y = SQUARE_HEIGHT / 2.1;
            fireAnimation.anchor.set(0.5);
            fireAnimation.scale.set(
              REEL_WIDTH / fireAnimation.width,
              SQUARE_HEIGHT / fireAnimation.height
            );
            fireAnimation.animationSpeed = 0.5;
            fireAnimation.loop = true;
            fireAnimation.play();

            if (lineIndex >= 0) {
              square
                .rect(0, 0, REEL_WIDTH, SQUARE_HEIGHT)
                .stroke({ color: LINE_COLORS[lineIndex], width: 5 });
            } else if (lineIndex === -1) {
              square
                .rect(0, 0, REEL_WIDTH, SQUARE_HEIGHT)
                .stroke({ color: JACKPOT_BORDER_COLOR, width: 5 });
            }

            square.addChild(fireAnimation);
            square.visible = true;

            square.on('removed', () => {
              square.removeChild(fireAnimation);
              fireAnimation.destroy();
            });
          }
        });

        symbolGrid.forEach((reelSymbols, reelIndex) => {
          reelSymbols.forEach((symbolObj, rowIndex) => {
            if (symbolObj.symbol) {
              symbolObj.symbol.alpha = winningSquares.has(
                `${reelIndex}-${rowIndex}`
              )
                ? 1.0
                : 0.3;
            }
          });
        });
      }

      const hasWinCondition = hasJackpotWin || hasLineWin;
      const currentCredits = parseInt(winText.text) || 0;
      if (hasWinCondition) {
        hasWin = true;
        hasPendingWin = true;
        pendingWinAmount = totalWin;
        startText.text = 'Collect';
        betText.text = `Win: ${totalWin}`;
        if (playFFOfaKind) {
          playSound(ffOfaKind);
        } else {
          playSound(winSound);
        }
        gambleButton.eventMode = 'static';
        gambleButton.cursor = 'pointer';
        drawButton(
          gambleButton,
          buttonWidth,
          buttonHeight,
          cornerRadius,
          buttonNormalBlue
        );
      } else {
        hasWin = false;
        hasPendingWin = false;
        pendingWinAmount = 0;
        startText.text = 'Start';
        betText.text =
          currentCredits === 0 ? 'No more credits!' : 'Please place your bet';
        gambleButton.eventMode = 'none';
        gambleButton.cursor = 'default';
        drawButton(gambleButton, buttonWidth, buttonHeight, cornerRadius, [
          '#666666',
          '#333333',
        ]);
        allLines.forEach((line) => {
          line.visible = false;
        });
      }

      startClickCount = 0;
      updateButtonStates();
    } catch (error) {
      console.error('Error in reelsComplete:', error);
      running = false;
      hasWin = false;
      hasPendingWin = false;
      pendingWinAmount = 0;
      isCollecting = false;
      isGambleOpen = false;
      startClickCount = 0;
      resetReels();
      betText.text = 'Please place your bet';
      startText.text = 'Start';
      gambleText.text = 'Gamble';
      gambleButton.eventMode = 'none';
      gambleButton.cursor = 'default';
      drawButton(gambleButton, buttonWidth, buttonHeight, cornerRadius, [
        '#666666',
        '#333333',
      ]);
      allLines.forEach((line) => {
        line.visible = false;
      });
      updateButtonStates();
    }
  }

  app.ticker.add(() => {
    for (const r of reels) {
      r.blur.blurY = (r.position - r.previousPosition) * 8;
      r.previousPosition = r.position;

      for (let j = 0; j < r.symbols.length; j++) {
        const s = r.symbols[j];
        const prevy = s.y;
        s.y = ((r.position + j) % r.symbols.length) * SQUARE_HEIGHT;
        if (s.y > REEL_HEIGHT) s.y -= r.symbols.length * SQUARE_HEIGHT;
        s.y += (SQUARE_HEIGHT - s.height) / 2;
        if (s.y < 0 && prevy > SQUARE_HEIGHT) {
          s.texture = getRandomSymbol(r.symbols, slotTextures, textureArray);
          s.scale.x = s.scale.y = Math.min(
            (SQUARE_HEIGHT / s.texture.width) * SYMBOL_SCALE,
            (SQUARE_HEIGHT / s.texture.height) * SYMBOL_SCALE
          );
          s.x = Math.round((REEL_WIDTH - s.width) / 2);
        }
      }
    }
  });

  const tweening = [];
  function tweenTo(
    object,
    property,
    target,
    time,
    easing,
    onchange,
    oncomplete
  ) {
    const tween = {
      object,
      property,
      propertyBeginValue: object[property],
      target,
      easing,
      time,
      change: onchange,
      complete: oncomplete,
      start: Date.now(),
    };
    tweening.push(tween);
    return tween;
  }

  app.ticker.add(() => {
    const now = Date.now();
    const remove = [];
    for (const t of tweening) {
      const phase = Math.min(1, (now - t.start) / t.time);
      t.object[t.property] = lerp(
        t.propertyBeginValue,
        t.target,
        t.easing(phase)
      );
      if (t.change) t.change(t);
      if (phase === 1) {
        t.object[t.property] = t.target;
        if (t.complete) t.complete(t);
        remove.push(t);
      }
    }
    for (const t of remove) {
      tweening.splice(tweening.indexOf(t), 1);
    }
  });

  function lerp(a1, a2, t) {
    return a1 * (1 - t) + a2 * t;
  }

  function gamblePlay() {
    if (!hasPendingWin || isCollecting || isGambleOpen) {
      return;
    }
    isGambleOpen = true;
    gambleText.text = 'Close';
    reelContainer.visible = false;
    paytableContainer.visible = false;
    gambleContainer.visible = true;
    betText.text = 'Choose a card color';
    startText.text = 'Collect';
    gambleContainer.reset(pendingWinAmount);
    updateButtonStates();
  }

  const leftLabels = [4, 2, 1, 3, 5];
  const rightLabels = [4, 2, 1, 3, 5];
  const labelColors = [0xffff00, 0xff0000, 0x3399ff, 0x33cc33, 0xff66cc];
  const labelHeight = SQUARE_HEIGHT * 0.3;
  const labelWidth = REEL_WIDTH * 0.5;

  const labelPositions = {
    0: 0,
    1: 0,
    2: 1,
    3: 2,
    4: 2,
  };

  const allLines = [];

  function createConnectingLines(
    labels,
    labelPositions,
    labelColors,
    labelHeight,
    labelWidth,
    reelContainer,
    REEL_COUNT,
    REEL_WIDTH,
    REEL_SPACING,
    headerMargin,
    app,
    SQUARE_HEIGHT,
    winLines,
    visible = true
  ) {
    const targetLabels = [1, 2, 3, 4, 5];
    targetLabels.forEach((targetNum) => {
      const idx = labels.indexOf(targetNum);
      if (idx === -1) return;

      const row = labelPositions[idx];
      let y;

      if (row === 0) {
        const totalHeight = labelHeight * 2 + 5;
        const startY =
          headerMargin +
          row * SQUARE_HEIGHT +
          (SQUARE_HEIGHT - totalHeight) / 2;
        y = startY + (idx === 0 ? 0 : labelHeight + 5);
      } else if (row === 2) {
        const totalHeight = labelHeight * 2 + 5;
        const startY =
          headerMargin +
          row * SQUARE_HEIGHT +
          (SQUARE_HEIGHT - totalHeight) / 2;
        y = startY + (idx === 3 ? 0 : labelHeight + 5);
      } else {
        y =
          headerMargin +
          row * SQUARE_HEIGHT +
          (SQUARE_HEIGHT - labelHeight) / 2;
      }
      y += labelHeight / 2;

      const startX = reelContainer.x - labelWidth - 10;
      const endX =
        reelContainer.x +
        REEL_COUNT * REEL_WIDTH +
        (REEL_COUNT - 1) * REEL_SPACING +
        10 +
        labelWidth;

      const line = new Graphics();
      if (targetNum === 4 || targetNum === 5) {
        const lineIndex = targetNum - 1;
        const path = winLines[lineIndex];
        line.moveTo(startX, y);

        const firstReelX = reelContainer.x + REEL_WIDTH / 2;
        line.lineTo(firstReelX, y);

        for (let i = 1; i < REEL_COUNT - 1; i++) {
          const reelX =
            reelContainer.x + i * (REEL_WIDTH + REEL_SPACING) + REEL_WIDTH / 2;
          const reelY =
            headerMargin + path[i] * SQUARE_HEIGHT + SQUARE_HEIGHT / 2;
          line.lineTo(reelX, reelY);
        }

        const lastReelX =
          reelContainer.x +
          (REEL_COUNT - 1) * (REEL_WIDTH + REEL_SPACING) +
          REEL_WIDTH / 2;
        const lastReelY =
          headerMargin +
          path[REEL_COUNT - 1] * SQUARE_HEIGHT +
          SQUARE_HEIGHT / 2;
        line.lineTo(lastReelX, y);

        line.lineTo(endX, y);
      } else {
        line.moveTo(startX, y).lineTo(endX, y);
      }

      line.stroke({ color: labelColors[idx], width: 4 });

      line.visible = visible;

      app.stage.addChild(line);
      allLines.push(line);
    });
  }

  function createSideLabels(labels, side) {
    labels.forEach((num, idx) => {
      const row = labelPositions[idx];
      let y;

      if (row === 0) {
        const totalHeight = labelHeight * 2 + 5;
        const startY =
          headerMargin +
          row * SQUARE_HEIGHT +
          (SQUARE_HEIGHT - totalHeight) / 2;
        y = startY + (idx === 0 ? 0 : labelHeight + 5);
      } else if (row === 2) {
        const totalHeight = labelHeight * 2 + 5;
        const startY =
          headerMargin +
          row * SQUARE_HEIGHT +
          (SQUARE_HEIGHT - totalHeight) / 2;
        y = startY + (idx === 3 ? 0 : labelHeight + 5);
      } else {
        y =
          headerMargin +
          row * SQUARE_HEIGHT +
          (SQUARE_HEIGHT - labelHeight) / 2;
      }

      let shadowXOffset = side === 'left' ? -5 : 5;
      const shadowYOffset = 5;

      const shadow = new Graphics()
        .rect(shadowXOffset, shadowYOffset, labelWidth, labelHeight)
        .fill({ color: 0x000000, alpha: 0.3 });
      const g = new Graphics()
        .rect(0, 0, labelWidth, labelHeight)
        .fill({ color: labelColors[idx] });

      const t = new Text(num.toString(), {
        fontSize: labelHeight * 0.6,
        fill: 0x000000,
        fontWeight: 'bold',
      });
      t.anchor.set(0.5);
      t.x = labelWidth / 2;
      t.y = labelHeight / 2;

      const container = new Container();
      container.addChild(shadow);
      container.addChild(g);
      container.addChild(t);
      container.y = y;

      if (side === 'left') {
        container.x = reelContainer.x - labelWidth - 10;
      } else {
        container.x =
          reelContainer.x +
          REEL_COUNT * REEL_WIDTH +
          (REEL_COUNT - 1) * REEL_SPACING +
          10;
      }

      app.stage.addChild(container);
    });
  }

  createConnectingLines(
    leftLabels,
    labelPositions,
    labelColors,
    labelHeight,
    labelWidth,
    reelContainer,
    REEL_COUNT,
    REEL_WIDTH,
    REEL_SPACING,
    headerMargin,
    app,
    SQUARE_HEIGHT,
    winLines
  );
  createSideLabels(leftLabels, 'left');
  createSideLabels(rightLabels, 'right');
  app.stage.addChild(gambleContainer);
  app.stage.addChild(paytableContainer);
})();
