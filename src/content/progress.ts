let overlay: HTMLElement | null = null;
let progressBar: HTMLElement | null = null;
let progressText: HTMLElement | null = null;

export function showProgress(total: number) {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'eli-progress-overlay';
  overlay.innerHTML = `
    <div id="eli-progress-container">
      <div id="eli-progress-bar"><div id="eli-progress-fill"></div></div>
      <div id="eli-progress-text">Translating... 0/${total}</div>
    </div>
    <style>
      #eli-progress-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(2px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #eli-progress-container {
        background: #1a1a2e;
        padding: 24px 32px;
        border-radius: 12px;
        min-width: 280px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      }
      #eli-progress-bar {
        height: 8px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
      }
      #eli-progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #4f46e5, #7c3aed);
        border-radius: 4px;
        transition: width 0.2s ease;
      }
      #eli-progress-text {
        margin-top: 12px;
        color: #ccc;
        font: 14px system-ui, sans-serif;
        text-align: center;
      }
    </style>
  `;
  document.body.appendChild(overlay);
  progressBar = overlay.querySelector('#eli-progress-fill');
  progressText = overlay.querySelector('#eli-progress-text');
}

export function updateProgress(completed: number, total: number) {
  if (!progressBar || !progressText) return;
  const pct = Math.round((completed / total) * 100);
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `Translating... ${completed}/${total}`;
}

export function hideProgress() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    progressBar = null;
    progressText = null;
  }
}
