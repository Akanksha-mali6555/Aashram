const mongoose = require("mongoose");
const { hashPassword, verifyAndRehashPassword } = require("../utils/passwordUtils");

const branchManagerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  managerId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  address: { type: String },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  password: { type: String, required: true },
  role: { type: String, default: "BranchManager" },
  profilePhoto: { type: String, default: "" }
}, { timestamps: true });

branchManagerSchema.pre("save", async function() {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await hashPassword(this.password);
});

branchManagerSchema.methods.matchPassword = async function(enteredPassword) {
  return await verifyAndRehashPassword(enteredPassword, this);
};

module.exports = mongoose.model("BranchManager", branchManagerSchema);
