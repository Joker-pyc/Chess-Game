
    class ChessGame {
      constructor() {
        this.board = document.getElementById('board');
        this.statusDisplay = document.getElementById('status');
        this.movesContainer = document.getElementById('moves-container');
        this.restartBtn = document.getElementById('restart-btn');
        this.flipBtn = document.getElementById('flip-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.promotionModal = document.getElementById('promotion-modal');
        this.promotionPieces = document.getElementById('promotion-pieces');
        
        this.selectedPiece = null;
        this.turn = 'white';
        this.boardOrientation = 'white'; 
        this.gameState = this.createInitialState();
        this.moveHistory = [];
        this.possibleMoves = [];
        this.kings = { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } };
        this.castlingRights = {
          white: { kingSide: true, queenSide: true },
          black: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null; 
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.waitingForPromotion = null;
        this.gameOver = false;
        
        this.setupEventListeners();
        this.renderBoard();
        this.updateGameStatus();
      }
      
      setupEventListeners() {
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.flipBtn.addEventListener('click', () => this.flipBoard());
        this.undoBtn.addEventListener('click', () => this.undoMove());
      }
      
      createInitialState() {
        return [
          ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], 
          ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'], 
          [null, null, null, null, null, null, null, null], 
          [null, null, null, null, null, null, null, null], 
          [null, null, null, null, null, null, null, null], 
          [null, null, null, null, null, null, null, null], 
          ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'], 
          ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']  
        ];
      }
      
      renderBoard() {
        this.board.innerHTML = '';
        
        const rows = this.boardOrientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
        const cols = this.boardOrientation === 'white' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
        
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const row = rows[r];
            const col = cols[c];
            const isLight = (row + col) % 2 === 0;
            const piece = this.gameState[row][col];
            
            const square = document.createElement('div');
            square.className = `square ${isLight ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            if (piece) {
              square.textContent = this.getPieceSymbol(piece);
            }
            
            square.addEventListener('click', (e) => this.handleSquareClick(row, col));
            this.board.appendChild(square);
          }
        }
        
        if (this.selectedPiece !== null) {
          this.highlightSelectedPiece();
          this.highlightPossibleMoves();
        }
      }
      
      getVisualIndex(row, col) {
          const visualRow = this.boardOrientation === 'white' ? row : 7 - row;
          const visualCol = this.boardOrientation === 'white' ? col : 7 - col;
          return visualRow * 8 + visualCol;
      }
      
      highlightSelectedPiece() {
        const { row, col } = this.selectedPiece;
        const index = this.getVisualIndex(row, col);
        
        if (this.board.children[index]) {
          this.board.children[index].classList.add('selected');
        }
      }
      
      highlightPossibleMoves() {
        for (const move of this.possibleMoves) {
          const index = this.getVisualIndex(move.toRow, move.toCol);
          
          if (this.board.children[index]) {
            this.board.children[index].classList.add('possible-move');
            if (this.gameState[move.toRow][move.toCol] !== null || move.isEnPassant) {
              this.board.children[index].classList.add('possible-capture');
            }
          }
        }
      }
      
      getPieceSymbol(piece) {
        const symbols = {
          'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
          'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
        };
        return symbols[piece] || '';
      }
      
      getPieceColor(piece) {
        if (!piece) return null;
        return piece === piece.toUpperCase() ? 'white' : 'black';
      }
      
      handleSquareClick(row, col) {
        if (this.gameOver || this.waitingForPromotion) {
          return;
        }
        
        const piece = this.gameState[row][col];
        const pieceColor = this.getPieceColor(piece);
        
        if (this.selectedPiece === null) {
          if (piece && pieceColor === this.turn) {
            this.selectedPiece = { row, col };
            this.possibleMoves = this.getValidMovesForPiece(row, col);
            this.renderBoard();
          }
        } 
        else {
          const sameSquare = this.selectedPiece.row === row && this.selectedPiece.col === col;
          
          if (sameSquare) {
            this.selectedPiece = null;
            this.possibleMoves = [];
            this.renderBoard();
            return;
          }
          
          if (piece && pieceColor === this.turn) {
            this.selectedPiece = { row, col };
            this.possibleMoves = this.getValidMovesForPiece(row, col);
            this.renderBoard();
            return;
          }
          
          const move = this.possibleMoves.find(m => m.toRow === row && m.toCol === col);
          if (move) {
            this.makeMove(move);
          } else {
            this.selectedPiece = null;
            this.possibleMoves = [];
            this.renderBoard();
          }
        }
      }

      isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
      }
      
      getPieceMoves(row, col, checkKingSafety = true) {
        const piece = this.gameState[row][col];
        if (!piece) return [];
        
        const pieceColor = this.getPieceColor(piece);
        const pieceType = piece.toUpperCase();
        const moves = [];
        
        if (pieceType === 'P') {
          const direction = pieceColor === 'white' ? -1 : 1;
          const startRow = pieceColor === 'white' ? 6 : 1;
          
          if (this.isValidPosition(row + direction, col) && 
              this.gameState[row + direction][col] === null) {
            moves.push({ fromRow: row, fromCol: col, toRow: row + direction, toCol: col });
            
            if (row === startRow && 
                this.isValidPosition(row + direction * 2, col) &&
                this.gameState[row + direction * 2][col] === null) {
              moves.push({ 
                fromRow: row, 
                fromCol: col, 
                toRow: row + direction * 2, 
                toCol: col,
                isPawnDoubleMove: true
              });
            }
          }
          
          const captureCols = [col - 1, col + 1];
          for (const captureCol of captureCols) {
            const captureRow = row + direction;
            if (this.isValidPosition(captureRow, captureCol)) {
              const targetPiece = this.gameState[captureRow][captureCol];
              if (targetPiece && this.getPieceColor(targetPiece) !== pieceColor) {
                moves.push({ fromRow: row, fromCol: col, toRow: captureRow, toCol: captureCol });
              }
              
              if (this.enPassantTarget && 
                  captureRow === this.enPassantTarget.row && 
                  captureCol === this.enPassantTarget.col) {
                moves.push({ 
                  fromRow: row, 
                  fromCol: col, 
                  toRow: captureRow, 
                  toCol: captureCol,
                  isEnPassant: true,
                  captureRow: row,
                  captureCol: captureCol
                });
              }
            }
          }
        }
        
        else if (pieceType === 'N') {
          const knightMoves = [
            { row: -2, col: -1 }, { row: -2, col: 1 },
            { row: -1, col: -2 }, { row: -1, col: 2 },
            { row: 1, col: -2 }, { row: 1, col: 2 },
            { row: 2, col: -1 }, { row: 2, col: 1 }
          ];
          
          for (const move of knightMoves) {
            const newRow = row + move.row;
            const newCol = col + move.col;
            
            if (this.isValidPosition(newRow, newCol)) {
              const targetPiece = this.gameState[newRow][newCol];
              if (!targetPiece || this.getPieceColor(targetPiece) !== pieceColor) {
                moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol });
              }
            }
          }
        }
        
        else if (pieceType === 'B' || pieceType === 'R' || pieceType === 'Q') {
          const directions = [];
          if (pieceType === 'B' || pieceType === 'Q') {
            directions.push({ row: -1, col: -1 }, { row: -1, col: 1 }, 
                            { row: 1, col: -1 }, { row: 1, col: 1 });
          }
          if (pieceType === 'R' || pieceType === 'Q') {
            directions.push({ row: -1, col: 0 }, { row: 1, col: 0 }, 
                            { row: 0, col: -1 }, { row: 0, col: 1 });
          }
          
          for (const dir of directions) {
            let newRow = row + dir.row;
            let newCol = col + dir.col;
            
            while (this.isValidPosition(newRow, newCol)) {
              const targetPiece = this.gameState[newRow][newCol];
              if (!targetPiece) {
                moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol });
              } else {
                if (this.getPieceColor(targetPiece) !== pieceColor) {
                  moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol });
                }
                break; 
              }
              newRow += dir.row;
              newCol += dir.col;
            }
          }
        }
        
        else if (pieceType === 'K') {
          const kingMoves = [
            { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
            { row: 0, col: -1 }, { row: 0, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 }
          ];
          
          for (const move of kingMoves) {
            const newRow = row + move.row;
            const newCol = col + move.col;
            
            if (this.isValidPosition(newRow, newCol)) {
              const targetPiece = this.gameState[newRow][newCol];
              if (!targetPiece || this.getPieceColor(targetPiece) !== pieceColor) {
                moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol });
              }
            }
          }
          
          if (checkKingSafety) {
            const opponentColor = pieceColor === 'white' ? 'black' : 'white';
            if (!this.isSquareAttacked(row, col, opponentColor)) {
              if (pieceColor === 'white') {
                if (this.castlingRights.white.kingSide && 
                    !this.gameState[7][5] && !this.gameState[7][6] &&
                    !this.isSquareAttacked(7, 5, opponentColor) && 
                    !this.isSquareAttacked(7, 6, opponentColor)) {
                  moves.push({ 
                    fromRow: 7, fromCol: 4, toRow: 7, toCol: 6, isCastling: true,
                    rookFromRow: 7, rookFromCol: 7, rookToRow: 7, rookToCol: 5
                  });
                }
                if (this.castlingRights.white.queenSide && 
                    !this.gameState[7][3] && !this.gameState[7][2] && !this.gameState[7][1] &&
                    !this.isSquareAttacked(7, 3, opponentColor) && 
                    !this.isSquareAttacked(7, 2, opponentColor)) {
                  moves.push({ 
                    fromRow: 7, fromCol: 4, toRow: 7, toCol: 2, isCastling: true,
                    rookFromRow: 7, rookFromCol: 0, rookToRow: 7, rookToCol: 3
                  });
                }
              } else { 
                if (this.castlingRights.black.kingSide && 
                    !this.gameState[0][5] && !this.gameState[0][6] &&
                    !this.isSquareAttacked(0, 5, opponentColor) && 
                    !this.isSquareAttacked(0, 6, opponentColor)) {
                  moves.push({ 
                    fromRow: 0, fromCol: 4, toRow: 0, toCol: 6, isCastling: true,
                    rookFromRow: 0, rookFromCol: 7, rookToRow: 0, rookToCol: 5
                  });
                }
                if (this.castlingRights.black.queenSide && 
                    !this.gameState[0][3] && !this.gameState[0][2] && !this.gameState[0][1] &&
                    !this.isSquareAttacked(0, 3, opponentColor) && 
                    !this.isSquareAttacked(0, 2, opponentColor)) {
                  moves.push({ 
                    fromRow: 0, fromCol: 4, toRow: 0, toCol: 2, isCastling: true,
                    rookFromRow: 0, rookFromCol: 0, rookToRow: 0, rookToCol: 3
                  });
                }
              }
            }
          }
        }
        
        return moves;
      }
      
      isSquareAttacked(row, col, attackingColor) {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = this.gameState[r][c];
            if (piece && this.getPieceColor(piece) === attackingColor) {
              const moves = this.getPieceMoves(r, c, false); 
              for (const move of moves) {
                if (move.toRow === row && move.toCol === col) {
                   if (piece.toUpperCase() === 'P') {
                        if (move.fromCol !== move.toCol) return true; 
                   } else {
                       return true;
                   }
                }
              }
            }
          }
        }
        return false;
      }
      
      isKingInCheck(color) {
        const king = this.kings[color];
        if (!king) return false; 
        return this.isSquareAttacked(king.row, king.col, color === 'white' ? 'black' : 'white');
      }
      
      getValidMovesForPiece(row, col) {
        const piece = this.gameState[row][col];
        if (!piece) return [];
        
        const pieceColor = this.getPieceColor(piece);
        const allMoves = this.getPieceMoves(row, col, true); 
        const validMoves = [];
        
        const originalGameState = JSON.stringify(this.gameState);
        const originalKings = JSON.parse(JSON.stringify(this.kings));
        const originalEnPassant = this.enPassantTarget ? {...this.enPassantTarget} : null;

        for (const move of allMoves) {
            this.gameState = JSON.parse(originalGameState);
            this.kings = JSON.parse(JSON.stringify(originalKings));
            this.enPassantTarget = originalEnPassant; 

            const tempMovingPiece = this.gameState[move.fromRow][move.fromCol];
            this.gameState[move.toRow][move.toCol] = tempMovingPiece;
            this.gameState[move.fromRow][move.fromCol] = null;

            if (tempMovingPiece.toUpperCase() === 'K') {
                this.kings[pieceColor] = { row: move.toRow, col: move.toCol };
            }
            if (move.isEnPassant) {
                this.gameState[move.captureRow][move.captureCol] = null;
            }
            if (move.isCastling) {
               this.gameState[move.rookToRow][move.rookToCol] = this.gameState[move.rookFromRow][move.rookFromCol];
               this.gameState[move.rookFromRow][move.rookFromCol] = null;
            }

            if (!this.isKingInCheck(pieceColor)) {
                validMoves.push(move);
            }
        }

        this.gameState = JSON.parse(originalGameState);
        this.kings = originalKings;
        this.enPassantTarget = originalEnPassant;
        
        return validMoves;
      }
      
      getAllValidMoves(color) {
        let allMoves = [];
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const piece = this.gameState[row][col];
            if (piece && this.getPieceColor(piece) === color) {
              const moves = this.getValidMovesForPiece(row, col);
              allMoves = allMoves.concat(moves);
            }
          }
        }
        return allMoves;
      }
      
      isCheckmate(color) {
        return this.isKingInCheck(color) && this.getAllValidMoves(color).length === 0;
      }
      
      isStalemate(color) {
         return !this.isKingInCheck(color) && this.getAllValidMoves(color).length === 0;
      }
      
      makeMove(move) {
        const { fromRow, fromCol, toRow, toCol } = move;
        const movingPiece = this.gameState[fromRow][fromCol];
        const pieceType = movingPiece.toUpperCase();
        const pieceColor = this.getPieceColor(movingPiece);
        
        const historyEntry = {
          fromRow, fromCol, toRow, toCol,
          piece: movingPiece,
          capturedPiece: this.gameState[toRow][toCol],
          castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
          enPassantTarget: this.enPassantTarget ? {...this.enPassantTarget} : null,
          halfMoveClock: this.halfMoveClock,
          fullMoveNumber: this.fullMoveNumber,
          isEnPassant: move.isEnPassant || false,
          enPassantCaptureCoords: move.isEnPassant ? {row: move.captureRow, col: move.captureCol} : null,
          isCastling: move.isCastling || false,
          castlingRookMove: move.isCastling ? {fromR: move.rookFromRow, fromC: move.rookFromCol, toR: move.rookToRow, toC: move.rookToCol} : null,
          promotionPiece: null,
          needsPromotion: false
        };

        const prevEnPassantTarget = this.enPassantTarget;
        this.enPassantTarget = null; 
        
        if (pieceType === 'P' || historyEntry.capturedPiece) {
          this.halfMoveClock = 0;
        } else {
          this.halfMoveClock++;
        }
        
        this.gameState[toRow][toCol] = movingPiece;
        this.gameState[fromRow][fromCol] = null;
        
        if (pieceType === 'K') {
          this.kings[pieceColor] = { row: toRow, col: toCol };
          if (pieceColor === 'white') {
            this.castlingRights.white.kingSide = false;
            this.castlingRights.white.queenSide = false;
          } else {
            this.castlingRights.black.kingSide = false;
            this.castlingRights.black.queenSide = false;
          }
        } else if (pieceType === 'R') {
          if (pieceColor === 'white') {
            if (fromRow === 7 && fromCol === 0) this.castlingRights.white.queenSide = false;
            if (fromRow === 7 && fromCol === 7) this.castlingRights.white.kingSide = false;
          } else {
            if (fromRow === 0 && fromCol === 0) this.castlingRights.black.queenSide = false;
            if (fromRow === 0 && fromCol === 7) this.castlingRights.black.kingSide = false;
          }
        }
        
        if (historyEntry.capturedPiece) {
            const capturedPieceType = historyEntry.capturedPiece.toUpperCase();
            if (capturedPieceType === 'R') {
                 if (pieceColor === 'white') { 
                    if (toRow === 0 && toCol === 0) this.castlingRights.black.queenSide = false;
                    if (toRow === 0 && toCol === 7) this.castlingRights.black.kingSide = false;
                } else {
                    if (toRow === 7 && toCol === 0) this.castlingRights.white.queenSide = false;
                    if (toRow === 7 && toCol === 7) this.castlingRights.white.kingSide = false;
                }
            }
        }

        if (move.isPawnDoubleMove) {
          this.enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
          historyEntry.createdEnPassant = this.enPassantTarget;
        }
        
        if (move.isEnPassant) {
          this.gameState[move.captureRow][move.captureCol] = null;
        }
        
        if (move.isCastling) {
          this.gameState[move.rookToRow][move.rookToCol] = this.gameState[move.rookFromRow][move.rookFromCol];
          this.gameState[move.rookFromRow][move.rookFromCol] = null;
        }
        
        const promotionRow = pieceColor === 'white' ? 0 : 7;
        if (pieceType === 'P' && toRow === promotionRow) {
          historyEntry.needsPromotion = true;
          this.moveHistory.push(historyEntry);
          this.waitingForPromotion = { row: toRow, col: toCol, color: pieceColor };
          this.showPromotionOptions(pieceColor);
          this.renderBoard(); 
          return; 
        }
        
        this.moveHistory.push(historyEntry);
        
        if (pieceColor === 'black') {
          this.fullMoveNumber++;
        }
        
        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.selectedPiece = null;
        this.possibleMoves = [];
        
        this.renderBoard();
        this.updateMoveHistory();
        this.updateGameStatus();
      }
      
      showPromotionOptions(color) {
        const pieces = color === 'white' ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
        this.promotionPieces.innerHTML = '';
        
        for (const piece of pieces) {
          const pieceElem = document.createElement('div');
          pieceElem.className = 'promotion-piece';
          pieceElem.textContent = this.getPieceSymbol(piece);
          pieceElem.addEventListener('click', () => this.handlePromotion(piece));
          this.promotionPieces.appendChild(pieceElem);
        }
        
        this.promotionModal.style.display = 'flex';
      }
      
      handlePromotion(promotionPiece) {
        if (!this.waitingForPromotion) return;
        
        const { row, col } = this.waitingForPromotion;
        this.gameState[row][col] = promotionPiece;
        
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        lastMove.promotionPiece = promotionPiece;
        lastMove.needsPromotion = false; 

        this.promotionModal.style.display = 'none';
        this.waitingForPromotion = null;
        
        if (this.getPieceColor(promotionPiece) === 'black') {
           this.fullMoveNumber++;
        }
        
        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.selectedPiece = null;
        this.possibleMoves = [];
        
        this.renderBoard();
        this.updateMoveHistory();
        this.updateGameStatus();
      }
      
      updateGameStatus() {
        let status = '';
        this.gameOver = false;
        
        if (this.isCheckmate(this.turn)) {
          const winner = this.turn === 'white' ? 'Black' : 'White';
          status = `Checkmate! ${winner} wins`;
          this.gameOver = true;
        } else if (this.isStalemate(this.turn)) {
          status = 'Stalemate! Game is a draw';
          this.gameOver = true;
        } else if (this.halfMoveClock >= 100) {
           status = 'Draw by 50-move rule';
           this.gameOver = true;
        } else {
          status = `${this.turn === 'white' ? 'White' : 'Black'}'s turn`;
          if (this.isKingInCheck(this.turn)) {
            status += ' (in check)';
          }
        }
        
        this.statusDisplay.textContent = status;
      }
      
      updateMoveHistory() {
        this.movesContainer.innerHTML = '';
        let movePairDiv = null;
        
        for (let i = 0; i < this.moveHistory.length; i++) {
          const move = this.moveHistory[i];
          if (move.needsPromotion) continue; 
          
          if (i % 2 === 0) {
            const moveNum = Math.floor(i / 2) + 1;
            movePairDiv = document.createElement('div');
            movePairDiv.className = 'move-pair';
            movePairDiv.textContent = `${moveNum}.`;
            this.movesContainer.appendChild(movePairDiv);
          }
          
          const moveSpan = document.createElement('span');
          moveSpan.textContent = this.formatMoveNotation(move);
          moveSpan.className = 'move';
          
          if(movePairDiv) {
              movePairDiv.appendChild(moveSpan);
          }
        }
        const historyDiv = document.getElementById('move-history');
        historyDiv.scrollTop = historyDiv.scrollHeight;
      }
      
      formatMoveNotation(move) {
        const piece = move.piece.toUpperCase();
        const files = 'abcdefgh';
        const ranks = '87654321';
        
        const toFile = files[move.toCol];
        const toRank = ranks[move.toRow];
        
        let notation = '';
        
        if (move.isCastling) {
          notation = move.toCol > move.fromCol ? 'O-O' : 'O-O-O';
        } else {
          if (piece !== 'P') {
            notation += piece;
          }
          
          if (move.capturedPiece || move.isEnPassant) {
            if (piece === 'P') {
              notation += files[move.fromCol];
            }
            notation += 'x';
          }
          
          notation += toFile + toRank;
          
          if (move.promotionPiece) {
            notation += '=' + move.promotionPiece.toUpperCase();
          }
        }

         const tempGameState = JSON.parse(JSON.stringify(this.gameState));
         const tempKings = JSON.parse(JSON.stringify(this.kings));
         const tempTurn = this.turn;
         const tempEnPassant = this.enPassantTarget ? {...this.enPassantTarget} : null;
         const tempCastling = JSON.parse(JSON.stringify(this.castlingRights));

         this.gameState = JSON.parse(JSON.stringify(this.gameState)); // Use current state to check future
         this.kings = JSON.parse(JSON.stringify(this.kings));
         this.turn = this.getPieceColor(move.piece) === 'white' ? 'black' : 'white';
         this.gameState[move.toRow][move.toCol] = move.promotionPiece ? move.promotionPiece : move.piece;
         if (move.piece.toUpperCase() === 'K') {
            this.kings[this.getPieceColor(move.piece)] = {row: move.toRow, col: move.toCol};
         }


         if (this.isCheckmate(this.turn)) {
             notation += '#';
         } else if (this.isKingInCheck(this.turn)) {
             notation += '+';
         }

         this.gameState = tempGameState;
         this.kings = tempKings;
         this.turn = tempTurn;
         this.enPassantTarget = tempEnPassant;
         this.castlingRights = tempCastling;

        return notation;
      }
      
      undoMove() {
        if (this.waitingForPromotion) {
            const lastMove = this.moveHistory.pop();
            this.promotionModal.style.display = 'none';
            this.waitingForPromotion = null;
            this.renderBoard();
            this.updateMoveHistory();
            this.updateGameStatus();
            return;
        }

        if (this.moveHistory.length === 0) return;
        
        const lastMove = this.moveHistory.pop();
        
        this.gameState[lastMove.fromRow][lastMove.fromCol] = lastMove.piece;
        this.gameState[lastMove.toRow][lastMove.toCol] = lastMove.capturedPiece; 
        
        if (lastMove.piece.toUpperCase() === 'K') {
          const color = this.getPieceColor(lastMove.piece);
          this.kings[color] = { row: lastMove.fromRow, col: lastMove.fromCol };
        }
        
        if (lastMove.isCastling) {
          const { fromR, fromC, toR, toC } = lastMove.castlingRookMove;
          this.gameState[fromR][fromC] = this.gameState[toR][toC];
          this.gameState[toR][toC] = null;
        }
        
        if (lastMove.isEnPassant) {
          const color = this.getPieceColor(lastMove.piece) === 'white' ? 'black' : 'white';
          const pawn = color === 'white' ? 'P' : 'p';
          this.gameState[lastMove.enPassantCaptureCoords.row][lastMove.enPassantCaptureCoords.col] = pawn;
        }
        
        this.castlingRights = lastMove.castlingRights;
        this.enPassantTarget = lastMove.enPassantTarget;
        this.halfMoveClock = lastMove.halfMoveClock;
        this.fullMoveNumber = lastMove.fullMoveNumber;
        
        this.turn = this.getPieceColor(lastMove.piece);
        
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameOver = false; 
        
        this.renderBoard();
        this.updateMoveHistory();
        this.updateGameStatus();
      }
      
      flipBoard() {
        this.boardOrientation = this.boardOrientation === 'white' ? 'black' : 'white';
        this.renderBoard(); 
      }
      
      resetGame() {
        this.gameState = this.createInitialState();
        this.selectedPiece = null;
        this.turn = 'white';
        this.possibleMoves = [];
        this.moveHistory = [];
        this.kings = { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } };
        this.castlingRights = {
          white: { kingSide: true, queenSide: true },
          black: { kingSide: true, queenSide: true }
        };
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.waitingForPromotion = null;
        this.gameOver = false;
        
        this.renderBoard();
        this.updateMoveHistory();
        this.updateGameStatus();
        this.promotionModal.style.display = 'none';
      }
    }
    
    document.addEventListener('DOMContentLoaded', () => {
      new ChessGame();
    });
  