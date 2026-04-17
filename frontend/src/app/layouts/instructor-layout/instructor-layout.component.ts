import { Component, signal, computed, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../core/services/auth.service';

import { ApiService } from '../../core/services/api.service';
import { Subscription, timer } from 'rxjs';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-instructor-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, CommonModule,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatTooltipModule, MatDividerModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">

      <!-- Sidebar -->
      <mat-sidenav
        #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        class="sidebar">

        <!-- Brand -->
        <div class="sidebar__brand">
          <img src="assets/images/logo.png" alt="LDCU Logo" class="sidebar__logo-img">
          <div class="sidebar__brand-text">
            <span class="sidebar__brand-name">Liceo</span>
            <span class="sidebar__brand-sub">Attendance System</span>
          </div>

          <!-- Notification Bell -->
          <button mat-icon-button class="notification-bell" [matMenuTriggerFor]="notifMenu" [class.pulse-active]="hasUnread()" (menuOpened)="markAsRead()">
             <mat-icon [class.pulse]="hasUnread()">{{ hasUnread() ? 'notifications_active' : 'notifications' }}</mat-icon>
             <span *ngIf="unreadCount() > 0" class="notif-badge">{{ unreadCount() }}</span>
          </button>
          <mat-menu #notifMenu="matMenu" class="modern-notif-menu">
             <div class="notif-menu-header">System Broadcasts</div>
             <button mat-menu-item *ngFor="let a of recentAnnouncements()" routerLink="/instructor/notifications">
                <div class="notif-item">
                   <div class="notif-dot"></div>
                   <div class="notif-item-body">
                      <div class="notif-item-title">{{ a.title }}</div>
                      <div class="notif-item-meta">By Admin • {{ a.created_at | date:'shortTime' }}</div>
                   </div>
                </div>
             </button>
             <div *ngIf="recentAnnouncements().length === 0" class="notif-empty">No unread broadcasts</div>
             <div class="notif-menu-footer" *ngIf="recentAnnouncements().length > 0">
                <button mat-button color="primary" routerLink="/instructor/notifications" style="width: 100%; border-radius: 0; font-size: 0.75rem; font-weight: 700;">VIEW ALL</button>
             </div>
          </mat-menu>
        </div>

        <!-- Navigation -->
        <nav class="sidebar__nav">
          <a *ngFor="let item of navItems"
             [routerLink]="item.route"
             routerLinkActive="active"
             class="sidebar__nav-item"
             (click)="isMobile() && sidenav.close()">
            <span class="material-icons sidebar__nav-icon">{{ item.icon }}</span>
            <span class="sidebar__nav-label">{{ item.label }}</span>
          </a>
        </nav>

        <!-- Footer -->
        <div class="sidebar-footer">
          <div class="sidebar-user" [routerLink]="'/instructor/profile'" (click)="isMobile() && sidenav.close()">
            <div class="user-avatar">{{ userInitials() }}</div>
            <div>
              <div class="user-name">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</div>
              <div class="user-role">Instructor</div>
            </div>
          </div>
          <button class="logout-btn" (click)="showLogoutConfirm.set(true)">
            <span class="material-icons">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
    </mat-sidenav>

      <!-- Main content -->
      <mat-sidenav-content class="main-content">
        <!-- Top bar (mobile) -->
        <div class="topbar" *ngIf="isMobile()">
          <button mat-icon-button (click)="sidenav.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="topbar__title">Liceo Attendance</span>
        </div>

        <div class="content-wrapper" #mainContent>
          <router-outlet (activate)="onRouteActivate()" />
        </div>
      </mat-sidenav-content>

    </mat-sidenav-container>

    <!-- Logout Confirmation Modal (Moved outside container for better z-index/click capture) -->
    <div class="modal-overlay" *ngIf="showLogoutConfirm()" (click)="showLogoutConfirm.set(false)">
      <div class="logout-modal animate-fade-in-up" (click)="$event.stopPropagation()">
        <div class="logout-modal__header">
          <div class="logout-icon-wrapper">
            <mat-icon>logout</mat-icon>
          </div>
          <h3>Sign Out?</h3>
          <p>Are you sure you want to log out of your instructor account?</p>
        </div>
        <div class="logout-modal__footer">
          <button mat-button (click)="showLogoutConfirm.set(false)">Cancel</button>
          <button mat-raised-button color="warn" (click)="confirmLogout()">Sign Out</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sidenav-container { height: 100dvh; }

    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, #8B1A1A 0%, #3e0909 100%);
      color: white;
      border-right: none !important;
    }
    
    ::ng-deep .sidebar .mat-drawer-inner-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .sidebar__brand {
      display: flex; align-items: center; gap: 12px;
      padding: 24px 20px 20px;
    }
    .sidebar__logo-img {
      width: 44px; height: 44px;
      flex-shrink: 0;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
    }
    .sidebar__brand-name { display: block; font-weight: 800; font-size: 1rem; color: #fff; }
    .sidebar__brand-sub  { display: block; font-size: 0.65rem; color: rgba(255, 255, 255, 0.5); }

    .sidebar__nav { flex: 1; padding: 12px 12px; display: flex; flex-direction: column; gap: 4px; }
    .sidebar__nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.65);
      text-decoration: none;
      font-size: 0.875rem; font-weight: 500;
      transition: all 0.2s ease;
      cursor: pointer;

      &:hover { background: rgba(255, 255, 255, 0.1); color: white; }
      &.active { background: rgba(201, 162, 39, 0.2); color: #C9A227; border-left: 3px solid #C9A227; }
    }
    .sidebar__nav-icon { font-size: 20px; }

    .sidebar-footer {
      padding: 16px; border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; flex-direction: column; gap: 12px; margin-top: auto;
    }
    .sidebar-user { 
      display: flex; align-items: center; gap: 10px; cursor: pointer;
      padding: 6px; border-radius: 10px; transition: background 0.2s;
    }
    .sidebar-user:hover { background: rgba(255,255,255,0.05); }
    .user-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #e94560, #c23152);
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.8rem; flex-shrink: 0;
    }
    .user-name { font-size: 0.8rem; font-weight: 700; color: white; }
    .user-role { font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; }
    .logout-btn {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 10px 14px; background: rgba(233,69,96,0.1);
      border: 1px solid rgba(233,69,96,0.2); border-radius: 10px;
      color: rgba(255,255,255,0.6); font-size: 0.875rem; cursor: pointer;
      transition: all 0.2s;
      .material-icons { font-size: 18px; }
      &:hover { background: rgba(233,69,96,0.25); color: #e94560; }
    }

    /* Notification Bell */
    .notification-bell {
       margin-left: auto; color: #C9A227; position: relative;
       width: 36px !important; height: 36px !important; line-height: 36px !important;
       .mat-icon { font-size: 20px; }
    }
    .notif-badge {
       position: absolute; top: 4px; right: 4px;
       background: #ef4444; color: white; font-size: 9px; font-weight: 800;
       width: 14px; height: 14px; border-radius: 50%;
       display: flex; align-items: center; justify-content: center;
       border: 1px solid white;
    }
    .modern-notif-menu {
       width: 280px; border-radius: 16px !important; overflow: hidden;
       box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
    }
    .notif-menu-header { padding: 12px 16px; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; color: #8B1A1A; border-bottom: 1px solid #eee; background: #fdfdfd; }
    .notif-item { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
    .notif-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; flex-shrink: 0; }
    .notif-item-body { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
    .notif-item-title { font-weight: 700; font-size: 0.82rem; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .notif-item-meta { font-size: 0.7rem; color: #666; font-weight: 500; }
    .notif-empty { padding: 24px; text-align: center; color: #999; font-size: 0.82rem; }

    .notification-bell.pulse-active {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      animation: bellGlow 1.5s infinite alternate;
    }
    @keyframes bellGlow {
      from { box-shadow: 0 0 5px rgba(255, 215, 0, 0.1); }
      to { box-shadow: 0 0 15px rgba(255, 215, 0, 0.4); }
    }

    /* Content */
    .main-content { background: var(--color-bg); overflow-y: auto; }
    .topbar {
      display: flex; align-items: center;
      padding: 0 8px;
      height: 56px;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      position: sticky; top: 0; z-index: 100;
      gap: 8px;
    }
    .topbar__title { font-weight: 700; color: var(--color-primary); flex: 1; }
    .content-wrapper { padding: 0; min-height: 100%; }

    mat-divider { border-color: rgba(255, 255, 255, 0.1) !important; margin: 4px 0; }

    /* Logout Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .logout-modal {
      background: white; border-radius: 20px; width: 100%; max-width: 320px;
      padding: 32px 24px; text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }
    .logout-icon-wrapper {
      width: 56px; height: 56px; border-radius: 50%;
      background: #fee2e2; color: #ef4444;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }
    .logout-modal h3 { font-size: 1.25rem; font-weight: 800; color: #1a1a2e; margin: 0 0 8px; }
    .logout-modal p { font-size: 0.875rem; color: #64748b; margin: 0 0 24px; line-height: 1.5; }
    .logout-modal__footer { display: flex; flex-direction: column; gap: 8px; }
    .logout-modal__footer button { width: 100%; border-radius: 10px; padding: 6px 0; }
  `]
})
export class InstructorLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('mainContent') mainContent?: ElementRef<HTMLDivElement>;
  auth = inject(AuthService);
  api = inject(ApiService);
  private bp = inject(BreakpointObserver);

  isMobile = signal(false);
  private sub = new Subscription();
  showLogoutConfirm = signal(false);
  userInitials = computed(() => {
    const u = this.auth.user();
    if (!u) return 'IN';
    return `${u.firstName[0]}${u.lastName[0]} `.toUpperCase();
  });

  navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/instructor/dashboard' },
    { icon: 'event', label: 'Sessions', route: '/instructor/sessions' },
    { icon: 'menu_book', label: 'My Courses', route: '/instructor/courses' },
    { icon: 'class', label: 'My Classes', route: '/instructor/sections' },
    { icon: 'campaign', label: 'Announcements', route: '/instructor/notifications' },
    { icon: 'bar_chart', label: 'Reports', route: '/instructor/reports' },
  ];

  constructor() {
    this.bp.observe([Breakpoints.Handset]).subscribe(r => this.isMobile.set(r.matches));
  }

  ngOnInit(): void {
    this.refreshAnnouncements();

    // Cross-tab refresh
    this.sub.add(this.api.refresh$.subscribe(source => {
      if (source?.includes('announcements') || source === 'general') {
        this.refreshAnnouncements();
      }
    }));

    // Local user polling (e.g. for when admin sends a broadcast)
    this.sub.add(timer(30000, 30000).subscribe(() => {
      this.refreshAnnouncements();
    }));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // Notifications Logic
  unreadCount = signal(0);
  hasUnread = computed(() => this.unreadCount() > 0);
  recentAnnouncements = signal<any[]>([]);
  private lastCheckedId = 0;

  refreshAnnouncements(): void {
    const savedLastId = localStorage.getItem('last_instructor_notif_id');
    if (savedLastId) this.lastCheckedId = parseInt(savedLastId);

    this.api.getInstructorAnnouncements().subscribe(r => {
      const announcements = r.data || [];
      announcements.sort((a: any, b: any) => b.id - a.id);
      this.recentAnnouncements.set(announcements.slice(0, 5));
      
      const newUnread = announcements.filter((a: any) => a.id > this.lastCheckedId).length;
      this.unreadCount.set(newUnread);
    });
  }

  markAsRead(): void {
    const latest = this.recentAnnouncements()[0];
    if (latest) {
      this.lastCheckedId = latest.id;
      localStorage.setItem('last_instructor_notif_id', this.lastCheckedId.toString());
      this.unreadCount.set(0);
    }
  }

  onRouteActivate(): void {
    if (this.mainContent?.nativeElement) {
      this.mainContent.nativeElement.scrollTop = 0;
    }
    const scrollContainer = document.querySelector('.main-content');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }

  confirmLogout(): void {
    this.showLogoutConfirm.set(false);
    this.auth.logout();
  }
}
