import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';

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

      <div class="stats-grid" *ngIf="!loading() && stats()">
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
             <img src="https://cdn-icons-png.flaticon.com/512/2666/2666505.png" style="width:48px;height:48px" alt="Sessions" />
          </div>
          <div class="card-value">{{ stats()?.sessions?.total || 0 }}</div>
          <div class="card-label">Sessions</div>
          <div class="card-footer status--active">
             {{ stats()?.sessions?.active || 0 }} active
          </div>
        </a>

        <a class="stat-card clickable highlight-pink" routerLink="/admin/reports">
          <div class="card-icon">
             <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" style="width:48px;height:48px" alt="Attendance" />
          </div>
          <div class="card-value">{{ stats()?.attend?.total || 0 }}</div>
          <div class="card-label">Attendance Records</div>
          <div class="card-footer">System Verified</div>
        </a>
      </div>

      <div class="quick-actions">
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
    .admin-page p { color: #64748b; font-size: 0.875rem; margin: 0 0 28px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; margin-bottom: 40px; }
    .stat-card {
      background: white; border-radius: 24px; padding: 32px 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
      display: flex; flex-direction: column; align-items: center; text-align: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none; position: relative; overflow: hidden;
      border: 1px solid #f1f5f9;
    }
    .stat-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 6px; }
    .highlight-red::before    { background: linear-gradient(90deg, #8B1A1A, #C9A227); }
    .highlight-gold::before   { background: #C9A227; }
    .highlight-green::before  { background: #10b981; }
    .highlight-orange::before { background: #f59e0b; }
    .highlight-pink::before   { background: #ef4444; }

    .stat-card.clickable:hover { 
      transform: translateY(-8px); 
      box-shadow: 0 20px 40px rgba(0,0,0,0.08);
    }
    
    .card-icon { font-size: 36px; margin-bottom: 16px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
    .card-value { font-size: 3rem; font-weight: 800; color: #1e293b !important; line-height: 1.1; margin-bottom: 4px; }
    .card-label { font-size: 0.75rem; font-weight: 700; color: #64748b !important; text-transform: uppercase; letter-spacing: 0.1em; }
    
    .card-footer { 
      margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; 
      width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px; 
      font-size: 0.72rem; font-weight: 600; color: #94a3b8 !important; 
    }
    .card-footer span { color: #94a3b8 !important; }
    .status--active { color: #10b981 !important; }

    .quick-actions h2 { font-size: 1.25rem; font-weight: 800; color: #1a1a2e; margin-bottom: 20px; }
    .actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
    .action-card {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
      padding: 24px 16px; background: white; border-radius: 16px;
      text-decoration: none; color: #1a1a2e; font-size: 0.875rem; font-weight: 600;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: all 0.2s;
      .material-icons { font-size: 32px; color: #8B1A1A; }
      &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); color: #8B1A1A; }
      
      &.highlight-danger .material-icons { color: #ef4444; }
      &.highlight-danger:hover { color: #ef4444; }
      &.highlight-info .material-icons { color: #6366f1; }
      &.highlight-info:hover { color: #6366f1; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  api = inject(ApiService);
  stats = signal<any>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.load();
    // Refresh triggered by other components
    this.api.refresh$.subscribe(() => {
      this.load();
    });
  }

  load(): void {
    this.api.getSystemStats().subscribe({
      next: r => { this.stats.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
