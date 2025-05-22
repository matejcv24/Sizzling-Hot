import {
  Container,
  Graphics,
  Text,
  TextStyle,
  FillGradient,
  Sprite,
  Texture,
} from 'pixi.js';

export function createGamble(app, initialWinAmount, onGambleComplete) {
  const gambleContainer = new Container();
  gambleContainer.visible = false; // Initially hidden

  // Background for the gamble window, sized to match the reel container
  const REEL_COUNT = 5;
  const REEL_WIDTH = app.screen.width * 0.12;
  const REEL_HEIGHT = app.screen.height * 0.7;
  const REEL_SPACING = app.screen.width * 0.01;
  const totalReelWidth =
    REEL_COUNT * (REEL_WIDTH + REEL_SPACING) - REEL_SPACING;
  const totalReelHeight = REEL_HEIGHT;

  const background = new Graphics()
    .rect(0, 0, totalReelWidth, totalReelHeight)
    .fill({ color: 0x2c003e })
    .stroke({ color: 0x8a8a8a, width: 6 });
  gambleContainer.addChild(background);

  // Title
  const textStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: app.screen.width * 0.02,
    fill: 0xffff00,
    fontWeight: 'bold',
  });
  const title = new Text('Gamble Your Win', textStyle);
  title.anchor.set(0.5);
  title.x = totalReelWidth / 2;
  title.y = totalReelHeight * 0.1;
  gambleContainer.addChild(title);

  // Win amount display
  let currentWin = initialWinAmount;
  let gambleCount = 0; // Track number of gambles
  const maxGambles = 5; // Maximum allowed gambles
  const winText = new Text(`Win: ${currentWin}`, textStyle);
  winText.anchor.set(0.5);
  winText.x = totalReelWidth / 2;
  winText.y = totalReelHeight * 0.2;
  gambleContainer.addChild(winText);
  console.log(`Initialized gamble with Win: ${currentWin}`);

  // Card display (using Sprite for images)
  const cardWidth = totalReelWidth * 0.25;
  const cardHeight = totalReelHeight * 0.5;
  const redTexture = Texture.from('./images/redcard.png');
  const blackTexture = Texture.from('./images/blackcard.png');
  const card = new Sprite(redTexture); // Start with red card
  card.width = cardWidth;
  card.height = cardHeight;
  card.x = (totalReelWidth - cardWidth) / 2;
  card.y = totalReelHeight * 0.3;
  gambleContainer.addChild(card);

  // Animation for alternating cards
  let isRedCard = true;
  let animationActive = true;
  const toggleCard = () => {
    if (!animationActive) return;
    isRedCard = !isRedCard;
    card.texture = isRedCard ? redTexture : blackTexture;
  };
  app.ticker.add(() => {
    if (animationActive && app.ticker.lastTime % 200 < app.ticker.deltaMS) {
      toggleCard();
    }
  });

  // Audio setup
  const successAudio = new Audio('./audio/success.mp3');
  const failAudio = new Audio('./audio/fail.mp3');
  const congratulationsSound = new Audio('./audio/congratulations.mp3');

  // Button dimensions
  const buttonWidth = totalReelWidth * 0.2;
  const buttonHeight = totalReelHeight * 0.1;
  const buttonSpacing = totalReelWidth * 0.05;
  const cornerRadius = 10;

  const drawButton = (graphics, colorStops) => {
    graphics
      .clear()
      .roundRect(0, 0, buttonWidth, buttonHeight, cornerRadius)
      .fill(
        new FillGradient({
          type: 'linear',
          colorStops,
        })
      )
      .stroke({ color: 0xc0c0c0, width: 2 });
  };

  // Red button (left of card)
  const redButton = new Graphics();
  drawButton(redButton, [
    { offset: 0, color: 0xff0000 },
    { offset: 1, color: 0x8b0000 },
  ]);
  redButton.x = card.x - buttonWidth - buttonSpacing;
  redButton.y = card.y + (cardHeight - buttonHeight) / 2;
  const redText = new Text('Red', textStyle);
  redText.anchor.set(0.5);
  redText.x = buttonWidth / 2;
  redText.y = buttonHeight / 2;
  redButton.addChild(redText);
  redButton.eventMode = 'static';
  redButton.cursor = 'pointer';
  gambleContainer.addChild(redButton);

  // Black button (right of card)
  const blackButton = new Graphics();
  drawButton(blackButton, [
    { offset: 0, color: 0x333333 },
    { offset: 1, color: 0x000000 },
  ]);
  blackButton.x = card.x + cardWidth + buttonSpacing;
  blackButton.y = card.y + (cardHeight - buttonHeight) / 2;
  const blackText = new Text('Black', textStyle);
  blackText.anchor.set(0.5);
  blackText.x = buttonWidth / 2;
  blackText.y = buttonHeight / 2;
  blackButton.addChild(blackText);
  blackButton.eventMode = 'static';
  blackButton.cursor = 'pointer';
  gambleContainer.addChild(blackButton);

  // Take Win button (below card, centered)
  const takeWinButton = new Graphics();
  drawButton(takeWinButton, [
    { offset: 0, color: 0x00ff00 },
    { offset: 1, color: 0x008000 },
  ]);
  takeWinButton.x = (totalReelWidth - buttonWidth) / 2;
  takeWinButton.y = totalReelHeight * 0.85;
  const takeWinText = new Text('Take Win', textStyle);
  takeWinText.anchor.set(0.5);
  takeWinText.x = buttonWidth / 2;
  takeWinText.y = buttonHeight / 2;
  takeWinButton.addChild(takeWinText);
  takeWinButton.eventMode = 'static';
  takeWinButton.cursor = 'pointer';
  gambleContainer.addChild(takeWinButton);

  // Button interaction handlers
  const handleGuess = (guess) => {
    animationActive = false; // Stop animation
    gambleCount++; // Increment gamble count
    const isRed = Math.random() < 0.5;
    card.texture = isRed ? redTexture : blackTexture; // Set final card

    const previousWin = currentWin;
    if ((guess === 'red' && isRed) || (guess === 'black' && !isRed)) {
      currentWin = previousWin * 2;
      console.log(
        `Correct guess! Win doubled from ${previousWin} to ${currentWin}, Gamble ${gambleCount}/${maxGambles}`
      );
      // Play success audio
      successAudio.currentTime = 0; // Reset to start
      successAudio.play().catch((error) => {
        console.warn('Success audio playback failed:', error);
      });

      if (gambleCount < maxGambles) {
        // Allow another gamble
        setTimeout(() => {
          animationActive = true; // Restart animation
          redButton.eventMode = 'static';
          redButton.cursor = 'pointer';
          blackButton.eventMode = 'static';
          blackButton.cursor = 'pointer';
          takeWinButton.eventMode = 'static';
          takeWinButton.cursor = 'pointer';
          app.render(); // Force render
        }, 1000);
      } else {
        // Max gambles reached, end gamble
        redButton.eventMode = 'none';
        redButton.cursor = 'default';
        blackButton.eventMode = 'none';
        blackButton.cursor = 'default';
        takeWinButton.eventMode = 'none';
        takeWinButton.cursor = 'default';
        setTimeout(() => {
          onGambleComplete(currentWin);
          gambleContainer.visible = false;
          reset(currentWin);
        }, 2000);
      }
    } else {
      currentWin = 0;
      console.log(
        `Incorrect guess! Win set to ${currentWin} from ${previousWin}`
      );
      // Play fail audio
      failAudio.currentTime = 0; // Reset to start
      failAudio.play().catch((error) => {
        console.warn('Fail audio playback failed:', error);
      });
      redButton.eventMode = 'none';
      redButton.cursor = 'default';
      blackButton.eventMode = 'none';
      blackButton.cursor = 'default';
      takeWinButton.eventMode = 'none';
      takeWinButton.cursor = 'default';
      setTimeout(() => {
        onGambleComplete(currentWin);
        gambleContainer.visible = false;
        reset(currentWin);
      }, 2000);
    }
    winText.text = `Win: ${currentWin}`; // Update winText immediately
    app.render(); // Force render to ensure text updates
  };

  const handleTakeWin = () => {
    animationActive = false; // Stop animation
    console.log(`Taking win: ${currentWin}`);

    // Play congratulations audio
    congratulationsSound.currentTime = 0; // Reset to start
    congratulationsSound.play().catch((error) => {
      console.warn('Congratulations audio playback failed:', error);
    });

    // Call onGambleComplete after a delay
    setTimeout(() => {
      onGambleComplete(currentWin);
      gambleContainer.visible = false;
      reset(currentWin);
    }, 1000);
  };

  // Attach event listeners
  function attachEventListeners() {
    redButton.removeAllListeners();
    blackButton.removeAllListeners();
    takeWinButton.removeAllListeners();
    redButton.on('pointerup', () => handleGuess('red'));
    blackButton.on('pointerup', () => handleGuess('black'));
    takeWinButton.on('pointerup', handleTakeWin);
  }

  // Reset function to restore initial state
  function reset(newWinAmount) {
    console.log(`Resetting gamble with new win amount: ${newWinAmount}`);
    currentWin = newWinAmount;
    gambleCount = 0; // Reset gamble count
    winText.text = `Win: ${currentWin}`;
    card.texture = redTexture; // Reset to red card
    isRedCard = true;
    animationActive = true; // Restart animation
    redButton.eventMode = 'static';
    redButton.cursor = 'pointer';
    blackButton.eventMode = 'static';
    blackButton.cursor = 'pointer';
    takeWinButton.eventMode = 'static';
    takeWinButton.cursor = 'pointer';
    attachEventListeners();
    app.render(); // Force render to ensure text updates
  }

  // Expose reset function on the container
  gambleContainer.reset = reset;

  // Initial reset
  reset(initialWinAmount);
  attachEventListeners();

  return gambleContainer;
}
