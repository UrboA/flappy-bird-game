// Simple test functions to verify game mechanics
function testGravity() {
    const bird = {
        y: 300,
        velocity: 0,
        gravity: 1000, // pixels per second squared
        update: function(deltaTime: number) {
            this.velocity += this.gravity * (deltaTime / 1000);
            this.y += this.velocity * (deltaTime / 1000);
            return this.y;
        }
    };

    // Test falling for 1 second
    const initialY = bird.y;
    const finalY = bird.update(1000); // 1 second
    console.assert(
        finalY > initialY,
        `Bird should fall: initial=${initialY}, final=${finalY}`
    );
}

function testJumpImpulse() {
    const bird = {
        y: 300,
        velocity: 0,
        jumpStrength: -400,
        flap: function() {
            this.velocity = this.jumpStrength;
            return this.velocity;
        }
    };

    // Test jump impulse
    const initialVelocity = bird.velocity;
    const jumpVelocity = bird.flap();
    console.assert(
        jumpVelocity < initialVelocity,
        `Bird should move upward on flap: initial=${initialVelocity}, jump=${jumpVelocity}`
    );
}

function testPipeGeneration() {
    const pipes: { x: number, y: number }[] = [];
    const generatePipe = () => {
        const gap = 200;
        const minY = 150;
        const maxY = 450;
        const holeY = Math.floor(Math.random() * (maxY - minY)) + minY;
        
        pipes.push(
            { x: 800, y: holeY - gap/2 }, // Top pipe
            { x: 800, y: holeY + gap/2 }  // Bottom pipe
        );
        return pipes.length;
    };

    // Test pipe generation
    const initialPipes = pipes.length;
    const finalPipes = generatePipe();
    console.assert(
        finalPipes === initialPipes + 2,
        `Should generate 2 pipes: initial=${initialPipes}, final=${finalPipes}`
    );
}

// Run tests
console.log('Running game mechanics tests...');
testGravity();
testJumpImpulse();
testPipeGeneration();
console.log('Tests completed!'); 