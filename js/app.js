/**
 * 2D Chess.com Main Web Application Controller & Renderer (Piece-Specific Arcade Capture VFX & Floating Text)
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
    this.arcadeBannerEl = document.getElementById('arcadeBanner');
    this.arcadeTextEl = document.getElementById('arcadeText');
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

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderBoard();
    this.updateHUD();
    this.updateEvalGauge();
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

    document.getElementById('checkBadge').style.display = 'none';
    document.getElementById('promotionModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
    if (this.commentaryBoxEl) this.commentaryBoxEl.textContent = "Game started. Make your opening move!";

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

        // Piece-Specific Capture Visual Effects
        this.triggerCaptureVFX(attackingPiece ? attackingPiece.type.toLowerCase() : 'p', to);
      }

      const evalAfter = evaluateBoard(this.game);
      const rating = classifyMove(move, evalBefore, evalAfter, turnMoving);
      this.showArcadeRating(rating);
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
   * PIECE-SPECIFIC ARCADE CAPTURE VFX & FLOATING COMBAT TEXT
   */
  triggerCaptureVFX(pieceType, targetSq) {
    const sqEl = document.querySelector(`.sq[data-sq="${targetSq}"]`);
    if (!sqEl) return;

    // 1. Floating Combat Text
    const textStr = PIECE_CAPTURE_TEXT[pieceType] || 'CRUSH!';
    const floatEl = document.createElement('div');
    floatEl.className = 'vfx-floating-text';
    floatEl.textContent = textStr;
    sqEl.appendChild(floatEl);

    // 2. Visual Particle & FX Overlays
    const vfxDiv = document.createElement('div');
    if (pieceType === 'p') {
      vfxDiv.className = 'vfx-spark-burst';
    } else if (pieceType === 'n') {
      vfxDiv.className = 'vfx-shockwave-ring';
    } else if (pieceType === 'b') {
      vfxDiv.className = 'vfx-holy-beam';
    } else if (pieceType === 'r') {
      vfxDiv.className = 'vfx-dust-trail';
      this.triggerBoardShake();
    } else if (pieceType === 'q') {
      vfxDiv.className = 'vfx-nova-ring';
      this.triggerBoardShake();
    } else if (pieceType === 'k') {
      vfxDiv.className = 'vfx-royal-aura';
    }

    sqEl.appendChild(vfxDiv);

    // Clean up temporary DOM nodes after animation
    setTimeout(() => {
      if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
      if (vfxDiv.parentNode) vfxDiv.parentNode.removeChild(vfxDiv);
    }, 650);
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

  showArcadeRating(rating) {
    if (this.commentaryBoxEl) {
      this.commentaryBoxEl.textContent = rating.commentary;
    }

    if (rating.bannerText && this.arcadeTextEl && this.arcadeBannerEl) {
      this.arcadeTextEl.textContent = rating.bannerText;
      this.arcadeTextEl.className = `arcade-text ${rating.type}`;
      this.arcadeBannerEl.className = 'arcade-banner show-banner';

      if (rating.type === 'blunder') {
        this.triggerBoardShake();
      }

      setTimeout(() => {
        this.arcadeBannerEl.className = 'arcade-banner';
      }, 1100);
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
              
              this.triggerCaptureVFX(attackingPiece ? attackingPiece.type.toLowerCase() : 'p', moveRes.to);
            }

            const evalAfter = evaluateBoard(this.game);
            const rating = classifyMove(moveRes, evalBefore, evalAfter, turnMoving);
            this.showArcadeRating(rating);
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
