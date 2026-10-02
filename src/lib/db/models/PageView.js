import mongoose from 'mongoose';

const PageViewSchema = new mongoose.Schema(
  {
  
    visitorId: { type: String, required: true },
    path: { type: String, required: true },
    userAgent: { type: String },
    device: { type: String },
    referrer: { type: String },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false }
);


export default mongoose.models.PageView || mongoose.model('PageView', PageViewSchema);
