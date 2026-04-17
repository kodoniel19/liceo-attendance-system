import { Component, OnInit, signal, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttendanceSummary, ClassSection } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div style="background:linear-gradient(160deg,var(--color-primary) 0%, #6b1313 100%); padding: 32px 20px 80px; position:relative; overflow:hidden">
      <!-- Background decoration -->
      <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:rgba(201,162,39,0.1);border-radius:50%;pointer-events:none"></div>
      <div style="position:absolute;bottom:-60px;left:-60px;width:250px;height:250px;background:rgba(255,255,255,0.04);border-radius:50%;pointer-events:none"></div>

      <!-- Greeting -->
      <div style="position:relative;z-index:1; max-width: 800px; margin: 0 auto;">
        <div style="font-size:0.75rem;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">
          🎓 Student Portal
        </div>
        <h1 style="font-size:1.75rem;color:#fff;font-weight:800;margin-bottom:4px">
          Hello, {{ auth.user()?.firstName }}! 👋
        </h1>
        <p style="color:rgba(255,255,255,0.65);font-size:0.875rem;margin-bottom:32px">
          {{ today }}
        </p>

        <!-- Big Stats -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div (click)="scrollToCourses()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;backdrop-filter:blur(10px); cursor:pointer; transition: transform 0.2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="font-size:2.5rem;font-weight:800;color:#C9A227">{{ stats()?.enrolledCourses ?? 0 }}</div>
            <div style="font-size:0.75rem;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.08em;margin-top:4px">Enrolled Courses</div>
          </div>
          
          <a routerLink="/student/history" style="text-decoration:none; display:block">
            <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;backdrop-filter:blur(10px); cursor:pointer; transition: transform 0.2s" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size:2.5rem;font-weight:800;" [style.color]="rateColor()">{{ stats()?.attendanceRate ?? 0 }}%</div>
              <div style="font-size:0.75rem;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.08em;margin-top:4px">Attendance Rate</div>
            </div>
          </a>
        </div>
      </div>
    </div>

    <!-- Floating card pulled up -->
    <div style="margin-top:-40px;padding:0 16px 60px;max-width:840px;margin-left:auto;margin-right:auto">

      <!-- Quick Scan Card -->
      <div class="scan-card animate-fade-in-up">
        <div class="scan-card__icon">📷</div>
        <div class="scan-card__text">
          <div style="font-weight:700;font-size:1rem;color:var(--color-text)">Scan QR Code</div>
          <div style="font-size:0.8rem;color:var(--color-text-muted)">Tap to record your attendance</div>
        </div>
        <a mat-raised-button color="primary" routerLink="/student/scan">Scan Now</a>
      </div>


      <!-- Pending Invitations -->
      <div *ngIf="invitations().length > 0" class="invitations-section animate-fade-in-up">
        <h3 style="font-size:1rem;font-weight:700;color:var(--color-warning);margin:0 0 16px;display:flex;align-items:center;gap:8px">
          🔔 Class Invitations ({{ invitations().length }})
        </h3>
        <div class="invitation-card" *ngFor="let inv of invitations()">
          <div class="inv-info">
            <div class="inv-code">{{ inv.courseCode }} — {{ inv.sectionName }}</div>
            <div class="inv-name">{{ inv.courseName }}</div>
            <div class="inv-instructor">Instructor: {{ inv.instructorFirst }} {{ inv.instructorLast }}</div>
          </div>
          <div class="inv-actions">
            <button mat-flat-button color="warn" (click)="declineInvitation(inv.id)" [disabled]="processing()">Decline</button>
            <button mat-flat-button color="primary" (click)="acceptInvitation(inv.id)" [disabled]="processing()">
              <mat-spinner *ngIf="processing()" diameter="16"></mat-spinner>
              Accept
            </button>
          </div>
        </div>
      </div>

      <!-- My Courses -->
      <h3 id="my-courses" style="font-size:1rem;font-weight:700;color:var(--color-primary);margin:24px 0 14px" class="animate-fade-in-up">
        📚 My Courses
      </h3>

      <div *ngIf="summaryLoading()" class="loading-spinner" style="padding:32px"><mat-spinner diameter="32"></mat-spinner></div>

      <div class="courses-list animate-fade-in-up" *ngIf="!summaryLoading()">
        <a [routerLink]="['/student/subjects', s.sectionId]" class="course-card-link" *ngFor="let s of summary()">
          <div class="course-card">
            <div class="course-card__header">
              <div class="header-left">
                <div class="course-card__code">{{ s.courseCode }} — {{ s.sectionName }}</div>
                <div class="course-card__name">{{ s.courseName }}</div>
                <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 4px; font-weight: 600;">
                  Instructor: {{ s.instructorFirst }} {{ s.instructorLast }}
                </div>
              </div>
              <div class="course-rate" [style.color]="getRateColor(s.attendanceRate ?? 0)">
                {{ s.attendanceRate ?? 0 }}%
              </div>
            </div>

            <div class="course-card__stats">
              <div class="mini-stat present">✅ {{ s.presentCount ?? 0 }}</div>
              <div class="mini-stat late">⏰ {{ s.lateCount ?? 0 }}</div>
              <div class="mini-stat absent">❌ {{ s.absentCount ?? 0 }}</div>
            </div>

            <!-- Schedule & Room -->
            <div class="course-card__info">
              <div class="info-item">
                <mat-icon>calendar_today</mat-icon>
                <span class="info-text">{{ (s as any).schedule || 'TBA' }}</span>
              </div>
              <div class="info-item">
                <mat-icon>location_on</mat-icon>
                <span class="info-text">{{ (s as any).room || 'TBA' }}</span>
              </div>
            </div>

            <!-- Progress bar -->
            <div style="margin-top:14px">
              <div style="height:6px;background:#f0e8e8;border-radius:3px;overflow:hidden">
                <div [style.width.%]="s.attendanceRate ?? 0"
                     [style.background]="getRateColor(s.attendanceRate ?? 0)"
                  style="height:100%;border-radius:3px;transition:width 0.8s ease"></div>
              </div>
            </div>
            
            <div class="course-card__footer">
              <span>View detailed attendance</span>
              <mat-icon>chevron_right</mat-icon>
            </div>
          </div>
        </a>

        <div class="empty-state" *ngIf="!summary().length" style="padding:32px">
          <span class="material-icons">school</span>
          <h3>No Courses Yet</h3>
          <p>You haven't been enrolled in any courses yet.</p>
        </div>
      </div>

      <!-- Subject-By-Subject Attendance Chart -->
      <div class="animate-fade-in-up mt-4" *ngIf="stats()?.subjectBreakdown">
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
            <h3 style="margin:0; font-size:1rem; font-weight:700; color:var(--color-primary)">📊 Subject Attendance Breakdown</h3>
          </div>
          <div *ngIf="(stats()?.subjectBreakdown?.length) > 0 && hasChartData(); else emptyChart" style="height: 300px; display:flex; align-items:center; justify-content:center; padding-top: 10px;">
             <div style="width: 100%; height: 100%; position: relative;">
                <canvas id="distributionChart"></canvas>
             </div>
          </div>
          <ng-template #emptyChart>
            <div style="height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--color-text-muted); text-align: center;">
              <span class="material-icons" style="font-size: 40px; opacity: 0.2; margin-bottom: 12px;">bar_chart</span>
              <p style="margin: 0; font-weight: 600;">No attendance records.</p>
              <p style="margin: 4px 0 0; font-size: 0.85rem; opacity: 0.7;">Your subject breakdown will appear<br>after your first scan.</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scan-card {
      background: var(--color-bg-card); border-radius: var(--radius-lg);
      padding: 20px; box-shadow: var(--shadow-lg);
      display: flex; align-items: center; gap: 16px;
      border: 1px solid var(--color-border);
    }
    .scan-card__icon { font-size: 36px; width: 56px; height: 56px; background: rgba(139,26,26,0.08); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .scan-card__text { flex: 1; }

    .courses-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 100px; }
    .course-card {
      background: var(--color-bg-card); border-radius: var(--radius-lg);
      padding: 18px; box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
    }
    .course-card__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .course-card__code { font-size: 0.7rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.08em; }
    .course-card__name { font-weight: 600; font-size: 0.9rem; margin-top: 3px; color: var(--color-text); }
    .course-rate { font-size: 1.5rem; font-weight: 800; }
    .course-card__stats { display: flex; gap: 12px; }
    .mini-stat { font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: var(--color-bg); color: var(--color-text-muted); }
    .mini-stat.present { background: rgba(39,174,96,0.1); color: #1a7a45; }
    .mini-stat.late    { background: rgba(230,126,34,0.1); color: #b55e14; }
    .mini-stat.absent  { background: rgba(231,76,60,0.1);  color: #c0392b; }
    .course-card__footer { 
      margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--color-border);
      display: flex; align-items: center; justify-content: space-between;
      color: var(--color-primary); font-size: 0.75rem; font-weight: 600;
    }

    .course-card__info {
       margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.03);
       display: flex; flex-direction: column; gap: 6px;
    }
    .info-item { display: flex; align-items: flex-start; gap: 6px; color: #64748b; }
    .info-item mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--color-primary); margin-top: 1px; }
    .info-text { font-size: 0.75rem; font-weight: 600; line-height: 1.3; white-space: pre-line; }

    .invitations-section { margin-top: 24px; }
    .invitation-card {
      background: #fff8eb; border: 1px solid #ffeeba; border-radius: 16px;
      padding: 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px;
      margin-bottom: 12px; box-shadow: 0 4px 12px rgba(201,162,39,0.1);
    }
    .inv-code { font-size: 0.75rem; font-weight: 700; color: #b58d05; text-transform: uppercase; }
    .inv-name { font-weight: 700; font-size: 1rem; color: #1a1a2e; margin: 4px 0; }
    .inv-instructor { font-size: 0.8rem; color: #64748b; font-weight: 600; }
    .inv-actions { display: flex; gap: 8px; }
    .inv-actions { display: flex; gap: 8px; }
    
    .glass-card {
      background: white; border-radius: var(--radius-lg);
      padding: 24px; box-shadow: var(--shadow-lg);
      border: 1px solid var(--color-border);
      margin-bottom: 24px;
    }

    @media (max-width: 600px) {
      .invitation-card { flex-direction: column; align-items: stretch; text-align: center; }
      .inv_actions { justify-content: center; }
      
      .course-card { padding: 14px; }
      .course-rate { font-size: 1.3rem !important; }
      .course-card__name { font-size: 0.85rem !important; line-height: 1.2; }
      .course-card__code { font-size: 0.65rem !important; }
      .mini-stat { font-size: 0.7rem !important; padding: 2px 8px !important; }
      .info-text { font-size: 0.7rem !important; }
    }
  `]
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  auth = inject(AuthService);
  toast = inject(ToastService);

  stats = signal<any>(null);
  summary = signal<AttendanceSummary[]>([]);
  invitations = signal<ClassSection[]>([]);
  summaryLoading = signal(true);
  processing = signal(false);
  private chart: Chart | null = null;

  today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

  rateColor = computed(() => {
    const r = this.stats()?.attendanceRate || 0;
    return r >= 75 ? '#C9A227' : '#ff6b6b';
  });

  getRateColor(rate: number): string {
    return rate >= 75 ? 'var(--color-success)' : rate >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
  }

  ngOnInit(): void {
    this.refreshDashboard();

    // Listen for real-time updates from notification service
    this.api.refresh$.subscribe(source => {
      if (source?.includes('enrollments') || source === 'general') {
        this.refreshDashboard(true);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
  }


  refreshDashboard(silent = false): void {
    if (!silent) this.summaryLoading.set(true);
    this.api.getDashboardStats().subscribe({ 
      next: r => { 
        this.stats.set(r.data); 
        setTimeout(() => this.initChart(), 100);
      } 
    });
    this.api.getMyAttendanceSummary().subscribe({
      next: r => { this.summary.set(r.data || []); this.summaryLoading.set(false); },
      error: () => this.summaryLoading.set(false)
    });
    this.api.getMyEnrollments().subscribe({
      next: r => {
        const all = r.data || [];
        this.invitations.set(all.filter(e => e.enrollmentStatus === 'pending'));
      }
    });
  }

  hasChartData(): boolean {
    const breakdown = this.stats()?.subjectBreakdown;
    if (!breakdown || !breakdown.length) return false;
    
    // Check if there is actual any presence data across all subjects
    let hasData = false;
    for (const b of breakdown) {
       if (parseInt(b.present||0)>0 || parseInt(b.late||0)>0 || parseInt(b.absent||0)>0 || parseInt(b.excused||0)>0) {
          hasData = true;
          break;
       }
    }
    return hasData;
  }

  private initChart(): void {
    const breakdown = this.stats()?.subjectBreakdown;
    if (!breakdown || breakdown.length === 0) return;

    if (!this.hasChartData()) return;

    const ctx = document.getElementById('distributionChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    const labels = breakdown.map((b: any) => b.label);
    const presentData = breakdown.map((b: any) => parseInt(b.present, 10) || 0);
    const lateData = breakdown.map((b: any) => parseInt(b.late, 10) || 0);
    const absentData = breakdown.map((b: any) => parseInt(b.absent, 10) || 0);
    const excusedData = breakdown.map((b: any) => parseInt(b.excused, 10) || 0);

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Present', data: presentData, backgroundColor: '#10b981', stack: 'Stack 0', borderRadius: 4 },
          { label: 'Late', data: lateData, backgroundColor: '#f59e0b', stack: 'Stack 0', borderRadius: 4 },
          { label: 'Excused', data: excusedData, backgroundColor: '#3b82f6', stack: 'Stack 0', borderRadius: 4 },
          { label: 'Absent', data: absentData, backgroundColor: '#ef4444', stack: 'Stack 0', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              padding: 16,
              font: { family: 'inherit', size: 10, weight: 'bold' }
            }
          },
          tooltip: {
            backgroundColor: '#1a1a2e',
            padding: 12,
            cornerRadius: 8,
            mode: 'index',
            intersect: false,
            titleFont: { size: 13, weight: 'bold' as any },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          x: { 
            stacked: true, 
            grid: { display: false }, 
            ticks: { 
              autoSkip: false,
              maxRotation: 45,
              minRotation: 0,
              font: { family: 'inherit', weight: 'bold' as any, size: 10 } 
            } 
          },
          y: { 
            stacked: true, 
            border: { display: false },
            grid: { color: '#f1f5f9' }, 
            ticks: { stepSize: 1, precision: 0, font: { family: 'inherit', size: 10 } } 
          }
        }
      }
    });
  }

  acceptInvitation(sectionId: number): void {
    this.processing.set(true);
    this.api.respondToEnrollment(sectionId, 'accept').subscribe({
      next: () => {
        this.toast.success('Successfully enrolled in class!');
        this.processing.set(false);
        // Optimistic refresh
        this.refreshDashboard(true);
      },
      error: (e) => {
        this.toast.error(e?.error?.message || 'Failed to accept invitation.');
        this.processing.set(false);
      }
    });
  }

  declineInvitation(sectionId: number): void {
    if (!confirm('Are you sure you want to decline this class invitation?')) return;
    this.processing.set(true);
    this.api.respondToEnrollment(sectionId, 'decline').subscribe({
      next: () => {
        this.toast.info('Class invitation declined.');
        this.processing.set(false);
        // Optimistic refresh
        this.refreshDashboard(true);
      },
      error: (e) => {
        this.toast.error(e?.error?.message || 'Failed to decline invitation.');
        this.processing.set(false);
      }
    });
  }

  scrollToCourses(): void {
    const el = document.getElementById('my-courses');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
