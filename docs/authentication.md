# Authentication

Android is Gonezo's current production authentication runtime. Credentials and session state are encrypted with an Android Keystore key, and device authentication uses the Android system prompt.

The web adapter keeps credentials and session state in memory for tests and future runtime development. It is not production authentication and does not persist across reloads. iOS authentication is not implemented.

Authentication gates access to the app UI and restores a local session. It does not encrypt Gonezo's financial database at rest. Database encryption is a separate future security capability.

Failed password attempts are delayed in the current application session with a capped, increasing wait. This is local friction against repeated guessing, not a distributed rate limiter or a permanent account lock.
