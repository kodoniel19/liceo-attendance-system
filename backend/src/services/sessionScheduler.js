const cron = require('node-cron');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Map getDay() integer to the string formats used in the DB
const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to get PHT (Philippine Time) Date object
function getPHTNow() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
}

// Convert HH:MM:SS to minutes since midnight for easy comparison
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format Date object to MySQL DATETIME literal for PHT
function toMySQLDateTime(dateObj) {
  const YYYY = dateObj.getFullYear();
  const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
  const DD = String(dateObj.getDate()).padStart(2, '0');
  const HH = String(dateObj.getHours()).padStart(2, '0');
  const MI = String(dateObj.getMinutes()).padStart(2, '0');
  const SS = String(dateObj.getSeconds()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${HH}:${MI}:${SS}`;
}

async function checkAndCreateScheduledSessions() {
  try {
    const phtNow = getPHTNow();
    const currentDayStr = DAYS_MAP[phtNow.getDay()];
    const currentMinutes = phtNow.getHours() * 60 + phtNow.getMinutes();
    
    // We want to trigger sessions that start roughly NOW, 
    // or up to 10 minutes ago, in case the cron interval just missed it.
    
    // 1. Fetch all active sections
    const sections = await query(`
      SELECT id, schedule_day, schedule_time_start 
      FROM class_sections 
      WHERE is_active = 1
    `);
    
    // Check start of today in PHT for duplication checks
    const phtStartOfDay = new Date(phtNow);
    phtStartOfDay.setHours(0, 0, 0, 0);
    const sqlphtStartOfDay = toMySQLDateTime(phtStartOfDay);

    for (const section of sections) {
      if (!section.schedule_day || !section.schedule_time_start) continue;

      // Ensure the section is scheduled for TODAY 
      // The DB might store "Monday,Wednesday" or similar formats.
      if (!section.schedule_day.includes(currentDayStr)) continue;

      // Check time bounding
      const startMins = timeToMinutes(section.schedule_time_start);
      const timeDiff = currentMinutes - startMins;

      // If the current time is between 0 to 10 minutes AFTER the scheduled start time
      // we consider it "time to automatically create a session".
      if (timeDiff >= 0 && timeDiff <= 10) {
        
        // 2. Prevent duplicate sessions today for this section
        const existing = await query(`
          SELECT id FROM class_sessions 
          WHERE class_section_id = ? 
            AND start_time >= ?
        `, [section.id, sqlphtStartOfDay]);

        if (existing.length === 0) {
          // 3. Create the automated session
          const exactStartTime = toMySQLDateTime(phtNow); // Setting it to the exact moment it's created
          
          await query(`
            INSERT INTO class_sessions (class_section_id, start_time, status)
            VALUES (?, ?, 'active')
          `, [section.id, exactStartTime]);
          
          logger.info(`Automatically created session for section ${section.id} at ${exactStartTime}`);
        }
      }
    }
  } catch (error) {
    logger.error('Error in automated session scheduling cron:', error);
  }
}

// Schedule the task to run every 5 minutes
const initScheduler = () => {
  logger.info('Initializing Session Auto-Scheduler Cron Job (Every 5 mins)');
  cron.schedule('*/5 * * * *', () => {
    checkAndCreateScheduledSessions();
  });
};

module.exports = { initScheduler };
