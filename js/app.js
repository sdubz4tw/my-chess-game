/**
 * 2D Chess.com Main Web Application Controller & Renderer (Dedicated 2D Canvas VFX Overlay Engine)
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

const PIECE_CAPTURE_TEXT = {
  'p': 'STAB!',
  'n': 'TRAMPLE!',
  'b': 'SMITE!',
  'r': 'CRUSH!',
  'q': 'NOVA SLASHER!',
  'k': 'ROYAL DOMINANCE!'
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

    this.capturedWhite = [];
    this.capturedBlack = [];
    this.activeVFX = [];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.resizeCanvas();
    this.renderBoard();
    this.updateHUD();
    this.updateEvalGauge();

    window.addEventListener('resize', () => this.resizeCanvas());
    requestAnimationFrame((t) => this.loopVFX(t));
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
    this.capturedWhite = [];
    this.capturedBlack = [];
    this.activeVFX = [];

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
    if (this.game.game_over() || (this.gameMode !== 'pvp' && this.game.turn() !== this.userSide)) return;

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
    if (this.game.game_over() || (this.gameMode !== 'pvp' && this.game.turn() !== this.userSide)) {
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
    const attackingPiece = this.game.get(from);
    const evalBefore = evaluateBoard(this.game);
    const turnMoving = this.game.turn();
    const move = this.game.move({ from, to, promotion });

    if (move) {
      this.lastMove = { from, to };

      if (move.captured) {
        const capSymbol = move.color === 'w' ? move.captured.toLowerCase() : move.captured.toUpperCase();
        if (move.color === 'w') this.capturedBlack.push(capSymbol);
        else this.capturedWhite.push(capSymbol);

        // Synchronous Canvas 2D Capture VFX Trigger
        this.triggerCanvasVFX(attackingPiece ? attackingPiece.type.toLowerCase() : 'p', to);
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
   * DIRECT 2D CANVAS CAPTURE VFX ENGINE
   */
  getSquareCenterCoords(targetSq) {
    if (!this.canvas) return { x: 0, y: 0 };
    const fileCol = targetSq.charCodeAt(0) - 97; // 0..7 (a..h)
    const rankRow = parseInt(targetSq.charAt(1), 10) - 1; // 0..7 (1..8)

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

  triggerCanvasVFX(attackingPiece, targetSq) {
    const coords = this.getSquareCenterCoords(targetSq);
    console.log("VFX Triggered for:", attackingPiece, "at coords:", coords);

    const textStr = PIECE_CAPTURE_TEXT[attackingPiece] || 'CRUSH!';
    const now = performance.now();

    // 1. Add Floating Combat Text
    this.activeVFX.push({
      type: 'text',
      text: textStr,
      x: coords.x,
      y: coords.y,
      startY: coords.y,
      startTime: now,
      duration: 650
    });

    // 2. Add Piece-Specific Canvas VFX
    if (attackingPiece === 'p') { // PAWN: 12 Fast Spark Particles
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const speed = 2 + Math.random() * 3;
        this.activeVFX.push({
          type: 'spark',
          x: coords.x, y: coords.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 3,
          color: i % 2 === 0 ? '#fef08a' : '#f59e0b',
          startTime: now,
          duration: 350
        });
      }
    } else if (attackingPiece === 'n') { // KNIGHT: Expanding Radial Shockwave Circle
      this.activeVFX.push({
        type: 'shockwave',
        x: coords.x, y: coords.y,
        maxRadius: coords.sqW * 0.95,
        color: '#38bdf8',
        startTime: now,
        duration: 450
      });
    } else if (attackingPiece === 'b') { // BISHOP: Vertical Holy Light Beam
      this.activeVFX.push({
        type: 'holy_beam',
        x: coords.x, y: coords.y,
        width: coords.sqW * 0.6,
        height: this.canvas.height,
        startTime: now,
        duration: 400
      });
    } else if (attackingPiece === 'r') { // ROOK: Heavy Board Shake + Dust Cluster
      this.triggerBoardShake();
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2.5;
        this.activeVFX.push({
          type: 'dust',
          x: coords.x, y: coords.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 4,
          color: '#a8a29e',
          startTime: now,
          duration: 400
        });
      }
    } else if (attackingPiece === 'q') { // QUEEN: Purple Energy Nova Ring + Screen Shake
      this.triggerBoardShake();
      this.activeVFX.push({
        type: 'queen_nova',
        x: coords.x, y: coords.y,
        maxRadius: coords.sqW * 1.3,
        color: '#c084fc',
        startTime: now,
        duration: 500
      });
    } else if (attackingPiece === 'k') { // KING: Golden Starburst Aura Pulse
      this.activeVFX.push({
        type: 'royal_starburst',
        x: coords.x, y: coords.y,
        maxRadius: coords.sqW * 1.1,
        color: '#f59e0b',
        startTime: now,
        duration: 550
      });
    }
  }

  loopVFX(timestamp) {
    requestAnimationFrame((t) => this.loopVFX(t));

    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.activeVFX.length === 0) return;

    this.activeVFX = this.activeVFX.filter(vfx => {
      const elapsed = timestamp - vfx.startTime;
      const progress = Math.min(elapsed / vfx.duration, 1.0);
      if (progress >= 1.0) return false;

      const alpha = 1.0 - progress;

      this.ctx.save();

      if (vfx.type === 'text') {
        const currY = vfx.startY - (progress * 35);
        this.ctx.globalAlpha = alpha;
        this.ctx.font = '900 18px Outfit, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#fde047';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        this.ctx.shadowBlur = 8;
        this.ctx.fillText(vfx.text, vfx.x, currY);
      } else if (vfx.type === 'spark') {
        vfx.x += vfx.vx;
        vfx.y += vfx.vy;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = vfx.color;
        this.ctx.beginPath();
        this.ctx.arc(vfx.x, vfx.y, vfx.size * (1 - progress * 0.5), 0, Math.PI * 2);
        this.ctx.fill();
      } else if (vfx.type === 'shockwave') {
        const radius = progress * vfx.maxRadius;
        this.ctx.globalAlpha = alpha;
        this.ctx.strokeStyle = vfx.color;
        this.ctx.lineWidth = 4 * (1 - progress);
        this.ctx.shadowColor = '#0284c7';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(vfx.x, vfx.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (vfx.type === 'holy_beam') {
        this.ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.85;
        const grad = this.ctx.createLinearGradient(vfx.x, 0, vfx.x, vfx.height);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, '#fef08a');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        this.ctx.fillStyle = grad;
        this.ctx.shadowColor = '#eab308';
        this.ctx.shadowBlur = 20;
        this.ctx.fillRect(vfx.x - (vfx.width / 2), 0, vfx.width * (1 + progress * 0.4), vfx.height);
      } else if (vfx.type === 'dust') {
        vfx.x += vfx.vx;
        vfx.y += vfx.vy;
        this.ctx.globalAlpha = alpha * 0.7;
        this.ctx.fillStyle = vfx.color;
        this.ctx.beginPath();
        this.ctx.arc(vfx.x, vfx.y, vfx.size * (1 + progress * 0.5), 0, Math.PI * 2);
        this.ctx.fill();
      } else if (vfx.type === 'queen_nova') {
        const radius = progress * vfx.maxRadius;
        this.ctx.globalAlpha = alpha;
        this.ctx.strokeStyle = vfx.color;
        this.ctx.lineWidth = 6 * (1 - progress);
        this.ctx.shadowColor = '#a855f7';
        this.ctx.shadowBlur = 25;
        this.ctx.beginPath();
        this.ctx.arc(vfx.x, vfx.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (vfx.type === 'royal_starburst') {
        const radius = progress * vfx.maxRadius;
        this.ctx.globalAlpha = alpha;
        this.ctx.strokeStyle = vfx.color;
        this.ctx.lineWidth = 5 * (1 - progress);
        this.ctx.shadowColor = '#eab308';
        this.ctx.shadowBlur = 25;
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const sx = vfx.x + Math.cos(angle) * (radius * 0.3);
          const sy = vfx.y + Math.sin(angle) * (radius * 0.3);
          const ex = vfx.x + Math.cos(angle) * radius;
          const ey = vfx.y + Math.sin(angle) * radius;
          this.ctx.moveTo(sx, sy);
          this.ctx.lineTo(ex, ey);
        }
        this.ctx.stroke();
      }

      this.ctx.restore();
      return true;
    });
  }

  updateSidebarCommentary(rating) {
    if (this.commentaryBoxEl) {
      this.commentaryBoxEl.innerHTML = `${rating.badgeHTML} <span>${rating.commentary}</span>`;
      if (rating.type === 'blunder') {
        this.triggerBoardShake();
      }
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

  triggerBoardShake() {
    this.boardEl.classList.remove('board-shake');
    void this.boardEl.offsetWidth;
    this.boardEl.classList.add('board-shake');
    setTimeout(() => this.boardEl.classList.remove('board-shake'), 250);
  }

  undoMove() {
    if (this.game.history().length === 0) return;
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
    if (this.game.game_over()) return;
    const aiThinking = document.getElementById('aiThinking');
    if (aiThinking) aiThinking.style.display = 'flex';

    setTimeout(() => {
      try {
        const evalBefore = evaluateBoard(this.game);
        const turnMoving = this.game.turn();
        const bestMove = getBestMove(this.game, this.gameMode);

        if (bestMove) {
          const attackingPiece = this.game.get(bestMove.from);
          const moveRes = this.game.move(bestMove);

          if (moveRes) {
            this.lastMove = { from: moveRes.from, to: moveRes.to };
            if (moveRes.captured) {
              const capSymbol = moveRes.color === 'w' ? moveRes.captured.toLowerCase() : moveRes.captured.toUpperCase();
              if (moveRes.color === 'w') this.capturedBlack.push(capSymbol);
              else this.capturedWhite.push(capSymbol);

              this.triggerCanvasVFX(attackingPiece ? attackingPiece.type.toLowerCase() : 'p', moveRes.to);
            }

            const evalAfter = evaluateBoard(this.game);
            const rating = classifyMove(moveRes, evalBefore, evalAfter, turnMoving);
            this.updateSidebarCommentary(rating);
            this.updateEvalGauge();
          }
        }
      } catch (err) {
        console.error("AI execution error, executing fallback random move:", err);
        const moves = this.game.moves({ verbose: true });
        if (moves.length > 0) {
          const randMove = moves[Math.floor(Math.random() * moves.length)];
          const moveRes = this.game.move(randMove);
          if (moveRes) {
            this.lastMove = { from: moveRes.from, to: moveRes.to };
            if (moveRes.captured) {
              const capSymbol = moveRes.color === 'w' ? moveRes.captured.toLowerCase() : moveRes.captured.toUpperCase();
              if (moveRes.color === 'w') this.capturedBlack.push(capSymbol);
              else this.capturedWhite.push(capSymbol);
            }
            this.updateEvalGauge();
          }
        }
      }

      if (aiThinking) aiThinking.style.display = 'none';
      this.selectedSq = null;
      this.legalMoves = [];
      this.renderBoard();
      this.updateHUD();
      this.checkGameState();
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
