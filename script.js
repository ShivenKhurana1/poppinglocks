const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

const centerX = canvas.width / 2
const centerY = canvas.height / 2 + 20
const trackRadius = 100
const SHACKLE_RADIUS = 45
const SHACKLE_OUTER = trackRadius + 65
const SHACKLE_TOP = centerY - SHACKLE_OUTER
const targetRadius = 10
const playerRadius = 7

let score = 0
let highScore = 0
let gameOver = false
let started = false

let playerAngle = 0
let playerSpeed = 0.04
let direction = 1

let targetAngle = 0

let particles = []
let screenShake = 0
let scoreScale = 1.0
let shackleYOffset = 0

let audioCtx = null

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
}

function playSound(type) {
    if (!audioCtx) return
    if (audioCtx.state === 'suspended') {
        audioCtx.resume()
    }
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    const now = audioCtx.currentTime

    if (type === 'hit') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, now)
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08)
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
        osc.start(now)
        osc.stop(now + 0.08)
    } else if (type === 'fail') {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, now)
        osc.frequency.linearRampToValueAtTime(50, now + 0.25)
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
        osc.start(now)
        osc.stop(now + 0.25)
    }
}

function createParticles(x, y) {
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 4
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 3,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.04
        })
    }
}

function spawnTarget() {
    const minDistance = Math.PI / 4
    const diff = minDistance + Math.random() * (Math.PI * 2 - minDistance * 2)
    targetAngle = (playerAngle + diff * direction) % (Math.PI * 2)
}

function initGame() {
    score = 0
    playerAngle = 0
    direction = 1
    playerSpeed = 0.04
    spawnTarget()
    gameOver = false
    shackleYOffset = 0
}

function checkHit() {
    let pAngle = playerAngle % (Math.PI * 2)
    let tAngle = targetAngle % (Math.PI * 2)
    if (pAngle < 0) pAngle += Math.PI * 2
    if (tAngle < 0) tAngle += Math.PI * 2
    let diff = Math.abs(pAngle - tAngle)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    const tolerance = 0.25
    return diff <= tolerance
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault()
        initAudio()
        if (!started) {
            started = true
            initGame()
            return
        }
        if (gameOver) {
            initGame()
            return
        }
        if (checkHit()) {
            score++
            if (score > highScore) highScore = score
            playerSpeed = 0.04 + Math.min(score * 0.002, 0.04)
            direction *= -1
            playSound('hit')
            const targetX = centerX + Math.cos(targetAngle) * trackRadius
            const targetY = centerY + Math.sin(targetAngle) * trackRadius
            createParticles(targetX, targetY)
            scoreScale = 1.4
            shackleYOffset = -15
            screenShake = 3
            spawnTarget()
        } else {
            gameOver = true
            playSound('fail')
            screenShake = 15
        }
    }
})

function draw() {
    ctx.save()
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake
        const dy = (Math.random() - 0.5) * screenShake
        ctx.translate(dx, dy)
        screenShake *= 0.85
        if (screenShake < 0.5) screenShake = 0
    }
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(
        centerX,
        SHACKLE_TOP + shackleYOffset + SHACKLE_RADIUS,
        SHACKLE_RADIUS,
        Math.PI,
        0
    )
    ctx.moveTo(
        centerX - SHACKLE_RADIUS,
        SHACKLE_TOP + shackleYOffset + SHACKLE_RADIUS
    )
    ctx.lineTo(
        centerX - SHACKLE_RADIUS,
        SHACKLE_TOP + shackleYOffset + SHACKLE_RADIUS + 30
    )
    ctx.moveTo(
        centerX + SHACKLE_RADIUS,
        SHACKLE_TOP + shackleYOffset + SHACKLE_RADIUS
    )
    ctx.lineTo(
        centerX + SHACKLE_RADIUS,
        SHACKLE_TOP + shackleYOffset + SHACKLE_RADIUS + 30
    )
    ctx.stroke()

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.arc(centerX, centerY, trackRadius, 0, Math.PI * 2)
    ctx.stroke()

    if (!started) {
        ctx.fillStyle = '#ffffff'
        ctx.font = '24px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('POP THE LOCK', centerX, centerY - 15)
        ctx.font = '14px monospace'
        ctx.fillText('PRESS SPACEBAR TO START', centerX, centerY + 30)
        ctx.restore()
        return
    }

    const targetX = centerX + Math.cos(targetAngle) * trackRadius
    const targetY = centerY + Math.sin(targetAngle) * trackRadius
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(targetX, targetY, targetRadius, 0, Math.PI * 2)
    ctx.fill()

    const playerX = centerX + Math.cos(playerAngle) * trackRadius
    const playerY = centerY + Math.sin(playerAngle) * trackRadius
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(playerX, playerY, playerRadius + 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2)
    ctx.fill()

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        p.x += p.vx
        p.y += p.vy
        p.life -= p.decay
        if (p.life <= 0) particles.splice(i, 1)
    }

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (gameOver) {
        ctx.font = '20px monospace'
        ctx.fillText('GAME OVER', centerX, centerY - 15)
        ctx.font = '14px monospace'
        ctx.fillText('PRESS SPACE', centerX, centerY + 20)
    } else {
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.scale(scoreScale, scoreScale)
        ctx.font = '64px monospace'
        ctx.fillText(score.toString(), 0, 0)
        ctx.restore()
        scoreScale += (1.0 - scoreScale) * 0.15
    }

    ctx.font = '12px monospace'
    ctx.fillText(`BEST: ${highScore}`, centerX, centerY + 65)

    ctx.restore()
}

function update() {
    shackleYOffset += (0 - shackleYOffset) * 0.1
    if (started && !gameOver) {
        playerAngle += playerSpeed * direction
        let pAngle = playerAngle % (Math.PI * 2)
        let tAngle = targetAngle % (Math.PI * 2)
        if (pAngle < 0) pAngle += Math.PI * 2
        if (tAngle < 0) tAngle += Math.PI * 2
        let diff = Math.abs(pAngle - tAngle)
        if (diff > Math.PI) diff = Math.PI * 2 - diff
        if (diff > 0.3 && diff < 0.5) {
            const nextAngle = playerAngle + (playerSpeed * direction)
            let nextPAngle = nextAngle % (Math.PI * 2)
            if (nextPAngle < 0) nextPAngle += Math.PI * 2
            let nextDiff = Math.abs(nextPAngle - tAngle)
            if (nextDiff > Math.PI) nextDiff = Math.PI * 2 - nextDiff
            if (nextDiff > diff) {
                gameOver = true
                playSound('fail')
                screenShake = 15
            }
        }
    }
}

function gameLoop() {
    update()
    draw()
    requestAnimationFrame(gameLoop)
}

initGame()
gameLoop()