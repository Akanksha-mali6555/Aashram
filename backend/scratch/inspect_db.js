const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

async function checkDbHashes() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const collectionNames = ["admins", "trustees", "branchmanagers", "devotees", "accountants", "documentadmins"];

    console.log("=== DB Password Hash Inspection ===");
    for (const name of collectionNames) {
      try {
        const docs = await db.collection(name).find({}, { projection: { password: 1, email: 1 } }).toArray();
        console.log(`\nCollection: ${name} (Count: ${docs.length})`);
        docs.forEach(d => {
          const p = d.password || "";
          let format = "none/missing";
          if (p.startsWith("$2a$") || p.startsWith("$2b$") || p.startsWith("$2y$")) {
            format = "bcrypt";
          } else if (p.startsWith("$argon2id$") || p.startsWith("$argon2i$") || p.startsWith("$argon2d$")) {
            format = "argon2";
          } else if (p.length > 0) {
            format = "plain_text_or_unknown";
          }
          console.log(`  - ID: ${d._id}, Email: ${d.email || 'N/A'}, Format: ${format}, Sample Prefix: ${p.substring(0, 15)}...`);
        });
      } catch (err) {
        console.log(`  - Error reading collection ${name}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("DB Connection error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDbHashes();
