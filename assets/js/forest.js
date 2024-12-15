const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const creditsCanvas = document.getElementById("creditsCanvas");
const creditsCtx = creditsCanvas.getContext("2d");

const game = {
    settings: {
        tileSize: 18,
        gridWidth: 80,
        gridHeight: 40,
        numberOfTrees: 450,
        numberOfOrcs: 20,
        mountainBlobCount: 10,
        mountainBlobMaxSize: 28,
        riverWidth: 7,
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
    ui: { // Renamed for brevity
        titleOffset: -120,
        textOffset: -80,
        buttonOffset: 40,
        buttonCoords: null, // Button coordinates start as null
    },
    debug: false,
};

canvas.width = game.settings.gridWidth * game.settings.tileSize;
canvas.height = game.settings.gridHeight * game.settings.tileSize;
// Update canvas dimensions to match the game canvas
creditsCanvas.width = canvas.width;
creditsCanvas.height = canvas.height;

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
    dead: { char: 'D', color: 'red', passable: true, kills: true },
    border: { char: 'X', color: 'red', passable: false, kills: true },
};

const sounds = {
    move: new Audio('assets/sounds/move.m4a'),
    orcCollision: new Audio('assets/sounds/orc-collision.m4a'),
    playerCollision: new Audio('assets/sounds/player-collision.m4a'),
    playerDrown: new Audio('assets/sounds/player-drown.m4a'),
};

function calculateGridSize() {
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
    canvas.addEventListener("click", (event) => {
        if (!game.ui.buttonCoords) return; // when no button currently displayed

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const { x, y, width, height } = game.ui.buttonCoords;

        // Check if the click is within the button's bounds
        if (
            mouseX >= x &&
            mouseX <= x + width &&
            mouseY >= y &&
            mouseY <= y + height
        ) {
            restartGame(); // Start or restart the game
            game.ui.buttonCoords = null; // Clear button coordinates after click
        }
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
    creditsCtx.clearRect(0, 0, creditsCanvas.width, creditsCanvas.height);
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
    generateRiver(riverWidth);
    generateMountainBlobs(numberOfMountains, mountainMaxSize);
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

    calculateGridSize();

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

function drawCredits() {
    const { gridWidth, gridHeight, tileSize } = game.settings;

    // Calculate dimensions
    const overlayWidth = Math.min(Math.ceil(gridWidth * 0.8), gridWidth) * tileSize;
    const overlayHeight = Math.min(Math.ceil(gridHeight * 0.8), gridHeight) * tileSize;

    const overlayX = (canvas.width - overlayWidth) / 2;
    const overlayY = (canvas.height - overlayHeight) / 2;

    // Draw black background
    creditsCtx.fillStyle = "black";
    creditsCtx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);

    // Draw border of asterisks
    creditsCtx.fillStyle = "white";
    creditsCtx.font = `${tileSize}px monospace`;
    creditsCtx.textAlign = "center";
    creditsCtx.textBaseline = "middle";

    for (let x = 0; x < overlayWidth / tileSize; x++) {
        creditsCtx.fillText("*", overlayX + x * tileSize + tileSize / 2, overlayY + tileSize / 2);
        creditsCtx.fillText("*", overlayX + x * tileSize + tileSize / 2, overlayY + overlayHeight - tileSize / 2);
    }

    for (let y = 0; y < overlayHeight / tileSize; y++) {
        creditsCtx.fillText("*", overlayX + tileSize / 2, overlayY + y * tileSize + tileSize / 2);
        creditsCtx.fillText("*", overlayX + overlayWidth - tileSize / 2, overlayY + y * tileSize + tileSize / 2);
    }

    // Draw credits text
    const textX = overlayX + overlayWidth / 2;
    let textY = overlayY + tileSize * 2;

    creditsCtx.fillStyle = "white";
    creditsCtx.textAlign = "center";

    // Draw "FOREST" (slightly smaller than the title screen)
    creditsCtx.font = `${tileSize * 2}px monospace`;
    creditsCtx.fillText("FOREST", textX, textY);
    textY += tileSize * 2;

    // Draw "Credits" in bold
    creditsCtx.font = `bold ${tileSize * 1.5}px monospace`;
    creditsCtx.fillText("Credits", textX, textY);
    textY += tileSize * 2;

    // Draw "M. Cummings • R. Butz"
    creditsCtx.font = `${tileSize}px monospace`;
    creditsCtx.fillText("M. Cummings • R. Butz", textX, textY);
    textY += tileSize * 2;

    // Draw "== SAME TEAM =="
    creditsCtx.font = `bold ${tileSize * 1.25}px monospace`;
    creditsCtx.fillText("== SAME TEAM ==", textX, textY);
    textY += tileSize * 2;

    // Draw "Cooperative Game Cooperative"
    creditsCtx.font = `${tileSize}px monospace`;
    creditsCtx.fillText("Cooperative Game Cooperative", textX, textY);
}

// START AND END SCREENS

function drawButton(ctx, text, x, y, width, height) {
    // Draw button background
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, width, height);

    // Draw button border
    ctx.strokeStyle = "black";
    ctx.strokeRect(x, y, width, height);

    // Draw button text
    ctx.fillStyle = "black";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + width / 2, y + height / 2);

    // Store button coordinates in the game object
    game.ui.buttonCoords = { x, y, width, height };
}

// About screen displayed at the beginning of the game
function displayAbout() {
    const { ui } = game; // Destructure UI settings

    // Clear the canvas
    eraseBoard();

    // Draw a sample game board
    drawGameBoard();

    // Draw the title: "Forest"
    ctx.fillStyle = "white";
    ctx.font = "48px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Forest", canvas.width / 2, canvas.height / 2 + ui.titleOffset);

    // Draw the objective
    ctx.font = "16px monospace";
    ctx.fillText(
        "Eliminate the orcs by guiding them into trees.",
        canvas.width / 2,
        canvas.height / 2 + ui.textOffset
    );

    // Draw the start button
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = (canvas.width - buttonWidth) / 2;
    const buttonY = (canvas.height / 2) + ui.buttonOffset;

    drawButton(ctx, "Start Game", buttonX, buttonY, buttonWidth, buttonHeight);
}

// Various game over screens displayed at the end of the game.
function displayGameOver(reason, result = 0) {
    const { ui } = game; // Destructure UI settings

    // Determine the result message
    const resultMessage = result === 1 ? "YOU WIN!" : "GAME OVER";

    // Draw "GAME OVER" or "YOU WIN!" text
    ctx.fillStyle = "white";
    ctx.font = "48px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(resultMessage, canvas.width / 2, canvas.height / 2 + ui.titleOffset);

    // Draw the reason text
    ctx.font = "16px monospace";
    ctx.fillText(reason, canvas.width / 2, canvas.height / 2 + ui.textOffset);

    // Draw the restart button
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = (canvas.width - buttonWidth) / 2;
    const buttonY = canvas.height / 2 + ui.buttonOffset;

    drawButton(ctx, "Play Again", buttonX, buttonY, buttonWidth, buttonHeight);
}

function toggleCredits() {
    const { gridWidth, gridHeight, tileSize } = game.settings;

    // Toggle visibility
    game.credits.visible = !game.credits.visible;
    creditsCanvas.style.display = game.credits.visible ? "block" : "none";

    if (game.credits.visible) {
        drawCredits();
    } else {
        eraseCredits();
    }
}

window.onload = init;