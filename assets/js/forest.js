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
    screenVisible: null,
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

const SCREENS = {
    ABOUT: "about",
    GAME_OVER: "gameOver",
    CREDITS: "credits",
    NONE: null,
};

const buttonActions = {
    "start-button": restartGame,
    "restart-button": restartGame,
    "github-link": () => window.open("https://github.com/oxygensmith/forest", "_blank")
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

// Future function for when the grid size will be calculated 
// automatically, using the initial viewport dimensions.
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

function canDisplayScreen(screenName) {
    if (game.debug) {
        console.log("Current screen state:", game.screenVisible);
    }
    if (game.screenVisible !== SCREENS.NONE) {
        console.log(`${game.screenVisible} screen in the way, skipping.`);
        return false;
    }
    game.screenVisible = screenName;
    if (game.debug) {
        console.log("New screen state:", game.screenVisible);
    }
    return true;
}

function setupButtonListener() {
    canvas.addEventListener("click", (event) => {
        if (!game.ui.buttonCoords || game.screenVisible === SCREENS.NONE) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const { x, y, width, height, className } = game.ui.buttonCoords; // Use className from buttonCoords

        // Check if the click is within the button's bounds
        if (
            mouseX >= x &&
            mouseX <= x + width &&
            mouseY >= y &&
            mouseY <= y + height
        ) {
            if (game.debug) {  
                console.log("Clicked button class:", className);
            }

            // Use buttonActions to determine the corresponding function
            if (buttonActions[className]) {
                buttonActions[className](); // Execute the button's associated action
            } else {
                if (game.debug) {  
                    console.warn(`No action defined for button: ${className}`);
                }
            }

            // Clear button state
            game.ui.buttonCoords = null;
            game.screenVisible = SCREENS.NONE;
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

    game.screenVisible = null;

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
    const { tileSize, gridWidth } = game.settings;
    
    // Clear the first row of the grid
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, tileSize);

    // Set font to match tile size
    ctx.fillStyle = "white";
    ctx.font = `${tileSize}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Display "Orcs left"
    ctx.fillText(`Orcs left: ${game.orcs.length}`, 10, tileSize / 2);

    // Display "Score" aligned to the right
    ctx.textAlign = "right";
    ctx.fillText(`Score: ${game.score}`, canvas.width - 10, tileSize / 2);
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
        displayGameOver("All orcs eliminated!", 1);
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
    // Clear any lingering button state
    game.ui.buttonCoords = null;
    game.screenVisible = SCREENS.NONE;

    // Reset game state and start the game
    game.gameOver = false;
    game.score = 0;
    game.turns = 0;
    game.paused = false;

    // Generate the game board and entities
    generateGameBoard();
    generateEntities();

    // Reset player position
    game.player = game.getInitialPlayerPosition();

    // Ensure the player's starting position is grass
    game.gameBoard[game.player.y][game.player.x] = "grass";

    // Redraw the entire game
    drawGame();
}


// START, END, and CREDIT SCREENS

function drawModalOverlay(percentageWidth, percentageHeight, tileSize, gridWidth, gridHeight, fillColor = "black", opacity = 1) {
    const overlayGridWidth = Math.floor(gridWidth * (percentageWidth / 100));
    const overlayGridHeight = Math.floor(gridHeight * (percentageHeight / 100));
    const overlayStartX = Math.floor((gridWidth - overlayGridWidth) / 2);
    const overlayStartY = Math.floor((gridHeight - overlayGridHeight) / 2);

    const overlayPixelWidth = overlayGridWidth * tileSize;
    const overlayPixelHeight = overlayGridHeight * tileSize;
    const overlayPixelX = overlayStartX * tileSize;
    const overlayPixelY = overlayStartY * tileSize;

    // Set transparency for the modal
    ctx.save(); // Save current canvas state
    ctx.globalAlpha = opacity;

    // Draw the overlay background
    ctx.fillStyle = fillColor;
    ctx.fillRect(overlayPixelX, overlayPixelY, overlayPixelWidth, overlayPixelHeight);

    ctx.restore(); // Restore canvas state to remove transparency

    return {
        overlayStartX,
        overlayStartY,
        overlayGridWidth,
        overlayGridHeight,
        pixelX: overlayPixelX,
        pixelY: overlayPixelY,
        pixelWidth: overlayPixelWidth,
        pixelHeight: overlayPixelHeight
    };
}

function drawModalBorder(char = "*", startX, startY, gridWidth, gridHeight, tileSize, color = "white") {
    if (game.debug) {
        console.log("drawModalBorder: Start", { startX, startY, gridWidth, gridHeight });
    }    
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
}

/* for displaying images on start/end/credit game screens. */
function gameScreenImage(url, yPosition, width = 400, height = null) {
    const img = new Image();
    img.src = url;

    img.onload = () => {
        // Auto-calculate height if not provided
        if (!height) {
            const aspectRatio = img.width / img.height;
            height = Math.floor(width / aspectRatio);
        }

        const xPosition = (canvas.width - width) / 2; // Center the image horizontally
        ctx.drawImage(img, xPosition, yPosition, width, height);
    };

    // mandatory error display if image not found
    img.onerror = () => {
        console.error(`Failed to load image: ${url}`);
    };
}

function gameScreenButton(text, x, y, width, height, defaultColor = "white", textColor = "black", className = null) {
    if (game.debug) {
        console.log("gameScreenButton", { text, x, y, width, height, defaultColor, textColor, className });
    }    
    ctx.fillStyle = defaultColor;
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = "black";
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = textColor;
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + width / 2, y + height / 2);

    // Set button coordinates in the game object
    game.ui.buttonCoords = { x, y, width, height, className };
    if (game.debug) {
        console.log("Button rendered:", game.ui.buttonCoords);
    }    
}

/* main function for rendering text and other elements on start/end/credit screens. */
function gameScreenLines(overlayY, overlayHeight, lines, defaultColor = "white") {
    const { tileSize } = game.settings;
    const maxTextSize = 32;

    const fontSizes = {
        title: 56,
        headline: 48,
        subhead: 40,
        regular: Math.min(tileSize, maxTextSize),
        button: 20,
        small: 20
    };

    ctx.fillStyle = defaultColor;

    // Calculate total height of all lines (images included)
    const totalTextHeight = lines.reduce((sum, line) => {
        const [, type = "regular", width = 400, height] = line;
        if (type === "image") {
            return sum + (height || Math.floor(width / 1.5)) + 10; // Default aspect ratio
        }
        const fontSize = fontSizes[type] || fontSizes.regular;
        return sum + fontSize + 10; // Add line height (font size + padding)
    }, 0);

    // Calculate starting Y position to center vertically
    let textY = overlayY + (overlayHeight - totalTextHeight) / 2;

    // Reset button areas for the current screen
    game.ui.buttonAreas = [];

    // Render each line
    lines.forEach(([content, type = "regular", param3, param4]) => {
        const fontSize = fontSizes[type] || fontSizes.regular;

        if (type === "button") {
            const buttonWidth = fontSize * 10; // Estimate button width
            const buttonHeight = fontSize + 20;
            const buttonX = (canvas.width - buttonWidth) / 2;
            const buttonY = textY - buttonHeight / 2;

            // Render the button using gameScreenButton
            gameScreenButton(content, buttonX, buttonY, buttonWidth, buttonHeight, defaultColor, "black", param3);
        } else if (type === "image") {
            // Render image using gameScreenImage
            gameScreenImage(content, textY, param3, param4);
        } else {
            // Render regular text
            ctx.font = `${fontSize}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(content, canvas.width / 2, textY);
        }

        // Update textY for the next element
        textY += type === "image" ? (param4 || Math.floor(param3 / 1.5)) + 10 : fontSize + 10;
    });
}

function displayCredits(defaultCreditColor = "white") {
    const { screenVisible, tileSize, gridWidth, gridHeight } = game.settings;
    if (screenVisible != null ) {
        if (game.debug) {
            console.log(`${screenVisible} screen in the way, skipping.`);
        }    
        return;
    }
    game.screenVisible = "credits";
    const overlay = drawModalOverlay(50, 75, tileSize, gridWidth, gridHeight, "black");
    drawModalBorder("*", overlay.overlayStartX, overlay.overlayStartY, overlay.overlayGridWidth, overlay.overlayGridHeight, tileSize);

    const lines = [
        ["assets/img/forest-game-title.svg", "image", 300, 120], // Image with dimensions
        [""],
        ["by", ],
        [""],
        ["== SAME TEAM ==", "subhead"],
        ["Cooperative Game Cooperative"],
        ["M. Cummings • R. Butz", "small"],
        [""],
        ["Licensed under CC-BY 4.0 2024", "small"],
        [""],
        ["Game code repo", "button", "github-link"]
    ];

    gameScreenLines(overlay.pixelY, overlay.pixelHeight, lines, defaultCreditColor);
}


// About screen displayed at the beginning of the game
function displayAbout() {
    if (!canDisplayScreen(SCREENS.ABOUT)) return;

    const { tileSize, gridWidth, gridHeight } = game.settings;
    
    // Clear the canvas
    eraseBoard();
    // Draw a sample game board
    generateGameBoard();
    drawGameBoard();
    
    // Draw the modal overlay (50% width and height, centered)
    const overlay = drawModalOverlay(50, 70, tileSize, gridWidth, gridHeight, "black", 0.6);
    
    // Draw the border around the modal
    drawModalBorder("*", overlay.overlayStartX, overlay.overlayStartY, overlay.overlayGridWidth, overlay.overlayGridHeight, tileSize);
    
    // Define the About screen lines
    const lines = [
        ["assets/img/forest-game-title.svg", "image", 400, 150], // Image with dimensions
        [""],
        ["Eliminate the orcs", "regular"],
        ["by guiding them into trees.", "regular"],
        [""],
        ["Start Game", "button", "start-button"] // Button with className
    ];

    // Render the lines within the modal overlay
    gameScreenLines(overlay.pixelY, overlay.pixelHeight, lines, "white");
}

// Various game over screens displayed at the end of the game.
function displayGameOver(reason, result = 0) {
    if (!canDisplayScreen(SCREENS.GAME_OVER)) return;
    const { tileSize, gridWidth, gridHeight } = game.settings;

    if (game.debug) {
        console.log("Entering displayGameOver");
        console.log("Reason:", reason, "Result:", result);
    }    

    // Draw the modal overlay with transparency (e.g., 0.6 opacity)
    const overlay = drawModalOverlay(50, 50, tileSize, gridWidth, gridHeight, "black", 0.6);

    // Draw the border
    drawModalBorder("*", overlay.overlayStartX, overlay.overlayStartY, overlay.overlayGridWidth, overlay.overlayGridHeight, tileSize);

    // Define the game over lines
    const resultMessage = result === 1 ? "YOU WIN!" : "GAME OVER";
    const lines = [
        [resultMessage, "title" ],
        [reason, "regular"],
        [""],
        ["Play Again", "button", "restart-button"]
    ];

    // Draw the lines
    gameScreenLines(overlay.pixelY, overlay.pixelHeight, lines, "white");
}

function toggleCredits() {
    // Prevent toggling if another screen is visible
    if (game.screenVisible !== SCREENS.NONE && game.screenVisible !== SCREENS.CREDITS) {
        if (game.debug) {
            console.log("Another screen is visible; cannot toggle credits.");
        }    
        return;
    }

    if (game.screenVisible === SCREENS.CREDITS) {
        // Credits screen is currently visible; erase it
        eraseCredits();
        if (game.debug) {
            console.log("Credits screen toggled off.");
        }    
        game.screenVisible = SCREENS.NONE;
        drawGame();
    } else {
        // Credits screen is not visible; display it
        displayCredits("green");
        if (game.debug) {
            console.log("Credits screen toggled on.");
        }
        game.screenVisible = SCREENS.CREDITS;
    }
}

function restartGame() {
    // Clear any lingering button state
    game.ui.buttonCoords = null;
    game.screenVisible = SCREENS.NONE;

    // Reset game state and start the game
    game.gameOver = false;
    game.score = 0;
    game.turns = 0;
    game.paused = false;

    // Generate the game board and entities
    generateGameBoard();
    generateEntities();

    // Reset player position
    game.player = game.getInitialPlayerPosition();

    // Ensure the player's starting position is grass
    game.gameBoard[game.player.y][game.player.x] = "grass";

    // Redraw the entire game
    drawGame();
}

window.onload = init;