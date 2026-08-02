/**
 * Strict FIDE Chess Engine & Minimax Alpha-Beta AI with Positional PST Tables
 */

// Positional Piece-Square Evaluation Tables (PST)
const PST = {
  p: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

export class ChessLogic {
  constructor() {
    this.board = [];
    this.turn = 'white';
    this.moveHistory = [];
    this.capturedWhite = [];
    this.capturedBlack = [];
    this.isGameOver = false;
    this.enPassantTarget = null;
    this.castlingRights = {
      whiteKingMoved: false, whiteRookKMoved: false, whiteRookQMoved: false,
      blackKingMoved: false, blackRookKMoved: false, blackRookQMoved: false
    };

    this.reset();
  }

  reset() {
    this.board = [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    this.turn = 'white';
    this.moveHistory = [];
    this.capturedWhite = [];
    this.capturedBlack = [];
    this.isGameOver = false;
    this.enPassantTarget = null;
    this.castlingRights = {
      whiteKingMoved: false, whiteRookKMoved: false, whiteRookQMoved: false,
      blackKingMoved: false, blackRookKMoved: false, blackRookQMoved: false
    };
  }

  getPieceColor(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? 'white' : 'black';
  }

  isSquareOnBoard(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  getRawMoves(r, c, board = this.board) {
    const piece = board[r][c];
    if (!piece) return [];
    const color = this.getPieceColor(piece);
    const type = piece.toLowerCase();
    const moves = [];

    const addMove = (tr, tc, isCastling = false, isEnPassant = false) => {
      if (!this.isSquareOnBoard(tr, tc)) return false;
      const target = board[tr][tc];
      if (!target) {
        moves.push({ r: tr, c: tc, isCastling, isEnPassant });
        return true;
      }
      if (this.getPieceColor(target) !== color) {
        moves.push({ r: tr, c: tc, isCastling, isEnPassant });
      }
      return false;
    };

    if (type === 'p') {
      const dir = color === 'white' ? -1 : 1;
      const startRank = color === 'white' ? 6 : 1;

      if (this.isSquareOnBoard(r + dir, c) && board[r + dir][c] === '') {
        moves.push({ r: r + dir, c });
        if (r === startRank && board[r + 2 * dir][c] === '') {
          moves.push({ r: r + 2 * dir, c });
        }
      }

      [-1, 1].forEach(dc => {
        const tr = r + dir;
        const tc = c + dc;
        if (this.isSquareOnBoard(tr, tc)) {
          const target = board[tr][tc];
          if (target && this.getPieceColor(target) !== color) {
            moves.push({ r: tr, c: tc });
          } else if (this.enPassantTarget && this.enPassantTarget.r === tr && this.enPassantTarget.c === tc) {
            moves.push({ r: tr, c: tc, isEnPassant: true });
          }
        }
      });
    } else if (type === 'n') {
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    } else if (type === 'b') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      dirs.forEach(([dr, dc]) => {
        let tr = r + dr, tc = c + dc;
        while (addMove(tr, tc)) { tr += dr; tc += dc; }
      });
    } else if (type === 'r') {
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      dirs.forEach(([dr, dc]) => {
        let tr = r + dr, tc = c + dc;
        while (addMove(tr, tc)) { tr += dr; tc += dc; }
      });
    } else if (type === 'q') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      dirs.forEach(([dr, dc]) => {
        let tr = r + dr, tc = c + dc;
        while (addMove(tr, tc)) { tr += dr; tc += dc; }
      });
    } else if (type === 'k') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      dirs.forEach(([dr, dc]) => addMove(r + dr, c + dc));

      // Castling Validation
      if (color === 'white' && r === 7 && c === 4 && !this.castlingRights.whiteKingMoved) {
        if (!this.castlingRights.whiteRookKMoved && board[7][5] === '' && board[7][6] === '' && board[7][7] === 'R') {
          if (!this.isSquareAttacked(7, 4, 'black') && !this.isSquareAttacked(7, 5, 'black') && !this.isSquareAttacked(7, 6, 'black')) {
            moves.push({ r: 7, c: 6, isCastling: true });
          }
        }
        if (!this.castlingRights.whiteRookQMoved && board[7][3] === '' && board[7][2] === '' && board[7][1] === '' && board[7][0] === 'R') {
          if (!this.isSquareAttacked(7, 4, 'black') && !this.isSquareAttacked(7, 3, 'black') && !this.isSquareAttacked(7, 2, 'black')) {
            moves.push({ r: 7, c: 2, isCastling: true });
          }
        }
      } else if (color === 'black' && r === 0 && c === 4 && !this.castlingRights.blackKingMoved) {
        if (!this.castlingRights.blackRookKMoved && board[0][5] === '' && board[0][6] === '' && board[0][7] === 'r') {
          if (!this.isSquareAttacked(0, 4, 'white') && !this.isSquareAttacked(0, 5, 'white') && !this.isSquareAttacked(0, 6, 'white')) {
            moves.push({ r: 0, c: 6, isCastling: true });
          }
        }
        if (!this.castlingRights.blackRookQMoved && board[0][3] === '' && board[0][2] === '' && board[0][1] === '' && board[0][0] === 'r') {
          if (!this.isSquareAttacked(0, 4, 'white') && !this.isSquareAttacked(0, 3, 'white') && !this.isSquareAttacked(0, 2, 'white')) {
            moves.push({ r: 0, c: 2, isCastling: true });
          }
        }
      }
    }

    return moves;
  }

  isSquareAttacked(r, c, attackerColor, board = this.board) {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && this.getPieceColor(piece) === attackerColor) {
          const raw = this.getRawMoves(i, j, board);
          if (raw.some(m => m.r === r && m.c === c)) return true;
        }
      }
    }
    return false;
  }

  findKing(color, board = this.board) {
    const kingSymbol = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === kingSymbol) return { r, c };
      }
    }
    return null;
  }

  isInCheck(color, board = this.board) {
    const king = this.findKing(color, board);
    if (!king) return false;
    const opponent = color === 'white' ? 'black' : 'white';
    return this.isSquareAttacked(king.r, king.c, opponent, board);
  }

  getLegalMoves(r, c) {
    const piece = this.board[r][c];
    if (!piece || this.getPieceColor(piece) !== this.turn) return [];
    const raw = this.getRawMoves(r, c);

    return raw.filter(m => {
      const tempBoard = this.board.map(row => [...row]);
      tempBoard[m.r][m.c] = tempBoard[r][c];
      tempBoard[r][c] = '';
      if (m.isEnPassant) {
        const epRow = this.turn === 'white' ? m.r + 1 : m.r - 1;
        tempBoard[epRow][m.c] = '';
      }
      return !this.isInCheck(this.turn, tempBoard);
    });
  }

  getAllLegalMovesForColor(color, board = this.board) {
    let moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.getPieceColor(board[r][c]) === color) {
          const pieceMoves = this.getRawMoves(r, c, board).filter(m => {
            const tempBoard = board.map(row => [...row]);
            tempBoard[m.r][m.c] = tempBoard[r][c];
            tempBoard[r][c] = '';
            if (m.isEnPassant) {
              const epRow = color === 'white' ? m.r + 1 : m.r - 1;
              tempBoard[epRow][m.c] = '';
            }
            return !this.isInCheck(color, tempBoard);
          });
          pieceMoves.forEach(m => moves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, move: m }));
        }
      }
    }
    return moves;
  }

  hasInsufficientMaterial() {
    let pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p) pieces.push({ type: p.toLowerCase(), color: this.getPieceColor(p), squareColor: (r + c) % 2 });
      }
    }

    if (pieces.length === 2) return true; // K vs K

    if (pieces.length === 3) {
      const nonKings = pieces.filter(p => p.type !== 'k');
      if (nonKings.length === 1 && (nonKings[0].type === 'b' || nonKings[0].type === 'n')) {
        return true; // K+B or K+N vs K
      }
    }

    if (pieces.length === 4) {
      const bishops = pieces.filter(p => p.type === 'b');
      if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
        if (bishops[0].squareColor === bishops[1].squareColor) {
          return true; // K+B vs K+B (Same Square Color)
        }
      }
    }

    return false;
  }

  executeMove(fromR, fromC, toR, toC, promotionChoice = null) {
    const piece = this.board[fromR][fromC];
    if (!piece) return null;
    const color = this.getPieceColor(piece);

    // Pawn Promotion Check
    if (piece.toLowerCase() === 'p' && (toR === 0 || toR === 7)) {
      if (!promotionChoice) {
        return { needsPromotion: true, fromR, fromC, toR, toC, isWhite: color === 'white' };
      }
    }

    let captured = this.board[toR][toC];
    const isEnPassant = piece.toLowerCase() === 'p' && this.enPassantTarget && toR === this.enPassantTarget.r && toC === this.enPassantTarget.c;

    if (isEnPassant) {
      const epRow = color === 'white' ? toR + 1 : toR - 1;
      captured = this.board[epRow][toC];
      this.board[epRow][toC] = '';
    }

    if (captured) {
      if (color === 'white') this.capturedWhite.push(captured);
      else this.capturedBlack.push(captured);
    }

    // Move Piece
    this.board[toR][toC] = (promotionChoice) ? promotionChoice : piece;
    this.board[fromR][fromC] = '';

    // En Passant Target Setting
    if (piece.toLowerCase() === 'p' && Math.abs(toR - fromR) === 2) {
      this.enPassantTarget = { r: (fromR + toR) / 2, c: fromC };
    } else {
      this.enPassantTarget = null;
    }

    // Castling Rook Movement
    if (piece.toLowerCase() === 'k' && Math.abs(toC - fromC) === 2) {
      if (toC === 6) { // Kingside
        this.board[toR][5] = this.board[toR][7];
        this.board[toR][7] = '';
      } else if (toC === 2) { // Queenside
        this.board[toR][3] = this.board[toR][0];
        this.board[toR][0] = '';
      }
    }

    // Update Castling Rights
    if (piece === 'K') this.castlingRights.whiteKingMoved = true;
    if (piece === 'k') this.castlingRights.blackKingMoved = true;
    if (fromR === 7 && fromC === 7) this.castlingRights.whiteRookKMoved = true;
    if (fromR === 7 && fromC === 0) this.castlingRights.whiteRookQMoved = true;
    if (fromR === 0 && fromC === 7) this.castlingRights.blackRookKMoved = true;
    if (fromR === 0 && fromC === 0) this.castlingRights.blackRookQMoved = true;

    // Move Record
    const colNames = ['a','b','c','d','e','f','g','h'];
    const notation = `${piece.toUpperCase() !== 'P' ? piece.toUpperCase() : ''}${colNames[toC]}${8 - toR}`;
    this.moveHistory.push({ piece, fromR, fromC, toR, toC, notation, captured });

    // Switch Turn
    this.turn = this.turn === 'white' ? 'black' : 'white';
    return { success: true, captured };
  }

  // --- MINIMAX AI WITH POSITIONAL PST & ALPHA-BETA PRUNING ---
  evaluateBoard(board = this.board) {
    let totalScore = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          const color = this.getPieceColor(piece);
          const type = piece.toLowerCase();
          const val = PIECE_VALUES[type] || 0;
          const pstTable = PST[type] || [];
          const pstScore = pstTable[color === 'white' ? r : 7 - r] ? pstTable[color === 'white' ? r : 7 - r][c] : 0;
          const totalVal = val + pstScore;

          if (color === 'white') totalScore += totalVal;
          else totalScore -= totalVal;
        }
      }
    }
    return totalScore;
  }

  minimax(board, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return this.evaluateBoard(board);

    const color = isMaximizing ? 'white' : 'black';
    const moves = this.getAllLegalMovesForColor(color, board);

    if (moves.length === 0) {
      if (this.isInCheck(color, board)) return isMaximizing ? -100000 : 100000;
      return 0; // Stalemate
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let m of moves) {
        const tempBoard = board.map(row => [...row]);
        tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
        tempBoard[m.fromR][m.fromC] = '';
        const ev = this.minimax(tempBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let m of moves) {
        const tempBoard = board.map(row => [...row]);
        tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
        tempBoard[m.fromR][m.fromC] = '';
        const ev = this.minimax(tempBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  getBestAIMove(aiColor, difficulty = 'ai-medium') {
    const moves = this.getAllLegalMovesForColor(aiColor);
    if (moves.length === 0) return null;

    if (difficulty === 'ai-easy') {
      // 30% chance random move, 70% depth 1 evaluation
      if (Math.random() < 0.3) {
        return moves[Math.floor(Math.random() * moves.length)];
      }
    }

    const searchDepth = (difficulty === 'ai-hard') ? 3 : (difficulty === 'ai-medium' ? 2 : 1);
    const isMaximizing = aiColor === 'white';
    let bestMove = null;
    let bestEval = isMaximizing ? -Infinity : Infinity;

    // Shuffle moves for natural play style
    moves.sort(() => Math.random() - 0.5);

    for (let m of moves) {
      const tempBoard = this.board.map(row => [...row]);
      tempBoard[m.toR][m.toC] = tempBoard[m.fromR][m.fromC];
      tempBoard[m.fromR][m.fromC] = '';

      const ev = this.minimax(tempBoard, searchDepth - 1, -Infinity, Infinity, !isMaximizing);

      if (isMaximizing) {
        if (ev > bestEval) {
          bestEval = ev;
          bestMove = m;
        }
      } else {
        if (ev < bestEval) {
          bestEval = ev;
          bestMove = m;
        }
      }
    }

    return bestMove || moves[Math.floor(Math.random() * moves.length)];
  }
}
