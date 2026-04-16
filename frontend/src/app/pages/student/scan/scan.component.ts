import { Component, OnInit, OnDestroy, signal, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ScanResult, QRScanPayload } from '../../../core/models';

declare const jsQR: any;
type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-scan',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="scan-page">
      <div class="scan-header">
        <h1>Scan QR Code</h1>
        <p>Use your camera or upload an image from your gallery</p>
      </div>

      <div class="scan-main">
        <!-- Idle -->
        <div class="scan-idle" *ngIf="state() === 'idle'">
          <div class="scan-idle__icon">📷</div>
          <h2>Ready to Scan</h2>
          <p>Choose how you want to scan the QR code</p>

          <div class="scan-options">
            <button mat-raised-button color="primary" class="scan-option-btn" (click)="startCamera()">
              <mat-icon>videocam</mat-icon>
              <div>
                <div class="opt-title">Open Camera</div>
                <div class="opt-sub">Scan live with your camera</div>
              </div>
            </button>

            <button mat-stroked-button class="scan-option-btn gallery-btn" (click)="fileInput.click()">
              <mat-icon>photo_library</mat-icon>
              <div>
                <div class="opt-title">Upload from Gallery</div>
                <div class="opt-sub">Pick a QR image from your device</div>
              </div>
            </button>
          </div>

          <!-- Hidden file input -->
          <input #fileInput type="file" accept="image/*" style="display:none" (change)="onFileSelected($event)" />
        </div>

        <!-- Scanner active -->
        <div class="scanner-wrap" *ngIf="state() === 'scanning'">
          <div class="scanner-container">
            <video #videoEl autoplay playsinline muted class="scanner-video"></video>
            <canvas #canvasEl class="scanner-canvas" style="display:none"></canvas>
            <div class="scanner-overlay-ui">
              <div class="scanner-frame-box">
                <div class="corner tl"></div>
                <div class="corner tr"></div>
                <div class="corner bl"></div>
                <div class="corner br"></div>
                <div class="scanner-line"></div>
              </div>
            </div>
          </div>
          <p class="scan-hint">Hold steady — scanning automatically...</p>
          <div class="scan-controls">
            <button mat-button (click)="fileInput2.click()">
              <mat-icon>photo_library</mat-icon> Upload Instead
            </button>
            <button mat-button color="warn" (click)="stopCamera()">
              <mat-icon>close</mat-icon> Cancel
            </button>
          </div>
          <input #fileInput2 type="file" accept="image/*" style="display:none" (change)="onFileSelected($event)" />
        </div>

        <!-- Processing -->
        <div class="scan-status" *ngIf="state() === 'processing'">
          <mat-spinner diameter="64"></mat-spinner>
          <h2>Recording Attendance...</h2>
          <p>Please wait while we process your scan</p>
        </div>

        <!-- Success -->
        <div class="scan-status success" *ngIf="state() === 'success'">
          <div class="status-icon">✅</div>
          <h2>{{ resultMessage() }}</h2>
          <div class="result-badge" [class]="'badge badge--' + resultStatus()">
            {{ resultStatus() | uppercase }}
          </div>
          <p class="scan-time" *ngIf="resultTime()">{{ resultTime() }}</p>
          <button mat-raised-button color="primary" (click)="reset()" style="margin-top:24px">
            <mat-icon>refresh</mat-icon> Scan Again
          </button>
        </div>

        <!-- Error -->
        <div class="scan-status error" *ngIf="state() === 'error'">
          <div class="status-icon">{{ errorIcon() }}</div>
          <h2>{{ errorTitle() }}</h2>
          <p>{{ errorMessage() }}</p>
          <button mat-raised-button color="primary" (click)="reset()" style="margin-top:24px">
            <mat-icon>refresh</mat-icon> Try Again
          </button>
        </div>
      </div>

      <!-- Tips -->
      <div class="scan-tips" *ngIf="state() === 'idle' || state() === 'scanning'">
        <div class="tip-item" *ngFor="let t of tips">
          <span>{{ t.icon }}</span><span>{{ t.text }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scan-page {
      min-height: 100vh; background: var(--color-bg);
      display: flex; flex-direction: column;
      padding: 24px 16px; max-width: 480px; margin: 0 auto;
    }
    .scan-header { text-align: center; margin-bottom: 32px; }
    .scan-header h1 { font-size: 1.5rem; color: var(--color-primary); margin-bottom: 8px; }
    .scan-header p { font-size: 0.875rem; color: var(--color-text-muted); }
    .scan-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }

    /* Idle */
    .scan-idle { text-align: center; padding: 24px 0; width: 100%; }
    .scan-idle__icon { font-size: 72px; margin-bottom: 16px; }
    .scan-idle h2 { font-size: 1.4rem; color: var(--color-primary); margin-bottom: 8px; }
    .scan-idle p { color: var(--color-text-muted); font-size: 0.875rem; margin: 0 auto 28px; }

    .scan-options { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 340px; margin: 0 auto; }
    .scan-option-btn {
      display: flex !important; align-items: center !important; gap: 16px !important;
      padding: 16px 20px !important; height: auto !important; border-radius: 16px !important;
      text-align: left !important; width: 100% !important;
      mat-icon { font-size: 28px !important; width: 28px !important; height: 28px !important; }
    }
    .gallery-btn { border: 2px solid var(--color-border) !important; background: white !important; }
    .gallery-btn:hover { border-color: var(--color-primary) !important; background: rgba(139,26,26,0.04) !important; }
    .opt-title { font-size: 0.9rem; font-weight: 700; }
    .opt-sub   { font-size: 0.72rem; opacity: 0.7; margin-top: 2px; }

    /* Scanner */
    .scanner-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; }
    .scanner-container { position: relative; width: 100%; max-width: 340px; border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-xl); }
    .scanner-video { width: 100%; display: block; border-radius: 20px; }
    .scanner-overlay-ui { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); pointer-events: none; }
    .scanner-frame-box { width: 220px; height: 220px; position: relative; }
    .corner { position: absolute; width: 28px; height: 28px; border-color: #C9A227; border-style: solid; }
    .corner.tl { top:0;left:0; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
    .corner.tr { top:0;right:0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
    .corner.bl { bottom:0;left:0; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
    .corner.br { bottom:0;right:0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
    .scanner-line { position: absolute; top: 0; left: 10%; right: 10%; height: 2px; background: linear-gradient(90deg, transparent, #C9A227, transparent); animation: scanLine 2.5s ease-in-out infinite; }
    @keyframes scanLine { 0%,100% { top:0; opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 50% { top:100%; } }

    .scan-hint { color: var(--color-text-muted); font-size: 0.8rem; text-align: center; }
    .scan-controls { display: flex; gap: 12px; align-items: center; }

    /* Status */
    .scan-status { text-align: center; padding: 32px 0; display: flex; flex-direction: column; align-items: center; }
    .scan-status h2 { font-size: 1.3rem; margin: 20px 0 10px; }
    .scan-status p { color: var(--color-text-muted); font-size: 0.875rem; }
    .status-icon { font-size: 80px; line-height: 1; animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    @keyframes bounceIn { 0% { transform: scale(0); } 80% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .result-badge { font-size: 1rem; padding: 8px 24px; margin-top: 8px; }
    .scan-time { font-size: 0.8rem; margin-top: 8px; color: var(--color-text-muted); }

    /* Tips */
    .scan-tips { display: flex; flex-direction: column; gap: 8px; margin-top: 32px; padding: 16px; background: rgba(139,26,26,0.04); border-radius: 12px; }
    .tip-item { display: flex; align-items: center; gap: 10px; font-size: 0.78rem; color: var(--color-text-muted); }
  `]
})
export class ScanComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  api   = inject(ApiService);
  toast = inject(ToastService);

  state          = signal<ScanState>('idle');
  resultMessage  = signal('');
  resultStatus   = signal('');
  resultTime     = signal<string | null>(null);
  errorTitle     = signal('');
  errorMessage   = signal('');
  errorIcon      = signal('❌');

  private stream: MediaStream | null = null;
  private scanInterval: any = null;

  tips = [
    { icon: '💡', text: 'Ensure good lighting for best results' },
    { icon: '📐', text: 'Hold the camera steady and level' },
    { icon: '🖼️', text: 'You can also upload a QR code image from your gallery' },
    { icon: '⚡', text: 'Attendance records in under 3 seconds' },
  ];

  ngOnInit(): void { this.loadJsQR(); }
  ngOnDestroy(): void { this.stopCamera(); }

  private loadJsQR(): void {
    if ((window as any).jsQR) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    document.head.appendChild(script);
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      this.state.set('scanning');
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.stream;
          this.videoEl.nativeElement.play();
          this.startScanning();
        }
      }, 100);
    } catch {
      this.showError('Camera Error', 'Could not access camera. Please grant permission or upload an image instead.', '📷');
    }
  }

  stopCamera(): void {
    if (this.scanInterval) { clearInterval(this.scanInterval); this.scanInterval = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    if (this.state() === 'scanning') this.state.set('idle');
  }

  // ── Gallery / File upload QR scanning ──────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    input.value = '';

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    // Show partial loading state
    this.state.set('processing');

    img.onload = () => {
      // Resize to a manageable size for better QR detection
      const MAX_SIZE = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw with smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      URL.revokeObjectURL(url);

      const jsQR = (window as any).jsQR;
      if (!jsQR) {
        this.state.set('idle');
        this.toast.error('QR scanner still loading. Please wait a moment.');
        return;
      }

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (code?.data) {
        this.stopCamera();
        this.processQRData(code.data);
      } else {
        this.showError('No QR Found', 'Could not detect a QR code. Make sure the photo is clear and the QR is in the center.', '🔍');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      this.showError('Image Error', 'Could not read the selected image.', '⚠️');
    };
    img.src = url;
  }

  private startScanning(): void {
    this.scanInterval = setInterval(() => {
      if (!this.videoEl?.nativeElement || !this.canvasEl?.nativeElement) return;
      const video  = this.videoEl.nativeElement;
      const canvas = this.canvasEl.nativeElement;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      canvas.height = video.videoHeight;
      canvas.width  = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQR = (window as any).jsQR;
      if (!jsQR) return;
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) { this.stopCamera(); this.processQRData(code.data); }
    }, 250);
  }

  private processQRData(data: string): void {
    try {
      const payload: QRScanPayload = JSON.parse(data);
      if (!payload.token || !payload.sessionId) {
        this.showError('Invalid QR', 'This QR code was not generated by the attendance system.', '⚠️');
        return;
      }
      this.state.set('processing');
      this.api.scanQR(payload.token, payload.sessionId).subscribe({
        next: (res) => this.handleScanResult(res),
        error: (err) => {
          const result = err?.error;
          if (result?.code) this.handleScanResult(result);
          else this.showError('Network Error', 'Could not connect to server. Please try again.', '🌐');
        }
      });
    } catch {
      this.showError('Invalid QR', 'Could not read QR code data. Please try again.', '⚠️');
    }
  }

  private handleScanResult(res: ScanResult): void {
    switch (res.code) {
      case 'RECORDED':
        this.state.set('success');
        this.resultMessage.set(res.data?.message || 'Attendance recorded!');
        this.resultStatus.set(res.data?.status || 'present');
        this.resultTime.set(res.data?.scanTime ? new Date(res.data.scanTime).toLocaleTimeString() : null);
        break;
      case 'QR_EXPIRED':
        this.showError('QR Expired', 'This QR code has expired. Ask your instructor to reopen it.', '⏱️');
        break;
      case 'ALREADY_RECORDED':
        this.showError('Already Recorded', res.message || 'Your attendance has already been recorded.', '✅');
        break;
      case 'NOT_ENROLLED':
        this.showError('Not Enrolled', 'You are not enrolled in this class section.', '🚫');
        break;
      default:
        this.showError('Invalid QR', res.message || 'This QR code is not valid.', '❌');
    }
  }

  private showError(title: string, message: string, icon: string): void {
    this.state.set('error');
    this.errorTitle.set(title);
    this.errorMessage.set(message);
    this.errorIcon.set(icon);
  }

  reset(): void { this.state.set('idle'); }
}
