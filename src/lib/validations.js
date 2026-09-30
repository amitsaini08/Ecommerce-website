import { z } from 'zod';

// --- Base Rules ---
export const passwordRules = z.string()
  .min(8, 'Must be at least 8 characters')
  .refine((val) => /[A-Z]/.test(val), { message: 'Must contain at least one uppercase letter' })
  .refine((val) => /[a-z]/.test(val), { message: 'Must contain at least one lowercase letter' })
  .refine((val) => /[0-9]/.test(val), { message: 'Must contain at least one number' })
  .refine((val) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val), { message: 'Must contain at least one special character' });

export const emailRule = z.string()
  .trim()
  .min(1, 'Email address is required')
  .email('Must be a valid email address (e.g. name@example.com)');

export const pincodeRule = z.string()
  .trim()
  .min(1, 'Pincode is required')
  .regex(/^\d+$/, 'Only numbers are allowed')
  .length(6, 'Pincode must be exactly 6 digits');

export const phoneRule = z.string()
  .trim()
  .regex(/^\d+$/, 'Only numbers are allowed')
  .length(10, 'Phone number must be exactly 10 digits');

// --- Auth Validations ---
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordRules,
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'New password must NOT be the same as Current Password',
  path: ['newPassword'],
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  email: emailRule,
  password: passwordRules,
  phone: phoneRule.optional().nullable().or(z.literal('')),
});

export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, 'Password is required'),
});


export const forgotPasswordSchema = z.object({
  email: emailRule,
});


// --- Profile & Address ---
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  phone: phoneRule.optional().nullable().or(z.literal('')),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export const addressSchema = z.object({
  label: z.string().trim().max(100).optional().nullable(),
  line1: z.string().trim().min(1, 'Address line 1 is required'),
  line2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: pincodeRule,
  phone: phoneRule.optional().nullable().or(z.literal('')),
});

// --- Products & Categories ---
export const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(500),
  slug: z.string().trim().min(1, 'Slug is required').max(500),
  description: z.string().trim().optional().nullable(),
  price: z.number().positive('Price must be greater than 0'),
  discountPrice: z.number().positive('Discount price must be greater than 0').optional().nullable(),
  categoryId: z.string().optional().nullable(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  images: z.array(z.string().url()).default([]),
  isActive: z.boolean().default(true),
  codAvailable: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(255),
  slug: z.string().trim().min(1, 'Slug is required').max(255),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  parentId: z.string().optional().nullable(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').max(50),
  type: z.enum(['flat', 'percent']),
  value: z.number().positive('Value must be greater than 0'),
  minOrderAmount: z.number().min(0).default(0),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// --- Reviews ---
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().or(z.literal('')).nullable(),
  mediaUrls: z.array(z.string()).max(4).optional(),
});

// --- Orders & Checkout ---
export const orderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Cart cannot be empty'),
  addressId: z.string().min(1, 'Please select or add a delivery address'),
  paymentMethod: z.enum(['razorpay', 'cod']).default('razorpay'),
  couponCode: z.string().trim().max(50).optional().nullable(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Please provide a reason for cancellation (at least 3 characters)').max(1000),
});

export const returnOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Please provide a reason for return (at least 3 characters)').max(1000),
});

export const adminOrderActionSchema = z.object({
  action: z.enum(['approve_cancel', 'reject_cancel', 'approve_return', 'reject_return', 'update_status', 'update_payment_status']),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  reason: z.string().optional(),
});

// --- Store Settings & Contact ---
export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(1, 'Store name is required').max(255).default('NovaHub'),
  contactEmail: emailRule.optional().nullable().or(z.literal('')),
  contactPhone: phoneRule.optional().nullable().or(z.literal('')),
  codEnabled: z.boolean().default(true),
  shippingFee: z.number().min(0).default(0),
  minFreeShipping: z.number().min(0).default(50),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  email: emailRule,
  subject: z.string().trim().min(2, 'Subject must be at least 2 characters').max(255),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(5000),
});
