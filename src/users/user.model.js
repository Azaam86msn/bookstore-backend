// Updated Admin model schema with improved security practices
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return typeof v === "string" && v.length > 0;
        },
        message: "Username must be a non-empty string",
      },
    },
    password: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          // Enforce a strong password policy
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{12,}$/.test(
            v
          );
        },
        message:
          "Password must be at least 12 characters long and include uppercase, lowercase, number, and special character",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 12); // Use higher salt rounds
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
