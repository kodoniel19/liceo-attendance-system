import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="page-header__title">
          <h1>Recent Notifications</h1>
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
               <span class="course-pill" [class.global-pill]="n.isGlobal">{{ n.isGlobal ? 'Admin' : n.courseCode }}</span>
               <span class="dot">·</span>
               <span class="instructor">{{ n.isGlobal ? 'Admin' : 'Instructor ' + n.instructorLast }}</span>
               <span class="dot">·</span>
               <span class="time">{{ n.created_at | date:'medium' }}</span>
            </div>
            <div class="notif-card__body">{{ n.content }}</div>
          </div>
        </div>

        <div class="empty-state" *ngIf="notifications().length === 0">
          <mat-icon>notifications_none</mat-icon>
          <h3>All caught up!</h3>
          <p>You have no recent notifications at this time.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notif-grid { display: flex; flex-direction: column; gap: 16px; max-width: 800px; }
    .notif-card {
      background: white; border-radius: 16px; padding: 20px;
      display: flex; align-items: flex-start; gap: 20px;
      border: 1px solid rgba(0,0,0,0.05);
      transition: all 0.2s ease;
      &:hover { 
        box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        border-left: 4px solid var(--color-primary);
      }
    }
    .notif-card__icon {
      width: 48px; height: 48px; border-radius: 12px;
      background: rgba(139, 26, 26, 0.08); color: var(--color-primary);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .notif-card__content { flex: 1; }
    .notif-card__title { font-weight: 800; font-size: 1.1rem; color: #1e293b; margin-bottom: 4px; }
    .notif-card__meta { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #64748b; margin-bottom: 12px; }
    .course-pill { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
    .global-pill { background: #e0e7ff; color: #4338ca; }
    .notif-card__body { font-size: 0.95rem; color: #4b5563; line-height: 1.6; }
    .notif-card__arrow { color: #cbd5e1; align-self: center; }
    .dot { color: #cbd5e1; }
    .empty-state { text-align: center; padding: 100px 20px; color: #94a3b8; mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 20px; } }
  `]
})
export class NotificationsComponent implements OnInit {
  api = inject(ApiService);
  notifications = signal<any[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.api.getMyAnnouncements().subscribe({
      next: r => { this.notifications.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
