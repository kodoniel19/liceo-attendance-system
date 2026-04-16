const bcrypt = require('bcryptjs');

const password = 'Admin@2024';
const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(password, salt);

console.log('HASH:', hash);
