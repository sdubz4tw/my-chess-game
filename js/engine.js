/**
 * FIDE Chess Rules Engine & Computer AI (Minimax with Alpha-Beta Pruning)
 */

export const INITIAL_BOARD = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

export class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = INITIAL_BOARD.map(row => [...row]);
    this.turn = 'white';
    this.enPassantTarget = null;
    this.hasMoved = {
      whiteKing: false, blackKing: false,
      whiteRookK: false, whiteRookQ: false,
      blackRookK: false, blackRookQ: false
    };
    this.moveHistory = [];
    this.capturedWhite = [];
    this.capturedBlack = [];
    this.isGameOver = false;
  }

  cloneBoard(b = this.board) {
    return b.map(row => [...row]);
  }

  isWhitePiece(p) { return p && p === p.toUpperCase(); }
  isBlackPiece(p) { return p && p === p.toLowerCase(); }
  getPieceColor(p) { return this.isWhitePiece(p) ? 'white' : 'black'; }

  findKing(color, b = this.board) {
    const kingChar = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c] === kingChar) return { r, c };
      }
    }
    return null;
  }

  isSquareAttacked(targetR, targetC, attackerColor, b = this.board) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && this.getPieceColor(p) === attackerColor) {
          const moves = this.getPseudoLegalMoves(r, c, b, true);
          if (moves.some(m => m.r === targetR && m.c === targetC)) return true;
        }
      }
    }
    return false;
  }

  isInCheck(color, b = this.board) {
    const kingPos = this.findKing(color, b);
    if (!kingPos) return false;
    const oppColor = color === 'white' ? 'black' : 'white';
    return this.isSquareAttacked(kingPos.r, kingPos.c, oppColor, b);
  }

  getPseudoLegalMoves(r, c, b = this.board, attackOnly = false) {
    const piece = b[r][c];
    if (!piece) return [];
    const color = this.getPieceColor(piece);
    const moves = [];
    const type = piece.toLowerCase();

    const addMove = (nr, nc) => {
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return false;
      const target = b[nr][nc];
      if (!target) { moves.push({ r: nr, c: nc }); return true; }
      if (this.getPieceColor(target) !== color) { moves.push({ r: nr, c: nc }); }
      return false;
    };

    if (type === 'p') {
      const dir = color === 'white' ? -1 : 1;
      const startR = color === 'white' ? 6 : 1;

      if (!attackOnly) {
        if (r + dir >= 0 && r + dir <= 7 && !b[r + dir][c]) {
          moves.push({ r: r + dir, c });
          if (r === startR && !b[r + 2 * dir][c]) {
            moves.push({ r: r + 2 * dir, c, isDoubleStep: true });
          }
        }
      }

      [-1, 1].forEach(dc => {
        const nr = r + dir, nc = c + dc;
        if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
          if (attackOnly) {
            moves.push({ r: nr, c: nc });
          } else {
            const target = b[nr][nc];
            if (target && this.getPieceColor(target) !== color) {
              moves.push({ r: nr, c: nc });
            }
            if (this.enPassantTarget && this.enPassantTarget.r === nr && this.enPassantTarget.c === nc) {
              moves.push({ r: nr, c: nc, isEnPassant: true });
            }
          }
        }
      });
    } else if (type === 'n') {
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => addMove(r+dr, c+dc));
    } else if (type === 'k') {
      for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++) if(dr||dc) addMove(r+dr, c+dc);

      if (!attackOnly) {
        if (this.canCastle(color, 'kingside', b)) {
          moves.push({ r: r, c: 6, isCastling: 'kingside' });
        }
        if (this.canCastle(color, 'queenside', b)) {
          moves.push({ r: r, c: 2, isCastling: 'queenside' });
        }
      }
    } else {
      const dirs = (type === 'r' || type === 'q') ? [[-1,0],[1,0],[0,-1],[0,1]] : [];
      if (type === 'b' || type === 'q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      dirs.forEach(([dr,dc]) => {
        let nr = r+dr, nc = c+dc;
        while(addMove(nr,nc)) { nr += dr; nc += dc; }
      });
    }

    return moves;
  }

  canCastle(color, side, b = this.board) {
    const isWhite = color === 'white';
    const kr = isWhite ? 7 : 0;
    const oppColor = isWhite ? 'black' : 'white';
    const rookChar = isWhite ? 'R' : 'r';

    const kingMoved = isWhite ? this.hasMoved.whiteKing : this.hasMoved.blackKing;
    if (kingMoved) return false;

    if (this.isInCheck(color, b)) return false;

    if (side === 'kingside') {
      const rookMoved = isWhite ? this.hasMoved.whiteRookK : this.hasMoved.blackRookK;
      if (rookMoved || b[kr][7] !== rookChar) return false;
      if (b[kr][5] || b[kr][6]) return false;
      if (this.isSquareAttacked(kr, 5, oppColor, b) || this.isSquareAttacked(kr, 6, oppColor, b)) return false;
      return true;
    } else if (side === 'queenside') {
      const rookMoved = isWhite ? this.hasMoved.whiteRookQ : this.hasMoved.blackRookQ;
      if (rookMoved || b[kr][0] !== rookChar) return false;
      if (b[kr][1] || b[kr][2] || b[kr][3]) return false;
      if (this.isSquareAttacked(kr, 3, oppColor, b) || this.isSquareAttacked(kr, 2, oppColor, b)) return false;
      return true;
    }

    return false;
  }

  isValidMove(fromR, fromC, toR, toC, b = this.board) {
    const piece = b[fromR][fromC];
    if (!piece) return false;
    const color = this.getPieceColor(piece);

    const simBoard = this.cloneBoard(b);
    if (piece.toLowerCase() === 'p' && this.enPassantTarget && toR === this.enPassantTarget.r && toC === this.enPassantTarget.c) {
      simBoard[fromR][toC] = '';
    }

    simBoard[toR][toC] = piece;
    simBoard[fromR][fromC] = '';

    return !this.isInCheck(color, simBoard);
  }

  getLegalMoves(r, c) {
    const piece = this.board[r][c];
    if (!piece) return [];
    const color = this.getPieceColor(piece);
    if (color !== this.turn) return [];

    const pseudoMoves = this.getPseudoLegalMoves(r, c, this.board);
    return pseudoMoves.filter(m => this.isValidMove(r, c, m.r, m.c, this.board));
  }

  getAllLegalMovesForColor(color, b = this.board) {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = b[r][c];
        if (piece && this.getPieceColor(piece) === color) {
          const origTurn = this.turn;
          this.turn = color;
          const pseudo = this.getPseudoLegalMoves(r, c, b);
          const legal = pseudo.filter(m => this.isValidMove(r, c, m.r, m.c, b));
          this.turn = origTurn;
          legal.forEach(m => allMoves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, ...m }));
        }
      }
    }
    return allMoves;
  }

  executeMove(fromR, fromC, toR, toC, promotionChoice = null) {
    if (this.isGameOver) return null;

    const piece = this.board[fromR][fromC];
    const target = this.board[toR][toC];
    const isWhite = this.isWhitePiece(piece);

    // Check Pawn Promotion
    if (piece.toLowerCase() === 'p' && (toR === 0 || toR === 7) && !promotionChoice) {
      return { needsPromotion: true, fromR, fromC, toR, toC, isWhite };
    }

    if (target) {
      if (this.isWhitePiece(target)) this.capturedWhite.push(target);
      else this.capturedBlack.push(target);
    }

    const isEP = piece.toLowerCase() === 'p' && this.enPassantTarget && toR === this.enPassantTarget.r && toC === this.enPassantTarget.c;
    if (isEP) {
      const epPawn = this.board[fromR][toC];
      if (epPawn) {
        if (this.isWhitePiece(epPawn)) this.capturedWhite.push(epPawn);
        else this.capturedBlack.push(epPawn);
      }
      this.board[fromR][toC] = '';
    }

    if (piece.toLowerCase() === 'k' && Math.abs(toC - fromC) === 2) {
      if (toC === 6) {
        this.board[fromR][5] = this.board[fromR][7];
        this.board[fromR][7] = '';
        this.moveHistory.push({ notation: 'O-O', piece });
      } else if (toC === 2) {
        this.board[fromR][3] = this.board[fromR][0];
        this.board[fromR][0] = '';
        this.moveHistory.push({ notation: 'O-O-O', piece });
      }
    } else {
      const files = ['a','b','c','d','e','f','g','h'];
      const pieceSym = piece.toUpperCase() === 'P' ? '' : piece.toUpperCase();
      const capSym = (target || isEP) ? 'x' : '';
      const notation = `${pieceSym}${files[fromC]}${8-fromR}${capSym}${files[toC]}${8-toR}`;
      this.moveHistory.push({ notation, piece });
    }

    this.board[toR][toC] = promotionChoice ? (isWhite ? promotionChoice.toUpperCase() : promotionChoice.toLowerCase()) : piece;
    this.board[fromR][fromC] = '';

    if (piece.toLowerCase() === 'p' && Math.abs(toR - fromR) === 2) {
      this.enPassantTarget = { r: (fromR + toR) / 2, c: fromC };
    } else {
      this.enPassantTarget = null;
    }

    if (piece === 'K') this.hasMoved.whiteKing = true;
    if (piece === 'k') this.hasMoved.blackKing = true;
    if (piece === 'R' && fromR === 7 && fromC === 7) this.hasMoved.whiteRookK = true;
    if (piece === 'R' && fromR === 7 && fromC === 0) this.hasMoved.whiteRookQ = true;
    if (piece === 'r' && fromR === 0 && fromC === 7) this.hasMoved.blackRookK = true;
    if (piece === 'r' && fromR === 0 && fromC === 0) this.hasMoved.blackRookQ = true;

    this.turn = this.turn === 'white' ? 'black' : 'white';
    return { success: true };
  }

  evaluateBoard(b = this.board) {
    const PIECE_VALUES = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p) {
          const val = PIECE_VALUES[p.toLowerCase()] || 0;
          if (this.isWhitePiece(p)) score += val;
          else score -= val;
        }
      }
    }
    return score;
  }

  minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) return this.evaluateBoard(this.board);

    const color = isMaximizing ? 'white' : 'black';
    const moves = this.getAllLegalMovesForColor(color, this.board);
    if (moves.length === 0) return this.evaluateBoard(this.board);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let m of moves) {
        const tempFrom = this.board[m.fromR][m.fromC];
        const tempTo = this.board[m.toR][m.toC];
        this.board[m.toR][m.toC] = tempFrom;
        this.board[m.fromR][m.fromC] = '';

        const evaluation = this.minimax(depth - 1, alpha, beta, false);

        this.board[m.fromR][m.fromC] = tempFrom;
        this.board[m.toR][m.toC] = tempTo;

        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let m of moves) {
        const tempFrom = this.board[m.fromR][m.fromC];
        const tempTo = this.board[m.toR][m.toC];
        this.board[m.toR][m.toC] = tempFrom;
        this.board[m.fromR][m.fromC] = '';

        const evaluation = this.minimax(depth - 1, alpha, beta, true);

        this.board[m.fromR][m.fromC] = tempFrom;
        this.board[m.toR][m.toC] = tempTo;

        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  getBestAIMove(aiColor, mode = 'ai-medium') {
    const moves = this.getAllLegalMovesForColor(aiColor, this.board);
    if (moves.length === 0) return null;

    if (mode === 'ai-easy') {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    const depth = mode === 'ai-hard' ? 3 : 2;
    const isMaximizing = aiColor === 'white';
    let bestVal = isMaximizing ? -Infinity : Infinity;
    let bestMove = null;

    moves.sort(() => Math.random() - 0.5);

    for (let m of moves) {
      const tempFrom = this.board[m.fromR][m.fromC];
      const tempTo = this.board[m.toR][m.toC];
      this.board[m.toR][m.toC] = tempFrom;
      this.board[m.fromR][m.fromC] = '';

      const val = this.minimax(depth - 1, -Infinity, Infinity, !isMaximizing);

      this.board[m.fromR][m.fromC] = tempFrom;
      this.board[m.toR][m.toC] = tempTo;

      if (isMaximizing ? (val > bestVal) : (val < bestVal)) {
        bestVal = val;
        bestMove = m;
      }
    }

    return bestMove;
  }
}
