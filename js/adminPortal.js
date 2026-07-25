/**
 * Admin Customizer Portal UI Controller & File Upload Handlers
 */

import { setCustomPieceImage, setCustomPieceModel, clearCustomPiece, clearAllCustomizations, customPieceModels } from './pieces3d.js';

const PIECES_SVG = {
  'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  'N': 'assets/donkey_knight.png',
  'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  'n': 'assets/donkey_knight.png',
  'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
};

const PIECE_NAMES = {
  'P': 'White Pawn', 'N': 'White Knight', 'B': 'White Bishop', 'R': 'White Rook', 'Q': 'White Queen', 'K': 'White King',
  'p': 'Black Pawn', 'n': 'Black Knight', 'b': 'Black Bishop', 'r': 'Black Rook', 'q': 'Black Queen', 'k': 'Black King'
};

export class AdminPortal {
  constructor(scene3d, onCustomizationChanged) {
    this.scene3d = scene3d;
    this.onCustomizationChanged = onCustomizationChanged;
    this.modalEl = document.getElementById('adminModal');
    this.gridEl = document.getElementById('adminGrid');

    this.init();
  }

  init() {
    document.getElementById('btnAdmin').addEventListener('click', () => this.open());
    document.getElementById('btnCloseAdmin').addEventListener('click', () => this.close());
    document.getElementById('btnSaveAdmin').addEventListener('click', () => this.close());
    document.getElementById('btnResetAllCustom').addEventListener('click', () => {
      clearAllCustomizations();
      this.scene3d.updatePieces(this.scene3d.currentBoardState || []);
      this.buildGrid();
      if (this.onCustomizationChanged) this.onCustomizationChanged();
    });
  }

  open() {
    this.buildGrid();
    this.modalEl.style.display = 'flex';
  }

  close() {
    this.modalEl.style.display = 'none';
  }

  buildGrid() {
    this.gridEl.innerHTML = '';

    Object.keys(PIECE_NAMES).forEach(pieceType => {
      const hasCustomImg = !!localStorage.getItem(`custom_piece_img_${pieceType}`);
      const hasCustomModel = !!customPieceModels[pieceType];

      let statusText = 'Default';
      if (hasCustomModel) statusText = 'Custom 3D Model';
      else if (hasCustomImg) statusText = 'Custom Image';

      const card = document.createElement('div');
      card.className = 'admin-card';
      card.innerHTML = `
        <div class="admin-card-header">
          <div class="admin-card-title">
            <img src="${PIECES_SVG[pieceType]}" alt="${pieceType}">
            <span>${PIECE_NAMES[pieceType]}</span>
          </div>
          <span class="status-tag">${statusText}</span>
        </div>

        <label class="admin-file-label">
          📁 Upload JPEG/PNG or 3D (.gltf, .obj)
          <input type="file" class="admin-file-input" data-piece="${pieceType}" accept="image/*,.gltf,.glb,.obj">
        </label>

        ${(hasCustomImg || hasCustomModel) ? `<button class="btn btn-reset-piece" data-piece="${pieceType}" style="font-size:0.75rem; padding:0.25rem; color:#dc2626;">Clear Customization</button>` : ''}
      `;

      this.gridEl.appendChild(card);
    });

    this.gridEl.querySelectorAll('.admin-file-input').forEach(input => {
      input.addEventListener('change', (e) => this.handleFileUpload(e));
    });

    this.gridEl.querySelectorAll('.btn-reset-piece').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pt = e.target.getAttribute('data-piece');
        clearCustomPiece(pt);
        this.scene3d.updatePieces(this.scene3d.currentBoardState || []);
        this.buildGrid();
        if (this.onCustomizationChanged) this.onCustomizationChanged();
      });
    });
  }

  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const pieceType = e.target.getAttribute('data-piece');
    const ext = file.name.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setCustomPieceImage(pieceType, dataUrl);
        this.scene3d.updatePieces(this.scene3d.currentBoardState || []);
        this.buildGrid();
        if (this.onCustomizationChanged) this.onCustomizationChanged();
      };
      reader.readAsDataURL(file);
    } else if (['gltf', 'glb'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const loader = new THREE.GLTFLoader();
        loader.parse(ev.target.result, '', (gltf) => {
          const obj = gltf.scene || gltf.scenes[0];
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.0 / maxDim;
          obj.scale.set(scale, scale, scale);

          setCustomPieceModel(pieceType, obj);
          this.scene3d.updatePieces(this.scene3d.currentBoardState || []);
          this.buildGrid();
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === 'obj') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const loader = new THREE.OBJLoader();
        const obj = loader.parse(ev.target.result);
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.0 / maxDim;
        obj.scale.set(scale, scale, scale);

        setCustomPieceModel(pieceType, obj);
        this.scene3d.updatePieces(this.scene3d.currentBoardState || []);
        this.buildGrid();
      };
      reader.readAsText(file);
    }
  }
}
