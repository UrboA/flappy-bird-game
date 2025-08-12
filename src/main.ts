import 'phaser';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000, x: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    // Add responsive scaling for mobile devices
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    // Ensure audio can work on mobile
    audio: {
        disableWebAudio: false
    }
};

let game: Phaser.Game;
let bird: Phaser.Physics.Arcade.Sprite;
let pipes: Phaser.Physics.Arcade.Group;
let score: number = 0;
let scoreText: Phaser.GameObjects.Text;
let gameOver: boolean = false;
let gameStarted: boolean = false;
let spaceKey: Phaser.Input.Keyboard.Key;
let startText: Phaser.GameObjects.Text;
let gameOverText: Phaser.GameObjects.Text;
let restartText: Phaser.GameObjects.Text;
let audioContext: AudioContext;
let lastPipeTime: number;
let ground: Phaser.Physics.Arcade.StaticBody;
let scoredPairs: Set<number> = new Set();
let background: Phaser.GameObjects.TileSprite;
let existingPairIds: Set<number> = new Set();
let gameOverBackground: Phaser.GameObjects.Rectangle;
let restartBackground: Phaser.GameObjects.Rectangle;
let groundSprite: Phaser.GameObjects.TileSprite;
// Add variables for confetti
let confettiEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
let lastConfettiScore: number = 0;
let explosionEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

// Add a device detection variable
let isMobileDevice: boolean = false;

// Game constants
const PIPE_WIDTH = 80; // Narrower pipes like original flappy bird
const PIPE_HEIGHT = 320; // Height of the pipe segment
const PIPE_GAP = 150; // Reduced from 180 for more challenge
const PIPE_SPAWN_DISTANCE = 300; // Distance between pipe pairs
const PIPE_SPEED = 180; // Increased from 160 for faster pipes
// Adjusted gap position limits to prevent zero-height textures
// Moved MIN_PIPE_Y up to ensure the top pipe always has height
const MIN_PIPE_Y = 150; // Increased from 120 to ensure top pipe has good height 
// Moved MAX_PIPE_Y down to ensure bottom pipe always has height
const MAX_PIPE_Y = 450; // Reduced from 480 to ensure bottom pipe has good height
const BIRD_X = 200; // Fixed horizontal position of bird
const BIRD_START_Y = 300;
const BIRD_FLAP_VELOCITY = -380; // Slightly increased from -350 for better control
const MOBILE_FLAP_VELOCITY = -320; // Reduced from -400, closer to desktop for consistency
const BIRD_GRAVITY = 18; // Increased from 15 for faster falling
const BIRD_MAX_FALL_SPEED = 450; // Increased from 400 for faster max fall speed
const BIRD_HITBOX_SIZE = 28; // Reduced hitbox size for more precise collision detection
const BIRD_VISUAL_SIZE = 35; // Visual size of bird for debugging
const BIRD_HITBOX_HALF = BIRD_HITBOX_SIZE / 2; // Half size for centered calculations
const PIPE_SPAWN_INTERVAL = 1300; // Reduced spawn interval for more continuous pipe generation
const PIPE_COLLISION_BUFFER = 4; // Pixels to expand pipe hitbox for more sensitive collisions

// Ground movement constants
const GROUND_SPEED_RATIO = 0.15; // Ground moves at only 15% of pipe speed
const BACKGROUND_SPEED_RATIO = 0.08; // Background moves at 8% of pipe speed

// Add a variable to track the last gap position
let lastGapY = 300; // Start in the middle

// Add variables for clouds and background birds
let clouds: Phaser.GameObjects.Image[] = [];
let backgroundBirds: Phaser.GameObjects.Sprite[] = [];

// Add a variable for wind trail effect
let windEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
let windUpEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
let windDownEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
let lastWindEmitTime: number = 0;
const WIND_EMIT_INTERVAL = 50; // milliseconds between wind emissions

// Add pause-related variables
let gamePaused: boolean = false;
let pauseButton: Phaser.GameObjects.Container;
let pauseOverlay: Phaser.GameObjects.Container;
let previousPhysicsState: boolean = false; // Store physics state
let previousTimeScale: number = 1; // Store time scale

// Add day-night cycle variables
let timeOfDay: number = 0; // 0 to 1: 0 = noon, 0.5 = midnight, 1 = noon again
let targetTimeOfDay: number = 0; // Target time of day based on score
let dayNightCycleSpeed: number = 0.0025; // How quickly the day/night cycle transitions (reduced for smoother transition)
let sunMoon: Phaser.GameObjects.Container;
let skyOverlay: Phaser.GameObjects.Rectangle;
let stars: Phaser.GameObjects.Particles.ParticleEmitter;
let lastStarTime: number = 0;
const DAY_SKY_COLOR = 0x4DA6FF; // Bright blue
const NIGHT_SKY_COLOR = 0x0A1A2A; // Deep blue
const DUSK_SKY_COLOR = 0xFF7F50; // Orange-ish for sunset/sunrise
const DAY_NIGHT_CYCLE_SCORE = 10; // Score threshold for day/night transition

function playHitSound() {
    // Create audio context if it doesn't exist
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Create a more complex crash sound
    
    // Main impact sound - short burst of noise
    const noiseLength = 0.1; // seconds
    const crashBuffer = audioContext.createBuffer(1, audioContext.sampleRate * noiseLength, audioContext.sampleRate);
    const crashData = crashBuffer.getChannelData(0);
    
    // Fill buffer with random values (white noise) with decreasing amplitude
    for (let i = 0; i < crashData.length; i++) {
        // Decreasing amplitude over time for a crash effect
        const amplitude = 1.0 - (i / crashData.length);
        crashData[i] = (Math.random() * 2 - 1) * amplitude * amplitude;
    }
    
    // Create noise source
    const crashSource = audioContext.createBufferSource();
    crashSource.buffer = crashBuffer;
    
    // Create metal resonance effect with oscillators
    const metalOsc1 = audioContext.createOscillator();
    metalOsc1.frequency.value = 600;
    metalOsc1.type = 'triangle';
    
    const metalOsc2 = audioContext.createOscillator();
    metalOsc2.frequency.value = 450;
    metalOsc2.type = 'triangle';
    
    // Create filter for metallic sound
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 300;
    filter.Q.value = 10;
    
    // Create gain nodes for volume control
    const crashGain = audioContext.createGain();
    crashGain.gain.value = 0.4;
    
    const metalGain1 = audioContext.createGain();
    metalGain1.gain.value = 0.2;
    metalGain1.gain.setValueAtTime(0.2, audioContext.currentTime);
    metalGain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    
    const metalGain2 = audioContext.createGain();
    metalGain2.gain.value = 0.2;
    metalGain2.gain.setValueAtTime(0.2, audioContext.currentTime);
    metalGain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
    
    // Final output gain
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.7;
    
    // Connect nodes
    crashSource.connect(crashGain);
    crashGain.connect(filter);
    filter.connect(masterGain);
    
    metalOsc1.connect(metalGain1);
    metalGain1.connect(masterGain);
    
    metalOsc2.connect(metalGain2);
    metalGain2.connect(masterGain);
    
    masterGain.connect(audioContext.destination);
    
    // Start the sound
    crashSource.start();
    metalOsc1.start();
    metalOsc2.start();
    
    // Stop oscillators after short duration
    metalOsc1.stop(audioContext.currentTime + 0.3);
    metalOsc2.stop(audioContext.currentTime + 0.3);
}

function preload(this: Phaser.Scene) {
    console.log('Preloading assets...');
    this.load.image('background', 'assets/background.svg');
    this.load.image('bird', 'assets/mascot.png');
    this.load.image('pipe', 'assets/newflappybirdpipe.png');
    this.load.image('pixelcloud', 'assets/pixelcloud.webp');
    
    // Create little bird sprites for background
    const birdFrame1 = this.add.graphics();
    birdFrame1.fillStyle(0x333333, 1); // Dark color for silhouette
    // Body
    birdFrame1.fillRect(2, 1, 4, 2);
    // Wings up
    birdFrame1.fillRect(0, 0, 2, 1);
    birdFrame1.fillRect(6, 0, 2, 1);
    birdFrame1.generateTexture('bgBird1', 8, 3);
    birdFrame1.clear();
    
    const birdFrame2 = this.add.graphics();
    birdFrame2.fillStyle(0x333333, 1);
    // Body
    birdFrame2.fillRect(2, 1, 4, 2);
    // Wings down
    birdFrame2.fillRect(1, 2, 2, 1);
    birdFrame2.fillRect(5, 2, 2, 1);
    birdFrame2.generateTexture('bgBird2', 8, 3);
    birdFrame2.clear();
    
    // Create confetti particle
    const confettiParticle = this.add.graphics();
    // Draw different shapes and colors for confetti
    const colors = [0xFF5252, 0x2196F3, 0xFFEB3B, 0x4CAF50, 0xE040FB, 0xFFA726];
    
    // Create square confetti
    confettiParticle.fillStyle(0xFFFFFF, 1);
    confettiParticle.fillRect(0, 0, 8, 8);
    confettiParticle.generateTexture('confetti', 8, 8);
    confettiParticle.clear();
    
    // Create explosion particles
    const explosionParticle = this.add.graphics();
    
    // Create circular particles
    explosionParticle.fillStyle(0xFFFFFF, 1);
    explosionParticle.fillCircle(4, 4, 4);
    explosionParticle.generateTexture('explosion_particle', 8, 8);
    explosionParticle.clear();
    
    // Create a glow effect
    const glowParticle = this.add.graphics();
    glowParticle.fillStyle(0xFFFFFF, 1);
    glowParticle.fillCircle(16, 16, 16);
    glowParticle.generateTexture('glow', 32, 32);
    glowParticle.clear();
    
    // Create wind particle effect
    const windParticle = this.add.graphics();
    
    // Create a wind streak shape
    windParticle.fillStyle(0xFFFFFF, 1); // White base
    
    // Draw an elongated shape for wind streak
    windParticle.beginPath();
    windParticle.moveTo(0, 3);
    windParticle.lineTo(12, 0);
    windParticle.lineTo(12, 6);
    windParticle.lineTo(0, 3);
    windParticle.closePath();
    windParticle.fillPath();
    
    // Generate the wind texture
    windParticle.generateTexture('wind_particle', 12, 6);
    windParticle.clear();
    
    // Create pause button icon
    const pauseButtonGraphics = this.add.graphics();
    
    // Draw pause button background (circle)
    pauseButtonGraphics.fillStyle(0x000000, 0.6); // Semi-transparent black
    pauseButtonGraphics.fillCircle(25, 25, 22);
    pauseButtonGraphics.lineStyle(2, 0xFFFFFF, 1);
    pauseButtonGraphics.strokeCircle(25, 25, 20);
    
    // Draw pause icon (two lines)
    pauseButtonGraphics.fillStyle(0xFFFFFF, 1);
    pauseButtonGraphics.fillRect(17, 15, 6, 20);
    pauseButtonGraphics.fillRect(27, 15, 6, 20);
    
    pauseButtonGraphics.generateTexture('pauseButton', 50, 50);
    pauseButtonGraphics.clear();
    
    // Draw play button for resume
    const playButtonGraphics = this.add.graphics();
    
    // Draw play button background (circle)
    playButtonGraphics.fillStyle(0x000000, 0.6);
    playButtonGraphics.fillCircle(25, 25, 22);
    playButtonGraphics.lineStyle(2, 0xFFFFFF, 1);
    playButtonGraphics.strokeCircle(25, 25, 20);
    
    // Draw play triangle
    playButtonGraphics.fillStyle(0xFFFFFF, 1);
    playButtonGraphics.beginPath();
    playButtonGraphics.moveTo(18, 15);
    playButtonGraphics.lineTo(36, 25);
    playButtonGraphics.lineTo(18, 35);
    playButtonGraphics.closePath();
    playButtonGraphics.fillPath();
    
    playButtonGraphics.generateTexture('playButton', 50, 50);
    playButtonGraphics.clear();
    
    // Create sun graphic
    const sunGraphics = this.add.graphics();
    sunGraphics.fillStyle(0xFFFF00, 1); // Yellow
    sunGraphics.fillCircle(25, 25, 25);
    
    // Add some rays around the sun
    sunGraphics.fillStyle(0xFFFF80, 0.7);
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = 25 + Math.cos(angle) * 30;
        const y = 25 + Math.sin(angle) * 30;
        sunGraphics.fillCircle(x, y, 5);
    }
    
    sunGraphics.generateTexture('sun', 50, 50);
    sunGraphics.clear();
    
    // Create moon graphic
    const moonGraphics = this.add.graphics();
    moonGraphics.fillStyle(0xEEEEFF, 1); // Pale blue-white
    moonGraphics.fillCircle(25, 25, 20);
    
    // Add some craters to the moon
    moonGraphics.fillStyle(0xCCCCDD, 1);
    moonGraphics.fillCircle(15, 20, 5);
    moonGraphics.fillCircle(30, 15, 3);
    moonGraphics.fillCircle(35, 30, 4);
    moonGraphics.fillCircle(20, 35, 3);
    
    moonGraphics.generateTexture('moon', 50, 50);
    moonGraphics.clear();
    
    // Create star particle
    const starParticle = this.add.graphics();
    starParticle.fillStyle(0xFFFFFF, 1);
    starParticle.fillCircle(2, 2, 2);
    starParticle.generateTexture('star', 4, 4);
    starParticle.clear();
}

function create(this: Phaser.Scene) {
    console.log('Creating game objects...');
    
    // Detect mobile device
    isMobileDevice = this.game.device.os.android || 
                    this.game.device.os.iOS || 
                    this.game.device.os.windowsPhone ||
                    (navigator.maxTouchPoints > 1);
    
    console.log('Is mobile device:', isMobileDevice);
    
    // Check if assets are loaded
    if (!this.textures.exists('pipe')) {
        console.error('Pipe texture not found!');
        return;
    }
    
    // Initialize audio context
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create a custom background (blue sky only) instead of using the image
    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(DAY_SKY_COLOR, 1); // Blue sky color
    bgGraphics.fillRect(0, 0, 800, 560); // Fill to exactly where the ground starts
    bgGraphics.generateTexture('customBackground', 800, 560);
    bgGraphics.clear();
    
    // Use our custom background with no light green
    background = this.add.tileSprite(400, 280, 800, 560, 'customBackground');
    background.setDepth(0); // Explicit depth for background (lowest)
    
    // Create sky overlay for transitioning between day and night
    skyOverlay = this.add.rectangle(400, 280, 800, 560, 0x000000, 0);
    skyOverlay.setDepth(1); // Just above background
    
    // Create stars particle emitter (initially not visible)
    stars = this.add.particles(0, 0, 'star', {
        x: { min: 0, max: 800 },
        y: { min: 0, max: 400 },
        lifespan: 20000,
        quantity: 1,
        frequency: -1, // Manual emission
        scale: { start: 0.5, end: 1 },
        alpha: { start: 0, end: 0.8, ease: 'Sine.easeIn' },
        emitting: false
    });
    stars.setDepth(2); // Above sky overlay
    
    // Create sun/moon container
    createCelestialObjects.call(this);
    
    // Add pixel clouds in the background
    createClouds.call(this);
    
    // Add background birds
    createBackgroundBirds.call(this);

    // Create bird at fixed position with appropriate hitbox
    bird = this.physics.add.sprite(BIRD_X, BIRD_START_Y, 'bird');
    bird.setCollideWorldBounds(true);
    bird.setScale(0.1);
    bird.setDepth(20); // Higher depth for bird to appear above clouds and pipes
    
    // Use a slightly smaller hitbox than visual size for more precise collisions
    if (bird.body) {
        bird.body.setSize(BIRD_HITBOX_SIZE, BIRD_HITBOX_SIZE);
        // Center the hitbox on the bird sprite
        bird.body.setOffset((bird.width * 0.1 - BIRD_HITBOX_SIZE) / 2, (bird.height * 0.1 - BIRD_HITBOX_SIZE) / 2);
        bird.body.enable = false; // Disable physics until game starts
    }

    // Disable gravity entirely for the world - we'll handle bird gravity manually
    this.physics.world.gravity.y = 0;

    // Create pipes group with physics configuration
    pipes = this.physics.add.group({
        gravityY: 0 // Ensure zero gravity for pipes
    });

    // Reset scored pairs and pipe tracking
    scoredPairs = new Set();
    existingPairIds = new Set();

    // Create ground with half grass, half dirt split
    const groundGraphics = this.add.graphics();
    
    // Ground is 100px tall total - split it 30/70
    const GROUND_HEIGHT = 100;
    const GRASS_HEIGHT = Math.floor(GROUND_HEIGHT * 0.3); // 30px grass
    const DIRT_HEIGHT = GROUND_HEIGHT - GRASS_HEIGHT;  // 70px dirt
    
    // Fill bottom portion with dirt first (70%)
    groundGraphics.fillStyle(0x8B4513, 1); // Brown soil color
    groundGraphics.fillRect(0, GRASS_HEIGHT, 800, DIRT_HEIGHT);
    
    // Add soil texture (dots) to dirt section
    groundGraphics.fillStyle(0x6B3203, 0.5); // Darker brown
    for (let x = 0; x < 800; x += 8) {
        for (let y = GRASS_HEIGHT + 5; y < GROUND_HEIGHT; y += 8) {
            if (Math.random() > 0.7) {
                const dotSize = 1 + Math.random() * 1.5;
                groundGraphics.fillRect(x, y, dotSize, dotSize);
            }
        }
    }
    
    // Add some larger dirt particles/pebbles scattered in the dirt
    groundGraphics.fillStyle(0x5E2C0D, 0.7); // Darker brown for pebbles
    for (let x = 0; x < 800; x += 20) {
        for (let y = GRASS_HEIGHT + 10; y < GROUND_HEIGHT - 10; y += 15) {
            if (Math.random() > 0.8) {
                const pebbleSize = 2 + Math.random() * 2;
                groundGraphics.fillRect(x, y, pebbleSize, pebbleSize);
            }
        }
    }
    
    // Add deeper soil variation
    groundGraphics.fillStyle(0x794011, 1); // Slightly different brown for depth
    for (let x = 0; x < 800; x += 40) {
        for (let y = GRASS_HEIGHT + 25; y < GROUND_HEIGHT - 10; y += 30) {
            if (Math.random() > 0.6) {
                const variationWidth = 15 + Math.random() * 30;
                const variationHeight = 10 + Math.random() * 15;
                groundGraphics.fillRect(x, y, variationWidth, variationHeight);
            }
        }
    }
    
    // Create a distinct separation line between grass and dirt
    groundGraphics.lineStyle(1, 0x3A2512, 0.6); // Dark line for soil edge
    groundGraphics.moveTo(0, GRASS_HEIGHT);
    groundGraphics.lineTo(800, GRASS_HEIGHT);
    
    // Fill top portion with dense grass base layer (30%)
    groundGraphics.fillStyle(0x254512, 1); // Dark base green
    groundGraphics.fillRect(0, 0, 800, GRASS_HEIGHT);
    
    // Using natural green colors for grass
    const grassColors = [
        0x2A5A16, // Dark forest green
        0x2F5F1A, // Moss green
        0x366E1E, // Forest green
        0x3D7A2C  // Medium-dark green
    ];
    
    // First layer - short grass blades across entire grass section
    for (let x = 0; x < 800; x += 2) { // Closer spacing for denser grass
        const colorIndex = Math.floor(Math.random() * grassColors.length);
        const grassColor = grassColors[colorIndex];
        const height = Math.floor(5 + Math.random() * (GRASS_HEIGHT - 10));
        
        groundGraphics.fillStyle(grassColor, 1);
        
        // Draw grass blade
        const width = 1.5 + Math.random();
        groundGraphics.fillRect(x, 0, width, height);
    }
    
    // Second layer - medium height grass blades
    for (let x = 4; x < 800; x += 5) { 
        if (Math.random() > 0.4) { // 60% chance for medium grass
            const colorIndex = Math.floor(Math.random() * grassColors.length);
            const grassColor = grassColors[colorIndex];
            const height = Math.floor(10 + Math.random() * (GRASS_HEIGHT - 12));
            
            groundGraphics.fillStyle(grassColor, 1);
            
            // Draw a slightly curved grass blade
            const width = 1 + Math.random();
            const xOffset = (Math.random() - 0.5) * 2;
            groundGraphics.beginPath();
            groundGraphics.moveTo(x, 0);
            groundGraphics.lineTo(x + width, 0);
            groundGraphics.lineTo(x + width + xOffset, height);
            groundGraphics.lineTo(x + xOffset, height);
            groundGraphics.closePath();
            groundGraphics.fillPath();
        }
    }
    
    // Third layer - tall grass blades up to full grass height
    for (let x = 3; x < 800; x += 8) {
        if (Math.random() > 0.65) { // 35% chance for tall grass
            const colorIndex = Math.floor(Math.random() * grassColors.length);
            const grassColor = grassColors[colorIndex];
            const height = Math.floor(GRASS_HEIGHT * (0.75 + Math.random() * 0.25)); // 75-100% of grass height
            
            const lighterColor = grassColors[Math.min(colorIndex + 1, grassColors.length - 1)];
            groundGraphics.fillStyle(lighterColor, 1);
            
            // Draw a tall, slightly curved grass blade
            const width = 1.5 + Math.random() * 0.5;
            const curve = (Math.random() - 0.5) * 3;
            groundGraphics.beginPath();
            groundGraphics.moveTo(x, 0);
            groundGraphics.lineTo(x + width, 0);
            groundGraphics.lineTo(x + width + curve, height);
            groundGraphics.lineTo(x + curve, height);
            groundGraphics.closePath();
            groundGraphics.fillPath();
        }
    }
    
    // Add some grass highlights
    groundGraphics.fillStyle(0x3E8024, 0.7); // Slightly lighter green for highlights
    for (let x = 0; x < 800; x += 15) {
        if (Math.random() > 0.7) {
            const height = 3 + Math.random() * 2;
            const width = 1 + Math.random() * 0.5;
            groundGraphics.fillRect(x, 0, width, height);
        }
    }
    
    // Add some roots transitioning from grass to dirt
    groundGraphics.fillStyle(0x3A2512, 0.7); // Dark brown for roots
    for (let x = 5; x < 800; x += 25) {
        if (Math.random() > 0.7) {
            const rootWidth = 1 + Math.random() * 0.5;
            const rootLength = 5 + Math.random() * 7;
            groundGraphics.fillRect(x, GRASS_HEIGHT, rootWidth, rootLength);
        }
    }
    
    // Generate the ground texture
    groundGraphics.generateTexture('groundTexture', 800, GROUND_HEIGHT);
    groundGraphics.clear();
    
    // Position ground sprite to align exactly with background bottom
    groundSprite = this.add.tileSprite(400, 560, 800, GROUND_HEIGHT, 'groundTexture');
    groundSprite.setDepth(15); // Higher depth than pipes (10) but lower than bird (20)
    
    // Calculate the exact position of the grass top for collision detection
    // The ground is positioned at y=560 (center), with height 100px
    // So the top of the ground is at 560 - 100/2 = 510
    const grassTopY = 510;
    
    // Set collision boundary exactly at the grass level
    const groundRect = this.add.rectangle(400, grassTopY, 800, 2, 0x000000, 0);
    this.physics.add.existing(groundRect, true);
    ground = groundRect.body as Phaser.Physics.Arcade.StaticBody;
    this.physics.add.collider(bird, ground, gameOverHandler, undefined, this);
    
    // Store the grass top Y position for manual collision checks
    this.registry.set('grassTopY', grassTopY);
    
    // Score text
    scoreText = this.add.text(400, 50, 'Score: 0', {
        fontSize: '32px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 6,
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }
    }).setOrigin(0.5);
    scoreText.setVisible(false);
    scoreText.setDepth(1000); // Ensure text appears above everything

    // Start screen text
    startText = this.add.text(400, 250, 'Click or Press Space\nto Start', {
        fontSize: '32px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }
    }).setOrigin(0.5);
    startText.setDepth(1000); // Ensure text appears above everything

    // Game over text with text box background
    gameOverBackground = this.add.rectangle(400, 250, 400, 120, 0x000000, 0.7);
    gameOverBackground.setVisible(false);
    gameOverBackground.setDepth(1000);
    
    gameOverText = this.add.text(400, 250, 'Game Over!', {
        fontSize: '48px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }
    }).setOrigin(0.5);
    gameOverText.setVisible(false);
    gameOverText.setDepth(1001); // Higher than background

    // Restart text
    restartBackground = this.add.rectangle(400, 350, 400, 100, 0x000000, 0.7);
    restartBackground.setVisible(false);
    restartBackground.setDepth(1000);
    
    restartText = this.add.text(400, 350, 'Click or Press Space\nto Restart', {
        fontSize: '32px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }
    }).setOrigin(0.5);
    restartText.setVisible(false);
    restartText.setDepth(1001); // Higher than background

    // Input handling
    this.input.on('pointerdown', startOrFlap, this);
    // Add specific touch handling for mobile
    this.input.addPointer(3); // Support multi-touch
    this.input.on('gameobjectdown', startOrFlap, this);
    // Add handling for screen taps anywhere
    this.input.on('pointerup', function(this: Phaser.Scene) {
        // Prevent default behavior to avoid browser UI showing on mobile
        if (this.game.device.os.iOS || this.game.device.os.android) {
            this.game.input.enabled = true;
        }
    }, this);
    if (this.input.keyboard) {
        spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.on('down', startOrFlap, this);
    }

    // Initialize confetti emitter
    confettiEmitter = this.add.particles(0, 0, 'confetti', {
        x: 0,
        y: 0,
        lifespan: 2000,
        speed: { min: 100, max: 200 },
        angle: { min: 0, max: 360 },
        gravityY: 300,
        scale: { start: 1, end: 0 },
        quantity: 1,
        blendMode: 'ADD',
        emitting: false,
        tint: [0xFF5252, 0x2196F3, 0xFFEB3B, 0x4CAF50, 0xE040FB, 0xFFA726]
    });
    confettiEmitter.setDepth(100); // Above most elements but below UI
    
    // Initialize explosion emitter
    explosionEmitter = this.add.particles(0, 0, 'explosion_particle', {
        lifespan: 800,
        speed: { min: 100, max: 300 },
        angle: { min: 0, max: 360 },
        gravityY: 300,
        scale: { start: 1.5, end: 0 },
        quantity: 1,
        blendMode: 'ADD',
        emitting: false,
        tint: [0xFF9F43, 0xEE5A24, 0xFA8231, 0xFC427B, 0xA3CB38],
        rotate: { min: 0, max: 360 }
    });
    explosionEmitter.setDepth(25); // Just above the bird

    // Initialize wind trail emitters with different configurations
    
    // Wind emitter for flapping upward
    windUpEmitter = this.add.particles(0, 0, 'wind_particle', {
        x: 0,
        y: 0,
        lifespan: { min: 300, max: 500 },
        speed: { min: 50, max: 100 },
        angle: { min: 150, max: 210 }, // Emit roughly to the left
        scale: { start: 1.0, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: [0xFFFFFF, 0xE0E0FF, 0xADD8E6], // White/light blue tints
        frequency: -1, // Manual emission
        blendMode: 'ADD',
        gravityY: -10 // Slight upward drift
    });
    windUpEmitter.setDepth(19); // Just behind the bird
    
    // Wind emitter for falling downward
    windDownEmitter = this.add.particles(0, 0, 'wind_particle', {
        x: 0,
        y: 0,
        lifespan: { min: 200, max: 400 },
        speed: { min: 30, max: 60 },
        angle: { min: 160, max: 200 }, // Emit roughly to the left
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.4, end: 0 },
        tint: [0xFFFFFF, 0xE0E0FF], 
        frequency: -1, // Manual emission
        blendMode: 'ADD',
        gravityY: 0 // No vertical drift
    });
    windDownEmitter.setDepth(19); // Just behind the bird
    
    // General wind burst emitter for flap action
    windEmitter = this.add.particles(0, 0, 'wind_particle', {
        x: 0,
        y: 0,
        lifespan: { min: 300, max: 600 },
        speed: { min: 60, max: 120 },
        angle: { min: 140, max: 220 }, // Wider angle for burst
        scale: { start: 1.2, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint: [0xFFFFFF, 0xE0E0FF, 0xADD8E6], // White/light blue tints
        frequency: -1, // Manual emission
        blendMode: 'ADD',
        gravityY: -15 // More upward drift for dramatic effect
    });
    windEmitter.setDepth(19); // Just behind the bird

    // After initializing all UI elements, create the pause button
    createPauseButton.call(this);
    
    // Create pause overlay (initially hidden)
    createPauseOverlay.call(this);
}

function createCelestialObjects(this: Phaser.Scene) {
    // Create container for sun/moon
    sunMoon = this.add.container(400, 500);
    
    // Create sun and moon objects (we'll toggle visibility based on time)
    const sun = this.add.image(0, 0, 'sun');
    const moon = this.add.image(0, 0, 'moon');
    
    // Initially show sun, hide moon
    moon.setVisible(false);
    
    // Add to container
    sunMoon.add([sun, moon]);
    sunMoon.setDepth(2); // Above sky but below clouds
    
    // Initial position
    updateTimeOfDay.call(this, 0);
}

function updateTimeOfDay(this: Phaser.Scene, forcedTime: number | null = null) {
    // If a specific time is forced, use it, otherwise just use current
    if (forcedTime !== null) {
        timeOfDay = forcedTime;
    }
    
    // Calculate target time of day based on score
    // Make the transition span more of the score range for smoother progression
    const cyclePosition = Math.floor(score / DAY_NIGHT_CYCLE_SCORE);
    const cycleProgress = (score % DAY_NIGHT_CYCLE_SCORE) / DAY_NIGHT_CYCLE_SCORE;
    
    // Instead of jumping directly to 0.0 or 0.5, calculate a smooth progression
    if (cyclePosition % 2 === 0) {
        // Day to night transition
        // First 25% = full day (0.0)
        // Next 50% = sunset transition (0.0 to 0.5)
        // Last 25% = full night (0.5)
        if (cycleProgress < 0.25) {
            targetTimeOfDay = 0.0; // Full day
        } else if (cycleProgress < 0.75) {
            // Smooth transition from day to night (map 0.25-0.75 to 0.0-0.5)
            targetTimeOfDay = ((cycleProgress - 0.25) / 0.5) * 0.5;
        } else {
            targetTimeOfDay = 0.5; // Full night
        }
    } else {
        // Night to day transition
        // First 25% = full night (0.5)
        // Next 50% = sunrise transition (0.5 to 1.0)
        // Last 25% = full day (0.0/1.0)
        if (cycleProgress < 0.25) {
            targetTimeOfDay = 0.5; // Full night
        } else if (cycleProgress < 0.75) {
            // Smooth transition from night to day (map 0.25-0.75 to 0.5-1.0)
            targetTimeOfDay = 0.5 + ((cycleProgress - 0.25) / 0.5) * 0.5;
        } else {
            targetTimeOfDay = 0.0; // Back to full day (equivalent to 1.0)
        }
    }
    
    // Gradually transition to target time of day with easing for smoother feel
    if (timeOfDay !== targetTimeOfDay) {
        // Calculate the distance to the target
        const distance = targetTimeOfDay - timeOfDay;
        
        // Apply easing - move faster in the middle of the transition, slower at endpoints
        const easingFactor = Math.abs(distance) < 0.1 ? 0.5 : 
                             Math.abs(distance) > 0.4 ? 0.5 : 1.0;
        
        // Apply the movement with easing
        if (Math.abs(distance) < dayNightCycleSpeed) {
            timeOfDay = targetTimeOfDay;
        } else if (distance > 0) {
            timeOfDay += dayNightCycleSpeed * easingFactor;
        } else {
            timeOfDay -= dayNightCycleSpeed * easingFactor;
        }
        
        // Handle wrapping around (0.99 to 0.01 should be a small step, not a big one)
        if (targetTimeOfDay === 0 && timeOfDay > 0.9) {
            timeOfDay = 0;
        }
        if (targetTimeOfDay === 1 && timeOfDay < 0.1) {
            timeOfDay = 1;
        }
    }
    
    // Clamp timeOfDay to valid range with wrapping
    if (timeOfDay > 1) timeOfDay = timeOfDay - 1;
    if (timeOfDay < 0) timeOfDay = timeOfDay + 1;
    
    // Calculate sun/moon position along an arc
    // We use a half circle for the path:
    // - At timeOfDay = 0 (noon): sun at bottom of arc (visible)
    // - At timeOfDay = 0.5 (midnight): moon at bottom of arc (visible)
    // - Arc spans from -PI to 0 (top half of circle)
    
    // Determine if it's day or night time
    const isNight = timeOfDay >= 0.25 && timeOfDay < 0.75;
    
    // Get day/night-normalized time (0-1 within each half)
    const normalizedTime = isNight ? 
        (timeOfDay - 0.25) * 2 : // Night: 0.25-0.75 -> 0-1
        timeOfDay < 0.25 ? 
            (timeOfDay + 0.25) * 2 : // Morning: 0-0.25 -> 0.5-1
            (timeOfDay - 0.75) * 2;  // Evening: 0.75-1 -> 0-0.5
    
    // Angle along the arc: PI to 0
    const angle = Math.PI - normalizedTime * Math.PI;
    
    // Calculate position (center is at x=400, y=650, radius=450)
    const centerX = 400;
    const centerY = 650;
    const radius = 450;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    // Update sun/moon position
    sunMoon.setPosition(x, y);
    
    // Get the sun and moon objects
    const sun = sunMoon.getAt(0) as Phaser.GameObjects.Image;
    const moon = sunMoon.getAt(1) as Phaser.GameObjects.Image;
    
    // Gradually fade between sun and moon rather than toggling
    const sunAlpha = timeOfDay >= 0.5 ? 
        Math.max(0, 1 - (timeOfDay - 0.5) * 5) : // Fade out sun as night approaches
        timeOfDay < 0.2 ? 1 : Math.max(0, 1 - ((timeOfDay - 0.2) * 5)); // Full brightness until 0.2, then fade
        
    const moonAlpha = timeOfDay >= 0.7 ? 
        Math.max(0, 1 - ((timeOfDay - 0.7) * 5)) : // Fade out moon as day approaches
        timeOfDay >= 0.3 && timeOfDay < 0.5 ? 
        Math.min(1, (timeOfDay - 0.3) * 5) : // Fade in moon as night approaches
        timeOfDay >= 0.5 ? 1 : 0; // Full brightness during night
    
    // Set visibility and alpha for smoother transitions
    sun.setVisible(sunAlpha > 0);
    moon.setVisible(moonAlpha > 0);
    sun.setAlpha(sunAlpha);
    moon.setAlpha(moonAlpha);
    
    // Adjust size based on height (smaller at horizon, larger at zenith)
    const distanceFromHorizon = (y - centerY) / radius;
    const scaleFactor = 0.8 + 0.4 * Math.abs(distanceFromHorizon);
    sun.setScale(scaleFactor);
    moon.setScale(scaleFactor * 0.8); // Moon slightly smaller
    
    // Calculate sky color based on time of day with more gradual transitions
    let skyColor: number;
    let skyAlpha: number;
    
    if (timeOfDay < 0.2) { // Morning - longer day period
        // Lerp from orange to blue (sunrise)
        const t = timeOfDay / 0.2;
        skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color().setTo(255, 127, 80), // Orange-ish
            new Phaser.Display.Color().setTo(77, 166, 255), // Blue
            100,
            Math.min(100, t * 100)
        ).color;
        skyAlpha = 0;
    } else if (timeOfDay < 0.3) { // Day
        skyColor = DAY_SKY_COLOR;
        skyAlpha = 0;
    } else if (timeOfDay < 0.4) { // Late afternoon to sunset - more gradual transition
        // Lerp from blue to orange (sunset beginning)
        const t = (timeOfDay - 0.3) / 0.1;
        skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color().setTo(77, 166, 255), // Blue
            new Phaser.Display.Color().setTo(255, 127, 80), // Orange-ish
            100,
            Math.min(100, t * 100)
        ).color;
        skyAlpha = t * 0.2; // Starting to darken
    } else if (timeOfDay < 0.45) { // Sunset - more gradual
        // Lerp from orange to dark blue (sunset to night)
        const t = (timeOfDay - 0.4) / 0.05;
        skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color().setTo(255, 127, 80), // Orange-ish
            new Phaser.Display.Color().setTo(10, 26, 42), // Dark blue
            100,
            Math.min(100, t * 100)
        ).color;
        skyAlpha = 0.2 + t * 0.4; // Continue darkening
    } else if (timeOfDay < 0.55) { // Full night
        skyColor = NIGHT_SKY_COLOR;
        skyAlpha = 0.6;
    } else if (timeOfDay < 0.65) { // Late night
        skyColor = NIGHT_SKY_COLOR;
        skyAlpha = 0.6;
    } else if (timeOfDay < 0.7) { // Night to dawn - more gradual
        // Lerp from dark blue to orange (dawn beginning)
        const t = (timeOfDay - 0.65) / 0.05;
        skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color().setTo(10, 26, 42), // Dark blue
            new Phaser.Display.Color().setTo(255, 127, 80), // Orange-ish
            100,
            Math.min(100, t * 100)
        ).color;
        skyAlpha = 0.6 - t * 0.4; // Starting to lighten
    } else if (timeOfDay < 0.8) { // Dawn - more gradual
        // Lerp from orange to blue (sunrise)
        const t = (timeOfDay - 0.7) / 0.1;
        skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color().setTo(255, 127, 80), // Orange-ish
            new Phaser.Display.Color().setTo(77, 166, 255), // Blue
            100,
            Math.min(100, t * 100)
        ).color;
        skyAlpha = 0.2 - t * 0.2; // Continue lightening
    } else { // Late morning
        skyColor = DAY_SKY_COLOR;
        skyAlpha = 0;
    }
    
    // Apply sky color and darkness
    skyOverlay.setFillStyle(skyColor, skyAlpha);
    
    // Gradually add more stars as night deepens
    const fullNightProgress = timeOfDay > 0.5 ? 
        Math.min(1, Math.max(0, 1 - ((timeOfDay - 0.5) / 0.15))) : // Fade out after peak night
        Math.min(1, Math.max(0, (timeOfDay - 0.35) / 0.15)); // Fade in as night approaches
        
    // Only add stars during deeper night, gradually increasing frequency
    if (isNight && fullNightProgress > 0.3 && this.time.now > lastStarTime + (1000 / Math.max(0.3, fullNightProgress))) {
        // Stars visible at night - add stars according to how deep into night we are
        const maxStars = Math.floor(3 * fullNightProgress);
        const numStars = maxStars > 0 ? Math.floor(Math.random() * maxStars) + 1 : 0;
        
        if (numStars > 0) {
            stars.explode(numStars);
            lastStarTime = this.time.now;
        }
    }
    
    // Fade existing stars based on time of day for smooth transitions
    const starVisibility = fullNightProgress;
    if (starVisibility < 1) {
        stars.forEachAlive((star: Phaser.GameObjects.Particles.Particle) => {
            star.alpha = star.alpha * starVisibility;
            if (starVisibility < 0.1) star.alpha = 0; // Fade out completely at transitions
        }, this);
    }
}

function createClouds(this: Phaser.Scene) {
    // Clear any existing clouds
    clouds.forEach(cloud => cloud.destroy());
    clouds = [];
    
    // Create fewer clouds at the top of the screen only
    const numClouds = 3; // Reduced from 6 to 3
    for (let i = 0; i < numClouds; i++) {
        const x = Math.random() * 800;
        const y = 30 + Math.random() * 70; // Position only at the top (y range 30-100)
        const scale = 0.4 + Math.random() * 0.3; // Slightly smaller scale range
        
        const cloud = this.add.image(x, y, 'pixelcloud');
        cloud.setScale(scale);
        cloud.setAlpha(0.7); // Slightly more transparent
        cloud.setDepth(1); // Just above background, but behind everything else
        
        // Set very slow speed data for each cloud
        cloud.setData('speed', 0.01 + Math.random() * 0.02); // Very slow speed between 0.01 and 0.03
        
        clouds.push(cloud);
    }
}

function createBackgroundBirds(this: Phaser.Scene) {
    // Clear any existing birds
    backgroundBirds.forEach(bird => bird.destroy());
    backgroundBirds = [];
    
    // Create animation for background birds if it doesn't exist
    if (!this.anims.exists('bgBirdFly')) {
        this.anims.create({
            key: 'bgBirdFly',
            frames: [
                { key: 'bgBird1', duration: 300 }, // Slower wing flapping
                { key: 'bgBird2', duration: 300 }  // Slower wing flapping
            ],
            repeat: -1
        });
    }
    
    // Create a few birds at different heights
    const numBirds = 4;
    for (let i = 0; i < numBirds; i++) {
        // Random starting position
        const x = Math.random() * 800;
        // Position birds at different heights but not at the very top (clouds zone)
        const y = 120 + Math.random() * 300;
        const scale = 1.0 + Math.random() * 1.5; // Random size for depth effect
        
        const bird = this.add.sprite(x, y, 'bgBird1');
        bird.setScale(scale);
        
        // Make birds farther away (higher up) slightly more transparent
        const alpha = 0.6 + 0.3 * ((420 - y) / 300); // Birds higher up are more transparent
        bird.setAlpha(alpha);
        
        // Background birds should be behind pipes but above clouds
        bird.setDepth(3);
        
        // Much slower speed - birds higher up (background) move slower
        const speedFactor = 0.4 + 0.6 * ((420 - y) / 300); // Slower at top, faster at bottom
        bird.setData('speed', 0.02 + 0.03 * speedFactor); // Reduced to 20% of original speed
        
        // Random up/down movement pattern - much gentler and slower
        const waveAmplitude = 3 + Math.random() * 8; // Reduced amplitude
        const waveFrequency = 0.0003 + Math.random() * 0.0006; // 30% of original frequency
        bird.setData('wave', {
            originalY: y,
            amplitude: waveAmplitude,
            frequency: waveFrequency,
            offset: Math.random() * Math.PI * 2 // Random phase offset
        });
        
        // Play animation
        bird.play('bgBirdFly');
        
        backgroundBirds.push(bird);
    }
}

function update(this: Phaser.Scene) {
    if (!gameStarted || gameOver || gamePaused) return; // Don't update if game is paused
    
    // Update time of day - now based on score, not real time
    updateTimeOfDay.call(this);
    
    // Apply gravity to the bird manually
    if (bird.body && bird.body.enable) {
        bird.body.velocity.y += BIRD_GRAVITY;
        
        // Cap maximum falling speed
        if (bird.body.velocity.y > BIRD_MAX_FALL_SPEED) {
            bird.body.velocity.y = BIRD_MAX_FALL_SPEED;
        }

        // Get the stored grass top Y position
        const grassTopY = this.registry.get('grassTopY');
        
        // More sensitive check for grass collision - subtract 2 pixels to make it even more sensitive
        // Bird hitbox bottom = bird.y + BIRD_HITBOX_HALF
        if (bird.y + BIRD_HITBOX_HALF > grassTopY - 2) {
            console.log('Bird touched grass at y=' + (grassTopY - 2));
            gameOverHandler.call(this);
            return;
        }
    }

    // Calculate movement per frame based on time delta for consistent movement regardless of frame rate
    const deltaFactor = this.game.loop.delta / (1000 / 60); // Normalize to 60fps
    const pipeMove = PIPE_SPEED * deltaFactor;
    const backgroundMove = pipeMove * BACKGROUND_SPEED_RATIO; // Background moves very slowly

    // Scroll background to create illusion of movement (slowest)
    background.tilePositionX += backgroundMove;
    
    // Update cloud positions
    updateClouds(pipeMove);
    
    // Update background birds
    updateBackgroundBirds(this.time.now, pipeMove);
    
    // Make ground move at an even slower speed
    // Reduced from 0.02 to 0.01 (half as fast)
    groundSprite.tilePositionX += pipeMove * 0.01;

    // Rotate bird based on velocity
    if (bird.body) {
        const velocityRotation = Phaser.Math.Clamp(bird.body.velocity.y * 0.1, -20, 20);
        bird.angle = velocityRotation;
    }

    // Find the rightmost pipe to decide if we need to spawn more
    let rightmostPipeX = 0;
    pipes.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
        const pipe = child as Phaser.Physics.Arcade.Image;
        rightmostPipeX = Math.max(rightmostPipeX, pipe.x);
    });

    // Spawn new pipes when the rightmost pipe is far enough to the left
    // or use time-based spawning if no pipes exist yet
    const noActivePipes = rightmostPipeX === 0;
    const timeSinceLastPipe = this.time.now - (lastPipeTime || 0);
    const enoughTimePassed = timeSinceLastPipe > PIPE_SPAWN_INTERVAL;
    const pipesFarEnough = rightmostPipeX < 800 - PIPE_SPAWN_DISTANCE;
    
    if ((noActivePipes && enoughTimePassed) || (!noActivePipes && pipesFarEnough)) {
        generatePipe.call(this);
        lastPipeTime = this.time.now;
    }

    // Update pipe positions and check for collisions with higher sensitivity
    let pipesToRemove: Phaser.Physics.Arcade.Image[] = [];
    
    pipes.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
        const pipe = child as Phaser.Physics.Arcade.Image;
        
        // Force horizontal movement only
        pipe.setVelocityX(-PIPE_SPEED);
        pipe.setVelocityY(0);
        
        // Keep at correct Y position
        const originalY = pipe.getData('originalY');
        if (originalY !== undefined) {
            pipe.y = originalY;
        }
        
        // Check if pipe is off screen
        if (pipe.x < -PIPE_WIDTH) {
            pipesToRemove.push(pipe);
            return; // Skip further checks for off-screen pipes
        }
        
        // Enhanced collision detection with increased sensitivity
        const birdRect = new Phaser.Geom.Rectangle(
            bird.x - BIRD_HITBOX_HALF + 2, // Slightly smaller bird hitbox for more precise collisions
            bird.y - BIRD_HITBOX_HALF + 2, // Add small offset to make the hitbox more centered on the visible bird
            BIRD_HITBOX_SIZE - 4,  // Smaller hitbox for more accurate collisions
            BIRD_HITBOX_SIZE - 4
        );
        
        // Get pipe bounds and expand them slightly for more sensitive collision
        const pipeBounds = pipe.getBounds();
        // Expand pipe bounds for more sensitive detection
        const expandedPipeBounds = new Phaser.Geom.Rectangle(
            pipeBounds.x - PIPE_COLLISION_BUFFER, 
            pipeBounds.y - PIPE_COLLISION_BUFFER, 
            pipeBounds.width + (PIPE_COLLISION_BUFFER * 2), 
            pipeBounds.height + (PIPE_COLLISION_BUFFER * 2)
        );
        
        // Check collision using more sensitive detection with expanded pipe bounds
        if (Phaser.Geom.Intersects.RectangleToRectangle(birdRect, expandedPipeBounds)) {
            console.log('Collision detected at coordinates:', 
                        'Bird:[' + bird.x + ',' + bird.y + ']', 
                        'Pipe:[' + pipe.x + ',' + pipe.y + ']');
            gameOverHandler.call(this);
            return;
        }
        
        // Check for scoring
        const pairId = pipe.getData('pairId');
        if (!scoredPairs.has(pairId) && pipe.x < BIRD_X && pipe.getData('isBottomPipe')) {
            scoredPairs.add(pairId);
            score++;
            scoreText.setText('Score: ' + score);
            
            // Celebrate with confetti when score is divisible by 5
            if (score > 0 && score % 5 === 0 && score !== lastConfettiScore) {
                celebrateWithConfetti.call(this);
                lastConfettiScore = score;
            }
        }
    });
    
    // Remove off-screen pipes
    pipesToRemove.forEach(pipe => {
        pipe.destroy();
    });

    // Add continuous subtle wind trail behind bird when in motion
    if (bird.body && bird.body.velocity.y !== 0 && this.time.now > lastWindEmitTime + WIND_EMIT_INTERVAL) {
        // Position slightly behind the bird
        const trailX = bird.x - 10; 
        const trailY = bird.y + 2;
        
        // Adjust particle count based on bird velocity
        const velocityFactor = Math.min(Math.abs(bird.body.velocity.y) / 300, 1);
        const particleCount = Math.floor(3 + velocityFactor * 3); // 3-6 particles based on speed
        
        // Different emitters based on if bird is going up or down
        if (bird.body.velocity.y < 0) {
            // Going up - use the stronger upward emitter
            windUpEmitter.explode(particleCount, trailX, trailY);
        } else {
            // Going down - use the subtler downward emitter
            windDownEmitter.explode(particleCount, trailX, trailY);
        }
        
        lastWindEmitTime = this.time.now;
    }
}

function updateClouds(pipeMove: number) {
    clouds.forEach(cloud => {
        // Move cloud horizontally at a much slower rate
        cloud.x -= pipeMove * cloud.getData('speed') * 0.5; // Additional 50% speed reduction
        
        // If cloud moves off-screen, wrap it around to the right but keep at top
        if (cloud.x < -cloud.width/2) {
            cloud.x = 800 + cloud.width/2;
            cloud.y = 30 + Math.random() * 70; // Keep at top when wrapping around
        }
    });
}

function updateBackgroundBirds(time: number, pipeMove: number) {
    backgroundBirds.forEach(bird => {
        // Move bird horizontally based on its speed (with additional 50% slowdown)
        bird.x += pipeMove * bird.getData('speed') * 0.5; // Extra slowdown factor
        
        // Apply wave pattern to y position for realistic flight
        const wave = bird.getData('wave');
        if (wave) {
            bird.y = wave.originalY + Math.sin(time * wave.frequency + wave.offset) * wave.amplitude;
        }
        
        // If bird moves off the right edge, wrap around to the left
        if (bird.x > 800 + bird.width/2) {
            bird.x = -bird.width/2;
            
            // Randomize height when wrapping
            const newY = 120 + Math.random() * 300;
            bird.setData('wave', {
                originalY: newY,
                amplitude: bird.getData('wave').amplitude,
                frequency: bird.getData('wave').frequency,
                offset: Math.random() * Math.PI * 2
            });
            bird.y = newY;
        }
    });
}

function startOrFlap(this: Phaser.Scene) {
    if (!gameStarted) {
        startGame.call(this);
        return;
    }
    if (gameOver) {
        restartGame.call(this);
        return;
    }
    flap.call(this);
}

function startGame(this: Phaser.Scene) {
    console.log('Starting game');
    gameStarted = true;
    gamePaused = false; // Ensure game starts unpaused
    startText.setVisible(false);
    scoreText.setVisible(true);
    pauseButton.setVisible(true); // Show pause button when game starts
    lastPipeTime = this.time.now;
    
    // Enable physics for the bird
    if (bird.body) {
        bird.body.enable = true;
    }
    
    // Initialize audio context on user interaction (important for iOS)
    if (!audioContext || audioContext.state === 'suspended') {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        } catch (e) {
            console.error('Audio context could not be created or resumed:', e);
        }
    }
    
    // Clear any existing pipes and generate the first one
    clearAllPipes();
    generatePipe.call(this);
}

function flap(this: Phaser.Scene) {
    // Use consistent velocity for all devices to ensure uniform experience
    bird.setVelocityY(BIRD_FLAP_VELOCITY);
    
    // Create a burst of wind particles when flapping
    createWindBurst.call(this);
}

function gameOverHandler(this: Phaser.Scene) {
    if (gameOver) return;
    
    gameOver = true;
    this.physics.pause();
    
    // Hide pause button when game is over
    pauseButton.setVisible(false);
    
    // Create explosion effect at bird position
    createExplosionEffect.call(this);
    
    playHitSound();

    // Show game over UI elements
    gameOverBackground.setVisible(true);
    restartBackground.setVisible(true);
    
    gameOverText.setVisible(true);
    gameOverText.setText(`Game Over!\nScore: ${score}`);
    
    restartText.setVisible(true);
    scoreText.setVisible(false);
}

function restartGame(this: Phaser.Scene) {
    // Reset game state
    gameOver = false;
    gameStarted = false;
    gamePaused = false; // Ensure game restarts unpaused
    score = 0;
    
    // Reset day/night cycle
    timeOfDay = 0;
    targetTimeOfDay = 0;
    updateTimeOfDay.call(this, 0);
    
    // Clear any existing stars
    stars.forEachAlive((star: Phaser.GameObjects.Particles.Particle) => {
        star.kill();
    }, this);
    
    // Make sure pause overlay is hidden
    pauseOverlay.setVisible(false);
    pauseButton.setVisible(false); // Hide pause button until game starts again
    
    // Reset bird position and physics
    bird.setPosition(BIRD_X, BIRD_START_Y);
    bird.setVelocity(0, 0);
    bird.setAngle(0);
    bird.setVisible(true); // Make sure bird is visible again
    if (bird.body) {
        bird.body.enable = false; // Disable physics until game starts
    }

    // Hide game over UI elements
    gameOverBackground.setVisible(false);
    restartBackground.setVisible(false);
    
    gameOverText.setVisible(false);
    restartText.setVisible(false);
    startText.setVisible(true);
    scoreText.setText('Score: 0');
    scoreText.setVisible(false);

    // Clear all existing pipes
    clearAllPipes();
    
    // Reset cloud positions
    createClouds.call(this);
    
    // Reset background birds
    createBackgroundBirds.call(this);

    // Reset confetti tracker
    lastConfettiScore = 0;

    // Resume physics in case it was paused
    this.physics.world.resume();
    this.time.timeScale = 1;
}

function clearAllPipes() {
    pipes.clear(true, true);
    existingPairIds.clear();
    scoredPairs.clear();
}

function generatePipe(this: Phaser.Scene) {
    const pipeId = Date.now(); // Unique identifier for this pipe pair
    
    // Generate gap position that's different from the previous one
    let gapCenterY;
    const usePatternGenerator = Math.random() < 0.3; // 30% chance to use pattern-based generation
    
    if (usePatternGenerator) {
        // Pattern-based generation for more challenging sequences
        const patternType = Math.floor(Math.random() * 4);
        
        switch (patternType) {
            case 0: // Very high gap
                gapCenterY = MIN_PIPE_Y + 40;
                break;
            case 1: // Very low gap
                gapCenterY = MAX_PIPE_Y - 40;
                break;
            case 2: // Alternating pattern (opposite of last position)
                if (lastGapY < 300) {
                    gapCenterY = Math.min(450, lastGapY + 150 + Math.random() * 80);
                } else {
                    gapCenterY = Math.max(150, lastGapY - 150 - Math.random() * 80);
                }
                break;
            default: // Random but extreme
                const extremePosition = Math.random() < 0.5;
                if (extremePosition) {
                    gapCenterY = MIN_PIPE_Y + 30 + Math.random() * 60;
                } else {
                    gapCenterY = MAX_PIPE_Y - 30 - Math.random() * 60;
                }
        }
    } else {
        // Ensure new gap is significantly different from the last one
        const minDifference = 100; // Minimum difference between consecutive gaps
        let newGapY;
        
        do {
            newGapY = Phaser.Math.Between(MIN_PIPE_Y, MAX_PIPE_Y);
        } while (Math.abs(newGapY - lastGapY) < minDifference);
        
        gapCenterY = newGapY;
    }
    
    // Safety check - make sure gapCenterY is within our safe range
    gapCenterY = Math.max(MIN_PIPE_Y, Math.min(MAX_PIPE_Y, gapCenterY));
    
    // Remember this gap position for next time
    lastGapY = gapCenterY;
    
    // Calculate gap boundaries
    const gapTop = gapCenterY - PIPE_GAP/2;
    const gapBottom = gapCenterY + PIPE_GAP/2;
    
    // Add safety check to ensure minimum height for both pipes
    // Ensure top pipe has at least 10px height
    const safeGapTop = Math.max(10, gapTop);
    
    // Create top pipe with enhanced visual styling
    const topGraphics = this.add.graphics();
    
    // Main pipe body
    topGraphics.fillStyle(0x74BF2E, 1); // Main green color
    topGraphics.fillRect(0, 0, PIPE_WIDTH, safeGapTop);
    
    // Add pipe texture pattern (horizontal lines)
    const lineSpacing = 15;
    topGraphics.lineStyle(1, 0x5A9823, 0.5);
    for (let y = lineSpacing; y < safeGapTop; y += lineSpacing) {
        topGraphics.moveTo(0, y);
        topGraphics.lineTo(PIPE_WIDTH, y);
    }
    
    // Dark inner shadow on right side (interior)
    topGraphics.fillStyle(0x5A9823, 0.7); // Darker green for shadow
    topGraphics.fillRect(PIPE_WIDTH - 12, 0, 4, safeGapTop);
    
    // Pipe highlight (left edge)
    topGraphics.fillStyle(0x88D631, 1); // Lighter green for highlight
    topGraphics.fillRect(0, 0, 8, safeGapTop); 
    
    // Pipe shadow (right edge)
    topGraphics.fillStyle(0x5A9823, 1); // Darker green for shadow
    topGraphics.fillRect(PIPE_WIDTH - 8, 0, 8, safeGapTop);
    
    // Only add cap if there's enough height
    if (safeGapTop > 15) {
        // Pipe cap at the bottom
        topGraphics.fillStyle(0x5A9823, 1);
        topGraphics.fillRect(0, safeGapTop - 15, PIPE_WIDTH, 15);
        
        // Add metallic shine effect on cap
        topGraphics.fillStyle(0xAAFF66, 0.4); // Very light green with transparency
        topGraphics.fillRect(10, safeGapTop - 15, PIPE_WIDTH - 20, 5);
        
        // Pipe cap highlight
        topGraphics.fillStyle(0x88D631, 1);
        topGraphics.fillRect(0, safeGapTop - 15, 8, 15);
        
        // Add rivets to the cap (small circles)
        topGraphics.fillStyle(0x2E4D12, 1); // Very dark green
        for (let x = 15; x < PIPE_WIDTH; x += 20) {
            topGraphics.fillCircle(x, safeGapTop - 7, 2);
        }
        
        // Pipe border - top of cap (dark outline)
        topGraphics.lineStyle(2, 0x2E4D12, 1);
        topGraphics.strokeRect(0, safeGapTop - 15, PIPE_WIDTH, 15);
    }
    
    // Generate texture for top pipe
    topGraphics.generateTexture('toppipe' + pipeId, PIPE_WIDTH, safeGapTop);
    topGraphics.clear();
    
    const topPipe = pipes.create(800, 0, 'toppipe' + pipeId) as Phaser.Physics.Arcade.Image;
    topPipe.setOrigin(0.5, 0); // Anchor at top
    topPipe.setData('pairId', pipeId);
    topPipe.setData('isBottomPipe', false);
    topPipe.setData('originalY', 0);
    topPipe.setVelocityX(-PIPE_SPEED);
    topPipe.setVelocityY(0);
    topPipe.setDepth(5); // Lower depth so pipes appear behind ground but above clouds
    
    if (topPipe.body) {
        topPipe.body.immovable = true;
    }
    
    // Create bottom pipe with enhanced visual styling
    // Limit the bottom pipe height to end at ground level (570)
    // Add safety check to ensure minimum height for bottom pipe
    let bottomPipeHeight = Math.min(570 - gapBottom, 600 - gapBottom);
    // Ensure bottom pipe has at least 10px height
    bottomPipeHeight = Math.max(10, bottomPipeHeight);
    
    const bottomGraphics = this.add.graphics();
    
    // Main pipe body
    bottomGraphics.fillStyle(0x74BF2E, 1); // Main green color
    bottomGraphics.fillRect(0, 0, PIPE_WIDTH, bottomPipeHeight);
    
    // Add pipe texture pattern (horizontal lines)
    bottomGraphics.lineStyle(1, 0x5A9823, 0.5);
    for (let y = lineSpacing; y < bottomPipeHeight; y += lineSpacing) {
        bottomGraphics.moveTo(0, y);
        bottomGraphics.lineTo(PIPE_WIDTH, y);
    }
    
    // Dark inner shadow on right side (interior)
    bottomGraphics.fillStyle(0x5A9823, 0.7); // Darker green for shadow
    bottomGraphics.fillRect(PIPE_WIDTH - 12, 0, 4, bottomPipeHeight);
    
    // Pipe highlight (left edge)
    bottomGraphics.fillStyle(0x88D631, 1); // Lighter green for highlight
    bottomGraphics.fillRect(0, 0, 8, bottomPipeHeight);
    
    // Pipe shadow (right edge)
    bottomGraphics.fillStyle(0x5A9823, 1); // Darker green for shadow
    bottomGraphics.fillRect(PIPE_WIDTH - 8, 0, 8, bottomPipeHeight);
    
    // Only add cap if there's enough height
    if (bottomPipeHeight > 15) {
        // Pipe cap at the top
        bottomGraphics.fillStyle(0x5A9823, 1);
        bottomGraphics.fillRect(0, 0, PIPE_WIDTH, 15);
        
        // Add metallic shine effect on cap
        bottomGraphics.fillStyle(0xAAFF66, 0.4); // Very light green with transparency
        bottomGraphics.fillRect(10, 0, PIPE_WIDTH - 20, 5);
        
        // Pipe cap highlight
        bottomGraphics.fillStyle(0x88D631, 1);
        bottomGraphics.fillRect(0, 0, 8, 15);
        
        // Add rivets to the cap (small circles)
        bottomGraphics.fillStyle(0x2E4D12, 1); // Very dark green
        for (let x = 15; x < PIPE_WIDTH; x += 20) {
            bottomGraphics.fillCircle(x, 7, 2);
        }
        
        // Pipe border - top of cap (dark outline)
        bottomGraphics.lineStyle(2, 0x2E4D12, 1);
        bottomGraphics.strokeRect(0, 0, PIPE_WIDTH, 15);
    }
    
    // Generate texture for bottom pipe
    bottomGraphics.generateTexture('bottompipe' + pipeId, PIPE_WIDTH, bottomPipeHeight);
    bottomGraphics.clear();
    
    const bottomPipe = pipes.create(800, gapBottom, 'bottompipe' + pipeId) as Phaser.Physics.Arcade.Image;
    bottomPipe.setOrigin(0.5, 0); // Anchor at top of bottom pipe
    bottomPipe.setData('pairId', pipeId);
    bottomPipe.setData('isBottomPipe', true);
    bottomPipe.setData('originalY', gapBottom);
    bottomPipe.setVelocityX(-PIPE_SPEED);
    bottomPipe.setVelocityY(0);
    bottomPipe.setDepth(5); // Lower depth so pipes appear behind ground but above clouds
    
    if (bottomPipe.body) {
        bottomPipe.body.immovable = true;
    }
    
    // Track this pair ID
    existingPairIds.add(pipeId);
    
    console.log(`Generated pipe pair ${pipeId} at x=800 with gap from y=${safeGapTop} to y=${gapBottom}, pattern: ${usePatternGenerator}`);
}

function celebrateWithConfetti(this: Phaser.Scene) {
    // Position confetti emitter at bird
    confettiEmitter.setPosition(bird.x, bird.y);
    
    // Burst confetti
    confettiEmitter.explode(50); // Emit 50 particles in a burst
    
    // Play celebration sound
    playCelebrationSound();
}

function playCelebrationSound() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Create an ascending melody
    const notes = [440, 494, 523, 587, 659];
    const noteLength = 0.1; // seconds
    
    notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.2;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + (index * noteLength));
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + ((index + 1) * noteLength));
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(audioContext.currentTime + (index * noteLength));
        oscillator.stop(audioContext.currentTime + ((index + 1) * noteLength));
    });
}

// Add explosion effect function
function createExplosionEffect(this: Phaser.Scene) {
    // Hide the bird
    bird.setVisible(false);
    
    // Position explosion at bird location
    explosionEmitter.setPosition(bird.x, bird.y);
    
    // Explode with many particles
    explosionEmitter.explode(50);
    
    // Create a glow effect at the explosion center
    const glow = this.add.image(bird.x, bird.y, 'glow');
    glow.setBlendMode('ADD');
    glow.setScale(0.1);
    glow.setAlpha(0.8);
    glow.setDepth(24);
    glow.setTint(0xFFA726);
    
    // Animate the glow
    this.tweens.add({
        targets: glow,
        scale: 2,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => {
            glow.destroy();
        }
    });
    
    // Add screen shake effect
    this.cameras.main.shake(300, 0.01);
}

// Add a new function for creating wind burst
function createWindBurst(this: Phaser.Scene) {
    // Position wind burst behind the bird
    const burstX = bird.x - 15;
    const burstY = bird.y + 2;
    
    // Use the dedicated burst emitter with preset configurations
    windEmitter.explode(8, burstX, burstY);
}

function createPauseButton(this: Phaser.Scene) {
    // Create pause button container
    pauseButton = this.add.container(740, 60);
    
    // Add pause icon
    const pauseIcon = this.add.image(0, 0, 'pauseButton');
    pauseButton.add(pauseIcon);
    
    // Make it interactive
    pauseIcon.setInteractive({ useHandCursor: true });
    
    // Stop event propagation to prevent unwanted flapping
    pauseIcon.on('pointerdown', function(this: Phaser.Scene, pointer: Phaser.Input.Pointer) {
        // Stop event propagation
        pointer.event.stopPropagation();
        togglePause.call(this);
    }, this);
    
    // Set high depth to appear above everything except pause overlay
    pauseButton.setDepth(1500);
    
    // Initially hide the pause button until game starts
    pauseButton.setVisible(false);
}

function createPauseOverlay(this: Phaser.Scene) {
    // Create container for pause overlay elements
    pauseOverlay = this.add.container(400, 300);
    
    // Create semi-transparent dark overlay
    const overlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.7);
    
    // Create "PAUSED" text
    const pausedText = this.add.text(0, -50, 'PAUSED', {
        fontSize: '48px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
        shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }
    }).setOrigin(0.5);
    
    // Create resume button
    const resumeButton = this.add.image(0, 50, 'playButton');
    resumeButton.setInteractive({ useHandCursor: true });
    
    // Stop event propagation to prevent unwanted flapping
    resumeButton.on('pointerdown', function(this: Phaser.Scene, pointer: Phaser.Input.Pointer) {
        // Stop event propagation
        pointer.event.stopPropagation();
        togglePause.call(this);
    }, this);
    
    // Resume text below button
    const resumeText = this.add.text(0, 100, 'Resume', {
        fontSize: '24px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
    }).setOrigin(0.5);
    
    // Also make the overlay click-proof to prevent input passing through
    overlay.setInteractive();
    
    // Add all elements to the container
    pauseOverlay.add([overlay, pausedText, resumeButton, resumeText]);
    
    // Set extremely high depth to ensure it's above everything
    pauseOverlay.setDepth(2000);
    
    // Initially hide the overlay
    pauseOverlay.setVisible(false);
}

function togglePause(this: Phaser.Scene) {
    if (!gameStarted || gameOver) return; // Don't pause if game hasn't started or is over
    
    gamePaused = !gamePaused;
    
    if (gamePaused) {
        // Pause the game
        previousPhysicsState = this.physics.world.isPaused;
        previousTimeScale = this.time.timeScale;
        
        this.physics.world.pause();
        this.time.timeScale = 0; // Freeze all time-based updates
        
        // Show pause overlay
        pauseOverlay.setVisible(true);
        
        // Temporarily disable input events for the scene to prevent flapping
        this.input.off('pointerdown', startOrFlap, this);
        if (this.input.keyboard && spaceKey) {
            spaceKey.off('down', startOrFlap, this);
        }
        
        // Stop any ongoing audio
        if (audioContext && audioContext.state === 'running') {
            audioContext.suspend();
        }
        
        console.log('Game paused');
    } else {
        // Resume the game
        if (!previousPhysicsState) {
            this.physics.world.resume();
        }
        this.time.timeScale = previousTimeScale;
        
        // Hide pause overlay
        pauseOverlay.setVisible(false);
        
        // Re-enable input events for the scene
        this.input.on('pointerdown', startOrFlap, this);
        if (this.input.keyboard && spaceKey) {
            spaceKey.on('down', startOrFlap, this);
        }
        
        // Resume audio
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        console.log('Game resumed');
    }
}

// Start the game
window.onload = () => {
    game = new Phaser.Game(config);
}; 