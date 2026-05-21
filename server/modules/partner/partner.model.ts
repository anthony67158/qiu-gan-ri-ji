import mongoose, { Schema } from 'mongoose'

const PartnerSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    nickname: { type: String, required: true },
    play_style: { type: String, default: null },
    main_weapons: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    court_preference: { type: String, enum: ['ad_court', 'deuce_court', 'flexible', null], default: null },
    physical_state: { type: String, default: null },
    last_match_date: { type: Date, default: null }
  },
  { timestamps: true }
)

PartnerSchema.index({ user_id: 1, nickname: 1 }, { unique: true })

export const PartnerProfileModel = mongoose.models.PartnerProfile || mongoose.model('PartnerProfile', PartnerSchema)

