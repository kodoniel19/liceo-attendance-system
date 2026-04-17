import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../../core/services/api.service';
import { Attendance, ClassSection, User } from '../../../core/models';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatButtonModule, MatIconModule, 
    MatTableModule, MatProgressSpinnerModule, MatTabsModule
  ],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="page-header__title">
          <a routerLink="/student/dashboard" class="back-link">
            <span class="material-icons">arrow_back</span> Dashboard
          </a>
          <h1 *ngIf="section()">{{ section()?.courseCode }} — {{ section()?.sectionName }}</h1>
          <p *ngIf="section()">{{ section()?.courseName }} · {{ section()?.semester }} Semester {{ section()?.academicYear }}</p>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-spinner">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="subject-content" *ngIf="!loading() && section()">
        
        <!-- Summary Cards -->
        <div class="stats-grid mb-3">
          <div class="stat-card">
            <div class="stat-card__icon info"><span class="material-icons">person</span></div>
            <div class="stat-card__value">{{ instructorName() }}</div>
            <div class="stat-card__label">Instructor</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon success"><span class="material-icons">check_circle</span></div>
            <div class="stat-card__value">{{ attendRate() }}%</div>
            <div class="stat-card__label">Attendance Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__icon info"><span class="material-icons">people</span></div>
            <div class="stat-card__value">{{ classmates().length }}</div>
            <div class="stat-card__label">Classmates</div>
          </div>
        </div>

        <mat-tab-group class="modern-tabs" [selectedIndex]="selectedTabIndex()">
          <!-- Attendance History Tab -->
          <mat-tab label="My Attendance">
             <div class="tab-content">
                <div class="history-timeline" *ngIf="attendance().length">
                   <div class="history-card shadow-premium" *ngFor="let a of attendance()">
                      <div class="history-card__date">
                         <div class="date-day">{{ (a.sessionDate || a.session_date) | date:'dd' }}</div>
                         <div class="date-month">{{ (a.sessionDate || a.session_date) | date:'MMM' }}</div>
                      </div>
                      <div class="history-card__info">
                         <div class="info-topic">{{ a.topic || 'Regular Session' }}</div>
                         <div class="info-time" *ngIf="a.scanTime || a.scan_time">
                            <mat-icon>schedule</mat-icon> {{ (a.scanTime || a.scan_time) | date:'h:mm a' }}
                         </div>
                      </div>
                      <div class="history-card__status">
                         <span class="badge-pill" [class]="'pill--' + a.status">{{ a.status | uppercase }}</span>
                      </div>
                   </div>
                </div>
                <div class="empty-state" *ngIf="!attendance().length">
                   <mat-icon>event_busy</mat-icon>
                   <p>No attendance records found for this subject yet.</p>
                </div>
             </div>
          </mat-tab>

          <!-- Announcements Tab -->
          <mat-tab>
             <ng-template mat-tab-label>
                Updates
                <span *ngIf="hasNewAnnouncements()" class="badge-dot pulse"></span>
             </ng-template>
             <div class="tab-content" style="max-width: 700px">
                <div class="announcement-card mb-3 animate-fade-in-up" *ngFor="let a of announcements()">
                   <div class="announcement-header">
                      <div class="announcement-author">
                         <div class="author-avatar">{{ a.first_name[0] }}{{ a.last_name[0] }}</div>
                         <div class="author-info">
                            <div class="author-name">{{ a.first_name }} {{ a.last_name }}</div>
                            <div class="announcement-date">{{ a.created_at | date:'medium' }}</div>
                         </div>
                      </div>
                   </div>
                   <div class="announcement-body">
                      <h4 class="announcement-title">{{ a.title }}</h4>
                      <p class="announcement-content">{{ a.content }}</p>
                   </div>
                </div>
                <div class="empty-state" *ngIf="!announcements().length">
                   <mat-icon>campaign</mat-icon>
                   <p>No announcements yet.</p>
                </div>
             </div>
          </mat-tab>

          <!-- Classmates Tab -->
          <mat-tab label="Classmates">
             <div class="tab-content">
                <div class="classmates-grid">
                   <div class="classmate-card shadow-premium" *ngFor="let c of classmates()">
                      <div class="classmate-avatar">
                         {{ (c.lastName || c.last_name || '?')[0] }}{{ (c.firstName || c.first_name || '?')[0] }}
                      </div>
                      <div class="classmate-info">
                         <div class="classmate-name">
                            {{ c.lastName || c.last_name }}, {{ c.firstName || c.first_name }}
                         </div>
                         <div class="classmate-id">{{ c.universityId || c.university_id }}</div>
                      </div>
                   </div>
                </div>
                <div class="empty-state" *ngIf="!classmates().length">
                   <mat-icon>group_off</mat-icon>
                   <p>No classmates found.</p>
                </div>
             </div>
          </mat-tab>

          <!-- Reports Tab -->
          <mat-tab label="Reports">
             <div class="tab-content">
                <div class="reports-container">
                   <div class="report-card animate-fade-in-up">
                      <div class="report-icon pdf"><mat-icon>picture_as_pdf</mat-icon></div>
                      <div class="report-details">
                         <h4>Attendance Report (PDF)</h4>
                         <p>Download a formal PDF certificate of your attendance for this subject.</p>
                      </div>
                      <button mat-flat-button color="primary" (click)="exportReport('pdf')">Download PDF</button>
                   </div>
                   <div class="report-card animate-fade-in-up" style="animation-delay: 0.1s">
                      <div class="report-icon excel"><mat-icon>table_chart</mat-icon></div>
                      <div class="report-details">
                         <h4>Attendance Data (Excel)</h4>
                         <p>Download your raw attendance data in Excel format for your personal records.</p>
                      </div>
                      <button mat-stroked-button (click)="exportReport('excel')">Download Excel</button>
                   </div>
                </div>
             </div>
          </mat-tab>
        </mat-tab-group>

      </div>
    </div>
  `,
  styles: [`
    .back-link { font-size:0.8rem; color:var(--color-text-muted); display:flex; align-items:center; gap:4px; margin-bottom:8px; text-decoration:none; &:hover { color:var(--color-primary); } .material-icons { font-size:16px; } }
    
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media (max-width: 480px) {
      .stats-grid { gap: 8px; }
      .stat-card { padding: 12px 6px !important; text-align: center; justify-content: center; }
      .stat-card__icon { width: 32px !important; height: 32px !important; margin-bottom: 6px !important; margin-left: auto; margin-right: auto; .material-icons { font-size: 18px !important; } }
      .stat-card__value { font-size: 0.8rem !important; line-height: 1.2; word-break: break-word; }
      .stat-card__label { font-size: 0.55rem !important; }
      
      .history-card { gap: 12px; padding: 12px; }
      .history-card__date { min-width: 40px; padding-right: 12px; }
      .date-day { font-size: 1.1rem; }
    }

    .stat-card {
      background: white; border-radius: 16px; padding: 20px;
      display: flex; flex-direction: column; align-items: flex-start;
      border: 1px solid rgba(139, 26, 26, 0.05); transition: all 0.3s ease;
      &:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    }
    .stat-card__icon { 
      width: 44px; height: 44px; border-radius: 12px; display: flex; 
      align-items: center; justify-content: center; margin-bottom: 12px;
      .material-icons { font-size: 24px; }
    }
    .stat-card__icon.info { background: rgba(139, 26, 26, 0.08); color: var(--color-primary); }
    .stat-card__icon.success { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
    .stat-card__value { font-size: 1.1rem; font-weight: 800; color: #1e293b; }
    .stat-card__label { font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .tab-content { 
      padding: 24px 0;
      animation: tabFadeIn 0.4s ease-out;
    }
    
    @keyframes tabFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Announcements */
    .announcement-card {
       background: white; border-radius: 16px; padding: 20px;
       border: 1px solid rgba(139, 26, 26, 0.08);
       box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .announcement-author { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .author-avatar { width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
    .author-name { font-weight: 600; font-size: 0.9rem; color: var(--color-text); }
    .announcement-date { font-size: 0.7rem; color: var(--color-text-muted); }
    .announcement-title { font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: var(--color-primary); }
    .announcement-content { font-size: 0.9rem; color: #4b5563; line-height: 1.6; }

    /* Reports */
    .reports-container { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
    .report-card {
       background: white; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 20px;
       border: 1px solid rgba(0,0,0,0.05);
    }
    .report-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; .material-icons { font-size: 28px; } }
    .report-icon.pdf { background: rgba(231, 76, 60, 0.1); color: #e74c3c; }
    .report-icon.excel { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
    .report-details { flex: 1; }
    .report-details h4 { margin: 0; font-size: 1rem; font-weight: 700; }
    .report-details p { margin: 4px 0 0; font-size: 0.85rem; color: var(--color-text-muted); }
    
    .history-timeline { display: flex; flex-direction: column; gap: 12px; }

    /* Badge dot */
    .badge-dot {
       width: 8px; height: 8px; background: #ef4444; border-radius: 50%;
       margin-left: 6px; display: inline-block;
    }
    .pulse { animation: pulseAnim 2s infinite; }
    @keyframes pulseAnim {
       0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
       70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
       100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    .history-card { 
      background: white; border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 20px;
      border: 1px solid rgba(139, 26, 26, 0.05); transition: all 0.2s ease;
      &:hover { transform: translateX(5px); border-left: 4px solid var(--color-primary); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
    }
    .history-card__date { 
      display: flex; flex-direction: column; align-items: center; min-width: 50px;
      padding-right: 20px; border-right: 1px solid #eee;
    }
    .date-day { font-size: 1.25rem; font-weight: 800; color: var(--color-primary); line-height: 1; }
    .date-month { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    
    .history-card__info { flex: 1; }
    .info-topic { font-size: 0.95rem; font-weight: 700; color: #1e293b; }
    .info-time { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: #64748b; margin-top: 4px; mat-icon { font-size: 14px; width: 14px; height: 14px; } }
    
    .badge-pill { font-size: 0.65rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.05em; }
    .pill--present { background: #dcfce7; color: #166534; }
    .pill--late    { background: #fef9c3; color: #854d0e; }
    .pill--absent  { background: #fee2e2; color: #991b1b; }
    .pill--excused { background: #e0f2fe; color: #075985; }

    /* Classmates */
    .classmates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
    .classmate-card { 
      background: white; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 12px;
      border: 1px solid rgba(0,0,0,0.05);
      transition: all 0.2s ease;
      &:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); border-top: 2px solid var(--color-primary); }
    }
    .classmate-avatar { 
      width: 40px; height: 40px; border-radius: 50%; background: #f1f5f9; color: #64748b;
      display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;
    }
    .classmate-name { font-size: 0.875rem; font-weight: 700; color: #1e293b; }
    .classmate-id { font-size: 0.75rem; color: #64748b; }

    .shadow-premium { box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
    .empty-state { text-align: center; padding: 40px; color: #94a3b8; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; } }
    
    ::ng-deep .modern-tabs .mat-mdc-tab-labels { background: white; border-radius: 12px; padding: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    ::ng-deep .modern-tabs .mat-mdc-tab { color: #64748b; }
    ::ng-deep .modern-tabs .mdc-tab--active .mdc-tab__text-label { color: var(--color-primary); font-weight: 800; }
    ::ng-deep .modern-tabs .mat-mdc-tab-label-container { border-bottom: none; }
  `]
})
export class SubjectDetailComponent implements OnInit {
  api = inject(ApiService);
  route = inject(ActivatedRoute);

  section = signal<ClassSection | null>(null);
  classmates = signal<User[]>([]);
  attendance = signal<Attendance[]>([]);
  announcements = signal<any[]>([]);
  loading = signal(true);
  selectedTabIndex = signal(0);

  hasNewAnnouncements = computed(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return (this.announcements() || []).some(a => new Date(a.created_at) > twentyFourHoursAgo);
  });


  instructorName = computed(() => {
    const s = this.section() as any;
    if (!s) return 'Loading...';
    // Handle both camelCase and snake_case from different API endpoints
    const first = s.instructorFirst || s.instructor_first || '';
    const last  = s.instructorLast || s.instructor_last || '';
    return (first || last) ? `${first} ${last}` : 'Not Assigned';
  });

  attendRate = computed(() => {
    if (!this.attendance().length) return 0;
    const present = this.attendance().filter(a => a.status === 'present' || a.status === 'late').length;
    return Math.round((present / this.attendance().length) * 100);
  });

  private dataSub?: Subscription;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) this.loadData(id);
    });

    this.route.queryParamMap.subscribe(params => {
       if (params.get('tab') === 'updates') {
          this.selectedTabIndex.set(1); // Index 1 is the Updates tab
       } else {
          this.selectedTabIndex.set(0);
       }
    });
  }

  loadData(id: number): void {
    if (this.dataSub) this.dataSub.unsubscribe();
    this.loading.set(true);

    this.dataSub = forkJoin({
      section:       this.api.getSection(id),
      classmates:    this.api.getSectionStudents(id),
      attendance:    this.api.getMyAttendance({ sectionId: id }),
      announcements: this.api.getSectionAnnouncements(id)
    }).subscribe({
      next: (results) => {
        this.section.set(results.section.data || null);
        this.classmates.set(results.classmates.data || []);
        this.attendance.set(results.attendance.data || []);
        this.announcements.set(results.announcements.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  exportReport(type: 'pdf' | 'excel'): void {
    const sectionId = this.section()?.id;
    if (!sectionId) return;

    if (type === 'pdf') {
       this.api.exportPDF({ sectionId });
    } else {
       this.api.exportExcel({ sectionId });
    }
  }

  ngOnDestroy(): void {
    if (this.dataSub) this.dataSub.unsubscribe();
  }
}
