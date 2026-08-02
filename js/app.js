/**
 * 2D Chess.com Main Web Application Controller & Renderer (Hole.io Void Swallowing Capture Animation)
 */

import { getBestMove, evaluateBoard, classifyMove } from './ai.js';

const PIECES_SVG = {
  'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
};

export class ChessApp {
  constructor() {
    localStorage.clear();

    this.game = new Chess();
    this.boardEl = document.getElementById('chessboard');
    this.canvas = document.getElementById('vfx-overlay');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.commentaryBoxEl = document.getElementById('commentaryBox');
    this.evalFillEl = document.getElementById('evalBarWhite');
    this.evalScoreTextEl = document.getElementById('evalScoreText');

    this.selectedSq = null;
    this.legalMoves = [];
    this.isFlipped = false;
    this.gameMode = 'ai-medium';
    this.userSide = 'w';
    this.pendingPromotion = null;
    this.lastMove = null;
    this.isAnimating = false;

    this.capturedWhite = [];
    this.capturedBlack = [];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.resizeCanvas();
    this.renderBoard();
    this.updateHUD();
    this.updateEvalGauge();

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas || !this.boardEl) return;
    const rect = this.boardEl.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  setupEventListeners() {
    document.getElementById('gameMode').addEventListener('change', (e) => {
      this.gameMode = e.target.value;
      this.startNewGame();
    });

    document.getElementById('playerSide').addEventListener('change', (e) => {
      this.userSide = e.target.value === 'white' ? 'w' : 'b';
      this.isFlipped = (this.userSide === 'b');
      this.startNewGame();
    });

    document.getElementById('btnNewGame').addEventListener('click', () => this.startNewGame());
    document.getElementById('btnUndo').addEventListener('click', () => this.undoMove());
    document.getElementById('btnFlip').addEventListener('click', () => {
      this.isFlipped = !this.isFlipped;
      this.renderBoard();
    });

    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      document.getElementById('gameOverModal').style.display = 'none';
      this.startNewGame();
    });

    document.querySelectorAll('.promo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.getAttribute('data-choice').toLowerCase();
        document.getElementById('promotionModal').style.display = 'none';
        if (this.pendingPromotion) {
          const { from, to } = this.pendingPromotion;
          this.pendingPromotion = null;
          this.makeMove(from, to, choice);
        }
      });
    });
  }

  startNewGame() {
    this.game.reset();
    this.selectedSq = null;
    this.legalMoves = [];
    this.pendingPromotion = null;
    this.lastMove = null;
    this.isAnimating = false;
    this.capturedWhite = [];
    this.capturedBlack = [];

    document.getElementById('checkBadge').style.display = 'none';
    document.getElementById('promotionModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
    if (this.commentaryBoxEl) this.commentaryBoxEl.innerHTML = 'Game started. Make your opening move!';

    this.renderBoard();
    this.updateHUD();
    this.updateEvalGauge();

    if (this.gameMode !== 'pvp' && this.game.turn() !== this.userSide) {
      setTimeout(() => this.triggerAIMove(), 300);
    }
  }

  renderBoard() {
    this.boardEl.innerHTML = '';
    const boardState = this.game.board();

    const ranks = this.isFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const files = this.isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    ranks.forEach(r => {
      files.forEach(c => {
        const sqName = String.fromCharCode(97 + c) + (r + 1);
        const isLight = (r + c) % 2 !== 0;

        const sqDiv = document.createElement('div');
        sqDiv.className = `sq ${isLight ? 'light' : 'dark'}`;
        sqDiv.dataset.sq = sqName;

        if (this.selectedSq === sqName) {
          sqDiv.classList.add('selected');
        }

        if (this.lastMove && (this.lastMove.from === sqName || this.lastMove.to === sqName)) {
          sqDiv.classList.add('last-move');
        }

        const legalMove = this.legalMoves.find(m => m.to === sqName);
        if (legalMove) {
          const dot = document.createElement('div');
          dot.className = legalMove.captured ? 'legal-ring' : 'legal-dot';
          sqDiv.appendChild(dot);
        }

        if (this.game.in_check()) {
          const pieceOnSq = boardState[7 - r][c];
          if (pieceOnSq && pieceOnSq.type.toUpperCase() === 'K' && pieceOnSq.color === this.game.turn()) {
            sqDiv.classList.add('in-check');
          }
        }

        const piece = boardState[7 - r][c];
        if (piece) {
          const pieceSymbol = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
          const img = document.createElement('img');
          img.src = PIECES_SVG[pieceSymbol] || '';
          img.alt = pieceSymbol;
          img.className = 'piece-img';
          img.draggable = true;

          img.addEventListener('dragstart', (e) => this.handleDragStart(e, sqName));
          sqDiv.appendChild(img);
        }

        sqDiv.addEventListener('click', () => this.handleSquareClick(sqName));
        sqDiv.addEventListener('dragover', (e) => e.preventDefault());
        sqDiv.addEventListener('drop', (e) => this.handleDrop(e, sqName));

        this.boardEl.appendChild(sqDiv);
      });
    });
  }

  handleSquareClick(sqName) {
    if (this.isAnimating || this.game.game_over() || (this.gameMode !== 'pvp' && this.game.turn() !== this.userSide)) return;

    const piece = this.game.get(sqName);

    if (piece && piece.color === this.game.turn()) {
      this.selectedSq = sqName;
      this.legalMoves = this.game.moves({ square: sqName, verbose: true });
      this.renderBoard();
      return;
    }

    if (this.selectedSq) {
      const move = this.legalMoves.find(m => m.to === sqName);
      if (move) {
        if (move.flags.includes('p')) {
          this.pendingPromotion = { from: this.selectedSq, to: sqName };
          document.getElementById('promotionModal').style.display = 'flex';
          return;
        }
        this.makeMove(this.selectedSq, sqName);
      } else {
        this.selectedSq = null;
        this.legalMoves = [];
        this.renderBoard();
      }
    }
  }

  handleDragStart(e, sqName) {
    if (this.isAnimating || this.game.game_over() || (this.gameMode !== 'pvp' && this.game.turn() !== this.userSide)) {
      e.preventDefault();
      return;
    }
    const piece = this.game.get(sqName);
    if (piece && piece.color === this.game.turn()) {
      this.selectedSq = sqName;
      this.legalMoves = this.game.moves({ square: sqName, verbose: true });
      e.dataTransfer.setData('text/plain', sqName);
      this.renderBoard();
    } else {
      e.preventDefault();
    }
  }

  handleDrop(e, targetSq) {
    e.preventDefault();
    if (this.isAnimating) return;
    const fromSq = e.dataTransfer.getData('text/plain');
    if (fromSq && fromSq !== targetSq) {
      const move = this.legalMoves.find(m => m.to === targetSq);
      if (move) {
        if (move.flags.includes('p')) {
          this.pendingPromotion = { from: fromSq, to: targetSq };
          document.getElementById('promotionModal').style.display = 'flex';
          return;
        }
        this.makeMove(fromSq, targetSq);
      }
    }
  }

  makeMove(from, to, promotion = 'q') {
    const targetPieceBefore = this.game.get(to);

    if (targetPieceBefore) { // Is a Capture Move! Trigger Hole.io Swallowing Sequence
      this.isAnimating = true;
      this.animateHoleIoSwallow(to, () => {
        this.isAnimating = false;
        this.finishMove(from, to, promotion);
      });
    } else {
      this.finishMove(from, to, promotion);
    }
  }

  finishMove(from, to, promotion) {
    const evalBefore = evaluateBoard(this.game);
    const turnMoving = this.game.turn();
    const move = this.game.move({ from, to, promotion });

    if (move) {
      this.lastMove = { from, to };

      if (move.captured) {
        const capSymbol = move.color === 'w' ? move.captured.toLowerCase() : move.captured.toUpperCase();
        if (move.color === 'w') this.capturedBlack.push(capSymbol);
        else this.capturedWhite.push(capSymbol);
      }

      const evalAfter = evaluateBoard(this.game);
      const rating = classifyMove(move, evalBefore, evalAfter, turnMoving);
      this.updateSidebarCommentary(rating);
      this.updateEvalGauge();

      this.selectedSq = null;
      this.legalMoves = [];
      this.renderBoard();
      this.updateHUD();
      this.checkGameState();

      if (!this.game.game_over() && this.gameMode !== 'pvp' && this.game.turn() !== this.userSide) {
        setTimeout(() => this.triggerAIMove(), 250);
      }
    }
  }

  /**
   * HOLE.IO BLACK HOLE SWALLOWING CANVAS ANIMATION (3-Step Sequence)
   */
  getSquareCenterCoords(targetSq) {
    if (!this.canvas) return { x: 0, y: 0, sqW: 75 };
    const fileCol = targetSq.charCodeAt(0) - 97;
    const rankRow = parseInt(targetSq.charAt(1), 10) - 1;

    const c = this.isFlipped ? 7 - fileCol : fileCol;
    const r = this.isFlipped ? rankRow : 7 - rankRow;

    const sqW = this.canvas.width / 8;
    const sqH = this.canvas.height / 8;

    return {
      x: c * sqW + sqW / 2,
      y: r * sqH + sqH / 2,
      sqW, sqH
    };
  }

  animateHoleIoSwallow(targetSq, onComplete) {
    const coords = this.getSquareCenterCoords(targetSq);
    const targetSqEl = document.querySelector(`.sq[data-sq="${targetSq}"]`);
    const pieceImg = targetSqEl ? targetSqEl.querySelector('.piece-img') : null;

    const maxRadius = coords.sqW * 0.52;
    const startTime = performance.now();
    const duration = 520; // 150ms expand + 220ms swallow + 150ms collapse

    const renderFrame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      let radius = 0;

      if (elapsed <= 140) { // Step 1: Expand Hole (0 - 140ms)
        const p1 = elapsed / 140;
        radius = p1 * maxRadius;
      } else if (elapsed <= 370) { // Step 2: Swallow Piece (140 - 370ms)
        radius = maxRadius;
        const p2 = (elapsed - 140) / 230;

        if (pieceImg) {
          pieceImg.style.transform = `scale(${Math.max(0, 1 - p2)}) rotate(${p2 * 180}deg)`;
          pieceImg.style.opacity = `${1 - p2}`;
        }
      } else { // Step 3: Collapse Void (370 - 520ms)
        const p3 = (elapsed - 370) / 150;
        radius = (1 - p3) * maxRadius;
      }

      if (radius > 0) {
        // Outer Glowing Event Horizon Ring
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(coords.x, coords.y, radius + 3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
        this.ctx.shadowColor = '#a855f7';
        this.ctx.shadowBlur = 20;
        this.ctx.fill();

        // Inner Cosmic Void
        this.ctx.beginPath();
        this.ctx.arc(coords.x, coords.y, Math.max(0, radius), 0, Math.PI * 2);
        this.ctx.fillStyle = '#111116';
        this.ctx.fill();
        this.ctx.restore();
      }

      if (progress < 1.0) {
        requestAnimationFrame(renderFrame);
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(renderFrame);
  }

  updateSidebarCommentary(rating) {
    if (this.commentaryBoxEl) {
      this.commentaryBoxEl.innerHTML = `${rating.badgeHTML} <span>${rating.commentary}</span>`;
    }
  }

  updateEvalGauge() {
    const scoreInPawns = evaluateBoard(this.game) / 100.0;
    const fillPercent = Math.min(Math.max(50 + (scoreInPawns * 4.5), 5), 95);

    if (this.evalFillEl) {
      this.evalFillEl.style.height = `${fillPercent}%`;
    }

    if (this.evalScoreTextEl) {
      if (this.game.in_checkmate()) {
        this.evalScoreTextEl.textContent = this.game.turn() === 'w' ? '-M' : '+M';
      } else {
        const scoreStr = scoreInPawns > 0 ? `+${scoreInPawns.toFixed(1)}` : scoreInPawns.toFixed(1);
        this.evalScoreTextEl.textContent = scoreStr;
        if (scoreInPawns < 0) {
          this.evalScoreTextEl.classList.add('black-lead');
        } else {
          this.evalScoreTextEl.classList.remove('black-lead');
        }
      }
    }
  }

  undoMove() {
    if (this.isAnimating || this.game.history().length === 0) return;
    this.game.undo();
    if (this.gameMode !== 'pvp' && this.game.history().length > 0) {
      this.game.undo();
    }
    this.selectedSq = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.renderBoard();
    this.updateHUD();
    this.updateEvalGauge();
  }

  triggerAIMove() {
    if (this.isAnimating || this.game.game_over()) return;
    const aiThinking = document.getElementById('aiThinking');
    if (aiThinking) aiThinking.style.display = 'flex';

    setTimeout(() => {
      try {
        const bestMove = getBestMove(this.game, this.gameMode);

        if (bestMove) {
          const targetPieceBefore = this.game.get(bestMove.to);

          if (targetPieceBefore) { // AI Capture Move! Trigger Hole.io Swallowing Sequence
            this.isAnimating = true;
            this.animateHoleIoSwallow(bestMove.to, () => {
              this.isAnimating = false;
              if (aiThinking) aiThinking.style.display = 'none';
              this.finishMove(bestMove.from, bestMove.to, bestMove.promotion || 'q');
            });
          } else {
            if (aiThinking) aiThinking.style.display = 'none';
            this.finishMove(bestMove.from, bestMove.to, bestMove.promotion || 'q');
          }
        } else {
          if (aiThinking) aiThinking.style.display = 'none';
        }
      } catch (err) {
        console.error("AI execution error, executing fallback random move:", err);
        const moves = this.game.moves({ verbose: true });
        if (moves.length > 0) {
          const randMove = moves[Math.floor(Math.random() * moves.length)];
          this.finishMove(randMove.from, randMove.to, randMove.promotion || 'q');
        }
        if (aiThinking) aiThinking.style.display = 'none';
      }
    }, 250);
  }

  checkGameState() {
    const checkBadge = document.getElementById('checkBadge');
    if (this.game.in_check()) {
      checkBadge.style.display = 'inline-block';
    } else {
      checkBadge.style.display = 'none';
    }

    if (this.game.game_over()) {
      const gameOverModal = document.getElementById('gameOverModal');
      const titleEl = document.getElementById('gameOverTitle');
      const msgEl = document.getElementById('gameOverMsg');

      if (this.game.in_checkmate()) {
        const winner = this.game.turn() === 'w' ? 'Black' : 'White';
        titleEl.textContent = 'Checkmate!';
        msgEl.textContent = `${winner} Wins!`;
      } else if (this.game.in_stalemate()) {
        titleEl.textContent = 'Draw!';
        msgEl.textContent = 'Draw by Stalemate.';
      } else if (this.game.in_threefold_repetition()) {
        titleEl.textContent = 'Draw!';
        msgEl.textContent = 'Draw by 3-Fold Repetition.';
      } else if (this.game.insufficient_material()) {
        titleEl.textContent = 'Draw!';
        msgEl.textContent = 'Draw by Insufficient Material.';
      } else {
        titleEl.textContent = 'Game Over!';
        msgEl.textContent = 'The game has ended.';
      }

      gameOverModal.style.display = 'flex';
    }
  }

  updateHUD() {
    const turnText = document.getElementById('turnText');
    const badge = document.getElementById('turnBadge');

    const isWhite = this.game.turn() === 'w';
    turnText.textContent = `${isWhite ? 'White' : 'Black'}'s Turn`;
    badge.className = `turn-badge ${isWhite ? 'white' : 'black'}`;

    document.getElementById('capturedWhite').innerHTML = this.capturedWhite.map(p => 
      `<img src="${PIECES_SVG[p]}" alt="${p}" class="captured-pop">`
    ).join('');

    document.getElementById('capturedBlack').innerHTML = this.capturedBlack.map(p => 
      `<img src="${PIECES_SVG[p]}" alt="${p}" class="captured-pop">`
    ).join('');

    const moveLogEl = document.getElementById('moveLog');
    moveLogEl.innerHTML = '';
    const history = this.game.history({ verbose: true });

    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wMove = history[i];
      const bMove = history[i + 1];

      const wSymbol = wMove ? (wMove.color === 'w' ? wMove.piece.toUpperCase() : wMove.piece.toLowerCase()) : '';
      const bSymbol = bMove ? (bMove.color === 'w' ? bMove.piece.toUpperCase() : bMove.piece.toLowerCase()) : '';

      const wIcon = wMove ? `<img src="${PIECES_SVG[wSymbol]}" width="16" height="16" style="vertical-align:middle;">` : '';
      const bIcon = bMove ? `<img src="${PIECES_SVG[bSymbol]}" width="16" height="16" style="vertical-align:middle;">` : '';

      const div = document.createElement('div');
      div.className = 'move-item';
      div.innerHTML = `${moveNum}. ${wIcon} ${wMove ? wMove.san : ''} ${bIcon} ${bMove ? bMove.san : ''}`;
      moveLogEl.appendChild(div);
    }
    moveLogEl.scrollTop = moveLogEl.scrollHeight;
  }
}
