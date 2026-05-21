import mongoose, { Schema } from 'mongoose'

const InsightSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    matches_count: { type: Number, default: 0 },
    content: {
      total_summary: { type: String, default: null },
      failure_patterns: { type: [String], default: [] },
      tough_opponent_types: { type: String, default: null },
      strength_patterns: { type: String, default: null },
      training_focus: { type: String, default: null }
    },
    raw_stats: { type: Schema.Types.Mixed, default: null },
    generated_at: { type: Date, default: null }
  },
  { timestamps: true }
)

InsightSchema.index({ user_id: 1, period_start: -1 })

export const InsightReportModel = mongoose.models.InsightReport || mongoose.model('InsightReport', InsightSchema)
