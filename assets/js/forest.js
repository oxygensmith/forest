const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const game = {
    settings: {
        tileSize: 32,
        gridWidth: 40,
        gridHeight: 24,
        numberOfTrees: 150,
        numberOfOrcs: 20,
        numberOfMountains: 3,
        mountainMaxSize: 12,
        riverWidth: 3,
        orcScore: 10,
    },
    credits: {
        visible: false,
    },
    score: 0,
    turns: 0,
    gameOver: false,
    paused: false,
    currentLevel: 1,
    trees: [],
    mountains: [],
    orcs: [],
    gameBoard: [],
    getInitialPlayerPosition() {
        return {
            x: Math.floor(this.settings.gridWidth / 2),
            y: Math.floor(this.settings.gridHeight / 2),
        };
    },
    player: {},
    ui: { 
        titleOffset: -120,
        textOffset: -80,
        buttonOffset: +40,
        buttonCoords: null
    },
    debug: false,
};

canvas.width = game.settings.gridWidth * game.settings.tileSize;
canvas.height = game.settings.gridHeight * game.settings.tileSize;
game.player = game.getInitialPlayerPosition();

 // Default to grass for all tiles
game.gameBoard = Array.from({ length: game.settings.gridHeight }, () =>
    Array.from({ length: game.settings.gridWidth }, () => 'grass')
);

const entityTypes = {
    grass: { char: '~', color: '#003300', passable: true },
    mountain: { char: 'M', color: 'gray', passable: false, kills: true },
    tree: { char: 'T', color: 'green', passable: false, kills: true },
    river: { char: 'r', color: 'blue', passable: false, kills: true },
    orc: { char: 'O', color: 'orange', passable: false, kills: true },
    player: { char: 'X', color: 'white', passable: true },
    dead: { char: 'D', color: 'red', passable: true },
    border: { char: 'X', color: 'red', passable: false, kills: true },
};

const sounds = {
    move: new Audio('assets/sounds/move.m4a'),
    orcCollision: new Audio('assets/sounds/orc-collision.m4a'),
    playerCollision: new Audio('assets/sounds/player-collision.m4a'),
    playerDrown: new Audio('assets/sounds/player-drown.m4a'),
};

function calculateGridSize() {
    // for when grid adapts to the initial window size
    const { tileSize } = game.settings;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate the number of tiles that fit in the viewport (rounding down)
    const gridWidth = Math.floor(viewportWidth / tileSize);
    const gridHeight = Math.floor(viewportHeight / tileSize);

    // Update canvas dimensions
    canvas.width = gridWidth * tileSize;
    canvas.height = gridHeight * tileSize;

    // Update game settings
    game.settings.gridWidth = gridWidth;
    game.settings.gridHeight = gridHeight;

    console.log(`Grid calculated: ${gridWidth} x ${gridHeight} tiles`);
}


function setupButtonListener() {
    // Map of button class names to their corresponding actions
    const buttonActions = {
        "start-button": restartGame,
        "restart-button": restartGame,
        "github-link": () => window.open("https://github.com/oxygensmith/forest", "_blank")
    };

    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Check each button area for a click
        game.ui.buttonAreas.forEach(button => {
            const { x, y, width, height, className } = button;

            if (
                mouseX >= x &&
                mouseX <= x + width &&
                mouseY >= y &&
                mouseY <= y + height
            ) {
                // If a matching action exists, trigger it
                if (className && buttonActions[className]) {
                    buttonActions[className]();
                }
            }
        });
    });
}

function setupKeyboardControls() {
    canvas.addEventListener("keydown", (event) => {
        const movement = {
            q: { x: -1, y: -1 },
            w: { x: 0, y: -1 },
            e: { x: 1, y: -1 },
            a: { x: -1, y: 0 },
            s: { x: 0, y: 0 },
            d: { x: 1, y: 0 },
            z: { x: -1, y: 1 },
            x: { x: 0, y: 1 },
            c: { x: 1, y: 1 },
        };

        const move = movement[event.key];
        if (move) {
            movePlayer(move.x, move.y);
        }
    });

    canvas.addEventListener("keydown", (event) => {
        if (event.key === "/" || event.key === "?") {
            toggleCredits();
        }
    });
}

function init() {
    
    // Calculate grid dimensions based on viewport
    // calculateGridSize();

    console.log("Game settings before displayAbout:", game.settings);
    
    // Setup button click listener
    setupButtonListener();

    // Setup keyboard controls
    setupKeyboardControls();

    // Display the About screen
    displayAbout();

    // Focus the canvas to enable keyboard input
    canvas.focus();
}

/* main HELPER functions */

function togglePause() {
    game.paused = !game.paused;
}

function eraseBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function eraseCredits() {
    const { tileSize, gridWidth, gridHeight } = game.settings;

    // Calculate overlay dimensions based on the grid
    const overlayGridWidth = Math.floor(gridWidth * 0.5);
    const overlayGridHeight = Math.floor(gridHeight * 0.5);
    const overlayStartX = Math.floor((gridWidth - overlayGridWidth) / 2);
    const overlayStartY = Math.floor((gridHeight - overlayGridHeight) / 2);

    // Clear the overlay area
    ctx.clearRect(
        overlayStartX * tileSize,
        overlayStartY * tileSize,
        overlayGridWidth * tileSize,
        overlayGridHeight * tileSize
    );

    // Optionally, redraw the game screen beneath the cleared area
    drawGame();
}

function clearTile(x, y) {
    const tileSize = game.settings.tileSize;
    ctx.fillStyle = "black"; // Black background to obscure the surface stood upon
    ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
}

/* GENERATE functions */

function addTreesToBoard(treeCount) {
    for (let i = 0; i < treeCount; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * game.settings.gridWidth);
            y = Math.floor(Math.random() * game.settings.gridHeight);
        } while (game.gameBoard[y][x] !== 'grass'); // Only place on grass

        // Place a tree on the board
        game.gameBoard[y][x] = 'tree';

        // Optionally track the tree coordinates in game.trees
        game.trees.push({ x, y });
    }
}

function generateGameBoard() {
    const { gridWidth, gridHeight, numberOfTrees, numberOfMountains, mountainMaxSize, riverWidth } = game.settings;
    const gameplayGridHeight = gridHeight - 1; // Reserve the first row for game details

    for (let y = 1; y <= gameplayGridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // Place border on the edges
            if (x === 0 || x === gridWidth - 1 || y === 1 || y === gameplayGridHeight) {
                game.gameBoard[y][x] = 'border';
            } else {
                game.gameBoard[y][x] = 'grass';
            }
        }
    }

    // Add static landscape features
    generateMountainBlobs(numberOfMountains, mountainMaxSize);
    generateRiver(riverWidth);
    addTreesToBoard(numberOfTrees);
}

function generateEntities() {
    const { gridWidth, gridHeight, numberOfOrcs } = game.settings;
    const gameplayGridHeight = gridHeight - 1; // Exclude the UI row

    game.orcs = []; // Reset the orcs array
    game.player = game.getInitialPlayerPosition(); // Reset player position

    for (let i = 0; i < numberOfOrcs; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (gridWidth - 2)) + 1; // Avoid left/right borders
            y = Math.floor(Math.random() * (gameplayGridHeight - 1)) + 2; // Avoid top/bottom borders
        } while (game.gameBoard[y][x] !== 'grass'); // Ensure orcs spawn on grass

        game.orcs.push({ x, y }); // Add orc to the array
    }
}

function generateRiver(riverWidth) {
    const { gridWidth, gridHeight } = game.settings;
    
    // Randomly choose a starting edge: top, bottom, left, or right
    const edges = ['top', 'bottom', 'left', 'right'];
    const startEdge = edges[Math.floor(Math.random() * edges.length)];

    let startX, startY;

    // Determine the starting coordinates based on the edge
    if (startEdge === 'top') {
        startX = Math.floor(Math.random() * gridWidth);
        startY = 0;
    } else if (startEdge === 'bottom') {
        startX = Math.floor(Math.random() * gridWidth);
        startY = gridHeight - 1;
    } else if (startEdge === 'left') {
        startX = 0;
        startY = Math.floor(Math.random() * gridHeight);
    } else if (startEdge === 'right') {
        startX = gridWidth - 1;
        startY = Math.floor(Math.random() * gridHeight);
    }

    // Start drawing the river
    let currentX = startX;
    let currentY = startY;

    while (currentX >= 0 && currentX < gridWidth && currentY >= 0 && currentY < gridHeight) {
        // Add the river to the gameBoard with the specified width
        for (let i = -Math.floor(riverWidth / 2); i <= Math.floor(riverWidth / 2); i++) {
            const riverX = currentX + (startEdge === 'top' || startEdge === 'bottom' ? i : 0);
            const riverY = currentY + (startEdge === 'left' || startEdge === 'right' ? i : 0);

            if (riverX >= 0 && riverX < gridWidth && riverY >= 0 && riverY < gridHeight && game.gameBoard[riverY][riverX] === 'grass') {
                game.gameBoard[riverY][riverX] = 'river'; // Mark as river
            }
        }

        // Randomly decide the direction to move
        const direction = Math.random();
        if (startEdge === 'top' || startEdge === 'bottom') {
            // Horizontal river
            if (direction < 0.4 && currentX > 0) currentX--; // Move left
            else if (direction < 0.8 && currentX < gridWidth - 1) currentX++; // Move right
            else currentY += startEdge === 'top' ? 1 : -1; // Move down or up
        } else {
            // Vertical river
            if (direction < 0.4 && currentY > 0) currentY--; // Move up
            else if (direction < 0.8 && currentY < gridHeight - 1) currentY++; // Move down
            else currentX += startEdge === 'left' ? 1 : -1; // Move right or left
        }
    }

    if (game.debug) {
        console.log(`River generated starting at (${startX}, ${startY}) from ${startEdge}.`);
    }

}

function generateMountainBlobs(numBlobs, maxBlobSize) {
    const { gridWidth, gridHeight } = game.settings;
    game.mountains = []; // Reset mountains array

    for (let i = 0; i < numBlobs; i++) {
        // Choose a random seed point for the blob
        const seedX = Math.floor(Math.random() * (gridWidth - 2)) + 1; // Avoid borders
        const seedY = Math.floor(Math.random() * (gridHeight - 2)) + 1;

        if (maxBlobSize === 1) {
            // Place a single mountain tile
            if (game.gameBoard[seedY][seedX] === 'grass') {
                game.gameBoard[seedY][seedX] = 'mountain';
                game.mountains.push({ x: seedX, y: seedY });
            }
        } else {
            // Create a set to store blob tiles
            const blobTiles = new Set();
            blobTiles.add(`${seedX},${seedY}`); // Add seed point to the blob

            // Expand the blob
            let expansionCount = 0;
            while (expansionCount < maxBlobSize) {
                // Pick a random existing tile in the blob
                const tilesArray = Array.from(blobTiles);
                const randomTile = tilesArray[Math.floor(Math.random() * tilesArray.length)];
                const [x, y] = randomTile.split(',').map(Number);

                // Generate a random adjacent tile
                const direction = [
                    { dx: 1, dy: 0 },
                    { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 },
                    { dx: 0, dy: -1 },
                ][Math.floor(Math.random() * 4)];
                const newX = x + direction.dx;
                const newY = y + direction.dy;

                // Ensure the new tile is within bounds, grass, and not already in the blob
                if (
                    newX > 0 &&
                    newX < gridWidth - 1 &&
                    newY > 0 &&
                    newY < gridHeight - 1 &&
                    game.gameBoard[newY][newX] === 'grass' && // Only place on grass
                    !blobTiles.has(`${newX},${newY}`)
                ) {
                    blobTiles.add(`${newX},${newY}`);
                    expansionCount++;
                }
            }

            // Add blob tiles to the game board and mountains array
            blobTiles.forEach(tile => {
                const [x, y] = tile.split(',').map(Number);
                game.gameBoard[y][x] = 'mountain'; // Add mountain to gameBoard
                game.mountains.push({ x, y }); // Track mountain in game.mountains
            });
        }
    }

    if (game.debug) {
        console.log("Generated mountain blobs:", game.mountains);
    }
    
}

function collisionEffect(x, y, callback) {
    const asciiChars = ['@', '#', '%', '&', '*', '+', '=', '?', '$', '!', '~'];
    let cycleCount = 0;
    const maxCycles = 2; // Number of cycles before settling on "D"
    const intervalDuration = 100; // Milliseconds per cycle

    // Start cycling through random ASCII characters
    const interval = setInterval(() => {
        const randomChar = asciiChars[Math.floor(Math.random() * asciiChars.length)];
        drawText(randomChar, x, y, "red"); // Draw random character in red

        cycleCount++;
        if (cycleCount >= maxCycles) {
            clearInterval(interval); // Stop cycling

            // Draw the final permanent "D"
            drawPermanentD(x, y);

            if (callback) {
                callback(); // Execute the callback after the effect is complete
            }
        }
    }, intervalDuration);
}

/* MOVE functions */

function movePlayer(dx, dy) {
    const { gridWidth, gridHeight } = game.settings;
    const player = game.player;

    // Prevent movement if the game is over
    if (game.gameOver) return;

    // Calculate new player position, clamping within bounds
    const newX = Math.max(0, Math.min(gridWidth - 1, player.x + dx));
    const newY = Math.max(1, Math.min(gridHeight - 1, player.y + dy)); // Row 0 reserved for game details

    // Check collision with static entities (gameBoard)
    const staticEntityKey = game.gameBoard[newY][newX];
    const staticEntity = entityTypes[staticEntityKey];

    if (staticEntity) {
        if (game.debug) {
            console.log(`Static entity detected: ${staticEntityKey}`, staticEntity);
        }

        // Handle lethal static entities
        if (staticEntity.kills) {
            handlePlayerDeath(player, newX, newY, staticEntityKey);
            return; // Stop further movement
        }

        // Handle impassable static entities
        if (!staticEntity.passable) {
            sounds.move.play(); // Play bump sound
            return; // Block movement
        }
    }

    // Check collision with dynamic entities (orcs)
    const collidedOrc = game.orcs.find(orc => orc.x === newX && orc.y === newY);
    if (collidedOrc) {
        handlePlayerDeath(player, newX, newY, "orc", "The orcs caught you!");
        return; // Stop further movement
    }

    // Move player to new position
    player.x = newX;
    player.y = newY;

    // Update game state
    updateGame();
}

function moveOrcs() {
    if (game.gameOver) return;

    const { player, orcs, gameBoard, settings } = game;
    const { orcScore } = settings;

    let orcCollidedWithTree = false;
    let orcCaughtPlayer = false;

    game.orcs = orcs.filter(orc => {
        // Move the orc toward the player
        if (orc.x < player.x) orc.x++;
        else if (orc.x > player.x) orc.x--;

        if (orc.y < player.y) orc.y++;
        else if (orc.y > player.y) orc.y--;

        // Check collisions with static entities
        const staticEntityKey = gameBoard[orc.y][orc.x];
        if (staticEntityKey === 'tree') {
            orcCollidedWithTree = true;
            collisionEffect(orc.x, orc.y, () => {}); // Show collision animation
            game.score += orcScore; // Update score
            return false; // Remove orc
        }

        // Check collisions with the player
        if (orc.x === player.x && orc.y === player.y) {
            orcCaughtPlayer = true;
        }

        return true; // Keep orc
    });

    if (orcCollidedWithTree) {
        sounds.orcCollision.play();
    }
    if (orcCaughtPlayer) {
        sounds.playerCollision.play();
        collisionEffect(player.x, player.y, () => {
            handlePlayerDeath(player, player.x, player.y, 'orc', "The orcs caught you!");
        });
    }
}

/* Miscellaneous HANDLERS */

function handlePlayerDeath(player, newX, newY, causeKey, customReason = null) {
    // Determine reason and sound for death
    const defaultReason = `You collided with ${causeKey}!`;
    const deathReason = customReason || defaultReason;
    const deathSound = causeKey === 'river' ? sounds.playerDrown : sounds.playerCollision;

    // Erase the player visually from the board
    clearTile(player.x, player.y);

    // Trigger visual effect and game over
    collisionEffect(newX, newY, () => {
        deathSound.play();
        displayGameOver(deathReason, 0);
        game.gameOver = true;
    });
}

// when a dynamic entity gets killed
function drawPermanentD(x, y) {
    clearTile(x, y); // Clear the tile with a black background
    drawEntity('dead', x, y); // Use the correct entity key
}

/* DRAW functions */

function drawText(char, x, y, color) {
    const tileSize = game.settings.tileSize;
    ctx.fillStyle = color;
    ctx.font = `${tileSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
}


function drawEntity(entityKey, x, y) {
    const tileSize = game.settings.tileSize;
    const entity = entityTypes[entityKey]; // Lookup by type (e.g., 'grass', 'tree')
    if (entity) {
        // console.log(`Draw ${entityKey} at (${x}, ${y})`);
        ctx.fillStyle = entity.color;
        ctx.font = `${tileSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(entity.char, x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
    } else {
        console.log(`No entity found for key: ${entityKey} at (${x}, ${y})`);
    }
}


function drawDynamicEntities() {
    // Clear and draw the player
    clearTile(game.player.x, game.player.y); // Clear background under the player
    drawEntity('player', game.player.x, game.player.y);

    // Clear and draw each orc
    game.orcs.forEach(orc => {
        clearTile(orc.x, orc.y); // Clear background under the orc
        drawEntity('orc', orc.x, orc.y);
    });
}

function drawGameBoard() {
    for (let y = 1; y < game.settings.gridHeight; y++) {
        for (let x = 0; x < game.settings.gridWidth; x++) {
            const entityKey = game.gameBoard[y][x];
            if (entityKey) {
                drawEntity(entityKey, x, y, entityKey.color);
            }
        }
    }
}

function drawGameDetails() {
    const tileSize = game.settings.tileSize;
    
    // Clear the first row of the grid
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, tileSize);

    // Draw "Orcs:" left-aligned and "Score:" right-aligned
    ctx.fillStyle = "white";
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Display the number of orcs left
    ctx.fillText(`Orcs left: ${game.orcs.length}`, 10, tileSize / 2);

    // Display the score
    ctx.fillText(`Score: ${game.score}`, canvas.width - 150, tileSize / 2);
}


function drawGame() {
    eraseBoard();          // Clear the canvas
    drawGameDetails();     // Draw game details (e.g., score)
    drawGameBoard();       // Draw static entities
    drawDynamicEntities(); // Draw dynamic entities (player, orcs)
}

/* MAIN GAME LOOP */

function updateGame() {
    
    if (game.paused) return; // not yet in use

    // Move orcs
    moveOrcs();
    
    // Redraw the game board to reflect the current state
    drawGame();

    // Check if the game is won (all orcs eliminated)
    if (game.orcs.length === 0) {
        displayGameOver("You win! All orcs eliminated!", 1);
        game.gameOver = true;
        return;
    }

    // Play move sound if no collisions occurred
    if (!game.gameOver) {
        sounds.move.play();
        game.turns += 1;
    }

    if (game.debug) {
        console.log("Game state:", { gameBoard: game.gameBoard, orcs: game.orcs, player: game.player, turns: game.turns });
    }
}

function restartGame() {
    const { gridWidth, gridHeight } = game.settings;

    // Reset game state
    game.gameOver = false;
    game.score = 0;
    game.turns = 0;
    game.paused = false; // Not yet in use
    game.currentLevel = 1; // Not yet in use

    // calculateGridSize();

    // Generate the game board and entities
    generateGameBoard(); // Populate the gameBoard array with static entities
    generateEntities();  // Populate dynamic entities like orcs and player

    // Reset player position to initial state
    game.player = game.getInitialPlayerPosition();

    // Ensure the player's starting position is grass
    game.gameBoard[game.player.y][game.player.x] = 'grass';

    // Redraw the entire game
    drawGame();
}


// START, END, and CREDIT SCREENS

/* button rendering function for start, end and credit screens. */
function drawButton(ctx, text, x, y, width, height, action = null) {
    
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = "black";
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "black";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + width / 2, y + height / 2);

    game.ui.buttonCoords = { x, y, width, height, action };
}

function drawModalOverlay(percentageWidth, percentageHeight, tileSize, gridWidth, gridHeight, fillColor = "black") {
    // Calculate overlay dimensions based on percentage of grid size
    const overlayGridWidth = Math.floor(gridWidth * (percentageWidth / 100));
    const overlayGridHeight = Math.floor(gridHeight * (percentageHeight / 100));
    const overlayStartX = Math.floor((gridWidth - overlayGridWidth) / 2); // Center horizontally
    const overlayStartY = Math.floor((gridHeight - overlayGridHeight) / 2); // Center vertically

    const overlayWidth = overlayGridWidth * tileSize; // Convert to pixel width
    const overlayHeight = overlayGridHeight * tileSize; // Convert to pixel height

    // Draw overlay background
    ctx.fillStyle = fillColor;
    ctx.fillRect(
        overlayStartX * tileSize,
        overlayStartY * tileSize,
        overlayWidth,
        overlayHeight
    );

    // Return overlay dimensions for further use (e.g., border, text placement)
    return { 
        overlayStartX, 
        overlayStartY, 
        overlayGridWidth, 
        overlayGridHeight,
        pixelY: overlayStartY * tileSize,
        pixelHeight: overlayGridHeight * tileSize};
}

function drawModalBorder(char = "*", startX, startY, gridWidth, gridHeight, tileSize, color = "white") {
    console.log("drawModalBorder: Start", { startX, startY, gridWidth, gridHeight });
    ctx.fillStyle = color;
    ctx.font = `${tileSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Top and bottom borders
    for (let x = startX; x < startX + gridWidth; x++) {
        ctx.fillText(char, x * tileSize + tileSize / 2, startY * tileSize + tileSize / 2); // Top border
        ctx.fillText(char, x * tileSize + tileSize / 2, (startY + gridHeight - 1) * tileSize + tileSize / 2); // Bottom border
    }

    // Left and right borders
    for (let y = startY; y < startY + gridHeight; y++) {
        ctx.fillText(char, startX * tileSize + tileSize / 2, y * tileSize + tileSize / 2); // Left border
        ctx.fillText(char, (startX + gridWidth - 1) * tileSize + tileSize / 2, y * tileSize + tileSize / 2); // Right border
    }
    console.log("drawModalBorder: End");
}

/* text renderer function for credit screens. */
function gameScreenLines(overlayY, overlayHeight, lines, defaultColor = "white") {
    
    const tileSize = game.settings.tileSize;
    const maxTextSize = 32; // Maximum size for standard text and buttons

    // Dynamically set sizes with a cap at 32
    const fontSizes = {
        title: 48,
        headline: 24,
        subhead: 18,
        regular: Math.min(tileSize, maxTextSize),
        button: Math.min(tileSize, maxTextSize)
    };

    ctx.fillStyle = defaultColor;

    // Calculate total height of all lines
    const totalTextHeight = lines.reduce((sum, [, style = "regular"]) => {
        const fontSize = fontSizes[style] || fontSizes.regular;
        return sum + fontSize + 10; // Add line height (font size + padding)
    }, 0);

    // Calculate starting Y position to center vertically
    let textY = overlayY + (overlayHeight - totalTextHeight) / 2;

    // Reset button areas for the current screen
    game.ui.buttonAreas = [];

    // Render each line
    lines.forEach(([text, style = "regular", className]) => {
        const fontSize = fontSizes[style] || fontSizes.regular;
        ctx.font = `${fontSize}px monospace`;

        // Measure text width
        const textWidth = ctx.measureText(text).width;

        // Render the text
        ctx.fillText(text, canvas.width / 2, textY);

        // If this is a button, register its clickable area with className
        if (style === "button" && className) {
            const buttonArea = {
                x: canvas.width / 2 - textWidth / 2,
                y: textY - fontSize / 2,
                width: textWidth,
                height: fontSize,
                className: className
            };

            game.ui.buttonAreas.push(buttonArea);
        }

        // Move to the next line
        textY += fontSize + 10;
    });
}

function displayCredits(defaultCreditColor = "white") {
    const { tileSize, gridWidth, gridHeight } = game.settings;
    const overlay = drawModalOverlay(50, 50, tileSize, gridWidth, gridHeight, "black");
    drawModalBorder("*", overlay.overlayStartX, overlay.overlayStartY, overlay.overlayGridWidth, overlay.overlayGridHeight, tileSize);

    const lines = [
        ["FOREST", "headline", "white"],
        ["= Credits =", "subhead"],
        [""],
        ["design and programming"],
        [""],
        ["== SAME TEAM ==", "subhead"],
        ["Cooperative Game Cooperative"],
        ["M. Cummings • R. Butz"],
        [""],
        ["Licensed under CC-BY 4.0 © 2024"],
        ["Game code repo", "button", "github-link"]
    ];

    gameScreenLines(overlay.pixelY, overlay.pixelHeight, lines, defaultCreditColor);
}


// About screen displayed at the beginning of the game
function displayAbout() {
    const { tileSize, gridWidth, gridHeight } = game.settings;

    // Clear the canvas
    eraseBoard();
    // Draw a sample game board
    drawGameBoard();
    
    // Draw the modal overlay (50% width and height, centered)
    const overlay = drawModalOverlay(50, 50, tileSize, gridWidth, gridHeight, "black");
    
    // Draw the border around the modal
    drawModalBorder("*", overlay.overlayStartX, overlay.overlayStartY, overlay.overlayGridWidth, overlay.overlayGridHeight, tileSize);
    
    // Define the About screen text and the Start Game button
    const lines = [
        ["Forest", "title", "white"],
        [""],
        ["Eliminate the orcs", "regular"],
        ["by guiding them into trees.", "regular"],
        [""],
        ["Start Game", "button", "start-button"]
    ];

    // Render the lines within the modal overlay
    gameScreenLines(overlay.pixelY, overlay.pixelHeight, lines, "white");
    console.log("displayAbout: End");
}

// Various game over screens displayed at the end of the game.
function displayGameOver(reason, result = 0) {
    const { tileSize, gridWidth, gridHeight } = game.settings;
    
    // Draw the modal overlay
    const overlay = drawModalOverlay(50, 50, tileSize, gridWidth, gridHeight, "black");
    drawModalBorder("*", overlay.overlayStartX, overlay.overlayStartY, overlay.overlayGridWidth, overlay.overlayGridHeight, game.settings.tileSize);

    // Define the game over lines
    const resultMessage = result === 1 ? "YOU WIN!" : "GAME OVER";
    const lines = [
        [resultMessage, "title"],
        [reason, "regular"],
        [""],
        ["Play Again", "button", "restart-button"]
    ];

    // Draw the lines
    gameScreenLines(overlay.pixelY, overlay.pixelHeight, lines, "white");
}

function toggleCredits() {
    // Toggle visibility
    game.credits.visible = !game.credits.visible;
    
    if (game.credits.visible) {
        displayCredits("green");
        console.log("displayCredits toggled on.");
    } else {
        eraseCredits();
        console.log("displayCredits toggled off.");
        drawGame();
    }
}

window.onload = init;