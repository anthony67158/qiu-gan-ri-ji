import mongoose, { Schema } from 'mongoose'

const SubscriptionSchema = new Schema(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    plan: { type: String, enum: ['FREE', 'MONTHLY', 'YEARLY'], default: 'FREE' },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'TRIAL'], default: 'TRIAL' },
    updated_at: { type: Date, default: Date.now }
  },
  { timestamps: false }
)

export const SubscriptionModel =
  mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema)
