import mongoose, { Schema } from 'mongoose'

const TrendSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    trend_type: { type: String, required: true },
    detail: { type: String, required: true },
    frequency: { type: Number, required: true },
    suggestion: { type: String, default: null },
    first_detected_at: { type: Date, required: true }
  },
  { timestamps: true }
)

TrendSchema.index({ user_id: 1, createdAt: -1 })

export const WeaknessTrendModel = mongoose.models.WeaknessTrend || mongoose.model('WeaknessTrend', TrendSchema)
