import { Routes } from '@angular/router';
import { authGuard, guestGuard, instructorGuard, studentGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // ── Auth ──────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard], title: 'Login - Liceo Attendance'
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard], title: 'Register - Liceo Attendance'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [guestGuard], title: 'Forgot Password - Liceo Attendance'
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    title: 'Reset Password - Liceo Attendance'
  },

  // ── Admin ─────────────────────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        title: 'Admin Dashboard - Liceo Attendance'
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
        title: 'User Management - Liceo Attendance'
      },
      {
        path: 'courses',
        loadComponent: () => import('./pages/admin/courses/admin-courses.component').then(m => m.AdminCoursesComponent),
        title: 'Course Management - Liceo Attendance'
      },
      {
        path: 'sections',
        loadComponent: () => import('./pages/instructor/sections/sections.component').then(m => m.SectionsComponent),
        title: 'Sections - Liceo Attendance'
      },
      {
        path: 'monitoring',
        loadComponent: () => import('./pages/admin/monitoring/monitoring.component').then(m => m.AdminMonitoringComponent),
        title: 'At-Risk Monitoring - Liceo Attendance'
      },
      {
        path: 'broadcast',
        loadComponent: () => import('./pages/admin/broadcast/broadcast.component').then(m => m.AdminBroadcastComponent),
        title: 'System Broadcast - Liceo Attendance'
      },
      {
        path: 'sessions',
        loadComponent: () => import('./pages/instructor/sessions/sessions.component').then(m => m.SessionsComponent),
        title: 'Global Sessions - Liceo Attendance'
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/instructor/reports/reports.component').then(m => m.ReportsComponent),
        title: 'Global Reports - Liceo Attendance'
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/shared/profile/profile.component').then(m => m.ProfileComponent),
        title: 'Profile - Liceo Attendance'
      },
    ]
  },

  // ── Instructor ────────────────────────────────────────────
  {
    path: 'instructor',
    loadComponent: () => import('./layouts/instructor-layout/instructor-layout.component').then(m => m.InstructorLayoutComponent),
    canActivate: [instructorGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/instructor/dashboard/dashboard.component').then(m => m.InstructorDashboardComponent),
        title: 'Instructor Dashboard - Liceo Attendance'
      },
      {
        path: 'sessions',
        loadComponent: () => import('./pages/instructor/sessions/sessions.component').then(m => m.SessionsComponent),
        title: 'Sessions - Liceo Attendance'
      },
      {
        path: 'sessions/:id',
        loadComponent: () => import('./pages/instructor/session-detail/session-detail.component').then(m => m.SessionDetailComponent),
        title: 'Session Detail - Liceo Attendance'
      },
      {
        path: 'courses',
        loadComponent: () => import('./pages/instructor/courses/instructor-courses.component').then(m => m.InstructorCoursesComponent),
        title: 'My Courses - Liceo Attendance'
      },
      {
        path: 'sections',
        loadComponent: () => import('./pages/instructor/sections/sections.component').then(m => m.SectionsComponent),
        title: 'My Classes - Liceo Attendance'
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/instructor/reports/reports.component').then(m => m.ReportsComponent),
        title: 'Reports - Liceo Attendance'
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/instructor/notifications/notifications.component').then(m => m.InstructorNotificationsComponent),
        title: 'Announcements - Liceo Attendance'
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/shared/profile/profile.component').then(m => m.ProfileComponent),
        title: 'Profile - Liceo Attendance'
      },
    ]
  },

  // ── Student ───────────────────────────────────────────────
  {
    path: 'student',
    loadComponent: () => import('./layouts/student-layout/student-layout.component').then(m => m.StudentLayoutComponent),
    canActivate: [studentGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/student/dashboard/dashboard.component').then(m => m.StudentDashboardComponent),
        title: 'Student Dashboard - Liceo Attendance'
      },
      {
        path: 'scan',
        loadComponent: () => import('./pages/student/scan/scan.component').then(m => m.ScanComponent),
        title: 'Scan QR - Liceo Attendance'
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/student/history/history.component').then(m => m.HistoryComponent),
        title: 'Attendance History - Liceo Attendance'
      },
      {
        path: 'subjects/:id',
        loadComponent: () => import('./pages/student/subject-detail/subject-detail.component').then(m => m.SubjectDetailComponent),
        title: 'Subject Detail - Liceo Attendance'
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/student/notifications/notifications.component').then(m => m.NotificationsComponent),
        title: 'Recent Notifications - Liceo Attendance'
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/shared/profile/profile.component').then(m => m.ProfileComponent),
        title: 'Profile - Liceo Attendance'
      },
    ]
  },

  // ── Wildcard ──────────────────────────────────────────────
  { path: '**', redirectTo: '/login' }
];
