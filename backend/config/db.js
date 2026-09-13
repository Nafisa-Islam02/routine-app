const mongoose = require('mongoose');
const dns = require('dns');

// Some networks/hosts block or mis-resolve the DNS SRV/TXT lookups that
// `mongodb+srv://` URIs need. Pointing at a public resolver fixes that on
// networks that support it — but on hosts that block raw DNS queries to
// 8.8.8.8 (many PaaS sandboxes do), forcing this actually breaks resolution
// that would otherwise have worked fine. So: try it, but never let it crash
// startup, and let it be disabled via an env var if it turns out to be the
// culprit (set DISABLE_CUSTOM_DNS=true).
if (process.env.DISABLE_CUSTOM_DNS !== 'true') {
  try {
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (err) {
    console.warn('Could not apply custom DNS settings, continuing with system defaults:', err.message);
  }
}

const RETRY_DELAY_MS = 5000;

// Connects to MongoDB and keeps retrying in the background on failure,
// instead of killing the whole process with process.exit(1). A dead DB
// connection should mean "API calls that need the DB fail with a clear
// JSON error" — not "the entire server stops responding to everything,
// including totally unrelated requests, until someone manually restarts it."
// This is almost certainly why "Generate Routine" (and everything else)
// was failing with a generic "Something went wrong" — if the initial
// connection attempt failed for any reason, the whole process used to exit,
// so the frontend's request never reached a server at all -> axios reports
// a network error -> the UI shows its generic fallback message.
async function connectDB() {
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Will keep retrying in the background.');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected.');
  });

  async function attempt() {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
      console.error(`Retrying in ${RETRY_DELAY_MS / 1000}s... (server stays up in the meantime)`);
      setTimeout(attempt, RETRY_DELAY_MS);
    }
  }

  await attempt();
}

module.exports = connectDB;
