const argon2 = require("argon2");
const bcrypt = require("bcryptjs");

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 1
};

/**
 * Hashes a plain-text password using Argon2id.
 * If the input is already an Argon2id hash, it returns it directly to avoid double hashing.
 */
async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Invalid password provided for hashing.");
  }
  if (password.startsWith("$argon2id$") || password.startsWith("$argon2i$") || password.startsWith("$argon2d$")) {
    return password;
  }
  return await argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies an entered password against a user's stored hash.
 * Handles backward compatibility:
 * - If stored hash is Argon2 (id/i/d), verifies using argon2.verify.
 * - If stored hash is Bcrypt ($2a$, $2b$, $2y$), verifies using bcrypt.compare.
 *   On successful verification, automatically rehashes password with Argon2id and updates DB.
 * - If stored password is plain text, compares directly and rehashes on match.
 */
async function verifyAndRehashPassword(enteredPassword, userDoc) {
  if (!enteredPassword || !userDoc || !userDoc.password) {
    return false;
  }

  const storedHash = userDoc.password;

  // 1. Argon2 format
  if (storedHash.startsWith("$argon2id$") || storedHash.startsWith("$argon2i$") || storedHash.startsWith("$argon2d$")) {
    try {
      return await argon2.verify(storedHash, enteredPassword);
    } catch (err) {
      console.error("[Argon2 Verification Error]:", err.message);
      return false;
    }
  }

  // 2. Bcrypt format ($2a$, $2b$, $2y$)
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    try {
      const isMatch = await bcrypt.compare(enteredPassword, storedHash);
      if (isMatch) {
        // Upgrade legacy hash to Argon2id automatically
        const newArgon2Hash = await hashPassword(enteredPassword);
        userDoc.password = newArgon2Hash;
        await userDoc.save();
      }
      return isMatch;
    } catch (err) {
      console.error("[Bcrypt Verification Error]:", err.message);
      return false;
    }
  }

  // 3. Plain-text fallback for legacy unhashed entries
  if (enteredPassword === storedHash) {
    try {
      const newArgon2Hash = await hashPassword(enteredPassword);
      userDoc.password = newArgon2Hash;
      await userDoc.save();
      return true;
    } catch (err) {
      console.error("[Plain Text Rehash Error]:", err.message);
      return true;
    }
  }

  return false;
}

module.exports = {
  ARGON2_OPTIONS,
  hashPassword,
  verifyAndRehashPassword
};
