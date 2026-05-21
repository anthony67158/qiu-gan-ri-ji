import mongoose, { Schema } from 'mongoose'

const MyPlayInfoSchema = new Schema(
  {
    play_style: { type: String, default: null },
    main_weapons: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    mobility: { type: [String], default: [] },
    clutch_state: { type: String, default: null },
    updated_at: { type: Date, default: null }
  },
  { _id: false }
)

const PlayInfoSchema = new Schema(
  {
    user_id: { type: String, required: true, unique: true },
    tennis_age: { type: String, default: null },
    my_play_info: { type: MyPlayInfoSchema, default: null }
  },
  { timestamps: true }
)

export const UserPlayInfoModel =
  mongoose.models.UserPlayInfo || mongoose.model('UserPlayInfo', PlayInfoSchema)
