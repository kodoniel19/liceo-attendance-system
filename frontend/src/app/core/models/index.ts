// ─── Auth Models ───────────────────────────────────────────────
export interface User {
  id: number;
  universityId: string;
  university_id?: string;
  email: string;
  firstName: string;
  first_name?: string;
  lastName: string;
  last_name?: string;
  middleName?: string;
  role: 'student' | 'instructor' | 'admin';
  department?: string;
  profilePhoto?: string;
  isActive?: boolean;
  is_active?: boolean;
  emailVerified?: boolean;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  universityId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: 'student' | 'instructor';
  department?: string;
}

// ─── Course & Section Models ───────────────────────────────────
export interface Course {
  id: number;
  courseCode: string;
  course_code?: string;
  courseName: string;
  course_name?: string;
  description?: string;
  units: number;
  department?: string;
  isActive?: boolean;
  is_active?: boolean;
  instructorName?: string;
}

export interface ClassSection {
  id: number;
  courseId: number;
  instructorId: number;
  sectionName: string;
  academicYear: string;
  semester: '1st' | '2nd' | 'summer';
  scheduleDay: string;
  scheduleTimeStart: string;
  scheduleTimeEnd: string;
  room?: string;
  maxStudents: number;
  isActive: boolean;
  courseCode?: string;
  courseName?: string;
  instructorFirst?: string;
  instructorLast?: string;
  enrolledCount?: number;
  units?: number;
  enrollmentStatus?: 'pending' | 'active' | 'dropped' | 'incomplete' | 'declined';
}

// ─── Session Models ────────────────────────────────────────────
export type SessionStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export interface ClassSession {
  id: number;
  classSectionId: number;
  sessionDate: string;
  topic?: string;
  notes?: string;
  lateThresholdMinutes: number;
  status: SessionStatus;
  createdBy: number;
  sectionName?: string;
  courseCode?: string;
  courseName?: string;
  instructorFirst?: string;
  instructorLast?: string;
  presentCount?: number;
  enrolledCount?: number;
  // raw MySQL aliases
  session_date?: string;
  class_section_id?: number;
}

// ─── QR Models ────────────────────────────────────────────────
export interface QRSession {
  id: number;
  classSessionId: number;
  qrToken: string;
  qrDataUrl: string;
  expiresAt: string;
  expirationMinutes: number;
  isActive: boolean;
  scanCount: number;
  isExpired?: boolean;
  isValid?: boolean;
}

export interface QRScanPayload {
  token: string;
  sessionId: number;
  expires: string;
  sig: string;
}

export type ScanResultCode = 'RECORDED' | 'QR_INVALID' | 'QR_EXPIRED' | 'ALREADY_RECORDED' | 'NOT_ENROLLED';

export interface ScanResult {
  success: boolean;
  code: ScanResultCode;
  data?: { status: string; scanTime: string; message: string; };
  message?: string;
}

// ─── Attendance Models ─────────────────────────────────────────
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface Attendance {
  id: number;
  studentId: number;
  classSessionId: number;
  qrSessionId?: number;
  status: AttendanceStatus;
  scanTime?: string;
  scan_time?: string;       // raw MySQL alias
  manualOverride: boolean;
  manual_override?: boolean; // raw MySQL alias
  overrideBy?: number;
  overrideReason?: string;
  sessionDate?: string;
  session_date?: string;    // raw MySQL alias
  topic?: string;
  courseCode?: string;
  courseName?: string;
  sectionName?: string;
  universityId?: string;
  university_id?: string;   // raw MySQL alias
  firstName?: string;
  first_name?: string;      // raw MySQL alias
  lastName?: string;
  last_name?: string;       // raw MySQL alias
  email?: string;
}

export interface AttendanceSummary {
  sectionId?: number;
  courseCode?: string;
  courseName?: string;
  sectionName?: string;
  totalSessions?: number;
  presentCount?: number;
  lateCount?: number;
  absentCount?: number;
  excusedCount?: number;
  attendanceRate?: number;
  instructorFirst?: string;
  instructorLast?: string;
  scheduleDay?: string;
  scheduleTimeStart?: string;
  scheduleTimeEnd?: string;
  room?: string;
}

// ─── Report & Dashboard Models ─────────────────────────────────
export interface InstructorDashboard {
  totalSections: number;
  activeSessions: number;
  todayStats: { total: number; present: number; late: number; absent: number; };
}

export interface StudentDashboard {
  enrolledCourses: number;
  attendanceRate: number;
}

// ─── API Response ──────────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  total?: number;
}
