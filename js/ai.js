/**
 * 2D Chess.com AI Engine & Live Move Evaluation Classification (Sidebar Badges Edition)
 */

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

export function evaluateBoard(game) {
  let totalScore = 0;
  const board = game.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const val = PIECE_VALUES[piece.type] || 0;
        const pstTable = PST[piece.type] || [];
        const pstScore = pstTable[piece.color === 'w' ? r : 7 - r] ? pstTable[piece.color === 'w' ? r : 7 - r][c] : 0;
        const totalVal = val + pstScore;

        if (piece.color === 'w') totalScore += totalVal;
        else totalScore -= totalVal;
      }
    }
  }
  return totalScore;
}

export function classifyMove(move, evalBefore, evalAfter, turn) {
  const delta = (turn === 'w') ? (evalAfter - evalBefore) : (evalBefore - evalAfter);

  if (move.captured && delta >= 120) {
    return {
      type: 'brilliant',
      badgeHTML: '<span class="badge-tag badge-brilliant">✨ BRILLIANT</span>',
      commentary: `${turn === 'w' ? 'White' : 'Black'} plays a brilliant tactical sacrifice!`
    };
  }
  if (delta >= 40) {
    return {
      type: 'great',
      badgeHTML: '<span class="badge-tag badge-great">⚡ GREAT</span>',
      commentary: `${turn === 'w' ? 'White' : 'Black'} seizes control of key squares.`
    };
  }
  if (delta >= -40) {
    return {
      type: 'good',
      badgeHTML: '<span class="badge-tag badge-good">GOOD</span>',
      commentary: `Solid development by ${turn === 'w' ? 'White' : 'Black'}.`
    };
  }
  if (delta >= -180) {
    return {
      type: 'mistake',
      badgeHTML: '<span class="badge-tag badge-mistake">⚠️ MISTAKE</span>',
      commentary: `Slight misstep opening up defensive gaps.`
    };
  }
  return {
    type: 'blunder',
    badgeHTML: '<span class="badge-tag badge-blunder">💥 BLUNDER</span>',
    commentary: `Disaster! ${turn === 'w' ? 'White' : 'Black'} leaves a piece exposed!`
  };
}

function minimax(game, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || game.game_over()) return evaluateBoard(game);

  const moves = game.moves({ verbose: true });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let m of moves) {
      game.move(m);
      const ev = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let m of moves) {
      game.move(m);
      const ev = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestMove(game, difficulty = 'ai-medium') {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  if (difficulty === 'ai-easy') {
    if (Math.random() < 0.4) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }

  const searchDepth = (difficulty === 'ai-hard') ? 3 : (difficulty === 'ai-medium' ? 2 : 1);
  const isMaximizing = game.turn() === 'w';
  let bestMove = null;
  let bestEval = isMaximizing ? -Infinity : Infinity;

  moves.sort(() => Math.random() - 0.5);

  for (let m of moves) {
    game.move(m);
    const ev = minimax(game, searchDepth - 1, -Infinity, Infinity, !isMaximizing);
    game.undo();

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
