import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { interval, Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClassSession, ClassSection, QRSession } from '../../../core/models';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatProgressBarModule, MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header animate-fade-in-up">
        <div class="page-header__title">
          <h1>Class Sessions</h1>
          <p>Manage your sessions and generate QR codes for attendance</p>
        </div>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> New Session
        </button>
      </div>

      <!-- Create Form -->
      <div class="create-panel animate-fade-in-up" *ngIf="showCreate()">
        <h3 style="color:var(--color-primary);margin-bottom:20px">📋 Create New Session</h3>
        <form [formGroup]="createForm" (ngSubmit)="createSession()" class="create-form">
          <mat-form-field>
            <mat-label>Class Section</mat-label>
            <mat-select formControlName="classSectionId">
              <mat-option *ngFor="let s of sections()" [value]="s.id">
                {{ s.courseCode }} — {{ s.sectionName }} ({{ s.courseName }})
              </mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Session Date</mat-label>
            <input matInput type="date" formControlName="sessionDate">
          </mat-form-field>
          <mat-form-field>
            <mat-label>Topic (optional)</mat-label>
            <input matInput formControlName="topic" placeholder="e.g. Introduction to Arrays">
          </mat-form-field>
          <mat-form-field>
            <mat-label>Late After (minutes)</mat-label>
            <input matInput type="number" formControlName="lateThresholdMinutes">
          </mat-form-field>
          <div class="create-form__actions">
            <button mat-button type="button" (click)="showCreate.set(false)">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || creating()">
              <mat-spinner *ngIf="creating()" diameter="18"></mat-spinner>
              <span *ngIf="!creating()">Create Session</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Sessions Grid -->
      <div *ngIf="loading()" class="loading-spinner"><mat-spinner diameter="40"></mat-spinner></div>

      <div class="sessions-grid animate-fade-in-up" *ngIf="!loading()">
        <div class="session-item" *ngFor="let s of sessions()" [class.is-active]="s.status === 'active'">
          <div class="session-item__header">
            <div>
              <div class="session-item__meta">
                {{ s.courseCode }} · {{ s.sectionName }} · {{ s.sessionDate || s.session_date | date:'MMM d, y' }}
                <span *ngIf="auth.isAdmin()" class="instructor-tag">By {{ s.instructorFirst }} {{ s.instructorLast }}</span>
              </div>
              <div class="session-item__name">{{ s.courseName }}</div>
              <div class="session-item__topic" *ngIf="s.topic">📌 {{ s.topic }}</div>
            </div>
            <span class="badge" [class]="'badge--' + s.status">{{ s.status | uppercase }}</span>
          </div>

          <!-- Attendance Progress -->
          <div class="session-item__progress" *ngIf="s.status !== 'cancelled'">
            <div class="session-item__progress-labels">
              <span>{{ s.presentCount || 0 }} / {{ s.enrolledCount || 0 }} present</span>
              <span>{{ getRate(s) }}%</span>
            </div>
            <mat-progress-bar mode="determinate" [value]="getRate(s)" color="primary"></mat-progress-bar>
          </div>

          <!-- QR Section -->
          <!-- QR Section -->
          <div class="session-item__qr" *ngIf="s.status === 'active'">
            <div class="qr-placeholder" *ngIf="activeQRs()[s.id]">
              <mat-icon style="font-size:48px;width:48px;height:48px;color:var(--color-success)">qr_code_2</mat-icon>
              <div class="qr-timer" [class.warning]="isQRWarning(s.id)" [class.expired]="isQRExpired(s.id)">
                {{ getQRCountdown(s.id) }}
              </div>
            </div>

            <div class="session-item__qr-actions">
              <button mat-raised-button color="primary" (click)="generateQR(s)" [disabled]="generatingQR() === s.id">
                <mat-spinner *ngIf="generatingQR() === s.id" diameter="18"></mat-spinner>
                <mat-icon *ngIf="generatingQR() !== s.id">qr_code</mat-icon>
                {{ activeQRs()[s.id] ? 'Regenerate QR' : 'Generate QR' }}
              </button>
              <button mat-raised-button color="accent" *ngIf="activeQRs()[s.id]" (click)="openBigQR(s)">
                <mat-icon>fullscreen</mat-icon> Show Large QR
              </button>
            </div>
          </div>

          <!-- Actions -->
            <div class="session-item__actions">
              <a mat-button [routerLink]="'/instructor/sessions/' + s.id">
                <mat-icon>people</mat-icon> Attendance
              </a>
               <button mat-button color="primary" *ngIf="s.status === 'ended'" (click)="generateQR(s)">
                <mat-icon>play_arrow</mat-icon> Resume
              </button>
              <button mat-button color="warn" *ngIf="s.status === 'active'" (click)="endSession(s)">
                <mat-icon>stop</mat-icon> End
              </button>
              <button mat-button class="btn-delete" (click)="confirmDeleteSession(s)" title="Delete Session">
                <mat-icon>delete</mat-icon> Delete
              </button>
            </div>
        </div>

        <div class="empty-state" *ngIf="!sessions().length">
          <span class="material-icons">event</span>
          <h3>No Sessions Yet</h3>
          <p>Create your first session to start taking attendance.</p>
        </div>
      </div>
      <!-- ══════════ DELETE CONFIRM MODAL ══════════ -->
      <div class="modal-overlay" *ngIf="showDeleteConfirm()" (click)="cancelDelete()">
        <div class="confirm-modal animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="confirm-modal__icon">⚠️</div>
          <h3>Confirm Deletion</h3>
          <p>Are you sure you want to delete the session for <strong>{{ sessionToDelete()?.courseCode }} — {{ sessionToDelete()?.sessionDate || $any(sessionToDelete())?.session_date | date:'MMM d, y' }}</strong>? All attendance records for this session will be permanently deleted.</p>
          
          <div class="confirm-modal__footer">
            <button mat-button (click)="cancelDelete()">Cancel</button>
            <button mat-raised-button color="warn" (click)="executeDeleteSession()" [disabled]="loading()">
              Delete Session
            </button>
          </div>
        </div>
      </div>

      <!-- ── Big QR Modal (for screen share) ──────────────── -->
      <div class="qr-modal-overlay" *ngIf="bigQRSession()" (click)="bigQRSession.set(null)">
        <div class="qr-big-card animate-scale-in" (click)="$event.stopPropagation()">
           <button class="qr-modal-close" (click)="bigQRSession.set(null)"><mat-icon>close</mat-icon></button>
           <div class="qr-big-header">
              <h2>{{ bigQRSession()?.courseCode }} Attendance</h2>
              <p>Scan to record attendance for today's session</p>
           </div>
           
           <div class="qr-big-body">
              <img [src]="getBigQRImageUrl()" alt="Large QR Code" />
           </div>

           <div class="qr-big-footer">
              <div class="qr-big-timer">
                 <mat-icon>timer</mat-icon>
                 <span>{{ getQRCountdown(bigQRSession()!.id) }}</span>
              </div>
              <button mat-raised-button color="primary" (click)="downloadQR(bigQRSession()!)">
                <mat-icon>download</mat-icon> Download PNG
              </button>
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1100; padding:16px; }
    .confirm-modal {
      background:white; border-radius:20px; width:100%; max-width:400px;
      padding:32px 24px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.2);
      h3 { margin:16px 0 8px; color:var(--color-primary); font-size:1.2rem; font-weight:800; }
      p { color:var(--color-text-muted); font-size:0.9rem; line-height:1.5; margin-bottom:24px; }
    }
    .confirm-modal__icon { font-size:48px; }
    .confirm-modal__footer { display:flex; justify-content:center; gap:12px; }

    .create-panel {
      background: white; border-radius: var(--radius-lg);
      padding: 28px; margin-bottom: 24px;
      box-shadow: var(--shadow-md); border: 2px solid var(--color-primary);
    }
    .create-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      @media (max-width: 640px) { grid-template-columns: 1fr; } }
    .create-form mat-form-field:last-of-type { grid-column: 1 / -1; }
    .create-form__actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 12px; }

    .sessions-grid { display: flex; flex-direction: column; gap: 16px; }
    .session-item {
      background: white; border-radius: var(--radius-lg);
      padding: 20px; box-shadow: var(--shadow-md);
      border: 1px solid var(--color-border);
      &.is-active { border-color: var(--color-primary); border-width: 2px; }
    }
    .session-item__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .session-item__meta { font-size: 0.72rem; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .instructor-tag { background: #fee2e2; color: #8B1A1A; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; }
    .session-item__name { font-size: 1.05rem; font-weight: 700; margin-top: 4px; }
    .session-item__topic { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px; }
    .session-item__progress { margin: 12px 0; }
    .session-item__progress-labels { display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--color-text-muted); margin-bottom: 6px; font-weight: 500; }
    .session-item__qr { display: flex; align-items: center; gap: 20px; padding: 16px 0; border-top: 1px solid var(--color-border); flex-wrap: wrap; }
    .qr-box { display: flex; flex-direction: column; align-items: center; gap: 6px;
      img { border-radius: 8px; box-shadow: var(--shadow-sm); } }
    .qr-timer { font-size: 0.9rem; font-weight: 700; color: var(--color-success);
      &.warning { color: var(--color-warning); }
      &.expired { color: var(--color-error); } }
    .session-item__qr-actions { display: flex; gap: 8px; flex-wrap:wrap; }
    .btn-delete { color: #ef4444 !important; margin-left: auto; }

    .qr-placeholder { display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1; }

    /* Big QR Modal */
    .qr-modal-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px);
      display:flex; align-items:center; justify-content:center; z-index:2000; padding:20px;
    }
    .qr-big-card {
      background:white; border-radius:32px; width:100%; max-width:600px;
      position:relative; padding:40px; text-align:center; box-shadow:0 30px 100px rgba(0,0,0,0.5);
    }
    .qr-modal-close {
      position:absolute; top:20px; right:20px; background:none; border:none; color:#666; cursor:pointer;
      &:hover { color:var(--color-primary); }
    }
    .qr-big-header { margin-bottom:30px; h2 { margin:0; color:var(--color-primary); font-size:2rem; } p { margin:8px 0 0; color:#666; font-size:1.1rem; } }
    .qr-big-body {
      background:#f8f9fa; border-radius:24px; padding:30px; margin-bottom:30px;
      display:flex; justify-content:center; align-items:center;
      img { width:100%; max-width:400px; height:auto; border-radius:16px; filter:drop-shadow(0 10px 30px rgba(0,0,0,0.1)); }
    }
    .qr-big-footer {
      display:flex; justify-content:space-between; align-items:center; padding-top:20px; border-top:1px solid #eee;
    }
    .qr-big-timer {
      display:flex; align-items:center; gap:8px; color:var(--color-success); font-weight:800; font-size:1.4rem;
      mat-icon { font-size:28px; width:28px; height:28px; }
    }
    .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes scaleIn { from { transform:scale(0.8); opacity:0; } to { transform:scale(1); opacity:1; } }
  `]
})
export class SessionsComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  auth = inject(AuthService);
  toast = inject(ToastService);
  private fb = inject(FormBuilder);

  sessions = signal<ClassSession[]>([]);
  sections = signal<ClassSection[]>([]);
  loading = signal(true);
  creating = signal(false);
  showCreate = signal(false);
  generatingQR = signal<number | null>(null);
  activeQRs = signal<{ [sessionId: number]: QRSession }>({});
  bigQRSession = signal<ClassSession | null>(null);
  now = signal(Date.now());

  private timerSub!: Subscription;

  createForm = this.fb.group({
    classSectionId: [null],
    sessionDate: [new Date().toISOString().split('T')[0]],
    topic: [''],
    lateThresholdMinutes: [15]
  });

  ngOnInit(): void {
    this.loadSections();
    this.loadSessions();
    // Refresh current time every second for smooth countdown
    this.timerSub = interval(1000).subscribe(() => this.now.set(Date.now()));
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }

  loadSections(): void {
    this.api.getSections().subscribe({ next: (r) => this.sections.set(r.data || []) });
  }

  loadSessions(): void {
    this.loading.set(true);
    this.api.getSessions().subscribe({
      next: (r) => { 
        const data = r.data || [];
        this.sessions.set(data); 

        // Populate activeQRs from session data to preserve state on reload/navigate
        const qrMap = { ...this.activeQRs() };
        data.forEach((s: any) => {
          if (s.activeQR) {
            let qr = s.activeQR;
            if (typeof qr === 'string') try { qr = JSON.parse(qr); } catch(e) {}
            if (qr && qr.isActive) qrMap[s.id] = qr;
          }
        });
        this.activeQRs.set(qrMap);

        this.loading.set(false); 
      },
      error: () => this.loading.set(false)
    });
  }

  openCreateDialog(): void { this.showCreate.update(v => !v); }

  createSession(): void {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    const v = this.createForm.value;
    this.api.createSession({
      classSectionId: v.classSectionId,
      sessionDate: v.sessionDate,
      topic: v.topic || undefined,
      lateThresholdMinutes: v.lateThresholdMinutes
    }).subscribe({
      next: () => { this.creating.set(false); this.showCreate.set(false); this.loadSessions(); this.toast.success('Session created!'); },
      error: (err) => { this.creating.set(false); this.toast.error(this.toast.extractError(err)); }
    });
  }

  generateQR(session: ClassSession): void {
    this.generatingQR.set(session.id);
    this.api.generateQR(session.id).subscribe({
      next: (r) => {
        this.generatingQR.set(null);
        this.activeQRs.update(v => ({ ...v, [session.id]: r.data! }));
        this.loadSessions(); 
        this.toast.success('QR Code generated! ✅');
      },
      error: (err) => { this.generatingQR.set(null); this.toast.error(this.toast.extractError(err)); }
    });
  }

  openBigQR(s: ClassSession): void {
    this.bigQRSession.set(s);
  }

  getBigQRImageUrl(): string {
    const s = this.bigQRSession();
    if (!s) return '';
    const qr = this.activeQRs()[s.id];
    if (!qr?.qrDataUrl) return '';
    return qr.qrDataUrl.replace('size=220x220', 'size=400x400');
  }

  endSession(session: ClassSession): void {
    this.api.updateSession(session.id, { status: 'ended' }).subscribe({
      next: () => {
        // Clear active QR for this session locally
        this.activeQRs.update(v => {
          const next = { ...v };
          delete next[session.id];
          return next;
        });
        this.loadSessions();
        this.toast.info('Session ended.');
      },
      error: (err) => this.toast.error(this.toast.extractError(err))
    });
  }

  getRate(s: ClassSession): number {
    if (!s.enrolledCount) return 0;
    return Math.round(((s.presentCount || 0) / s.enrolledCount) * 100);
  }

  getQRCountdown(sessionId: number): string {
    const qr = this.activeQRs()[sessionId];
    if (!qr) return '';
    const remaining = new Date(qr.expiresAt).getTime() - this.now();
    if (remaining <= 0) return 'Expired';
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')} remaining`;
  }

  isQRWarning(id: number): boolean {
    const qr = this.activeQRs()[id];
    if (!qr) return false;
    return new Date(qr.expiresAt).getTime() - this.now() < 120000;
  }

  isQRExpired(id: number): boolean {
    const qr = this.activeQRs()[id];
    if (!qr) return false;
    return new Date(qr.expiresAt).getTime() < this.now();
  }

  downloadQR(session: ClassSession): void {
    const qr = this.activeQRs()[session.id];
    if (!qr?.qrDataUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const padding = 40;
      const headerH = 60;
      const footerH = 40;
      const w = img.width + padding * 2;
      const h = img.height + padding * 2 + headerH + footerH;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#8B1A1A';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Liceo de Cagayan University', w / 2, padding + 20);
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.fillText(`${session.courseCode || ''} \u2014 ${session.sectionName || ''} \u2014 ${session.topic || ''}`, w / 2, padding + 42);

      ctx.drawImage(img, padding, padding + headerH);

      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.fillText('Scan to record attendance', w / 2, h - padding + 10);

      const link = document.createElement('a');
      link.download = `QR-${session.courseCode}-${session.sectionName}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qr.qrDataUrl;
  }

  showDeleteConfirm = signal(false);
  sessionToDelete = signal<ClassSession | null>(null);

  confirmDeleteSession(s: ClassSession): void {
    this.sessionToDelete.set(s);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.sessionToDelete.set(null);
  }

  executeDeleteSession(): void {
    console.log('>>> executeDeleteSession triggered');
    const s = this.sessionToDelete();
    if (!s) return;
    
    this.api.deleteSession(s.id).subscribe({
      next: () => {
        this.toast.success('Session deleted!');
        this.cancelDelete();
        this.loadSessions();
      },
      error: (err) => {
        this.toast.error(this.toast.extractError(err));
      }
    });
  }
}
