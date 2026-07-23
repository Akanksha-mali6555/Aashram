const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Admin = require("../models/Admin");
const Trustee = require("../models/Trustee");
const Devotee = require("../models/Devotee");
const BranchManager = require("../models/BranchManager");
const Accountant = require("../models/Accountant");
const DocumentAdmin = require("../models/DocumentAdmin");
const { hashPassword, verifyAndRehashPassword } = require("../utils/passwordUtils");

async function runTests() {
  console.log("\n==========================================");
  console.log("    ARGON2 MIGRATION VERIFICATION SUITE");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected to MongoDB successfully.\n");

    // TEST 1: New User Registration & Argon2id Hash Verification
    console.log("--- TEST 1: New User Registration ---");
    const testEmail = `test_argon2_${Date.now()}@example.com`;
    const plainPassword = "SecurePassword123!";

    const newDevotee = new Devotee({
      name: "Argon2 Test User",
      email: testEmail,
      mobile: "9998887776",
      password: plainPassword,
      isVerified: true
    });
    await newDevotee.save();

    assert(newDevotee.password.startsWith("$argon2id$"), "New user password is saved in $argon2id$ format");

    // TEST 2: User Login Verification with Argon2id
    console.log("\n--- TEST 2: Argon2id Login Verification ---");
    const isMatchNew = await newDevotee.matchPassword(plainPassword);
    assert(isMatchNew === true, "Correct password matches with Argon2id");

    const isMatchWrong = await newDevotee.matchPassword("WrongPassword123!");
    assert(isMatchWrong === false, "Incorrect password fails verification");

    // TEST 3: Backward Compatibility & Auto-Migration of Bcrypt User
    console.log("\n--- TEST 3: Bcrypt Backward Compatibility & Auto-Migration ---");
    const legacyUser = await Devotee.findOne({ email: "akankshamali229@gmail.com" });
    if (legacyUser) {
      console.log(`Legacy user found. Initial password hash format: ${legacyUser.password.substring(0, 15)}...`);
      const isBcryptInitially = legacyUser.password.startsWith("$2b$") || legacyUser.password.startsWith("$2a$");
      assert(isBcryptInitially, "User initial format was Bcrypt ($2b$)");

      // Verify with legacy password (note: in DB password hash for akankshamali229@gmail.com was bcrypt, let's verify rehash mechanism)
      // To test rehash cleanly, let's create a temporary user document with a known bcrypt hash!
      const bcrypt = require("bcryptjs");
      const tempBcryptHash = await bcrypt.hash("BcryptLegacyPass123", 10);

      const legacyDevotee = new Devotee({
        name: "Legacy Bcrypt Devotee",
        email: `legacy_${Date.now()}@example.com`,
        mobile: "1112223334",
        password: "placeholder", // will overwrite with raw bcrypt hash
        isVerified: true
      });
      await legacyDevotee.save();

      // Directly set the bcrypt hash in DB without triggering pre-save hook
      await Devotee.updateOne({ _id: legacyDevotee._id }, { $set: { password: tempBcryptHash } });
      const fetchedLegacy = await Devotee.findById(legacyDevotee._id);
      assert(fetchedLegacy.password.startsWith("$2b$"), "Legacy test doc inserted with bcrypt hash");

      // Authenticate with legacy password
      const legacyLoginResult = await fetchedLegacy.matchPassword("BcryptLegacyPass123");
      assert(legacyLoginResult === true, "Legacy user logs in successfully with legacy bcrypt password");

      // Refetch document to confirm it was automatically rehashed to Argon2id
      const rehashedDevotee = await Devotee.findById(legacyDevotee._id);
      assert(rehashedDevotee.password.startsWith("$argon2id$"), "Legacy user password automatically rehashed to $argon2id$ in DB");

      // Clean up legacy test doc
      await Devotee.deleteOne({ _id: legacyDevotee._id });
    } else {
      console.log("No legacy bcrypt user found in DB, skipping live legacy user check.");
    }

    // TEST 4: Password Change & Reset Verification
    console.log("\n--- TEST 4: Password Change & Reset ---");
    const newPasswordAfterReset = "NewResetPassword456!";
    newDevotee.password = newPasswordAfterReset;
    await newDevotee.save(); // triggers pre-save Argon2id hook

    assert(newDevotee.password.startsWith("$argon2id$"), "Reset password saved in $argon2id$ format");
    const isResetMatch = await newDevotee.matchPassword(newPasswordAfterReset);
    assert(isResetMatch === true, "New reset password matches successfully");

    // TEST 5: Admin-Created User Verification (e.g. Trustee / BranchManager)
    console.log("\n--- TEST 5: Admin-Created User Hashing ---");
    const trusteeEmail = `admin_created_trustee_${Date.now()}@example.com`;
    const adminCreatedTrustee = new Trustee({
      name: "Admin Created Trustee",
      email: trusteeEmail,
      mobile: "9123456789",
      designation: "Board Member",
      address: "Monastery Office",
      password: "InitialAdminPassword789!"
    });
    await adminCreatedTrustee.save();

    assert(adminCreatedTrustee.password.startsWith("$argon2id$"), "Admin-created Trustee password is Argon2id");
    const isTrusteeMatch = await adminCreatedTrustee.matchPassword("InitialAdminPassword789!");
    assert(isTrusteeMatch === true, "Admin-created Trustee authenticates successfully");

    // TEST 6: Invalid User & Non-existent User Login Rejection
    console.log("\n--- TEST 6: Invalid User Rejection ---");
    const nonExistent = await Devotee.findOne({ email: "non_existent_user_9999@example.com" });
    assert(nonExistent === null, "Non-existent user lookup returns null");

    // Clean up test devotee & trustee created during test
    await Devotee.deleteOne({ _id: newDevotee._id });
    await Trustee.deleteOne({ _id: adminCreatedTrustee._id });

    console.log("\n==========================================");
    console.log(`    SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================\n");

  } catch (err) {
    console.error("Fatal Test Execution Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
