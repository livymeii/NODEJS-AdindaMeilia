const mongoose = require('mongoose');

const User = mongoose.model('user', {
  username: String,
  password: String,
});

async function createDefaultAdmin() {
    const admin = await User.findOne({ username: 'admin' });

    if (!admin) {
        await User.create({
            username: 'admin',
            password: 'admin',
        });
        console.log('Admin default dibuat');
    } else {
        console.log('Admin sudah ada');
    }
}
 
createDefaultAdmin();

module.exports = User;
