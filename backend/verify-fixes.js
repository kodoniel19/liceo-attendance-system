const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: 'localhost', port: 3000, path: `/api/v1${path}`,
      method, headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(raw) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  // 1. Login as admin
  const login = await request('POST', '/auth/login', { email: 'admin@liceo.edu.ph', password: 'Admin@2024' });
  const token = login.data.data?.accessToken;
  console.log('✅ Admin login:', login.status === 200 ? 'OK' : 'FAIL');

  // 2. Create user
  const create = await request('POST', '/users', {
    universityId: 'TEST-VFY-001', email: 'verify_test@liceo.edu.ph',
    password: 'Admin@2024', firstName: 'Verify', lastName: 'Test', role: 'student'
  }, token);
  console.log('✅ Create user:', create.status, create.data.message || create.data.success);
  const userId = create.data.data?.id;

  // 3. Toggle active
  if (userId) {
    const tog = await request('PATCH', `/users/${userId}/toggle`, {}, token);
    console.log('✅ Toggle active:', tog.status, tog.data.message);
    const tog2 = await request('PATCH', `/users/${userId}/toggle`, {}, token);
    console.log('✅ Toggle back:', tog2.status, tog2.data.message);
  }

  // 4. Forgot password
  const fp = await request('POST', '/auth/forgot-password', { email: 'instructor@liceo.edu.ph' });
  console.log('✅ Forgot password:', fp.status, fp.data.message);

  // 5. Create section (with multi-day)
  const loginInstr = await request('POST', '/auth/login', { email: 'instructor@liceo.edu.ph', password: 'Admin@2024' });
  const instrToken = loginInstr.data.data?.accessToken;
  const sec = await request('POST', '/sections', {
    courseId: 1, sectionName: 'BSIT-3A',
    academicYear: '2024-2025', semester: '1st',
    scheduleDay: 'Monday, Wednesday, Friday',
    scheduleTimeStart: '08:00:00', scheduleTimeEnd: '09:00:00',
    room: 'Room 201', maxStudents: 40
  }, instrToken);
  console.log('✅ Create section (multi-day):', sec.status, sec.data.message || sec.data.success);

  console.log('\n✅ All tests done!');
}

run().catch(console.error);
