import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  stravaId: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  profile: {
    firstName: String,
    lastName: String,
    avatar: String
  },
  lastSync: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User; 