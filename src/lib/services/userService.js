import bcrypt from 'bcryptjs';
import { User } from '@/lib/db/models';
import { AppError } from '@/app/api/routeHandler';

export const userService = {
  
  async getProfile(user) {
    const { passwordHash, ...safeUser } = user;
    return {
      user: safeUser,
      addresses: user.addresses || [],
    };
  },


  async updateProfile({ userId, data }) {
    const { name, phone, avatarUrl } = data;
    const dbUser = await User.findById(userId);
    if (!dbUser) throw new AppError('User not found', 404);

    dbUser.name = name;
    dbUser.phone = phone || null;
    if (avatarUrl !== undefined) dbUser.avatarUrl = avatarUrl || null;

    await dbUser.save();

    return {
      user: {
        _id: String(dbUser._id),
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: dbUser.role,
        avatarUrl: dbUser.avatarUrl,
      },
      message: 'Profile updated successfully!',
    };
  },


  async getUserAddresses(userId) {
    const dbUser = await User.findById(userId).lean();
    const list = dbUser?.addresses || [];
    return { addresses: list };
  },


  async addAddress({ userId, data }) {
    const { label, line1, line2, city, state, pincode, phone } = data;
    const dbUser = await User.findById(userId);

    if (!dbUser) {
      throw new AppError('User not found', 404);
    }

    const newAddress = {
      label: label || null,
      line1,
      line2: line2 || null,
      city,
      state,
      pincode,
      phone: phone || null,
      createdAt: new Date(),
    };

    dbUser.addresses.push(newAddress);
    await dbUser.save();

    const addedAddress = dbUser.addresses[dbUser.addresses.length - 1];
    return { address: addedAddress };
  },


  async getAdminUsers({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const users = await User.find().select('_id name email role isVerified createdAt').sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    const count = await User.countDocuments();

    return { users, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
  },


  async updateUserRole({ userId, role }) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    user.role = role;
    await user.save();
    return { user };
  },

  
  async changePassword({ userId, data }) {
    const { currentPassword, newPassword } = data || {};

    const dbUser = await User.findById(userId);
    if (!dbUser || !dbUser.passwordHash) {
      throw new AppError('Enter your Current password', 400, 'currentPassword');
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400, 'currentPassword');
    }

    dbUser.passwordHash = await bcrypt.hash(newPassword, 10);
    await dbUser.save();

    return { message: 'Password updated successfully' };
  },
};
