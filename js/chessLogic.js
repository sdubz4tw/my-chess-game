/**
 * FIDE Chess Engine & Minimax Computer AI
 */

export class ChessLogic {
  constructor() {
    this.board = [];
    this.turn = 'white';
    this.history = [];
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
    this.history = [];
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

      // Castling
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

  getAllLegalMovesForColor(color) {
    let moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.getPieceColor(this.board[r][c]) === color) {
          const pieceMoves = this.getLegalMoves(r, c);
          pieceMoves.forEach(m => moves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, move: m }));
        }
      }
    }
    return moves;
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

    // Record Move History
    const colNames = ['a','b','c','d','e','f','g','h'];
    const notation = `${piece.toUpperCase() !== 'P' ? piece.toUpperCase() : ''}${colNames[toC]}${8 - toR}`;
    this.moveHistory.push({ piece, fromR, fromC, toR, toC, notation, captured });

    // Switch Turn
    this.turn = this.turn === 'white' ? 'black' : 'white';
    return { success: true, captured };
  }

  getBestAIMove(aiColor, difficulty = 'ai-medium') {
    const moves = this.getAllLegalMovesForColor(aiColor);
    if (moves.length === 0) return null;

    if (difficulty === 'ai-easy') {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestMove = null;
    let bestScore = -Infinity;

    for (let m of moves) {
      const target = this.board[m.toR][m.toC];
      let score = 0;
      const values = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 100 };
      if (target) score += (values[target.toLowerCase()] || 1) * 10;
      if (m.toR >= 3 && m.toR <= 4 && m.toC >= 3 && m.toC <= 4) score += 2;

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    return bestMove || moves[Math.floor(Math.random() * moves.length)];
  }
}
