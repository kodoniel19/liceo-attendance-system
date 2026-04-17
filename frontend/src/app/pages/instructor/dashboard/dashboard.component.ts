import { Component, OnInit, signal, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClassSession } from '../../../core/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header animate-fade-in-up">
        <div class="page-header__title">
          <h1>Good {{ greeting() }}, {{ auth.user()?.firstName }}! 👋</h1>
          <p>Here's your attendance overview for today, {{ today }}</p>
        </div>
        <div class="page-header__actions">
          <a mat-flat-button class="btn-premium" routerLink="/instructor/sessions">
            <mat-icon>add</mat-icon> 
            <span>New Session</span>
          </a>
        </div>
      </div>

      <!-- Top Row: Stats & Chart -->
      <div class="dashboard-top-row animate-fade-in-up" *ngIf="!statsLoading() && stats()">
        <!-- Stats Grid -->
        <div class="stats-grid">
          <a class="stat-card clickable highlight-red" routerLink="/instructor/sections">
            <div class="card-icon">🏫</div>
            <div class="card-value">{{ stats()?.totalSections ?? 0 }}</div>
            <div class="card-label">Active Classes</div>
            <div class="card-footer">My Workload</div>
          </a>

          <a class="stat-card clickable highlight-gold" routerLink="/instructor/sessions">
            <div class="card-icon">⚡</div>
            <div class="card-value">{{ stats()?.activeSessions ?? 0 }}</div>
            <div class="card-label">Live Sessions</div>
            <div class="card-footer status--active">Tracking Now</div>
          </a>

          <a class="stat-card clickable highlight-green" routerLink="/instructor/reports">
            <div class="card-icon">✅</div>
            <div class="card-value">{{ stats()?.todayStats?.present ?? 0 }}</div>
            <div class="card-label">Present Today</div>
            <div class="card-footer">System Verified</div>
          </a>

          <a class="stat-card clickable highlight-orange" routerLink="/instructor/reports">
            <div class="card-icon">👥</div>
            <div class="card-value">{{ stats()?.todayStats?.total ?? 0 }}</div>
            <div class="card-label">Expected Students</div>
            <div class="card-footer">Daily Total</div>
          </a>
        </div>

        <!-- Performance Chart -->
        <div class="chart-wrapper">
          <div class="chart-container">
            <div class="chart-header">
              <h2>
                <span class="material-icons">bar_chart</span>
                Class Attendance (%)
              </h2>
            </div>
            <div *ngIf="stats()?.sectionPerformance?.length > 0; else emptyChart" style="height: 180px; position: relative;">
              <canvas id="performanceChart"></canvas>
            </div>
            <ng-template #emptyChart>
              <div style="height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--color-text-muted);">
                <span class="material-icons" style="font-size: 36px; opacity: 0.2; margin-bottom: 8px;">query_stats</span>
                <p style="margin: 0; font-weight: 600;">No data yet.</p>
                <p style="margin: 4px 0 0; font-size: 0.75rem; opacity: 0.7;">Complete a session to generate insights.</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Active Sessions -->
      <div class="section-header mt-3 mb-2 animate-fade-in-up">
        <h2 style="font-size:1.2rem;color:var(--color-primary)">
          <span class="material-icons" style="vertical-align:middle;font-size:1.1rem;margin-right:6px">sensors</span>
          Active Sessions
        </h2>
        <a routerLink="/instructor/sessions" style="font-size:0.8rem;color:var(--color-primary)">View all →</a>
      </div>

      <div *ngIf="sessionsLoading()" class="loading-spinner"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="content-grid animate-fade-in-up" *ngIf="!sessionsLoading() && activeSessions().length">
        <div class="session-card" *ngFor="let s of activeSessions()">
          <div class="session-card__header">
            <div>
              <div class="session-card__course">{{ s.courseCode }} — {{ s.sectionName }}</div>
              <div class="session-card__name">{{ s.courseName }}</div>
            </div>
            <span class="badge badge--active">LIVE</span>
          </div>
          <div class="session-card__stats">
            <div class="session-stat">
              <span class="session-stat__value" style="color:var(--color-success)">{{ s.presentCount }}</span>
              <span class="session-stat__label">Present</span>
            </div>
            <div class="session-stat">
              <span class="session-stat__value">{{ s.enrolledCount }}</span>
              <span class="session-stat__label">Enrolled</span>
            </div>
            <div class="session-stat">
              <span class="session-stat__value" [style.color]="s.status === 'active' ? '#64748b' : 'var(--color-error)'">{{ Math.max(0, (s.enrolledCount || 0) - (s.presentCount || 0)) }}</span>
              <span class="session-stat__label">{{ s.status === 'active' ? 'To Scan' : 'Absent' }}</span>
            </div>
          </div>
          <div class="session-card__footer">
            <a mat-button color="primary" [routerLink]="'/instructor/sessions/' + s.id">
              <mat-icon>arrow_forward</mat-icon> Manage Session
            </a>
          </div>
        </div>
      </div>

      <div class="empty-state animate-fade-in" *ngIf="!sessionsLoading() && !activeSessions().length">
        <span class="material-icons">event_available</span>
        <h3>No Active Sessions</h3>
        <p>Start a new session to begin tracking attendance with QR codes.</p>
        <a mat-flat-button class="btn-premium" routerLink="/instructor/sessions" style="margin-top:16px">
          <mat-icon>add</mat-icon> 
          <span>Create Session</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 16px 20px; }

    .dashboard-top-row { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
    @media (min-width: 1024px) {
      .dashboard-top-row { grid-template-columns: 1.1fr 1fr; } 
    }

    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .stat-card {
      background: white !important; border-radius: 16px !important; padding: 16px !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important;
      display: flex !important; flex-direction: column !important; align-items: center !important; text-align: center !important;
      transition: all 0.3s ease !important;
      text-decoration: none !important; position: relative !important; overflow: hidden !important;
      border: 1px solid #eee !important;
    }
    .stat-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
    .highlight-red::before    { background: #8B1A1A; }
    .highlight-gold::before   { background: #C9A227; }
    .highlight-green::before  { background: #10b981; }
    .highlight-orange::before { background: #f59e0b; }

    .stat-card.clickable:hover { 
      transform: translateY(-3px) !important; 
      box-shadow: 0 10px 25px rgba(0,0,0,0.06) !important;
    }
    
    .card-icon { font-size: 26px; margin-bottom: 6px; height: 30px; display: flex; align-items: center; justify-content: center; }
    .card-value { font-size: 1.8rem !important; font-weight: 800 !important; color: #1a1a2e !important; line-height: 1 !important; margin-bottom: 2px !important; }
    .card-label { font-size: 0.65rem !important; font-weight: 700 !important; color: #64748b !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
    
    .card-footer { 
      margin-top: 10px; padding-top: 8px; border-top: 1px solid #f8fafc; width: 100%; 
      display: flex; flex-direction: column; align-items: center; gap: 2px; 
      font-size: 0.65rem !important; font-weight: 600 !important; color: #94a3b8 !important; 
    }
    .status--active { color: #10b981 !important; font-weight: 700 !important; }

    .session-card {
      background: white; border-radius: var(--radius-lg);
      padding: 20px; box-shadow: var(--shadow-md);
      border: 1px solid var(--color-border);
      transition: transform 0.2s, box-shadow 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
    }
    .session-card__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .session-card__course { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .session-card__name { font-size: 1rem; font-weight: 700; color: var(--color-text); margin-top: 4px; }
    .session-card__stats { display: flex; gap: 20px; padding: 16px 0; border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); margin-bottom: 12px; }
    .session-stat { text-align: center; }
    .session-stat__value { display: block; font-size: 1.5rem; font-weight: 800; }
    .session-stat__label { font-size: 0.7rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .session-card__footer { display: flex; justify-content: flex-end; }
    
    .empty-state { padding: 16px 20px; text-align: center; }
    .empty-state .material-icons { font-size: 48px; opacity: 0.2; margin-bottom: 8px; }
    .empty-state h3 { margin-bottom: 4px; font-size: 1.1rem; }
    .empty-state p { font-size: 0.85rem; margin-bottom: 12px; }
    
    .chart-wrapper { height: 100%; display: flex; flex-direction: column; }
    .chart-container {
      background: white; border-radius: 20px; padding: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eee;
      flex: 1; display: flex; flex-direction: column; margin-bottom: 0px;
    }
    .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .chart-header h2 { font-size: 1.1rem; font-weight: 700; color: var(--color-primary); display: flex; align-items: center; gap: 8px; margin: 0; }
    .chart-header .material-icons { font-size: 1.4rem; color: var(--color-primary); }

    .btn-premium {
      background: linear-gradient(135deg, #8B1A1A 0%, #B91C1C 100%) !important;
      color: white !important; border-radius: 30px !important; padding: 0 24px !important; height: 48px !important;
      font-weight: 700 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important;
      box-shadow: 0 8px 20px rgba(139, 26, 26, 0.3) !important;
      transition: all 0.3s ease !important; border: none !important; cursor: pointer !important;
      
      &:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 25px rgba(139, 26, 26, 0.4) !important; }
      &:active { transform: translateY(0) !important; }
      
      mat-icon { font-size: 20px; width: 20px; height: 20px; margin: 0 !important; }
    }
  `]
})
export class InstructorDashboardComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  auth = inject(AuthService);
  toast = inject(ToastService);
  protected Math = Math;

  stats = signal<any>(null);
  activeSessions = signal<ClassSession[]>([]);
  statsLoading = signal(true);
  sessionsLoading = signal(true);

  today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

  greeting = signal('morning');
  private chart: Chart | null = null;

  ngOnInit(): void {
    const h = new Date().getHours();
    this.greeting.set(h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening');

    this.api.getDashboardStats().subscribe({
      next: (r) => { 
        this.stats.set(r.data); 
        this.statsLoading.set(false); 
        // Ensure Angular change detection places the canvas first
        setTimeout(() => this.initChart(), 100);
      },
      error: () => this.statsLoading.set(false)
    });

    this.api.getSessions({ status: 'active' }).subscribe({
      next: (r) => { this.activeSessions.set(r.data || []); this.sessionsLoading.set(false); },
      error: () => this.sessionsLoading.set(false)
    });
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
  }

  private initChart(): void {
    const perfData = this.stats()?.sectionPerformance;
    if (!perfData || !perfData.length) return;

    const ctx = document.getElementById('performanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    const canvasCtx = ctx.getContext('2d');
    let gradientFill;
    if (canvasCtx) {
      gradientFill = canvasCtx.createLinearGradient(0, 0, 0, 300);
      gradientFill.addColorStop(0, 'rgba(139, 26, 26, 0.8)');
      gradientFill.addColorStop(1, 'rgba(139, 26, 26, 0.2)');
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: perfData.map((d: any) => d.label),
        datasets: [{
          label: 'Attendance %',
          data: perfData.map((d: any) => d.rate),
          backgroundColor: gradientFill || 'rgba(139, 26, 26, 0.7)',
          borderColor: '#8B1A1A',
          borderWidth: 1.5,
          borderRadius: 12,
          borderSkipped: false,
          barThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            titleFont: { family: 'inherit', size: 14, weight: 'bold' as any },
            bodyFont: { family: 'inherit', size: 13 },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (ctx) => ` Performance: ${ctx.raw}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            border: { display: false },
            grid: { color: 'rgba(0,0,0,0.04)', drawTicks: false },
            ticks: { 
              font: { family: 'inherit', weight: 'bold' as any, size: 11 }, 
              padding: 10,
              callback: (v) => v + '%' 
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'inherit', weight: 'bold' as any, size: 11 }, padding: 10 }
          }
        }
      }
    });
  }
}
