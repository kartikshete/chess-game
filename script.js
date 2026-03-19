// DOM Elements
const boardEl = document.getElementById('chessboard');
const historyList = document.getElementById('history-list');
const gameStatus = document.getElementById('game-status');
const setupModal = document.getElementById('setupModal');
const aboutModal = document.getElementById('aboutModal');

const whiteTimerEl = document.getElementById('white-timer');
const blackTimerEl = document.getElementById('black-timer');
const whiteScoreEl = document.getElementById('white-score');
const blackScoreEl = document.getElementById('black-score');

const PIECES = {
    white: {
        p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
        r: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
        n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
        b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
        q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
        k: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
    },
    black: {
        p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
        r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
        n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
        b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
        q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
        k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
    }
};

const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

let boardState = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

let selectedSquare = null;
let currentTurn = 'white';
let gameMode = 'pvp';
let whiteTime = 600; // 10 mins
let blackTime = 600;
let timerInterval = null;
let whiteScore = 0;
let blackScore = 0;

// --- SETUP & MODALS ---
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.dataset.mode;
        if (gameMode === 'ai') {
            document.getElementById('blackNameInput').value = 'Raj AI (CPU)';
        } else {
            document.getElementById('blackNameInput').value = 'Player 2';
        }
    });
});

document.getElementById('startGameBtn').addEventListener('click', () => {
    const wName = document.getElementById('whiteNameInput').value || 'Kartik';
    const bName = document.getElementById('blackNameInput').value || 'Opponent';
    document.getElementById('name-white').innerText = wName;
    document.getElementById('name-black').innerText = bName;
    document.getElementById('mode-badge').innerText = gameMode === 'ai' ? 'Vs Computer' : 'Player vs Player';
    setupModal.style.display = 'none';
    startTimer();
    initBoard();
});

document.getElementById('aboutBtn').addEventListener('click', () => aboutModal.style.display = 'flex');
document.getElementById('closeAbout').addEventListener('click', () => aboutModal.style.display = 'none');
document.getElementById('quitBtn').addEventListener('click', () => location.reload());
document.getElementById('resetBtn').addEventListener('click', () => location.reload());

// --- TIMER LOGIC ---
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (currentTurn === 'white') {
            whiteTime--;
            updateTimerDisplay(whiteTimerEl, whiteTime);
            if (whiteTime <= 0) endGame('Black wins on time!');
        } else {
            blackTime--;
            updateTimerDisplay(blackTimerEl, blackTime);
            if (blackTime <= 0) endGame('White wins on time!');
        }
    }, 1000);
}

function updateTimerDisplay(el, time) {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    el.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- CORE GAME ENGINE ---
function initBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = r;
            square.dataset.col = c;

            const pieceCode = boardState[r][c];
            if (pieceCode) {
                const pieceImg = document.createElement('img');
                const isWhite = pieceCode === pieceCode.toUpperCase();
                const type = pieceCode.toLowerCase();
                pieceImg.src = isWhite ? PIECES.white[type] : PIECES.black[type];
                pieceImg.classList.add('piece');
                square.appendChild(pieceImg);
            }

            square.addEventListener('click', () => handleSquareClick(r, c));
            boardEl.appendChild(square);
        }
    }
}

function handleSquareClick(r, c) {
    if (gameMode === 'ai' && currentTurn === 'black') return;
    const piece = boardState[r][c];
    if (selectedSquare) {
        const [sr, sc] = selectedSquare;
        if (movePiece(sr, sc, r, c)) {
            selectedSquare = null;
            initBoard();
            if (gameMode === 'ai' && currentTurn === 'black') {
                setTimeout(makeAIMove, 800);
            }
            return;
        }
        if (sr === r && sc === c) {
            selectedSquare = null;
            clearSelection();
            return;
        }
    }
    if (piece) {
        const isWhite = piece === piece.toUpperCase();
        if ((currentTurn === 'white' && isWhite) || (currentTurn === 'black' && !isWhite)) {
            selectedSquare = [r, c];
            highlightSquare(r, c);
        }
    }
}

function highlightSquare(r, c) {
    clearSelection();
    const square = boardEl.children[r * 8 + c];
    square.classList.add('selected');
}

function clearSelection() {
    document.querySelectorAll('.square').forEach(s => s.classList.remove('selected'));
}

function movePiece(fromR, fromC, toR, toC) {
    const piece = boardState[fromR][fromC];
    if (!piece) return false;
    if (!isLegalMove(piece, fromR, fromC, toR, toC)) return false;

    const target = boardState[toR][toC];
    if (target) {
        const val = PIECE_VALUES[target.toLowerCase()];
        if (piece === piece.toUpperCase()) whiteScore += val;
        else blackScore += val;
        updateScoreDisplay();
    }

    boardState[toR][toC] = piece;
    boardState[fromR][fromC] = null;

    logMove(piece, fromR, fromC, toR, toC);
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    updateStatus();
    return true;
}

function updateScoreDisplay() {
    whiteScoreEl.innerText = `+${whiteScore}`;
    blackScoreEl.innerText = `+${blackScore}`;
}

function isLegalMove(piece, fr, fc, tr, tc) {
    if (fr === tr && fc === tc) return false;
    const target = boardState[tr][tc];
    const isWhite = piece === piece.toUpperCase();
    if (target) {
        const targetIsWhite = target === target.toUpperCase();
        if (isWhite === targetIsWhite) return false;
    }

    const type = piece.toLowerCase();
    const dr = tr - fr;
    const dc = tc - fc;

    switch (type) {
        case 'p':
            const dir = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;
            if (dc === 0 && dr === dir && !target) return true;
            if (dc === 0 && dr === 2 * dir && fr === startRow && !target && !boardState[fr + dir][fc]) return true;
            if (Math.abs(dc) === 1 && dr === dir && target) return true;
            return false;
        case 'r':
            if (fr !== tr && fc !== tc) return false;
            return isPathClear(fr, fc, tr, tc);
        case 'n':
            return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
        case 'b':
            if (Math.abs(dr) !== Math.abs(dc)) return false;
            return isPathClear(fr, fc, tr, tc);
        case 'q':
            if (fr !== tr && fc !== tc && Math.abs(dr) !== Math.abs(dc)) return false;
            return isPathClear(fr, fc, tr, tc);
        case 'k':
            return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
        default: return false;
    }
}

function isPathClear(fr, fc, tr, tc) {
    const dr = Math.sign(tr - fr);
    const dc = Math.sign(tc - fc);
    let r = fr + dr;
    let c = fc + dc;
    while (r !== tr || c !== tc) {
        if (boardState[r][c]) return false;
        r += dr;
        c += dc;
    }
    return true;
}

function endGame(msg) {
    clearInterval(timerInterval);
    alert(msg);
    location.reload();
}

// --- AI LOGIC ---
function makeAIMove() {
    let legalMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece && piece === piece.toLowerCase()) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isLegalMove(piece, r, c, tr, tc)) {
                            const target = boardState[tr][tc];
                            let score = target ? 10 : 1;
                            legalMoves.push({ f: [r, c], t: [tr, tc], score });
                        }
                    }
                }
            }
        }
    }
    if (legalMoves.length > 0) {
        const captures = legalMoves.filter(m => m.score > 1);
        const move = captures.length > 0 ? captures[Math.floor(Math.random() * captures.length)] : legalMoves[Math.floor(Math.random() * legalMoves.length)];
        movePiece(move.f[0], move.f[1], move.t[0], move.t[1]);
        initBoard();
    }
}

function logMove(piece, fr, fc, tr, tc) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const pName = { 'p': 'Pawn', 'r': 'Rook', 'n': 'Knight', 'b': 'Bishop', 'q': 'Queen', 'k': 'King' };
    const moveText = `${pName[piece.toLowerCase()]} ${files[fc]}${ranks[fr]} → ${files[tc]}${ranks[tr]}`;
    const logItem = document.createElement('div');
    logItem.classList.add('log-item');
    logItem.innerText = moveText;
    if (historyList.querySelector('.empty-log')) historyList.innerHTML = '';
    historyList.prepend(logItem);
}

function updateStatus() {
    const wName = document.getElementById('name-white').innerText;
    const bName = document.getElementById('name-black').innerText;
    gameStatus.innerText = currentTurn === 'white' ? `${wName}'s Turn` : `${bName}'s Turn`;
    document.querySelector('.white-player').classList.toggle('active', currentTurn === 'white');
    document.querySelector('.black-player').classList.toggle('active', currentTurn === 'black');
}

document.getElementById('themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
});
