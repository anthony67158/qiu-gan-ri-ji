import mongoose, { Schema } from 'mongoose'

const TagStatSchema = new Schema(
  {
    tag: { type: String, required: true },
    count: { type: Number, required: true },
    ratio: { type: Number, required: true }
  },
  { _id: false }
)

const OpponentSchema = new Schema(
  {
    user_id: { type: String, required: true },
    opponent_name_alias: { type: String, required: true },

    play_style: { type: String, default: null },
    dominant_hand: { type: String, default: null },
    main_weapons: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    clutch_tendency: { type: String, default: null },
    mobility: { type: [String], default: [] },

    total_matches: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    win_rate: { type: Number, default: 0 },

    aggregated_opponent_tags: { type: [TagStatSchema], default: [] },
    tactics_when_win: { type: [TagStatSchema], default: [] },
    patterns_when_lose: { type: [TagStatSchema], default: [] },

    score_patterns: {
      avg_sets_per_match: { type: Number, default: 0 },
      deciding_set_count: { type: Number, default: 0 },
      deciding_set_win_rate: { type: Number, default: 0 },
      collapsed_from_leading_count: { type: Number, default: 0 }
    },

    ai_opponent_advice: { type: String, default: null },
    personal_notes: { type: String, default: null },
    last_match_date: { type: Date, default: null }
  },
  { timestamps: true }
)

OpponentSchema.index({ user_id: 1, opponent_name_alias: 1 }, { unique: true })

export const OpponentProfileModel =
  mongoose.models.OpponentProfile || mongoose.model('OpponentProfile', OpponentSchema)
