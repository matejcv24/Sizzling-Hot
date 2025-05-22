import { Container, Graphics, Text, Sprite, FillGradient } from 'pixi.js';

// Function to create the paytable container
export function createPaytable(app, slotTextures, reelContainerPosition) {
  const paytableContainer = new Container();
  paytableContainer.visible = false; // Initially hidden
  paytableContainer.x = reelContainerPosition.x; // Align with reels
  paytableContainer.y = reelContainerPosition.y; // Align with reels

  // Background for the paytable
  const paytableWidth = app.screen.width * 0.64; // Match reel area width
  const paytableHeight = app.screen.height * 0.7; // Match reel area height
  const background = new Graphics()
    .rect(0, 0, paytableWidth, paytableHeight)
    .fill({ color: 0x2c003e })
    .stroke({ color: 0xffffff, width: 4 });
  paytableContainer.addChild(background);

  // Define payouts (example structure)
  const payouts = [
    {
      symbol: 'seven',
      texture: slotTextures.seven,
      5: '1000x',
      4: '200x',
      3: '20x',
    },
    {
      symbol: 'jackpot',
      texture: slotTextures.jackpot,
      5: '50x',
      4: '10x',
      3: '2x',
    },
    {
      symbol: 'watermelon',
      texture: slotTextures.watermelon,
      5: '100x',
      4: '40x',
      3: '10x',
    },
    {
      symbol: 'grape',
      texture: slotTextures.grape,
      5: '100x',
      4: '40x',
      3: '10x',
    },
    {
      symbol: 'orange',
      texture: slotTextures.orange,
      5: '40x',
      4: '10x',
      3: '4x',
    },
    {
      symbol: 'lemon',
      texture: slotTextures.lemon,
      5: '40x',
      4: '10x',
      3: '4x',
    },
    {
      symbol: 'plum',
      texture: slotTextures.plum,
      5: '40x',
      4: '10x',
      3: '4x',
    },
    {
      symbol: 'cherries',
      texture: slotTextures.cherries,
      5: '40x',
      4: '10x',
      3: '4x',
      2: '1x',
    },
  ];

  // Organize payouts into three groups: left, center, right
  const leftPayouts = payouts.filter((p) =>
    ['watermelon', 'plum', 'lemon'].includes(p.symbol)
  );
  const centerPayouts = payouts.filter((p) =>
    ['seven', 'jackpot'].includes(p.symbol)
  );
  const rightPayouts = payouts.filter((p) =>
    ['grape', 'orange', 'cherries'].includes(p.symbol)
  );

  // Display payout information
  const rowHeight = paytableHeight * 0.25; // Adjusted for max 3 rows
  const symbolSize = rowHeight * 0.8;
  const textStyle = {
    fontFamily: 'Arial',
    fontSize: app.screen.width * 0.015,
    fill: 0xffff00,
    fontWeight: 'bold', // Make payout text bold
  };
  const payoutTextHeight = app.screen.width * 0.02; // Height for each payout text line
  const columnWidth = paytableWidth * 0.3; // Width for left and right columns
  const textOffset = paytableWidth * 0.05; // Consistent spacing between symbol and text
  const boxPadding = paytableWidth * 0.01; // Padding inside each box
  const standardBoxHeight = rowHeight * 0.9; // Height for all boxes except cherries
  const cherriesBoxHeight = payoutTextHeight * 4 + payoutTextHeight * 0.5; // Custom height for cherries box
  const boxWidth = columnWidth - paytableWidth * 0.02; // Width of each box

  // Left column (watermelon, plum, lemon) - text on left, symbol on right
  leftPayouts.forEach((payout, index) => {
    const rowY = paytableHeight * 0.15 + index * rowHeight;

    // Box background
    const box = new Graphics()
      .rect(paytableWidth * 0.05, rowY, boxWidth, standardBoxHeight)
      .fill(
        new FillGradient({
          type: 'linear',
          colorStops: [
            { offset: 0, color: 0x301934 },
            { offset: 1, color: 0x702963 },
          ],
        })
      )
      .stroke({ color: 0xffffff, width: 2 });
    paytableContainer.addChild(box);

    // Payout texts (one per line, on the left)
    const payoutValues = [
      { count: 5, value: payout[5] || '-' },
      { count: 4, value: payout[4] || '-' },
      { count: 3, value: payout[3] || '-' },
    ];

    payoutValues.forEach((payoutItem, textIndex) => {
      const payoutText = new Text(
        `${payoutItem.count}: ${payoutItem.value}`,
        textStyle
      );
      payoutText.x = paytableWidth * 0.05 + boxPadding; // Left edge of box with padding
      payoutText.y =
        rowY +
        (standardBoxHeight - 3 * payoutTextHeight) / 2 +
        textIndex * payoutTextHeight; // Center text block for 3 lines
      paytableContainer.addChild(payoutText);
    });

    // Symbol sprite (on the right)
    const symbolSprite = new Sprite(payout.texture);
    symbolSprite.width = symbolSize;
    symbolSprite.height = symbolSize;
    symbolSprite.x = paytableWidth * 0.05 + boxWidth - symbolSize - boxPadding; // Right edge of box with padding
    symbolSprite.y = rowY + (standardBoxHeight - symbolSize) / 2; // Center vertically in box
    paytableContainer.addChild(symbolSprite);
  });

  // Center column (seven, jackpot) - symbol on left, text on right
  centerPayouts.forEach((payout, index) => {
    const rowY = paytableHeight * 0.15 + index * rowHeight;

    // Box background
    const box = new Graphics()
      .rect(paytableWidth * 0.35, rowY, boxWidth, standardBoxHeight)
      .fill(
        new FillGradient({
          type: 'linear',
          colorStops: [
            { offset: 0, color: 0x301934 },
            { offset: 1, color: 0x702963 },
          ],
        })
      )
      .stroke({ color: 0xffffff, width: 2 });
    paytableContainer.addChild(box);

    // Symbol sprite
    const symbolSprite = new Sprite(payout.texture);
    symbolSprite.width = symbolSize;
    symbolSprite.height = symbolSize;
    symbolSprite.x = paytableWidth * 0.35 + boxPadding; // Left edge of box with padding
    symbolSprite.y = rowY + (standardBoxHeight - symbolSize) / 2; // Center vertically in box
    paytableContainer.addChild(symbolSprite);

    // Payout texts (one per line)
    const payoutValues = [
      { count: 5, value: payout[5] || '-' },
      { count: 4, value: payout[4] || '-' },
      { count: 3, value: payout[3] || '-' },
    ];

    payoutValues.forEach((payoutItem, textIndex) => {
      const payoutText = new Text(
        `${payoutItem.count}: ${payoutItem.value}`,
        textStyle
      );
      payoutText.x =
        paytableWidth * 0.35 + symbolSize + textOffset + boxPadding; // Right of symbol with consistent spacing
      payoutText.y =
        rowY +
        (standardBoxHeight - 3 * payoutTextHeight) / 2 +
        textIndex * payoutTextHeight; // Center text block for 3 lines
      paytableContainer.addChild(payoutText);
    });
  });

  // Right column (grape, orange, cherries) - symbol on left, text on right - CHANGED LOGIC
  rightPayouts.forEach((payout, index) => {
    const rowY = paytableHeight * 0.15 + index * rowHeight;

    // Box background
    const boxHeight =
      payout.symbol === 'cherries' ? cherriesBoxHeight : standardBoxHeight;
    const box = new Graphics()
      .rect(paytableWidth * 0.65, rowY, boxWidth, boxHeight)
      .fill(
        new FillGradient({
          type: 'linear',
          colorStops: [
            { offset: 0, color: 0x301934 },
            { offset: 1, color: 0x702963 },
          ],
        })
      )
      .stroke({ color: 0xffffff, width: 2 });
    paytableContainer.addChild(box);

    // Symbol sprite (on the left) - CHANGED POSITION
    const symbolSprite = new Sprite(payout.texture);
    symbolSprite.width = symbolSize;
    symbolSprite.height = symbolSize;
    symbolSprite.x = paytableWidth * 0.65 + boxPadding; // Left edge of box with padding
    symbolSprite.y = rowY + (boxHeight - symbolSize) / 2; // Center vertically in box
    paytableContainer.addChild(symbolSprite);

    // Payout texts (one per line, on the right) - CHANGED POSITION
    const payoutValues = [
      { count: 5, value: payout[5] || '-' },
      { count: 4, value: payout[4] || '-' },
      { count: 3, value: payout[3] || '-' },
    ];
    if (payout.symbol === 'cherries') {
      payoutValues.push({ count: 2, value: payout[2] || '-' });
    }

    payoutValues.forEach((payoutItem, textIndex) => {
      const payoutText = new Text(
        `${payoutItem.count}: ${payoutItem.value}`,
        textStyle
      );
      payoutText.x =
        paytableWidth * 0.65 + symbolSize + textOffset + boxPadding; // Right of symbol with consistent spacing
      payoutText.y =
        rowY +
        (boxHeight - payoutValues.length * payoutTextHeight) / 2 +
        textIndex * payoutTextHeight; // Center text block
      paytableContainer.addChild(payoutText);
    });
  });

  return paytableContainer;
}
