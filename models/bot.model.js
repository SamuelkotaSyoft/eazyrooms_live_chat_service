import mongoose from "mongoose";
const botSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    channel: {
      type: String,
      default: "",
    },

    restart_cmd: {
      type: String,
      default: "MENU",
    },
    end_cmd: {
      type: String,
      default: "END",
    },

    api_key: {
      type: String,
      default: "",
    },
    key_type: {
      type: String,
      default: "",
    },

    info: {
      type: Object,
      default: {},
    },

    styles: {
      type: Object,
      default: {},
    },

    org: {
      type: String,
      required: true,
    },

    status: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
    },

    is_template: {
      type: Boolean,
      default: false,
    },

    created_at: {
      type: Date,
      default: Date.now,
    },

    updated_at: {
      type: Date,
      default: Date.now,
    },

    created_by: {
      type: String,
      default: "",
    },
    updated_by: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Bot", botSchema);
