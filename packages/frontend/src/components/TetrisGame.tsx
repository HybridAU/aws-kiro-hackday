import { useState, useEffect, useCallback, useRef } from 'react';

// Tetris piece shapes
const PIECES = {
  I: { shape: [[1, 1, 1, 1]], color: 'bg-cyan-400' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-400' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-400' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-400' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-400' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-400' },
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

type PieceType = keyof typeof PIECES;

interface TetrisGameProps {
  onClose: () => void;
}

export function TetrisGame({ onClose }: TetrisGameProps) {
  const [board, setBoard] = useState<(string | null)[][]>(() =>
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<{
    type: PieceType;
    x: number;
    y: number;
    shape: number[][];
  } | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);

  const getRandomPiece = useCallback((): PieceType => {
    const pieces = Object.keys(PIECES) as PieceType[];
    return pieces[Math.floor(Math.random() * pieces.length)];
  }, []);

  const spawnPiece = useCallback(() => {
    const type = getRandomPiece();
    const piece = PIECES[type];
    setCurrentPiece({
      type,
      x: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
      y: 0,
      shape: piece.shape,
    });
  }, [getRandomPiece]);


  const checkCollision = useCallback((shape: number[][], x: number, y: number, boardState: (string | null)[][]) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
          if (newY >= 0 && boardState[newY][newX]) return true;
        }
      }
    }
    return false;
  }, []);

  const rotatePiece = useCallback((shape: number[][]) => {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated: number[][] = [];
    for (let col = 0; col < cols; col++) {
      rotated.push([]);
      for (let row = rows - 1; row >= 0; row--) {
        rotated[col].push(shape[row][col]);
      }
    }
    return rotated;
  }, []);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;
    const newBoard = board.map(row => [...row]);
    const color = PIECES[currentPiece.type].color;
    
    for (let row = 0; row < currentPiece.shape.length; row++) {
      for (let col = 0; col < currentPiece.shape[row].length; col++) {
        if (currentPiece.shape[row][col]) {
          const y = currentPiece.y + row;
          const x = currentPiece.x + col;
          if (y >= 0) newBoard[y][x] = color;
        }
      }
    }

    // Check for completed lines
    let linesCleared = 0;
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (newBoard[row].every(cell => cell !== null)) {
        newBoard.splice(row, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(null));
        linesCleared++;
        row++;
      }
    }
    setScore(prev => prev + linesCleared * 100 + 10);
    setBoard(newBoard);
    setCurrentPiece(null);
  }, [currentPiece, board]);


  const moveDown = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    if (checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1, board)) {
      if (currentPiece.y <= 0) {
        setGameOver(true);
        return;
      }
      lockPiece();
    } else {
      setCurrentPiece(prev => prev ? { ...prev, y: prev.y + 1 } : null);
    }
  }, [currentPiece, board, gameOver, isPaused, checkCollision, lockPiece]);

  const moveHorizontal = useCallback((dir: number) => {
    if (!currentPiece || gameOver || isPaused) return;
    if (!checkCollision(currentPiece.shape, currentPiece.x + dir, currentPiece.y, board)) {
      setCurrentPiece(prev => prev ? { ...prev, x: prev.x + dir } : null);
    }
  }, [currentPiece, board, gameOver, isPaused, checkCollision]);

  const rotate = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    const rotated = rotatePiece(currentPiece.shape);
    if (!checkCollision(rotated, currentPiece.x, currentPiece.y, board)) {
      setCurrentPiece(prev => prev ? { ...prev, shape: rotated } : null);
    }
  }, [currentPiece, board, gameOver, isPaused, rotatePiece, checkCollision]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    let newY = currentPiece.y;
    while (!checkCollision(currentPiece.shape, currentPiece.x, newY + 1, board)) {
      newY++;
    }
    setCurrentPiece(prev => prev ? { ...prev, y: newY } : null);
  }, [currentPiece, board, gameOver, isPaused, checkCollision]);

  // Spawn piece when none exists
  useEffect(() => {
    if (!currentPiece && !gameOver) spawnPiece();
  }, [currentPiece, gameOver, spawnPiece]);

  // Game loop
  useEffect(() => {
    if (gameOver || isPaused) return;
    const interval = setInterval(moveDown, 500);
    return () => clearInterval(interval);
  }, [moveDown, gameOver, isPaused]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveHorizontal(-1);
      else if (e.key === 'ArrowRight') moveHorizontal(1);
      else if (e.key === 'ArrowDown') moveDown();
      else if (e.key === 'ArrowUp') rotate();
      else if (e.key === ' ') hardDrop();
      else if (e.key === 'p' || e.key === 'P') setIsPaused(p => !p);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHorizontal, moveDown, rotate, hardDrop, onClose]);

  // Focus game on mount
  useEffect(() => { gameRef.current?.focus(); }, []);


  const restart = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)));
    setCurrentPiece(null);
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
  };

  // Render board with current piece
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    if (currentPiece) {
      const color = PIECES[currentPiece.type].color;
      for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
          if (currentPiece.shape[row][col]) {
            const y = currentPiece.y + row;
            const x = currentPiece.x + col;
            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
              displayBoard[y][x] = color;
            }
          }
        }
      }
    }
    return displayBoard;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={onClose}>
      <div 
        ref={gameRef}
        tabIndex={0}
        onClick={e => e.stopPropagation()}
        className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6 rounded-2xl shadow-2xl border border-white/20"
      >
        <div className="flex gap-6">
          {/* Game Board */}
          <div className="bg-black/50 p-2 rounded-lg border border-white/10">
            <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}>
              {renderBoard().flat().map((cell, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-sm ${cell || 'bg-gray-800/50'} ${cell ? 'shadow-inner' : ''}`}
                />
              ))}
            </div>
          </div>


          {/* Side Panel */}
          <div className="flex flex-col gap-4 min-w-[140px]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                🎮 TETRIS
              </h2>
              <p className="text-xs text-white/50 mt-1">Easter Egg Edition</p>
            </div>

            <div className="bg-black/30 rounded-lg p-3 text-center">
              <p className="text-white/60 text-xs uppercase tracking-wider">Score</p>
              <p className="text-2xl font-bold text-white">{score}</p>
            </div>

            {gameOver && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-center">
                <p className="text-red-400 font-bold">GAME OVER</p>
                <button
                  onClick={restart}
                  className="mt-2 bg-white/10 hover:bg-white/20 text-white px-4 py-1 rounded text-sm"
                >
                  Play Again
                </button>
              </div>
            )}

            {isPaused && !gameOver && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-center">
                <p className="text-yellow-400 font-bold">PAUSED</p>
              </div>
            )}

            <div className="bg-black/30 rounded-lg p-3 text-xs text-white/60 space-y-1">
              <p className="text-white/80 font-semibold mb-2">Controls:</p>
              <p>← → Move</p>
              <p>↑ Rotate</p>
              <p>↓ Soft drop</p>
              <p>Space Hard drop</p>
              <p>P Pause</p>
              <p>Esc Close</p>
            </div>

            <button
              onClick={onClose}
              className="mt-auto bg-white/10 hover:bg-white/20 text-white/80 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
