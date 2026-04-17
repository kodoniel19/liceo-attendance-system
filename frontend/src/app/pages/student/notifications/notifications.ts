import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatButtonModule, MatIconModule, 
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule
  ],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div class="page-header__title">
          <h1>Recent Notifications</h1>
          <p>Stay updated with all announcements</p>
        </div>
      </div>

      <!-- Filter Area -->
      <div class="filter-area animate-fade-in-up" *ngIf="notifications().length > 0">
        <mat-form-field appearance="outline" class="course-filter">
          <mat-select [value]="selectedFilter()" (selectionChange)="selectedFilter.set($event.value)" placeholder="Filter by Source">
            <mat-option [value]="'all'">All Notifications</mat-option>
            <mat-option [value]="'admin'">Admin/System</mat-option>
            <mat-option *ngFor="let course of uniqueCourses()" [value]="course.code">
              {{ course.label }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>filter_list</mat-icon>
        </mat-form-field>
      </div>

      <div *ngIf="loading()" class="loading-spinner">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div class="notif-grid" *ngIf="!loading()">
        <div class="notif-card" *ngFor="let n of filteredNotifications()">
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
    .filter-area { margin-bottom: 24px; display: flex; justify-content: flex-start; }
    .course-filter {
      width: 100%; max-width: 260px;
      margin: 0;
      ::ng-deep .mat-mdc-text-field-wrapper { background: white !important; border-radius: 12px !important; height: 48px !important; display: flex; align-items: center; }
      ::ng-deep .mdc-notched-outline__leading,
      ::ng-deep .mdc-notched-outline__notch,
      ::ng-deep .mdc-notched-outline__trailing { border-color: var(--color-primary) !important; }
      ::ng-deep .mat-mdc-select-value { font-size: 0.85rem; font-weight: 600; color: #444; }
      ::ng-deep .mat-icon { color: var(--color-primary); font-size: 20px; width: 20px; height: 20px; margin-right: 8px; }
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
      .mdc-list-item__primary-text { font-size: 0.85rem !important; font-weight: 500; }
    }

    ::ng-deep .mat-mdc-option.mdc-list-item--selected:not(.mdc-list-item--disabled) {
      background: var(--color-primary) !important;
      .mdc-list-item__primary-text { color: white !important; font-weight: 700 !important; }
    }

    ::ng-deep .mat-mdc-option:hover:not(.mdc-list-item--selected) {
      background: rgba(139, 26, 26, 0.05) !important;
    }

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
  selectedFilter = signal<string>('all');

  uniqueCourses = computed(() => {
    const items = this.notifications()
      .filter(n => !n.isGlobal && n.courseCode)
      .map(n => ({
        code: n.courseCode,
        label: `${n.courseName || n.courseCode} Instructor: ${n.instructorLast || 'Instructor'}`
      }));
    
    // Get unique entries based on courseCode
    const unique = Array.from(
      new Map(items.map(item => [item['code'], item])).values()
    );
    
    return unique.sort((a,b) => a.code.localeCompare(b.code));
  });

  filteredNotifications = computed(() => {
    const filter = this.selectedFilter();
    const all = this.notifications();
    
    if (filter === 'all') return all;
    if (filter === 'admin') return all.filter(n => n.isGlobal);
    return all.filter(n => n.courseCode === filter);
  });

  ngOnInit(): void {
    this.api.getMyAnnouncements().subscribe({
      next: r => { this.notifications.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
