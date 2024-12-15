const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const tileSize = 18; // Size of each grid square
const gridWidth = 80; // Number of columns
const gridHeight = 40; // Number of rows
const gameplayGridHeight = gridHeight - 1; // Reserve the first row for game details
let score = 0;

canvas.width = gridWidth * tileSize;
canvas.height = gridHeight * tileSize;

let player = { x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) };

let gameBoard = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => 'grass') // Default to grass
);

let orcs = []; // Array of orc objects, e.g., { x: 5, y: 8 }

let trees = [];
let mountains = [];
let gameOver = false;
const numberOfTrees = 450;
const numberOfOrcs = 20;
const numberOfMountains = 10;
const mountainMaxSize = 28;
const riverWidth = 7;

const orcScore = 10;

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

// things for the start/end screens

let buttonCoords = null;

function setupButtonListener() {
    canvas.addEventListener("click", (event) => {
        if (!buttonCoords) return; // when no button currently displayed

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const { x, y, width, height } = buttonCoords;

        // Check if the click is within the button's bounds
        if (
            mouseX >= x &&
            mouseX <= x + width &&
            mouseY >= y &&
            mouseY <= y + height
        ) {
            restartGame(); // Start or restart the game
            buttonCoords = null; // Clear button coordinates after click
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
}


function init() {
        // Setup button click listener
        setupButtonListener();
    
        // Setup keyboard controls
        setupKeyboardControls();
    
        // Display the About screen
        displayAbout();

        // Focus the canvas to enable keyboard input
        canvas.focus();
}


function drawText(char, x, y, color) {
    ctx.fillStyle = color;
    ctx.font = `${tileSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(char, x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
}

function clearTile(x, y) {
    ctx.fillStyle = "black"; // Black background to obscure the grass
    ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
}

function drawEntity(entityKey, x, y) {
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
    clearTile(player.x, player.y); // Clear background under the player
    drawEntity('player', player.x, player.y);

    // Clear and draw each orc
    orcs.forEach(orc => {
        clearTile(orc.x, orc.y); // Clear background under the orc
        drawEntity('orc', orc.x, orc.y);
    });
}

function addTreesToBoard(treeCount) {
    for (let i = 0; i < treeCount; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * gridWidth);
            y = Math.floor(Math.random() * gridHeight);
        } while (gameBoard[y][x] !== 'grass'); // Only place on grass
        gameBoard[y][x] = 'tree'; // Place a tree
    }
}

// new function to generate the board
function generateGameBoard() {
    // Initialize the board with grass
    for (let y = 1; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // Check if the current tile is on the border
            if (x === 0 || x === gridWidth - 1 || y === 1 || y === gridHeight - 1) {
                gameBoard[y][x] = 'border'; // Place a border
            } else {
                gameBoard[y][x] = 'grass'; // Place grass
            }
        }
    }

    // Add static landscape features
    generateRiver(riverWidth);
    generateMountainBlobs(numberOfMountains, mountainMaxSize);
    addTreesToBoard(numberOfTrees);
}

function generateEntities() {
    // Reset dynamic entities
    orcs = [];
    player = { x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) }; // Center player

    // Generate orcs
    for (let i = 0; i < numberOfOrcs; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * gridWidth);
            y = Math.floor(Math.random() * gridHeight);
        } while (gameBoard[y][x] !== 'grass'); // Ensure orcs spawn on grass
        orcs.push({ x, y });
    }
}

function eraseBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGameBoard() {
    for (let y = 1; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const entityKey = gameBoard[y][x];
            if (entityKey) {
                drawEntity(entityKey, x, y, entityKey.color);
            }
        }
    }
}

function generateRiver(riverWidth) {
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

            if (riverX >= 0 && riverX < gridWidth && riverY >= 0 && riverY < gridHeight && gameBoard[riverY][riverX] === 'grass') {
                gameBoard[riverY][riverX] = 'river'; // Mark as river
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

    console.log(`River generated starting at (${startX}, ${startY}) from ${startEdge}.`);
}

function generateMountainBlobs(numBlobs, maxBlobSize) {
    mountains = []; // Clear existing mountain data

    for (let i = 0; i < numBlobs; i++) {
        // Choose a random seed point for the blob
        const seedX = Math.floor(Math.random() * (gridWidth - 2)) + 1; // Avoid borders
        const seedY = Math.floor(Math.random() * (gridHeight - 2)) + 1;

        if (maxBlobSize === 1) {
            // Place a single mountain tile
            if (gameBoard[seedY][seedX] === 'grass') {
                gameBoard[seedY][seedX] = 'mountain';
                mountains.push({ x: seedX, y: seedY });
            }
        } else {
            // create a set to store blob tiles
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

                // Ensure the new tile is within bounds and not already part of the blob
                if (
                    newX > 0 &&
                    newX < gridWidth - 1 &&
                    newY > 0 &&
                    newY < gridHeight - 1 &&
                    !blobTiles.has(`${newX},${newY}`)
                ) {
                    blobTiles.add(`${newX},${newY}`);
                    expansionCount++;
                }

                // Add blob tiles to the game board
                blobTiles.forEach(tile => {
                    const [x, y] = tile.split(',').map(Number);
                    gameBoard[y][x] = 'mountain'; // Add mountain to gameBoard
                });
            }
        }
    }    
    console.log("Generated mountain blobs:", mountains);
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

function drawPermanentD(x, y) {
    clearTile(x, y); // Clear the tile with a black background
    drawEntity('dead', x, y); // Use the correct entity key
}

function drawGameDetails() {
    // Clear the first row of the grid
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, tileSize);

    // Draw "Orcs left:" and "Score:"
    ctx.fillStyle = "white";
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Display the number of orcs left
    ctx.fillText(`Orcs left: ${orcs.length}`, 10, tileSize / 2);

    // Display the score
    ctx.fillText(`Score: ${score}`, canvas.width - 150, tileSize / 2);
}

function movePlayer(dx, dy) {
    if (gameOver) return;

    const newX = Math.max(0, Math.min(gridWidth - 1, player.x + dx));
    const newY = Math.max(1, Math.min(gridHeight - 1, player.y + dy)); // Start at row 1 (skip game details row)

    // Check collisions with static entities (gameBoard)
    const staticEntityKey = gameBoard[newY][newX];
    const staticEntity = entityTypes[staticEntityKey];

    if (staticEntity) {
        console.log(`Static entity detected: ${staticEntityKey}`, staticEntity);
        if (staticEntity.kills) {
            let deathReason = `You collided with ${staticEntityKey}!`;
            let deathSound = sounds.playerCollision;
            if (staticEntityKey === 'river') {
                deathReason = `You drowned in the river!`;
                deathSound = sounds.playerDrown;
            }

            // Erase the player visually from the board
            clearTile(player.x, player.y);

            collisionEffect(newX, newY, () => {
                deathSound.play();
                displayGameOver(deathReason, 0);
                gameOver = true;
            });
            return; // Stop further movement
        }

        if (!staticEntity.passable) {
            sounds.move.play(); // Play bump sound
            return; // Block movement
        }
    }

    // Check collisions with dynamic entities (orcs)
    const collidedOrc = orcs.find(orc => orc.x === newX && orc.y === newY);
    if (collidedOrc) {
        sounds.playerCollision.play();
        collisionEffect(newX, newY, () => {
            displayGameOver("The orcs caught you!", 0);
            gameOver = true;
        });
        return; // Stop further movement
    }

    // Move player
    player.x = newX;
    player.y = newY;

    // Update game state
    updateGame();
}

function moveOrcs() {
    if (gameOver) return;

    let orcCollidedWithTree = false;
    let orcCaughtPlayer = false;

    orcs = orcs.filter(orc => {
        // Move the orc toward the player
        if (orc.x < player.x) orc.x++;
        else if (orc.x > player.x) orc.x--;

        if (orc.y < player.y) orc.y++;
        else if (orc.y > player.y) orc.y--;

        // Check collisions with static entities
        const staticEntityKey = gameBoard[orc.y][orc.x];
        const staticEntity = entityTypes[staticEntityKey];
        if (staticEntityKey === 'tree') {
            orcCollidedWithTree = true;
            collisionEffect(orc.x, orc.y, () => {}); // Show collision animation
            score += orcScore; // 
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
            displayGameOver("The orcs caught you!", 0);
            gameOver = true;
        });
    }
}

function updateGame() {
    // Move orcs
    moveOrcs();
    
    // Redraw the game board to reflect the current state
    drawGame();

    // Check if the game is won (all orcs eliminated)
    if (orcs.length === 0) {
        displayGameOver("You win! All orcs eliminated!", 1);
        gameOver = true;
        return;
    }

    // Play move sound if no collisions occurred
    if (!gameOver) {
        sounds.move.play();
    }
}

function drawGame() {
    eraseBoard();          // Clear the canvas
    drawGameDetails();     // Draw game details (e.g., score)
    drawGameBoard();       // Draw static entities
    drawDynamicEntities(); // Draw dynamic entities (player, orcs)
}

function restartGame() {
    // Reset game state
    gameOver = false;
    score = 0;

    // Generate the game board and entities
    generateGameBoard(); // Populate the gameBoard array with entities

    // Generate dynamic entities (e.g., orcs, player)
    generateEntities();

    // Reset player position to the center
    player = { x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) };

    // Force the player's starting position to be grass
    gameBoard[player.y][player.x] = 'grass';

    // Redraw the entire game
    drawGame();
}

// START AND END SCREENS

function drawButton(text, x, y, width, height) {
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

    // Store the button's coordinates
    buttonCoords = { x, y, width, height };
}

// About screen displayed at the beginning of the game
function displayAbout() {
    // Clear the canvas
    eraseBoard();
  
    // draw a sample game board
    drawGameBoard(); 

    // Draw the title: "Forest"
    ctx.fillStyle = "white";
    ctx.font = "48px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Forest", canvas.width / 2, canvas.height / 2 - 40);

    // Draw the objective
    ctx.font = "16px monospace";
    ctx.fillText("Eliminate the orcs by guiding them into trees.", canvas.width / 2, canvas.height / 2 + 20);

    // Draw the start button
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = (canvas.width - buttonWidth) / 2;
    const buttonY = canvas.height / 2;

    drawButton("Start Game", buttonX, buttonY, buttonWidth, buttonHeight);
}

// Various game over screens displayed at the end of the game.
function displayGameOver(reason, result = 0) {
  
    let resultMessage = "GAME OVER";
    if( result === 1) {
      resultMessage = "YOU WIN!"
    }

    // Draw "GAME OVER" text
    ctx.fillStyle = "white";
    ctx.font = "48px monospace";
    ctx.textAlign = "center";
    ctx.fillText(resultMessage, canvas.width / 2, canvas.height / 2 - 20);

    // Draw the reason text
    ctx.font = "16px monospace";
    ctx.fillText(reason, canvas.width / 2, canvas.height / 2 + 20);

    // Draw the restart button
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonX = (canvas.width - buttonWidth) / 2;
    const buttonY = canvas.height / 2 + 50;

    drawButton("Play Again", buttonX, buttonY, buttonWidth, buttonHeight);
}


window.onload = init;