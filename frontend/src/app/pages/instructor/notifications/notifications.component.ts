import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-instructor-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="page-header__title">
          <h1>System Announcements</h1>
          <p>Stay updated with all announcements</p>
        </div>
      </div>

      <div *ngIf="loading()" class="loading-spinner">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="notif-grid" *ngIf="!loading()">
        <div class="notif-card" *ngFor="let n of notifications()">
          <div class="notif-card__icon">
            <mat-icon>campaign</mat-icon>
          </div>
          <div class="notif-card__content">
            <div class="notif-card__title">{{ n.title }}</div>
            <div class="notif-card__meta">
               <span class="admin-pill">System Broadcast</span>
               <span class="dot">·</span>
               <span class="instructor">From: {{ n.adminFirst }} {{ n.adminLast }}</span>
               <span class="dot">·</span>
               <span class="time">{{ n.created_at | date:'medium' }}</span>
            </div>
            <div class="notif-card__body">{{ n.content }}</div>
          </div>
        </div>

        <div class="empty-state" *ngIf="notifications().length === 0">
          <mat-icon>notifications_none</mat-icon>
          <h3>No system announcements</h3>
          <p>You have no recent broadcasts from the administrator.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 900px; margin: 0 auto; }
    .page-header { margin-bottom: 32px; }
    .page-header h1 { font-size: 1.8rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
    .page-header p { color: #64748b; font-size: 1rem; }
    
    .notif-grid { display: flex; flex-direction: column; gap: 16px; }
    .notif-card {
      background: white; border-radius: 16px; padding: 24px;
      display: flex; align-items: flex-start; gap: 20px;
      border: 1px solid rgba(0,0,0,0.05);
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .notif-card:hover { 
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      border-left: 4px solid #6366f1;
    }
    .notif-card__icon {
      width: 48px; height: 48px; border-radius: 12px;
      background: rgba(99, 102, 241, 0.08); color: #6366f1;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .notif-card__content { flex: 1; }
    .notif-card__title { font-weight: 800; font-size: 1.2rem; color: #1e293b; margin-bottom: 6px; }
    .notif-card__meta { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #64748b; margin-bottom: 14px; }
    .admin-pill { background: #e0e7ff; color: #4338ca; padding: 2px 10px; border-radius: 20px; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; }
    .notif-card__body { font-size: 1rem; color: #4b5563; line-height: 1.7; white-space: pre-wrap; }
    .dot { color: #cbd5e1; }
    .empty-state { text-align: center; padding: 100px 20px; color: #94a3b8; }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 20px; color: #cbd5e1; }
    .loading-spinner { display: flex; justify-content: center; padding: 100px; }
  `]
})
export class InstructorNotificationsComponent implements OnInit {
  api = inject(ApiService);
  notifications = signal<any[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.api.getInstructorAnnouncements().subscribe({
      next: r => { this.notifications.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
