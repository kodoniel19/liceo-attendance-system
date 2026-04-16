import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { User, AuthResponse, LoginPayload, RegisterPayload } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ACCESS_TOKEN_KEY  = 'liceo_access_token';
  private readonly REFRESH_TOKEN_KEY = 'liceo_refresh_token';
  private readonly USER_KEY          = 'liceo_user';

  // Reactive state using Angular signals
  private _user = signal<User | null>(this.loadUserFromStorage());
  private _loading = signal(false);

  readonly user     = this._user.asReadonly();
  readonly loading  = this._loading.asReadonly();
  readonly isAuth   = computed(() => !!this._user());
  readonly isStudent    = computed(() => this._user()?.role === 'student');
  readonly isInstructor = computed(() => this._user()?.role === 'instructor');
  readonly isAdmin      = computed(() => this._user()?.role === 'admin');

  constructor(private http: HttpClient, private router: Router) {}

  login(payload: LoginPayload): Observable<AuthResponse> {
    this._loading.set(true);
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap(res => {
        this._loading.set(false);
        this.saveSession(res.data.accessToken, res.data.refreshToken, res.data.user);
      }),
      catchError(err => { this._loading.set(false); return throwError(() => err); })
    );
  }

  googleLogin(token: string): Observable<any> {
    this._loading.set(true);
    return this.http.post<any>(`${environment.apiUrl}/auth/google`, { token }).pipe(
      tap(res => {
        this._loading.set(false);
        if (res.data?.accessToken) {
          this.saveSession(res.data.accessToken, res.data.refreshToken, res.data.user);
        }
      }),
      catchError(err => { this._loading.set(false); return throwError(() => err); })
    );
  }

  register(payload: RegisterPayload): Observable<any> {
    this._loading.set(true);
    return this.http.post<any>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap(() => {
        this._loading.set(false);
      }),
      catchError(err => { this._loading.set(false); return throwError(() => err); })
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap(res => {
        this.saveSession(res.data.accessToken, res.data.refreshToken, res.data.user);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/reset-password`, { token, password });
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private saveSession(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY,  accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
  }

  private loadUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  redirectToDashboard(): void {
    const role = this._user()?.role;
    if (role === 'instructor') this.router.navigate(['/instructor/dashboard']);
    else if (role === 'student') this.router.navigate(['/student/dashboard']);
    else if (role === 'admin') this.router.navigate(['/admin/dashboard']);
    else this.router.navigate(['/login']);
  }
}
