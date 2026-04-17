import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
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
      
      <!-- Filter Dropdown -->
      <div class="filter-area animate-fade-in-up" *ngIf="sections().length > 0">
        <mat-form-field appearance="outline" class="course-filter">
          <mat-label>Filter by Course</mat-label>
          <mat-select [value]="selectedFilter()" (selectionChange)="selectedFilter.set($event.value)">
            <mat-option [value]="null">All Sessions</mat-option>
            <mat-option *ngFor="let sec of sections()" [value]="sec.id">
              {{ sec.courseName }} — {{ sec.sectionName }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>filter_list</mat-icon>
        </mat-form-field>
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
        <!-- Grouped Sessions -->
        <div *ngFor="let group of groupedSessions()" class="course-group">
          <div class="course-divider">
            <span class="course-divider__code">{{ group.courseCode }} — {{ group.sectionName }}</span>
            <span class="course-divider__name">{{ group.courseName }}</span>
            <div class="course-divider__line"></div>
          </div>

          <div class="session-item" *ngFor="let s of group.sessions" [class.is-active]="s.status === 'active'">
            <div class="session-item__header">
              <div>
                <div class="session-item__meta">
                  📅 {{ s.sessionDate || s.session_date | date:'MMM d, y' }}
                  <span *ngIf="auth.isAdmin()" class="instructor-tag">By {{ s.instructorFirst }} {{ s.instructorLast }}</span>
                </div>
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
        </div>

        <!-- Empty State (No sessions found for filter or overall) -->
        <div class="empty-state animate-fade-in-up" *ngIf="groupedSessions().length === 0">
          <div class="empty-state__icon">📭</div>
          <h3>{{ selectedFilter() ? 'No sessions found for this course' : 'No sessions yet' }}</h3>
          <button mat-button color="primary" *ngIf="selectedFilter()" (click)="selectedFilter.set(null)">
            Show All Sessions
          </button>
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

    .course-group {
      display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;
    }
    .course-divider {
      display: flex; align-items: center; gap: 12px; margin: 12px 0 8px;
      padding: 0 4px;
    }
    .course-divider__code {
      font-size: 0.85rem; font-weight: 800; color: var(--color-primary);
      text-transform: uppercase; white-space: nowrap;
      background: rgba(139, 26, 26, 0.08); padding: 6px 14px; border-radius: 12px;
      border: 1px solid rgba(139, 26, 26, 0.1);
    }
    .course-divider__name {
      font-size: 0.9rem; font-weight: 700; color: #444;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .course-divider__line {
      flex: 1; height: 1px; background: linear-gradient(to right, rgba(139, 26, 26, 0.2), transparent);
    }

    .filter-area {
      margin-bottom: 32px;
      display: flex; justify-content: flex-start;
      padding: 0 4px;
    }
    .course-filter {
      width: 100%; max-width: 320px;
      ::ng-deep .mat-mdc-text-field-wrapper { 
        background: white; border-radius: 12px !important; 
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      /* Target the Material Outline specifically to avoid double-border issues */
      ::ng-deep .mdc-notched-outline__leading,
      ::ng-deep .mdc-notched-outline__notch,
      ::ng-deep .mdc-notched-outline__trailing {
        border-color: rgba(139, 26, 26, 0.2) !important;
      }

      &:hover ::ng-deep .mdc-notched-outline__leading,
      &:hover ::ng-deep .mdc-notched-outline__notch,
      &:hover ::ng-deep .mdc-notched-outline__trailing {
        border-color: var(--color-primary) !important;
      }
      
      &.mat-focused ::ng-deep .mdc-notched-outline__leading,
      &.mat-focused ::ng-deep .mdc-notched-outline__notch,
      &.mat-focused ::ng-deep .mdc-notched-outline__trailing {
        border-color: var(--color-primary) !important;
        border-width: 2px !important;
      }

      ::ng-deep .mat-mdc-select-value { font-size: 0.9rem; font-weight: 500; }
      ::ng-deep .mat-mdc-form-field-label { color: var(--color-text-muted); font-size: 0.85rem; }
    }

    /* Premium Overlay Styling */
    ::ng-deep .mat-mdc-select-panel {
      border-radius: 16px !important;
      padding: 8px !important;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
    }
    ::ng-deep .mat-mdc-option {
      border-radius: 8px !important;
      margin-bottom: 4px !important;
      transition: all 0.2s ease !important;
      
      &:hover:not(.mdc-list-item--disabled) {
        background-color: rgba(139, 26, 26, 0.05) !important;
      }
      
      &.mdc-list-item--selected:not(.mdc-list-item--disabled) {
        background-color: var(--color-primary) !important;
        .mdc-list-item__primary-text { color: white !important; font-weight: 700 !important; }
        mat-pseudo-checkbox { display: none; }
      }
    }
    .session-item {
      background: white; border-radius: 20px;
      padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,0.04);
      border: 1px solid rgba(139, 26, 26, 0.08);
      transition: all 0.3s ease;
      position: relative; overflow: hidden;
      
      &:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(139, 26, 26, 0.08); border-color: rgba(139, 26, 26, 0.2); }
      &.is-active { 
        border: 2px solid var(--color-primary); 
        background: linear-gradient(to bottom, #fff, #fffafa);
        &::after {
          content: '● Active Now'; position: absolute; top: 12px; right: 12px;
          color: var(--color-success); font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
        }
      }
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

    .empty-state {
      text-align: center; padding: 60px 20px;
      background: white; border-radius: 24px; border: 2px dashed var(--color-border);
      .empty-state__icon { font-size: 64px; margin-bottom: 20px; }
      h3 { font-size: 1.5rem; color: var(--color-primary); margin-bottom: 8px; font-weight: 800; }
      p { color: var(--color-text-muted); margin-bottom: 24px; }
    }
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
  selectedFilter = signal<number | null>(null);

  groupedSessions = computed(() => {
    let sessions = this.sessions();
    const filterId = this.selectedFilter();
    
    // Apply filter if one is selected
    if (filterId) {
      sessions = sessions.filter(s => s.classSectionId === filterId || (s as any).class_section_id === filterId);
    }

    const groups: { [key: string]: { courseCode: string, courseName: string, sectionName: string, sessions: ClassSession[] } } = {};
    
    sessions.forEach(s => {
      const cCode = s.courseCode || 'N/A';
      const sName = s.sectionName || 'N/A';
      const cName = s.courseName || 'Unknown Course';
      const key = `${cCode}-${sName}`;

      if (!groups[key]) {
        groups[key] = {
          courseCode: cCode,
          courseName: cName,
          sectionName: sName,
          sessions: []
        };
      }
      groups[key].sessions.push(s);
    });

    return Object.values(groups);
  });

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
      next: (r) => { 
        this.creating.set(false); 
        this.showCreate.set(false); 
        // Force refresh session list without explicit heavy loading if possible
        this.loadSessions(); 
        this.toast.success('Session created!'); 
      },
      error: (err) => { this.creating.set(false); this.toast.error(this.toast.extractError(err)); }
    });
  }

  generateQR(session: ClassSession): void {
    const active = this.activeQRs()[session.id];
    let seconds: number | undefined;
    
    // Logic: If session is ended, it's a "Resume" -> Reset to 15 min.
    // If session is active and has a QR, it's a "Regenerate" -> Preserve time.
    const isEnded = session.status === 'ended';
    if (!isEnded && active && active.isActive) {
      const remaining = new Date(active.expiresAt).getTime() - this.now();
      seconds = Math.max(0, Math.floor(remaining / 1000));
    }

    this.generatingQR.set(session.id);
    this.api.generateQR(session.id, seconds ? undefined : 15, seconds).subscribe({
      next: (r) => {
        this.generatingQR.set(null);
        this.activeQRs.update(v => ({ ...v, [session.id]: r.data! }));
        
        // Optimistically update session status to active without full reload
        this.sessions.update(list => 
          list.map(x => x.id === session.id ? { ...x, status: 'active' as any } : x)
        );

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
        // Optimistically update session status
        this.sessions.update(list => 
          list.map(x => x.id === session.id ? { ...x, status: 'ended' as any } : x)
        );
        // Clear active QR for this session locally
        this.activeQRs.update(v => {
          const next = { ...v };
          delete next[session.id];
          return next;
        });
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
    const s = this.sessionToDelete();
    if (!s) return;
    
    this.api.deleteSession(s.id).subscribe({
      next: () => {
        // Optimistically remove from list
        this.sessions.update(list => list.filter(x => x.id !== s.id));
        this.toast.success('Session deleted!');
        this.cancelDelete();
      },
      error: (err) => {
        this.toast.error(this.toast.extractError(err));
      }
    });
  }
}
