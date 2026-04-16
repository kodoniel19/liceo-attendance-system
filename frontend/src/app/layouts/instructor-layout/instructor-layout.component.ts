import { Component, signal, computed, inject } from '@angular/core';
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
          <div class="sidebar__logo">
            <span class="sidebar__logo-icon">🎓</span>
          </div>
          <div class="sidebar__brand-text">
            <span class="sidebar__brand-name">Liceo</span>
            <span class="sidebar__brand-sub">Attendance System</span>
          </div>
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

        <div class="content-wrapper">
          <router-outlet />
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
    .sidebar__logo {
      width: 44px; height: 44px;
      background: rgba(201, 162, 39, 0.2);
      border: 2px solid rgba(201, 162, 39, 0.5);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
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
export class InstructorLayoutComponent {
  auth = inject(AuthService);
  private bp = inject(BreakpointObserver);

  isMobile = signal(false);
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
    { icon: 'bar_chart', label: 'Reports', route: '/instructor/reports' },
  ];

  constructor() {
    this.bp.observe([Breakpoints.Handset]).subscribe(r => this.isMobile.set(r.matches));
  }

  confirmLogout(): void {
    this.showLogoutConfirm.set(false);
    this.auth.logout();
  }
}
