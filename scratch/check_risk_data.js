require('dotenv').config({ path: './backend/.env' });
const { query } = require('./backend/src/config/database');

async function checkRiskData() {
    try {
        console.log("Checking Sessions...");
        const sess = await query("SELECT count(*) as count FROM class_sessions WHERE status = 'ended'");
        console.log("Ended Sessions:", sess[0].count);

        console.log("Checking Students...");
        const stu = await query("SELECT count(*) as count FROM users WHERE role = 'student'");
        console.log("Total Students:", stu[0].count);

        console.log("Checking Attendance...");
        const att = await query("SELECT count(*) as count FROM attendance");
        console.log("Total Attendance Records:", att[0].count);

        console.log("\nCalculating Rates...");
        const result = await query(`
            SELECT 
                u.id, 
                u.first_name, 
                u.last_name,
                cl.id as section_id,
                (
                    SELECT COUNT(*) 
                    FROM class_sessions sess 
                    WHERE sess.class_section_id = cl.id AND sess.status = 'ended'
                ) as total_sessions,
                (
                    SELECT COUNT(*) 
                    FROM attendance a
                    JOIN class_sessions sess ON a.class_session_id = sess.id
                    WHERE sess.class_section_id = cl.id AND sess.status = 'ended' AND a.student_id = u.id AND a.status IN ('present', 'late')
                ) as attended
            FROM users u
            JOIN enrollments e ON u.id = e.student_id AND e.status = 'active'
            JOIN class_sections cl ON e.class_section_id = cl.id
            WHERE u.role = 'student'
        `);

        result.forEach(r => {
            const rate = r.total_sessions > 0 ? (r.attended / r.total_sessions) * 100 : 100;
            console.log(`- ${r.first_name} ${r.last_name}: ${attended}/${total_sessions} (${rate.toFixed(1)}%)`);
        });

    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        process.exit();
    }
}

checkRiskData();
