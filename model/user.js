const mongoose = require('mongoose');

const User = mongoose.model('user', {
  username: String,
  password: String,
});

module.exports = User;
