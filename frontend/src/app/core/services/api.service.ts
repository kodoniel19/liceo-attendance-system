import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  ApiResponse, ClassSection, ClassSession, Attendance,
  AttendanceSummary, QRSession, ScanResult, Course, User
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;
  
  // Realtime notification for components to refresh their data (Cross-Tab)
  private refreshSubject = new BehaviorSubject<string | null>(null);
  refresh$ = this.refreshSubject.asObservable();
  private channel = new BroadcastChannel('liceo_refresh_channel');

  constructor(private http: HttpClient, private auth: AuthService) {
    this.channel.onmessage = (event) => {
      this.refreshSubject.next(event.data);
    };
  }

  triggerRefresh(source: string = 'general'): void {
    const msg = source + '_' + Date.now();
    this.refreshSubject.next(msg);
    this.channel.postMessage(msg);
  }

  // ── Generic helpers ────────────────────────────────────────
  private get<T>(path: string, params?: any): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) Object.keys(params).forEach(k => params[k] != null && (httpParams = httpParams.set(k, params[k])));
    return this.http.get<ApiResponse<T>>(`${this.base}${path}`, { params: httpParams });
  }
  private post<T>(path: string, body: any): Observable<ApiResponse<T>> { return this.http.post<ApiResponse<T>>(`${this.base}${path}`, body); }
  private put<T>(path: string, body: any): Observable<ApiResponse<T>>  { return this.http.put<ApiResponse<T>>(`${this.base}${path}`, body); }
  private patch<T>(path: string, body: any): Observable<ApiResponse<T>> { return this.http.patch<ApiResponse<T>>(`${this.base}${path}`, body); }
  private delete<T>(path: string): Observable<ApiResponse<T>>           { return this.http.delete<ApiResponse<T>>(`${this.base}${path}`); }

  // ── Dashboard ──────────────────────────────────────────────
  getDashboardStats(): Observable<ApiResponse<any>> { return this.get('/reports/dashboard'); }

  // ── Courses ────────────────────────────────────────────────
  getCourses(params?: any): Observable<ApiResponse<Course[]>> { return this.get('/courses', params); }
  createCourse(data: any): Observable<ApiResponse<Course>> { return this.post('/courses', data); }
  updateCourse(id: number, data: any): Observable<ApiResponse<Course>> { return this.put(`/courses/${id}`, data); }

  // ── Sections ───────────────────────────────────────────────
  getSections(params?: any): Observable<ApiResponse<ClassSection[]>> { return this.get('/sections', params); }
  getSection(id: number): Observable<ApiResponse<ClassSection>> { return this.get(`/sections/${id}`); }
  createSection(data: any): Observable<ApiResponse<ClassSection>> { return this.post('/sections', data); }
  updateSection(id: number, data: any): Observable<ApiResponse<ClassSection>> { return this.patch(`/sections/${id}`, data); }
  getSectionStudents(id: number): Observable<ApiResponse<User[]>> { return this.get(`/sections/${id}/students`); }
  getSectionAnnouncements(sectionId: number): Observable<ApiResponse<any[]>> { return this.get(`/sections/${sectionId}/announcements`); }
  postAnnouncement(sectionId: number, title: string, content: string): Observable<ApiResponse<any>> {
    return this.post(`/sections/${sectionId}/announcements`, { title, content });
  }
  getAvailableStudents(sectionId: number, search?: string): Observable<ApiResponse<User[]>> {
    return this.get(`/sections/${sectionId}/available-students`, search ? { search } : undefined);
  }
  enrollStudent(sectionId: number, studentId: number): Observable<ApiResponse<any>> {
    return this.post(`/sections/${sectionId}/enroll`, { studentId });
  }
  unenrollStudent(sectionId: number, studentId: number): Observable<ApiResponse<any>> {
    return this.delete(`/sections/${sectionId}/enroll/${studentId}`);
  }
  respondToEnrollment(sectionId: number, action: 'accept' | 'decline'): Observable<ApiResponse<any>> {
    return this.patch(`/sections/${sectionId}/respond`, { action });
  }

  // ── Sessions ───────────────────────────────────────────────
  getSessions(params?: any): Observable<ApiResponse<ClassSession[]>> { return this.get('/sessions', params); }
  getSession(id: number): Observable<ApiResponse<ClassSession>> { return this.get(`/sessions/${id}`); }
  createSession(data: any): Observable<ApiResponse<ClassSession>> { return this.post('/sessions', data); }
  updateSession(id: number, data: any): Observable<ApiResponse<ClassSession>> { return this.patch(`/sessions/${id}`, data); }
  getSessionAttendance(id: number, params?: any): Observable<ApiResponse<Attendance[]>> {
    return this.get(`/sessions/${id}/attendance`, params);
  }

  // ── QR Code ────────────────────────────────────────────────
  generateQR(sessionId: number, expirationMinutes = 15, expirationSeconds?: number): Observable<ApiResponse<QRSession>> {
    return this.post(`/qr/generate/${sessionId}`, { expirationMinutes, expirationSeconds });
  }
  reopenQR(sessionId: number, expirationMinutes = 15, expirationSeconds?: number): Observable<ApiResponse<QRSession>> {
    return this.post(`/qr/reopen/${sessionId}`, { expirationMinutes, expirationSeconds });
  }
  scanQR(token: string, sessionId: number): Observable<ScanResult> {
    return this.http.post<ScanResult>(`${this.base}/qr/scan`, { token, sessionId });
  }
  getQRStatus(sessionId: number): Observable<ApiResponse<QRSession | null>> {
    return this.get(`/qr/status/${sessionId}`);
  }
  deactivateQR(qrSessionId: number): Observable<ApiResponse<any>> {
    return this.patch(`/qr/deactivate/${qrSessionId}`, {});
  }

  // ── Attendance ─────────────────────────────────────────────
  getMyAttendance(params?: any): Observable<ApiResponse<Attendance[]>> { return this.get('/attendance/my', params); }
  getMyAttendanceSummary(): Observable<ApiResponse<AttendanceSummary[]>> { return this.get('/attendance/my/summary'); }
  getSectionAttendanceStats(sectionId: number): Observable<ApiResponse<any[]>> {
    return this.get(`/attendance/section/${sectionId}/stats`);
  }
  manualAttendance(sessionId: number, studentId: number, status: string, reason?: string): Observable<ApiResponse<any>> {
    return this.post('/attendance/manual', { sessionId, studentId, status, reason });
  }
  updateAttendance(id: number, status: string, reason?: string): Observable<ApiResponse<Attendance>> {
    return this.patch(`/attendance/${id}`, { status, reason });
  }

  // ── Reports & Export ───────────────────────────────────────
  getAttendanceReport(params?: any): Observable<ApiResponse<any[]>> { return this.get('/reports/attendance', params); }

  exportExcel(params?: any): void {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => params[k] && (p = p.set(k, params[k])));
    const token = localStorage.getItem('liceo_access_token') || '';
    const url = `${this.base}/reports/export/excel?${p.toString()}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `attendance-report-${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
      });
  }

  exportPDF(params?: any): void {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => params[k] && (p = p.set(k, params[k])));
    const token = localStorage.getItem('liceo_access_token') || '';
    const url = `${this.base}/reports/export/pdf?${p.toString()}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `attendance-report-${new Date().toISOString().slice(0,10)}.pdf`;
        a.click();
      });
  }

  // ── Users & Profile ────────────────────────────────────────
  getProfile(): Observable<ApiResponse<User>> { return this.get('/users/me'); }
  updateProfile(data: any): Observable<ApiResponse<User>> { return this.put('/users/me', data); }
  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse<any>> {
    return this.post('/users/me/password', { currentPassword, newPassword });
  }
  getUsers(params?: any): Observable<ApiResponse<User[]>> { return this.get('/users', params); }
  getUser(id: number): Observable<ApiResponse<User>> { return this.get(`/users/${id}`); }
  createUser(data: any): Observable<ApiResponse<User>> { return this.post('/users', data); }
  updateUser(id: number, data: any): Observable<ApiResponse<User>> { return this.put(`/users/${id}`, data); }
  toggleUserActive(id: number): Observable<ApiResponse<any>> { return this.patch(`/users/${id}/toggle`, {}); }
  deleteUser(id: number): Observable<ApiResponse<any>> { return this.delete(`/users/${id}`); }
  getSystemStats(): Observable<ApiResponse<any>> { return this.get('/users/system/stats'); }
  getMyEnrollments(): Observable<ApiResponse<ClassSection[]>> { return this.get('/users/me/enrollments'); }
  deleteCourse(id: number): Observable<ApiResponse<any>> { return this.delete(`/courses/${id}`); }
  restoreCourse(id: number): Observable<ApiResponse<any>> { return this.patch(`/courses/${id}/restore`, {}); }
  hardDeleteCourse(id: number): Observable<ApiResponse<any>> { return this.delete(`/courses/${id}/permanent`); }
  deleteSection(id: number): Observable<ApiResponse<any>> { return this.delete(`/sections/${id}`); }
  restoreSection(id: number): Observable<ApiResponse<any>> { return this.patch(`/sections/${id}/restore`, {}); }
  hardDeleteSection(id: number): Observable<ApiResponse<any>> { return this.delete(`/sections/${id}/permanent`); }
  deleteSession(id: number): Observable<ApiResponse<any>> { return this.delete(`/sessions/${id}`); }
  getMyAnnouncements(): Observable<ApiResponse<any[]>> { 
    return this.get('/sections/my/announcements', { _cb: Date.now() }); 
  }
  getInstructorAnnouncements(): Observable<ApiResponse<any[]>> {
    return this.get('/sections/instructor/announcements', { _cb: Date.now() });
  }


  // ── Admin Exclusive ────────────────────────────────────────
  getAtRiskStudents(): Observable<ApiResponse<any[]>> { return this.get('/admin/stats/at-risk'); }
  sendGlobalBroadcast(title: string, content: string, targetRole: string = 'all'): Observable<ApiResponse<any>> {
    return this.post('/admin/broadcast', { title, content, targetRole });
  }
  getStudentAttendanceHistoryByAdmin(studentId: number): Observable<ApiResponse<any[]>> {
    return this.get(`/admin/student/${studentId}/attendance`);
  }
}
