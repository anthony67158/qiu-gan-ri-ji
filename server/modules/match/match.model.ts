import mongoose, { Schema } from 'mongoose'

const SetScoreSchema = new Schema(
  {
    set_number: { type: Number, required: true },
    score_self: { type: Number, required: true },
    score_opponent: { type: Number, required: true }
  },
  { _id: false }
)

const MatchSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    opponent_id: { type: Schema.Types.ObjectId, ref: 'OpponentProfile', default: null },
    opponent_name_alias: { type: String, default: null },

    match_result: { type: String, enum: ['WIN', 'LOSE', 'DRAW', 'PRACTICE'], required: true },
    match_type: { type: String, enum: ['SINGLE', 'DOUBLE', 'PRACTICE', 'singles', 'doubles'], default: 'singles' },

    score: {
      sets: { type: [SetScoreSchema], default: [] },
      total_self: { type: Number, default: 0 },
      total_opponent: { type: Number, default: 0 }
    },
    score_analysis: { type: Schema.Types.Mixed, default: null },

    most_painful_point: { type: String, default: null },
    painful_scene_tag: { type: String, default: null },
    voice_input_url: { type: String, default: null },

    // 旧字段，向后兼容保留，新功能使用下面的结构化字段
    opponent_tags: { type: [String], default: [] },
    self_state_tags: { type: [String], default: [] },
    tactics_used_tags: { type: [String], default: [] },

    // 新结构化字段 v3.1
    opponent_info: {
      id: { type: Schema.Types.ObjectId, ref: 'OpponentProfile', default: null },
      name: { type: String, default: null },
      play_style: { type: String, default: null },
      dominant_hand: { type: String, default: null },
      main_weapons: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      clutch_tendency: { type: String, default: null },
      mobility: { type: [String], default: [] }
    },

    opponent_ids: { type: [Schema.Types.ObjectId], ref: 'OpponentProfile', default: [] },
    opponent_snapshots: {
      type: [
        {
          id: { type: Schema.Types.ObjectId, ref: 'OpponentProfile', default: null },
          name: { type: String, default: null },
          play_style: { type: String, default: null },
          dominant_hand: { type: String, default: null },
          main_weapons: { type: [String], default: [] },
          weaknesses: { type: [String], default: [] },
          clutch_tendency: { type: String, default: null },
          mobility: { type: [String], default: [] }
        }
      ],
      default: []
    },

    my_info: {
      play_style: { type: String, default: null },
      main_weapons: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      mobility: { type: [String], default: [] },
      clutch_state: { type: String, default: null },
      physical_state: { type: String, default: null }
    },

    post_match_summary: {
      scoring_methods: { type: [String], default: [] },
      losing_reasons: { type: [String], default: [] },
      key_point_error_reasons: { type: [String], default: [] },
      one_line_summary: { type: String, default: null },
      coordination_issues: { type: [String], default: [] }
    },

    match_conditions: {
      surface: { type: String, default: null },
      weather: { type: String, default: null },
      physical_state: { type: String, default: null }
    },

    doubles_data: {
      partner_id: { type: Schema.Types.ObjectId, ref: 'DoublesPartnerProfile', default: null },
      partner_name_alias: { type: String, default: null },
      partner_position: { type: String, enum: ['ad_side', 'deuce_side', null], default: null },
      doubles_tactics_tags: { type: [String], default: [] }
    },

    partner_snapshot: {
      id: { type: Schema.Types.ObjectId, ref: 'PartnerProfile', default: null },
      nickname: { type: String, default: null },
      play_style: { type: String, default: null },
      main_weapons: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      court_preference: { type: String, enum: ['ad_court', 'deuce_court', 'flexible', null], default: null },
      physical_state: { type: String, default: null }
    },

    my_court_preference: { type: String, enum: ['ad_court', 'deuce_court', 'flexible', null], default: null },

    // 练习模式专属字段
    practice_info: {
      duration: { type: String, default: null },
      practice_type: { type: String, default: null },
      focus_areas: { type: [String], default: [] },
      practice_partner_id: { type: Schema.Types.ObjectId, ref: 'PartnerProfile', default: null },
      practice_partner_nickname: { type: String, default: null },
      date_time: { type: Date, default: null }
    },
    practice_summary: {
      gains: { type: [String], default: [] },
      unresolved: { type: [String], default: [] },
      one_line_note: { type: String, default: null }
    },

    ai_clarification: {
      question: { type: String, default: null },
      options: { type: [String], default: [] },
      selected_option: { type: String, default: null },
      skipped: { type: Boolean, default: false }
    },

    ai_feedback: {
      key_problem: { type: String, default: null },
      next_tactic: { type: String, default: null },
      training_suggestion: { type: String, default: null },
      condition_tip: { type: String, default: null },
      knowledge_used: {
        opponent_type_id: { type: String, default: null },
        failure_pattern_id: { type: String, default: null },
        drill_id: { type: String, default: null },
        condition_pattern_id: { type: String, default: null }
      },
      is_helpful: { type: Boolean, default: null },
      generated_at: { type: Date, default: null }
    },

    ai_analysis: {
      version: { type: String, default: null },
      match_analysis: { type: Schema.Types.Mixed, default: null },
      trend_analysis: { type: Schema.Types.Mixed, default: null },
      pre_match_intel: { type: Schema.Types.Mixed, default: null },
      generated_at: { type: Date, default: null },
      model_used: { type: String, default: null },
      prompt_tokens: { type: Number, default: null },
      completion_tokens: { type: Number, default: null }
    },

    share_image_url: { type: String, default: null },

    date_time: { type: Date, default: Date.now, index: true },
    location: { type: String, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

MatchSchema.index({ user_id: 1, date_time: -1 })

export const MatchModel = mongoose.models.Match || mongoose.model('Match', MatchSchema)
