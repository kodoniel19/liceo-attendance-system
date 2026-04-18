require('dotenv').config({ path: './.env' });
const emailService = require('./src/utils/email');

(async () => {
    try {
        console.log('Testing email dispatch...');
        await emailService.sendAnnouncementNotification(
            ['deko74415@liceo.edu.ph'], 
            'Test Announcement', 
            'This is a local test to verify delivery.', 
            'System Debug'
        );
        console.log('Done!');
    } catch (err) {
        console.error('Test Failed:', err);
    }
})();
