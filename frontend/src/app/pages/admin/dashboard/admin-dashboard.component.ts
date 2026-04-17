import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="admin-page animate-fade-in-up">
      <div class="page-header">
        <h1>System Overview</h1>
        <p>Real-time statistics and system health</p>
      </div>

      <div *ngIf="loading()" class="loading-spinner"><mat-spinner diameter="36"></mat-spinner></div>

      <!-- Top Row: Stats & Chart -->
      <div class="dashboard-top-row animate-fade-in-up" *ngIf="!loading() && stats()">
        <div class="stats-grid">
          <a class="stat-card clickable highlight-red" routerLink="/admin/users">
            <div class="card-icon">👥</div>
            <div class="card-value">{{ stats()?.users?.total || 0 }}</div>
            <div class="card-label">Total Users</div>
            <div class="card-footer">
              <span>{{ stats()?.users?.students || 0 }} Students</span>
              <span>{{ stats()?.users?.instructors || 0 }} Instructors</span>
            </div>
          </a>

          <a class="stat-card clickable highlight-gold" routerLink="/admin/courses">
            <div class="card-icon">📚</div>
            <div class="card-value">{{ stats()?.courses?.total || 0 }}</div>
            <div class="card-label">Courses</div>
            <div class="card-footer">Active Curriculum</div>
          </a>

          <a class="stat-card clickable highlight-green" routerLink="/admin/sections">
            <div class="card-icon">🏫</div>
            <div class="card-value">{{ stats()?.sections?.total || 0 }}</div>
            <div class="card-label">Active Sections</div>
            <div class="card-footer">Running Classes</div>
          </a>

          <a class="stat-card clickable highlight-orange" routerLink="/admin/sessions">
            <div class="card-icon">
               <img src="https://cdn-icons-png.flaticon.com/512/2666/2666505.png" style="width:28px;height:28px" alt="Sessions" />
            </div>
            <div class="card-value">{{ stats()?.sessions?.total || 0 }}</div>
            <div class="card-label">Sessions</div>
            <div class="card-footer status--active">
               {{ stats()?.sessions?.active || 0 }} active
            </div>
          </a>

          <a class="stat-card clickable highlight-pink" routerLink="/admin/reports">
            <div class="card-icon">
               <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" style="width:28px;height:28px" alt="Attendance" />
            </div>
            <div class="card-value">{{ stats()?.attend?.total || 0 }}</div>
            <div class="card-label">Attendance Records</div>
            <div class="card-footer">System Verified</div>
          </a>
        </div>

        <!-- Weekly Trend Chart -->
        <div class="chart-wrapper">
          <div class="chart-container">
            <div class="chart-header">
              <h2>
                <span class="material-icons">trending_up</span>
                7-Day Activity
              </h2>
            </div>
            <div *ngIf="stats()?.weeklySessions?.length > 0; else emptyChart" style="height: 220px; position: relative;">
              <canvas id="weeklyChart"></canvas>
            </div>
            <ng-template #emptyChart>
              <div style="height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--color-text-muted);">
                <span class="material-icons" style="font-size: 40px; opacity: 0.2; margin-bottom: 12px;">show_chart</span>
                <p style="margin: 0; font-weight: 600;">No session activity in the past 7 days.</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <div class="quick-actions animate-fade-in-up">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <a routerLink="/admin/users" class="action-card">
            <span class="material-icons">person_add</span>
            <span>Manage Users</span>
          </a>
          <a routerLink="/admin/monitoring" class="action-card highlight-danger">
            <span class="material-icons">warning</span>
            <span>At-Risk Students</span>
          </a>
          <a routerLink="/admin/broadcast" class="action-card highlight-info">
            <span class="material-icons">campaign</span>
            <span>System Broadcast</span>
          </a>
          <a routerLink="/admin/courses" class="action-card">
            <span class="material-icons">library_add</span>
            <span>Add Course</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page h1 { font-size: 1.5rem; font-weight: 800; color: #1a1a2e; margin: 0 0 4px; }
    .admin-page p { color: #64748b; font-size: 0.875rem; margin: 0 0 24px; }

    .dashboard-top-row { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 32px; }
    @media (min-width: 1200px) {
      .dashboard-top-row { grid-template-columns: 1.2fr 1fr; }
    }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .stat-card {
      background: white; border-radius: 16px; padding: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.03);
      display: flex; flex-direction: column; align-items: center; text-align: center;
      transition: all 0.3s ease;
      text-decoration: none; position: relative; overflow: hidden;
      border: 1px solid #f1f5f9;
    }
    .stat-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
    .highlight-red::before    { background: linear-gradient(90deg, #8B1A1A, #C9A227); }
    .highlight-gold::before   { background: #C9A227; }
    .highlight-green::before  { background: #10b981; }
    .highlight-orange::before { background: #f59e0b; }
    .highlight-pink::before   { background: #ef4444; }

    .stat-card.clickable:hover { 
      transform: translateY(-3px); 
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
    }
    
    .card-icon { font-size: 26px; margin-bottom: 8px; min-height: 30px; display: flex; align-items: center; justify-content: center; }
    .card-value { font-size: 1.8rem; font-weight: 800; color: #1e293b !important; line-height: 1.1; margin-bottom: 2px; }
    .card-label { font-size: 0.65rem; font-weight: 700; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.05em; }
    
    .card-footer { 
      margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; 
      width: 100%; display: flex; flex-direction: column; align-items: center; gap: 2px; 
      font-size: 0.65rem; font-weight: 600; color: #94a3b8 !important; 
    }
    .card-footer span { color: #94a3b8 !important; }
    .status--active { color: #10b981 !important; }

    .quick-actions h2 { font-size: 1.25rem; font-weight: 800; color: #1a1a2e; margin-bottom: 20px; }
    .actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; margin-bottom: 40px; }
    .action-card {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
      padding: 24px 16px; background: white; border-radius: 16px;
      text-decoration: none; color: #1a1a2e; font-size: 0.875rem; font-weight: 600;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: all 0.2s;
    }
    .action-card .material-icons { font-size: 32px; color: #8B1A1A; }
    .action-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); color: #8B1A1A; }
    
    .action-card.highlight-danger .material-icons { color: #ef4444; }
    .action-card.highlight-danger:hover { color: #ef4444; }
    .action-card.highlight-info .material-icons { color: #6366f1; }
    .action-card.highlight-info:hover { color: #6366f1; }

    .chart-wrapper { height: 100%; display: flex; flex-direction: column; }
    .chart-container {
      background: white; border-radius: 16px; padding: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;
      flex: 1; display: flex; flex-direction: column;
    }
    .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .chart-header h2 { font-size: 1.1rem; font-weight: 800; color: #1a1a2e; margin: 0; display: flex; align-items: center; gap: 8px; }
    .chart-header .material-icons { color: #8B1A1A; font-size: 1.25rem; }
  `]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  stats = signal<any>(null);
  loading = signal(true);
  private chart: Chart | null = null;

  ngOnInit(): void {
    this.load();
    // Refresh triggered by other components - use silent mode
    this.api.refresh$.subscribe(() => {
      this.load(true);
    });
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.api.getSystemStats().subscribe({
      next: r => { 
        this.stats.set(r.data); 
        this.loading.set(false); 
        setTimeout(() => this.initChart(), 100);
      },
      error: () => this.loading.set(false)
    });
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
  }

  private initChart(): void {
    const weeklyData = this.stats()?.weeklySessions;
    if (!weeklyData?.length) return;

    const ctx = document.getElementById('weeklyChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyData.map((d: any) => d.label),
        datasets: [{
          label: 'Total Sessions',
          data: weeklyData.map((d: any) => d.count),
          borderColor: '#8B1A1A',
          backgroundColor: 'rgba(139, 26, 26, 0.1)',
          borderWidth: 3,
          pointBackgroundColor: '#C9A227',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a2e',
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            padding: 12,
            cornerRadius: 8,
            displayColors: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { weight: 'bold' }, stepSize: 1 }
          },
          x: {
            grid: { display: false },
            ticks: { font: { weight: 'bold' } }
          }
        }
      }
    });
  }
}
