import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';
import { Attendance } from '../../../core/models';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container" style="max-width:800px;margin:0 auto;padding-bottom:100px">
      <!-- Header -->
      <div class="page-header animate-fade-in-up">
        <div class="page-header__title">
          <h1>Attendance History</h1>
          <p>Your complete attendance record across all subjects</p>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="filters-row animate-fade-in-up">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Month</mat-label>
          <mat-select [formControl]="monthCtrl">
            <mat-option value="">All Months</mat-option>
            <mat-option *ngFor="let m of months" [value]="m.value">{{ m.label }}</mat-option>
          </mat-select>
          <mat-icon matPrefix>calendar_month</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Year</mat-label>
          <mat-select [formControl]="yearCtrl">
            <mat-option *ngFor="let y of years" [value]="y">{{ y === currentYear ? y + ' - Present' : y }}</mat-option>
          </mat-select>
          <mat-icon matPrefix>event</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>By Subject</mat-label>
          <mat-select [formControl]="sectionFilter" placeholder="All Subjects">
            <mat-option value="">All Subjects</mat-option>
            <mat-option *ngFor="let s of enrollment()" [value]="s.id">
              {{ s.courseName }} Instructor: {{ s.instructorLast }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>book</mat-icon>
        </mat-form-field>
      </div>

      <div *ngIf="loading()" class="loading-spinner"><mat-spinner diameter="36"></mat-spinner></div>

      <!-- Timeline -->
      <div class="history-timeline animate-fade-in-up" *ngIf="!loading()">
        <ng-container *ngFor="let group of groupedAttendance()">
          <div class="timeline-group">
            <div class="timeline-date">
               <span class="material-icons">event</span>
               {{ group.date | date:'EEEE, MMMM d, y' }}
            </div>
            
            <div class="timeline-records">
              <div class="history-item" *ngFor="let a of group.records" [class.is-late]="a.status === 'late'">
                <div class="history-item__status">
                   <div class="status-indicator" [class]="'indicator--' + a.status"></div>
                   <div class="status-line"></div>
                </div>
                
                <div class="history-card shadow-premium">
                  <div class="history-card__main">
                    <div class="history-card__course">
                      <span class="course-code">{{ a.courseCode }}</span>
                      <span class="course-section">{{ a.sectionName }}</span>
                    </div>
                    <div class="history-card__title">{{ a.courseName }}</div>
                    <div class="history-card__topic" *ngIf="a.topic">
                       <span class="material-icons">info</span> {{ a.topic }}
                    </div>
                  </div>
                  
                  <div class="history-card__meta">
                    <div class="history-time">
                      <mat-icon>schedule</mat-icon>
                      {{ (a.scanTime || a.scan_time) | date:'h:mm a' }}
                    </div>
                    <span class="badge-pill" [class]="'pill--' + a.status">{{ a.status | uppercase }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <div class="empty-state" *ngIf="!attendance().length">
          <div class="empty-icon-box">
             <mat-icon>event_busy</mat-icon>
          </div>
          <h3>Detailed Records Not Found</h3>
          <p>We couldn't find any attendance logs for the selected period.</p>
          <button mat-stroked-button color="primary" (click)="resetFilters()" style="margin-top:16px">
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-filter { margin-bottom: 24px; display: flex; gap: 12px; }
    .filters-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .filter-field { 
      flex: 1; min-width: 140px;
      margin: 0;
      ::ng-deep .mat-mdc-text-field-wrapper { background: white !important; border-radius: 12px !important; height: 44px !important; display: flex; align-items: center; border: 1px solid var(--color-primary); }
      ::ng-deep .mdc-notched-outline__leading,
      ::ng-deep .mdc-notched-outline__notch,
      ::ng-deep .mdc-notched-outline__trailing { display: none !important; }
      ::ng-deep .mat-mdc-select-value { font-size: 0.8rem; font-weight: 600; color: #444; }
      ::ng-deep .mat-icon { color: var(--color-primary); font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
      ::ng-deep .mat-mdc-form-field-infix { padding-top: 0 !important; border-top: 0 !important; }
    }

    /* Premium Overlay Styling */
    ::ng-deep .mat-mdc-select-panel {
      background: rgba(255, 255, 255, 0.95) !important;
      backdrop-filter: blur(10px);
      border-radius: 12px !important;
      padding: 8px !important;
      box-shadow: 0 10px 40px rgba(139, 26, 26, 0.15) !important;
      border: 1px solid rgba(139, 26, 26, 0.1) !important;
    }

    ::ng-deep .mat-mdc-option {
      border-radius: 8px !important;
      margin-bottom: 2px;
      transition: all 0.2s ease;
      .mdc-list-item__primary-text { font-size: 0.8rem !important; font-weight: 500; }
    }

    ::ng-deep .mat-mdc-option.mdc-list-item--selected:not(.mdc-list-item--disabled) {
      background: var(--color-primary) !important;
      .mdc-list-item__primary-text { color: white !important; font-weight: 700 !important; }
    }

    .history-timeline { display: flex; flex-direction: column; gap: 32px; }
    .timeline-group { display: flex; flex-direction: column; gap: 16px; }
    
    .timeline-date {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.85rem; font-weight: 800; color: var(--color-primary);
      background: rgba(139, 26, 26, 0.05); padding: 8px 16px; border-radius: 20px;
      width: fit-content;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    
    .timeline-records { display: flex; flex-direction: column; }
    
    .history-item { display: flex; gap: 20px; }
    .history-item__status { display: flex; flex-direction: column; align-items: center; width: 20px; }
    .status-indicator {
      width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #eee; z-index: 2;
      &.indicator--present { background: var(--color-success); box-shadow: 0 0 0 2px var(--color-success); }
      &.indicator--late    { background: var(--color-warning); box-shadow: 0 0 0 2px var(--color-warning); }
      &.indicator--absent  { background: var(--color-error);   box-shadow: 0 0 0 2px var(--color-error); }
      &.indicator--excused { background: var(--color-info);    box-shadow: 0 0 0 2px var(--color-info); }
    }
    .status-line { width: 2px; flex: 1; background: #eee; margin-top: -2px; }
    .history-item:last-child .status-line { display: none; }

    .history-card {
      flex: 1; background: white; border-radius: 16px; padding: 20px;
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px; border: 1px solid rgba(0,0,0,0.05);
      transition: transform 0.2s, box-shadow 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    }
    
    .history-card__main { flex: 1; }
    .history-card__course { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
    .course-code { font-size: 0.75rem; font-weight: 800; color: var(--color-primary); text-transform: uppercase; }
    .course-section { font-size: 0.7rem; color: #64748b; font-weight: 600; padding: 1px 8px; background: #f1f5f9; border-radius: 4px; }
    .history-card__title { font-size: 1rem; font-weight: 700; color: #1e293b; }
    .history-card__topic {
       display: flex; align-items: center; gap: 4px;
       font-size: 0.8rem; color: #64748b; margin-top: 6px;
       mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    
    .history-card__meta { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    .history-time {
       display: flex; align-items: center; gap: 4px;
       font-size: 0.85rem; font-weight: 700; color: #1e293b;
       mat-icon { font-size: 16px; width: 16px; height: 16px; color: #94a3b8; }
    }
    
    .badge-pill {
       font-size: 0.65rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.05em;
       &.pill--present { background: #dcfce7; color: #166534; }
       &.pill--late    { background: #fef9c3; color: #854d0e; }
       &.pill--absent  { background: #fee2e2; color: #991b1b; }
       &.pill--excused { background: #e0f2fe; color: #075985; }
    }
    
    .empty-icon-box {
       width: 80px; height: 80px; border-radius: 50%; background: #f1f5f9;
       display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
       mat-icon { font-size: 40px; width: 40px; height: 40px; color: #94a3b8; }
    }
    .shadow-premium { box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
  `]
})
export class HistoryComponent implements OnInit {
  api = inject(ApiService);

  attendance = signal<Attendance[]>([]);
  groupedAttendance = signal<{ date: string; records: Attendance[] }[]>([]);
  loading = signal(true);
  enrollment = signal<any[]>([]);

  currentYear = new Date().getFullYear();
  years = Array.from({ length: this.currentYear - 2023 }, (_, i) => 2024 + i).reverse();
  months = [
    { label: 'January',   value: '01' }, { label: 'February',  value: '02' },
    { label: 'March',     value: '03' }, { label: 'April',     value: '04' },
    { label: 'May',       value: '05' }, { label: 'June',      value: '06' },
    { label: 'July',      value: '07' }, { label: 'August',    value: '08' },
    { label: 'September', value: '09' }, { label: 'October',   value: '10' },
    { label: 'November',  value: '11' }, { label: 'December',  value: '12' }
  ];
  
  monthCtrl = new FormControl('');
  yearCtrl = new FormControl(this.currentYear.toString());
  sectionFilter = new FormControl('');
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.loadEnrollments();
    this.loadHistory();
    
    this.monthCtrl.valueChanges.subscribe(() => this.loadHistory());
    this.yearCtrl.valueChanges.subscribe(() => this.loadHistory());
    this.sectionFilter.valueChanges.subscribe(() => this.loadHistory());
    
    this.route.queryParams.subscribe(params => {
       if (params['sectionId']) {
          this.sectionFilter.setValue(params['sectionId'], { emitEvent: false });
          this.loadHistory();
       }
    });
  }

  loadEnrollments(): void {
    this.api.getMyEnrollments().subscribe({ next: r => this.enrollment.set(r.data || []) });
  }

  loadHistory(): void {
    this.loading.set(true);
    const params: any = {};
    
    // Filter by specific month+year OR just by year
    if (this.yearCtrl.value) {
      if (this.monthCtrl.value) {
        params['month'] = `${this.yearCtrl.value}-${this.monthCtrl.value}`;
      } else {
        params['year'] = this.yearCtrl.value;
      }
    }
    
    if (this.sectionFilter.value) params['sectionId'] = this.sectionFilter.value;

    this.api.getMyAttendance(params).subscribe({
      next: r => {
        const data = r.data || [];
        this.attendance.set(data);
        this.groupByDate(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  resetFilters(): void {
    this.monthCtrl.setValue('');
    this.yearCtrl.setValue(this.currentYear.toString());
    this.sectionFilter.setValue('');
  }

  private groupByDate(records: Attendance[]): void {
    const grouped = records.reduce((acc: { [key: string]: Attendance[] }, rec) => {
      const date = (rec as any).session_date || rec.sessionDate || '';
      if (!acc[date]) acc[date] = [];
      acc[date].push(rec);
      return acc;
    }, {} as any);

    this.groupedAttendance.set(
      Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => ({
        date,
        records: grouped[date]
      }))
    );
  }
}
