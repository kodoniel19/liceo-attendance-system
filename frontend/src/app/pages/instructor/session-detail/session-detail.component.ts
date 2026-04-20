import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Subscription, interval } from 'rxjs';
import { Attendance, ClassSession, QRSession } from '../../../core/models';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatMenuModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header animate-fade-in-up">
        <div class="page-header__title">
          <a routerLink="/instructor/sessions" class="back-link">
            <span class="material-icons">arrow_back</span> Sessions
          </a>
          <h1>{{ session()?.courseCode }} — {{ session()?.sectionName }}</h1>
          <p>{{ session()?.sessionDate | date:'EEEE, MMMM d, y' }} · {{ session()?.topic || 'No topic set' }}</p>
        </div>
        <div class="page-header__actions">
          <button mat-stroked-button (click)="api.exportExcel({ sectionId: getSectionId() })">
            <mat-icon>table_chart</mat-icon> Excel
          </button>
          <button mat-stroked-button (click)="api.exportPDF({ sectionId: getSectionId() })">
            <mat-icon>picture_as_pdf</mat-icon> PDF
          </button>
        </div>
      </div>

      <!-- ── QR Control Panel ──────────────────────────────── -->
      <div class="qr-panel animate-fade-in-up" *ngIf="session()">
        <div class="qr-panel__left">
          <div class="qr-status-dot" [class.active]="qrActive() && session()?.status === 'active'" [class.inactive]="!qrActive() || session()?.status === 'ended'"></div>
          <div>
            <div class="qr-status-label">Session & QR Status</div>
            <div class="qr-status-value" [class.text-success]="session()?.status === 'active'" [class.text-muted]="session()?.status === 'ended'">
              <span *ngIf="session()?.status === 'active'">Active — {{ qrActive() ? 'Scanning in progress' : 'Ready to scan' }}</span>
              <span *ngIf="session()?.status === 'ended'">Session Ended</span>
              <span class="sync-indicator" *ngIf="session()?.status === 'active'">⚡ Synced {{ now() | date:'h:mm:ss a' }}</span>
            </div>
            <div class="qr-expiry" *ngIf="qrActive() && qrData()?.expiresAt && session()?.status === 'active'">
              <span class="material-icons" style="font-size:14px;vertical-align:middle;margin-right:4px">timer</span>
              {{ getQRCountdown() }}
            </div>
          </div>
        </div>
        <div class="qr-panel__actions">
          <!-- Generate QR (first time or resume) -->
          <button mat-raised-button color="primary" *ngIf="!qrActive() || session()?.status === 'ended'" (click)="generateQR()" [disabled]="qrLoading()">
            <mat-spinner *ngIf="qrLoading()" diameter="16"></mat-spinner>
            <mat-icon *ngIf="!qrLoading()">{{ session()?.status === 'ended' ? 'refresh' : 'qr_code' }}</mat-icon>
            {{ session()?.status === 'ended' ? 'Resume & Generate QR' : 'Generate QR' }}
          </button>
          
          <!-- View Large QR -->
          <button mat-raised-button color="accent" *ngIf="qrActive() && session()?.status === 'active'" (click)="showBigQR.set(true)">
            <mat-icon>fullscreen</mat-icon> Show Large QR
          </button>

          <!-- Stop (Pause) QR -->
          <button mat-raised-button color="warn" *ngIf="qrActive() && session()?.status === 'active'" (click)="stopQR()" [disabled]="qrLoading()">
            <mat-icon>pause_circle</mat-icon> Stop QR
          </button>

          <!-- End Session -->
          <button mat-raised-button 
            *ngIf="session()?.status === 'active'" 
            (click)="endSession()" 
            [disabled]="qrLoading()"
            style="background-color: #1a1a2e; color: white;">
            <mat-icon>event_available</mat-icon> End Session
          </button>
        </div>
      </div>

      <!-- ── Stats ─────────────────────────────────────────── -->
      <div class="stats-grid animate-fade-in-up mb-3" *ngIf="attendance().length">
        <div class="stat-card">
          <div class="stat-card__icon success"><span class="material-icons">check_circle</span></div>
          <div class="stat-card__value text-success">{{ counts().present }}</div>
          <div class="stat-card__label">Present</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon" style="background:rgba(230,126,34,.1);color:var(--color-warning)"><span class="material-icons">schedule</span></div>
          <div class="stat-card__value" style="color:var(--color-warning)">{{ counts().late }}</div>
          <div class="stat-card__label">Late</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon" [style.background]="session()?.status === 'active' ? 'rgba(100,116,139,.1)' : 'rgba(231,76,60,.1)'" [style.color]="session()?.status === 'active' ? '#64748b' : 'var(--color-error)'">
            <span class="material-icons">{{ session()?.status === 'active' ? 'hourglass_empty' : 'cancel' }}</span>
          </div>
          <div class="stat-card__value" [style.color]="session()?.status === 'active' ? '#64748b' : 'var(--color-error)'">{{ counts().absent }}</div>
          <div class="stat-card__label">{{ session()?.status === 'active' ? 'To Scan' : 'Absent' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon" style="background:rgba(52,152,219,.1);color:#3498db"><span class="material-icons">assignment</span></div>
          <div class="stat-card__value" style="color:#3498db">{{ counts().excused }}</div>
          <div class="stat-card__label">Excused</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon info"><span class="material-icons">people</span></div>
          <div class="stat-card__value">{{ attendance().length }}</div>
          <div class="stat-card__label">Total</div>
        </div>
      </div>

      <!-- ── Search bar ─────────────────────────────────────── -->
      <div class="search-bar mb-2 animate-fade-in-up">
        <mat-form-field style="max-width:340px">
          <mat-label>Search student...</mat-label>
          <input matInput [formControl]="search">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
      </div>

      <!-- ── Attendance Table ───────────────────────────────── -->
      <div *ngIf="loading()" class="loading-spinner"><mat-spinner diameter="36"></mat-spinner></div>
      <div class="data-table-container animate-fade-in-up" *ngIf="!loading()">
        <table mat-table [dataSource]="filteredAttendance()">
          <ng-container matColumnDef="student">
            <th mat-header-cell *matHeaderCellDef>Student</th>
            <td mat-cell *matCellDef="let a">
              <div class="student-cell">
                <div class="student-avatar">{{ getInitials(a) }}</div>
                <div>
                  <div class="student-name">{{ a.lastName || a.last_name }}, {{ a.firstName || a.first_name }}</div>
                  <div class="student-id">{{ a.universityId || a.university_id }}</div>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let a">
              <span class="badge" 
                [class]="'badge--' + a.status"
                [style.background-color]="(a.status === 'absent' && session()?.status === 'active') ? '#e2e8f0' : null"
                [style.color]="(a.status === 'absent' && session()?.status === 'active') ? '#64748b' : null">
                {{ (a.status === 'absent' && session()?.status === 'active') ? 'To Scan' : a.status }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="time">
            <th mat-header-cell *matHeaderCellDef>Scan Time</th>
            <td mat-cell *matCellDef="let a">
              <span *ngIf="a.scanTime || a.scan_time" style="font-size:0.85rem">
                {{ (a.scanTime || a.scan_time) | date:'h:mm a' }}
              </span>
              <span *ngIf="!a.scanTime && !a.scan_time" style="color:#ccc;font-size:0.8rem">—</span>
            </td>
          </ng-container>


          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Change</th>
            <td mat-cell *matCellDef="let a">
              <button mat-icon-button [matMenuTriggerFor]="menu" [matMenuTriggerData]="{record: a}">
                <mat-icon>more_vert</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="['student', 'status', 'time', 'actions']"></tr>
          <tr mat-row *matRowDef="let row; columns: ['student', 'status', 'time', 'actions'];"></tr>
        </table>

        <div class="empty-state" *ngIf="!filteredAttendance().length">
          <span class="material-icons">people_outline</span>
          <h3>No records yet</h3>
          <p>Generate a QR code for students to scan, or use Manual Entry.</p>
        </div>
      </div>

      <mat-menu #menu="matMenu">
        <ng-template matMenuContent let-record="record">
          <button mat-menu-item (click)="override(record, 'present')"><mat-icon style="color:var(--color-success)">check_circle</mat-icon> Mark Present</button>
          <button mat-menu-item (click)="override(record, 'late')"><mat-icon style="color:var(--color-warning)">schedule</mat-icon> Mark Late</button>
          <button mat-menu-item (click)="override(record, 'absent')"><mat-icon style="color:var(--color-error)">cancel</mat-icon> Mark Absent</button>
          <button mat-menu-item (click)="override(record, 'excused')"><mat-icon style="color:var(--color-info)">info</mat-icon> Mark Excused</button>
        </ng-template>
      </mat-menu>

      <!-- ── Manual Attendance Modal ───────────────────────── -->
      <div class="modal-overlay" *ngIf="showManual()" (click)="closeManual()">
        <div class="manual-modal animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Manual Attendance Entry</h3>
              <p>Search for a student and mark their attendance manually</p>
            </div>
            <button mat-icon-button (click)="closeManual()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="modal-body">
            <!-- Student search -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Search Student (name or ID)</mat-label>
              <input matInput [formControl]="studentSearch" placeholder="Type to search..." />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <!-- Search results -->
            <div class="student-results" *ngIf="availableStudents().length">
              <div class="student-result-row" *ngFor="let s of availableStudents()"
                [class.selected]="selectedStudent()?.id === s.id"
                (click)="selectStudent(s)">
                <div class="student-avatar small">{{ (s.first_name||s.firstName||'')[0] }}{{ (s.last_name||s.lastName||'')[0] }}</div>
                <div class="flex-1">
                  <div class="student-name">{{ s.last_name || s.lastName }}, {{ s.first_name || s.firstName }}</div>
                  <div class="student-id">{{ s.university_id || s.universityId }}</div>
                </div>
                <mat-icon *ngIf="selectedStudent()?.id === s.id" style="color:var(--color-primary)">check_circle</mat-icon>
              </div>
            </div>
            <div class="no-students" *ngIf="studentSearch.value && !availableStudents().length && !searchingStudents()">
              No students found matching "{{ studentSearch.value }}"
            </div>
            <div class="loading-spinner" style="padding:16px" *ngIf="searchingStudents()">
              <mat-spinner diameter="24"></mat-spinner>
            </div>

            <!-- Status picker -->
            <mat-form-field appearance="outline" class="full-width" style="margin-top:16px" *ngIf="selectedStudent()">
              <mat-label>Attendance Status</mat-label>
              <mat-select [formControl]="manualStatus">
                <mat-option value="present">✅ Present</mat-option>
                <mat-option value="late">⏰ Late</mat-option>
                <mat-option value="absent">❌ Absent</mat-option>
                <mat-option value="excused">📝 Excused</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width" *ngIf="selectedStudent()">
              <mat-label>Reason / Note (optional)</mat-label>
              <input matInput [formControl]="manualReason" placeholder="e.g. Medical certificate submitted" />
            </mat-form-field>
          </div>
          <div class="modal-footer">
            <button mat-button (click)="closeManual()">Cancel</button>
            <button mat-raised-button color="primary" (click)="submitManual()"
              [disabled]="!selectedStudent() || !manualStatus.value || savingManual()">
              <mat-spinner *ngIf="savingManual()" diameter="16"></mat-spinner>
              {{ savingManual() ? 'Saving...' : 'Record Attendance' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Big QR Modal (for screen share) ──────────────── -->
      <div class="qr-modal-overlay" *ngIf="showBigQR()" (click)="showBigQR.set(false)">
        <div class="qr-big-card animate-scale-in" (click)="$event.stopPropagation()">
           <button class="qr-modal-close" (click)="showBigQR.set(false)"><mat-icon>close</mat-icon></button>
           <div class="qr-big-header">
              <h2>{{ session()?.courseCode }} Attendance</h2>
              <p>Scan to record attendance for today's session</p>
           </div>
           
           <div class="qr-big-body">
              <img [src]="getBigQR()" alt="Large QR Code" />
           </div>

           <div class="qr-big-footer">
              <div class="qr-big-timer">
                 <mat-icon>timer</mat-icon>
                 <span>{{ getQRCountdown() }}</span>
              </div>
              <button mat-raised-button color="primary" (click)="downloadQR()">
                <mat-icon>download</mat-icon> Download PNG
              </button>
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .back-link { font-size:0.8rem; color:var(--color-text-muted); display:flex; align-items:center; gap:4px; margin-bottom:8px; text-decoration:none; &:hover { color:var(--color-primary); } .material-icons { font-size:16px; } }

    .page-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; }
    .page-header__actions { display:flex; gap:10px; }

    /* QR Panel */
    .qr-panel {
      background:white; border-radius:var(--radius-lg); padding:20px 24px;
      box-shadow:var(--shadow-md); border:1px solid var(--color-border);
      display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;
      margin-bottom:20px;
    }
    .qr-panel__left { display:flex; align-items:center; gap:16px; }
    .qr-status-dot {
      width:14px; height:14px; border-radius:50%; flex-shrink:0;
      &.active { background:#10b981; box-shadow:0 0 0 4px rgba(16,185,129,0.2); animation: pulse 2s infinite; }
      &.inactive { background:#cbd5e1; }
    }
    @keyframes pulse { 0%,100% { box-shadow:0 0 0 4px rgba(16,185,129,0.2); } 50% { box-shadow:0 0 0 8px rgba(16,185,129,0.1); } }
    .qr-status-label { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted); }
    .qr-status-value { font-size:0.9rem; font-weight:600; margin-top:2px; display:flex; align-items:center; gap:10px; }
    .sync-indicator { font-size:0.65rem; color: #10b981; font-weight: 700; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .qr-expiry { font-size:0.75rem; color:var(--color-text-muted); margin-top:4px; }
    .qr-panel__actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }

    /* QR image */
    .qr-image-wrap { display:flex; justify-content:center; margin-bottom:24px; }
    .qr-image-card { background:white; border-radius:20px; padding:28px; text-align:center; box-shadow:var(--shadow-lg); max-width:320px; width:100%; h3 { margin:0 0 16px; color:var(--color-primary); } }
    .qr-img { width:220px; height:220px; border-radius:12px; }
    .qr-hint { font-size:0.75rem; color:var(--color-text-muted); margin-top:12px; }
    .download-qr-btn {
      margin-top: 16px; width: 100%;
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)) !important;
      color: white !important; font-weight: 600; border-radius: 10px !important;
      height: 44px;
    }

    /* Table */
    .student-cell { display:flex; align-items:center; gap:12px; padding:4px 0; }
    .student-avatar {
      width:36px; height:36px; border-radius:50%;
      background:linear-gradient(135deg, var(--color-primary), var(--color-accent));
      color:white; display:flex; align-items:center; justify-content:center;
      font-weight:700; font-size:0.75rem; flex-shrink:0;
      &.small { width:30px; height:30px; font-size:0.65rem; }
    }
    .student-name { font-weight:600; font-size:0.875rem; }
    .student-id   { font-size:0.75rem; color:var(--color-text-muted); }
    .search-bar { display:flex; align-items:center; gap:12px; }

    /* Manual modal */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
    .manual-modal { background:white; border-radius:20px; width:100%; max-width:520px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.2); overflow:hidden; }
    .modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:20px 24px; border-bottom:1px solid var(--color-border); h3 { margin:0 0 4px; color:var(--color-primary); } p { margin:0; font-size:0.8rem; color:var(--color-text-muted); } }
    .modal-body { padding:20px 24px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px; }
    .modal-footer { display:flex; justify-content:flex-end; gap:12px; padding:16px 24px; border-top:1px solid var(--color-border); }
    .full-width { width:100%; }

    .student-results { display:flex; flex-direction:column; gap:4px; max-height:220px; overflow-y:auto; border:1px solid var(--color-border); border-radius:10px; padding:8px; }
    .student-result-row {
      display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:8px; cursor:pointer;
      transition:background 0.15s;
      &:hover { background:rgba(139,26,26,0.05); }
      &.selected { background:rgba(139,26,26,0.1); }
    }
    .flex-1 { flex:1; }
    .no-students { text-align:center; color:var(--color-text-muted); font-size:0.85rem; padding:16px; }

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
export class SessionDetailComponent implements OnInit, OnDestroy {
  api   = inject(ApiService);
  toast = inject(ToastService);
  route = inject(ActivatedRoute);
  fb    = inject(FormBuilder);

  session    = signal<ClassSession | null>(null);
  attendance = signal<Attendance[]>([]);
  loading    = signal(true);
  search     = new FormControl('');

  // QR state
  qrData     = signal<any>(null);
  qrActive   = computed(() => !!this.qrData()?.isActive);
  qrImageUrl = signal<string | null>(null);
  qrLoading  = signal(false);
  showBigQR  = signal(false);
  pausedRemainingSeconds = signal<number | null>(null);
  private qrPollInterval: any = null;
  now = signal(Date.now());
  private timerSub!: Subscription;

  // Manual attendance
  showManual        = signal(false);
  studentSearch     = new FormControl('');
  availableStudents = signal<any[]>([]);
  selectedStudent   = signal<any>(null);
  manualStatus      = this.fb.control('present');
  manualReason      = this.fb.control('');
  savingManual      = signal(false);
  searchingStudents = signal(false);
  private studentSearchDebounce: any = null;

  displayedColumns  = ['student', 'status', 'time', 'actions'];
  filteredAttendance = signal<Attendance[]>([]);
  counts = signal({ present: 0, late: 0, absent: 0, excused: 0 });

  private sessionId = 0;

  ngOnInit(): void {
    this.sessionId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadSessionData();
    this.loadAttendance();
    this.checkQRStatus();
    this.startAttendanceMonitor(); // Always start polling for real-time updates

    this.timerSub = interval(1000).subscribe(() => this.now.set(Date.now()));

    this.search.valueChanges.subscribe(v => {
      const q = (v || '').toLowerCase();
      this.filteredAttendance.set(
        this.attendance().filter(a =>
          `${a.firstName || (a as any).first_name} ${a.lastName || (a as any).last_name} ${a.universityId || (a as any).university_id}`.toLowerCase().includes(q)
        )
      );
    });

    this.studentSearch.valueChanges.subscribe(v => {
      clearTimeout(this.studentSearchDebounce);
      if (!v || v.length < 2) { this.availableStudents.set([]); return; }
      this.studentSearchDebounce = setTimeout(() => this.searchStudents(v), 400);
    });
  }

  ngOnDestroy(): void {
    if (this.qrPollInterval) clearInterval(this.qrPollInterval);
    if (this.timerSub) this.timerSub.unsubscribe();
    clearTimeout(this.studentSearchDebounce);
  }

  loadAttendance(silent = false): void {
    if (!silent) this.loading.set(true);
    this.api.getSessionAttendance(this.sessionId).subscribe({
      next: r => {
        const data = r.data || [];
        this.attendance.set(data);
        this.filteredAttendance.set(data);
        this.counts.set({
          present: data.filter(a => a.status === 'present').length,
          late:    data.filter(a => a.status === 'late').length,
          absent:  data.filter(a => a.status === 'absent').length,
          excused: data.filter(a => a.status === 'excused').length,
        });
        if (!silent) this.loading.set(false);
      },
      error: () => { if (!silent) this.loading.set(false); }
    });
  }

  // ── QR Code ───────────────────────────────────────────────
  loadSessionData(): void {
    this.api.getSession(this.sessionId).subscribe({ next: r => this.session.set(r.data || null) });
  }

  checkQRStatus(): void {
    this.api.getQRStatus(this.sessionId).subscribe({
      next: r => {
        const qr = r.data;
        if (qr && qr.isActive) {
          this.qrData.set(qr);
          this.buildQRImage(qr);
          this.startAttendanceMonitor();
        } else if (qr) {
          this.qrData.set(qr); // keep data but inactive
        }
      }
    });
  }

  generateQR(): void {
    const isEnded = this.session()?.status === 'ended';
    const seconds = isEnded ? null : this.pausedRemainingSeconds();
    
    this.qrLoading.set(true);
    this.api.generateQR(this.sessionId, seconds ? undefined : 15, seconds || undefined).subscribe({
      next: r => {
        this.qrData.set(r.data);
        this.buildQRImage(r.data);
        this.startAttendanceMonitor();
        this.loadSessionData(); // IMPORTANT: Refresh session status (e.g. from 'ended' to 'active')
        this.qrLoading.set(false);
        this.pausedRemainingSeconds.set(null); // Clear pause state
        this.toast.success('QR code generated! Students can now scan.');
      },
      error: e => { this.toast.error(e?.error?.message || 'Failed to generate QR.'); this.qrLoading.set(false); }
    });
  }

  reopenQR(): void {
    const isEnded = this.session()?.status === 'ended';
    const seconds = isEnded ? null : this.pausedRemainingSeconds();
    
    this.qrLoading.set(true);
    this.api.reopenQR(this.sessionId, seconds ? undefined : 15, seconds || undefined).subscribe({
      next: r => {
        this.qrData.set(r.data);
        this.buildQRImage(r.data);
        this.startAttendanceMonitor();
        this.loadSessionData(); // Sync session status
        this.qrLoading.set(false);
        this.pausedRemainingSeconds.set(null); // Clear pause state
        this.toast.success('QR code reopened!');
      },
      error: e => { this.toast.error(e?.error?.message || 'Failed to reopen QR.'); this.qrLoading.set(false); }
    });
  }

  stopQR(): void {
    const qr = this.qrData();
    if (!qr) return;

    // Calculate remaining time relative to current session
    const remaining = new Date(qr.expiresAt).getTime() - Date.now();
    this.pausedRemainingSeconds.set(Math.max(0, Math.floor(remaining / 1000)));

    this.api.deactivateQR(qr.id || qr.qrSessionId).subscribe({
      next: () => {
        this.qrData.update(d => ({ ...d, isActive: false }));
        this.qrImageUrl.set(null);
        if (this.qrPollInterval) clearInterval(this.qrPollInterval);
        this.toast.success('QR paused. Students can no longer scan.');
      },
      error: e => this.toast.error(e?.error?.message || 'Failed to stop QR.')
    });
  }

  endSession(): void {
    if (!confirm('Are you sure you want to end this attendance session? Students will no longer be able to scan or join.')) return;
    
    this.qrLoading.set(true);
    this.api.updateSession(this.sessionId, { status: 'ended' }).subscribe({
      next: () => {
        // If QR is active, stop it too
        if (this.qrActive()) {
          this.stopQR();
        }
        this.loadSessionData();
        this.qrLoading.set(false);
        this.toast.success('Attendance session ended.');
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to end session.');
        this.qrLoading.set(false);
      }
    });
  }

  private buildQRImage(qr: any): void {
    // Use the data URL generated by our own backend (burgundy design)
    // instead of an external black & white generator.
    this.qrImageUrl.set(qr.qrDataUrl || qr.qr_data_url);
  }

  getBigQR(): string {
    return this.qrImageUrl() || '';
  }

  getQRCountdown(): string {
    const expiresAt = this.qrData()?.expiresAt;
    if (!expiresAt) return '';
    const remaining = new Date(expiresAt).getTime() - this.now();
    if (remaining <= 0) return 'Expired';
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')} remaining`;
  }

  private startAttendanceMonitor(): void {
    if (this.qrPollInterval) return;
    
    console.log('Attendance Real-Time Monitor Started...');
    this.qrPollInterval = setInterval(() => {
      // 1. Refresh Attendance Data (The "Reflect Automatically" part)
      this.api.getSessionAttendance(this.sessionId).subscribe({
        next: r => {
          const data = r.data || [];
          
          // Silently update all signals to reflect the latest state
          this.attendance.set(data);
          this.counts.set({
            present: data.filter((a:any) => a.status === 'present').length,
            late:    data.filter((a:any) => a.status === 'late').length,
            absent:  data.filter((a:any) => a.status === 'absent').length,
            excused: data.filter((a:any) => a.status === 'excused').length,
          });
          
          // Also update filtered view if not searching
          if (!this.search.value) {
            this.filteredAttendance.set(data);
          }
        },
        error: () => console.warn('Attendance monitor heartbeat failed.')
      });

      // 2. Separately Refresh QR status if active
      if (this.session()?.status === 'active') {
        this.api.getQRStatus(this.sessionId).subscribe({
          next: r => {
            if (r.data) this.qrData.set(r.data);
            if (this.session()?.status === 'ended') {
              clearInterval(this.qrPollInterval);
              this.qrPollInterval = null;
            }
          }
        });
      }
    }, 2000); 
  }

  // ── Manual Attendance ─────────────────────────────────────
  openManualModal(): void {
    this.showManual.set(true);
    this.selectedStudent.set(null);
    this.studentSearch.setValue('');
    this.availableStudents.set([]);
    this.manualStatus.setValue('present');
    this.manualReason.setValue('');
  }

  closeManual(): void { this.showManual.set(false); }

  searchStudents(query: string): void {
    const sectionId = this.getSectionId();
    if (!sectionId) return;
    this.searchingStudents.set(true);
    this.api.getAvailableStudents(sectionId, query).subscribe({
      next: r => { this.availableStudents.set(r.data || []); this.searchingStudents.set(false); },
      error: () => this.searchingStudents.set(false)
    });
  }

  selectStudent(s: any): void { this.selectedStudent.set(s); }

  submitManual(): void {
    const student = this.selectedStudent();
    const status  = this.manualStatus.value;
    if (!student || !status) return;
    this.savingManual.set(true);
    this.api.manualAttendance(this.sessionId, student.id, status, this.manualReason.value || undefined).subscribe({
      next: () => {
        this.toast.success(`Attendance recorded: ${student.first_name || student.firstName} — ${status}`);
        this.savingManual.set(false);
        this.closeManual();
        this.loadAttendance();
      },
      error: e => {
        this.toast.error(e?.error?.message || 'Failed to record attendance.');
        this.savingManual.set(false);
      }
    });
  }

  override(record: Attendance, status: string): void {
    this.api.updateAttendance(record.id, status).subscribe({
      next: () => { this.toast.success(`Marked as ${status}`); this.loadAttendance(); },
      error: err => this.toast.error(this.toast.extractError(err))
    });
  }

  getInitials(a: Attendance): string {
    const f = (a.firstName || (a as any).first_name || '')[0] || '';
    const l = (a.lastName  || (a as any).last_name  || '')[0] || '';
    return `${f}${l}`.toUpperCase();
  }

  getSectionId(): number | undefined {
    const s = this.session();
    return s ? (s.classSectionId || (s as any).class_section_id) : undefined;
  }

  downloadQR(): void {
    const url = this.qrImageUrl();
    if (!url) return;
    
    // Create a canvas with padding and labels
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
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      
      // Header text
      ctx.fillStyle = '#8B1A1A';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Liceo de Cagayan University', w / 2, padding + 20);
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      const s = this.session();
      ctx.fillText(`${s?.courseCode || ''} — ${s?.sectionName || ''}`, w / 2, padding + 42);
      
      // QR image
      ctx.drawImage(img, padding, padding + headerH);
      
      // Footer
      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.fillText('Scan to record attendance', w / 2, h - padding + 10);
      
      // Download
      const link = document.createElement('a');
      link.download = `QR-${s?.courseCode || 'session'}-${s?.sectionName || ''}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.onerror = () => {
      // Fallback: direct download
      const link = document.createElement('a');
      link.download = 'qr-code.png';
      link.href = url;
      link.target = '_blank';
      link.click();
    };
    img.src = url;
  }
}
