// import mongoose from "mongoose";

imp;
const ipSchema = mongoose.Schema({
  ip: {
    type: String,
    default: "CHAT",
  },

  data: {
    type: Object,
    default: {},
  },

  created_at: {
    type: Date,
    default: Date.now,
  },

  updated_at: {
    type: Date,
    default: Date.now,
  },
});

ipSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

ipSchema.pre("findOneAndUpdate", function (next) {
  this.findOneAndUpdate({}, { $set: { updatedAt: new Date() } });
  next();
});

export default mongoose.model("IP", ipSchema);
