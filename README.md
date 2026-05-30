# Vela 🌟

A calendar app built for real life. Events, Tasks, and Anchors — with ADHD-friendly reminders and a Quick Add natural language input.

---

## Prerequisites

Make sure these are installed and configured on your machine before starting:

- **Node.js** and **npm**
- **Android Studio** with Android SDK installed
- **Java 17** (`openjdk-17-jdk`)
- **EAS CLI** (`npm install -g eas-cli`)

Environment variables in `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
```

After editing `.zshrc` run `source ~/.zshrc` to apply.

---

## The Three Ways to Run Vela

Understanding which mode to use is the most important thing to know about this project.

```
Expo Go + QR code       ← DO NOT USE. Notifications broken, limited features.

npx expo run:android    ← Daily development at your desk (USB cable)
                           Hot reload for JS changes
                           Full native features

eas build (preview)     ← Real-world testing away from desk
                           Proper notifications and battery behavior
                           Shareable APK download link

eas build (production)  ← Play Store / personal permanent install
                           + eas update for fast iterative JS-only updates
```

### The Simple Decision Rule

```
Am I at my desk coding?
  → npx expo run:android (USB)

Do I want to walk around and test?
  → eas build --profile preview (APK)

Is Vela stable enough to use as my real calendar?
  → Play Store internal testing (see Publishing section)
  → then eas update for fast iterations
```

---

## Option 1 — Daily Development via USB (Hot Reload)

Use this for day-to-day development. Changes to TypeScript/JavaScript hot reload instantly to your phone.

### First time setup

1. **Enable Developer Mode on your Android phone**
   - Settings → About Phone → tap Build Number 7 times
   - Settings → Developer Options → USB Debugging → ON

2. **Connect your phone via USB data cable**
   (must be a data cable, not a charge-only cable)

3. **Verify your phone is detected**
   ```bash
   adb devices
   ```
   Should show your device as `device` not `unauthorized`.
   If it shows `unauthorized`, unplug and replug — accept the Allow USB Debugging popup on your phone.

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Build and install to phone** (first time or after native changes)
   ```bash
   cd ~/code/vela
   npx expo run:android
   ```
   Takes 3-5 minutes first time. Installs Vela directly to your phone.

### Coming back after a break

The app is already installed — just start the JS bundler:

```bash
cd ~/code/vela
npx expo start --dev-client
```

Hot reload works immediately. No rebuild needed.

### When you need a full rebuild (npx expo run:android again)

- Changed `app.json`
- Added a new native library
- Uninstalled the app from your phone
- Build errors that a reload didn't fix

### Useful terminal shortcuts

| Key | Action |
|-----|--------|
| `r` | Force reload the app |
| `j` | Open JavaScript debugger (console logs) |
| `m` | Toggle developer menu on phone |
| `a` | Reinstall APK to connected Android device |

---

## Option 2 — Preview Cloud Build (Real-World Testing)

Use this to test away from your desk, or to test things that behave differently in production (notifications, battery optimization, splash screen).

```bash
eas build --platform android --profile preview
```

- Takes 5-10 minutes, builds in Expo's cloud
- Produces a downloadable APK
- EAS gives you a QR code and download link when done

### Install on your phone

1. Open the download link on your Android phone
   (or go to [expo.dev](https://expo.dev) → your project → Builds)
2. Tap the APK to install
3. Allow "Install from unknown sources" if prompted

### Important: switching between USB debug and EAS builds

If you get `INSTALL_FAILED_UPDATE_INCOMPATIBLE` when installing:
- The signing keys are different between USB debug builds and EAS builds
- Uninstall Vela from your phone first, then install the new APK
- Your SQLite data will be lost — use the dev reset button first to clear it cleanly

---

## Option 3 — Play Store Internal Testing (Personal Beta)

Use this when Vela is stable enough to be your actual daily calendar. This is the closest to what real users experience.

### One-time setup (~1 hour)

**Step 1 — Create a Google Play Developer account**
- Go to [play.google.com/console](https://play.google.com/console)
- One-time $25 fee
- Takes up to 48 hours for Google to verify

**Step 2 — Create the app in Play Console**
- New app → Android → Vela
- Fill in basic store listing details

**Step 3 — Set up production credentials via EAS**
```bash
eas credentials
```
Select Android → production → let EAS generate and manage the keystore.
EAS stores it securely — you don't need to manage keystore files yourself.

**Step 4 — Build a production AAB**
```bash
eas build --platform android --profile production
```
Produces an `.aab` file (Play Store format, not APK).

**Step 5 — Upload to Play Console**
- Play Console → your app → Testing → Internal testing
- Create a new release → upload the AAB
- Add yourself as a tester (your Gmail address)
- Roll out

**Step 6 — Install on your phone**
Google sends you an opt-in link. Tap it, install from the Play Store normally.

### Updating after initial Play Store setup

This is where it gets fast. Two paths depending on what changed:

**JavaScript/TypeScript changes only (most daily work):**
```bash
eas update --branch production --message "what you fixed"
```
- Takes ~2 minutes
- Your installed app checks for updates on launch and applies automatically
- No reinstalling, no Play Console upload needed
- This is called an OTA (over the air) update

**Native changes (app.json changed, new library added):**
```bash
eas build --platform android --profile production
```
Then upload the new AAB to Play Console → Internal testing → new release.
Goes live immediately (no Google review needed for internal testing).

---

## Build Profiles Summary

Defined in `eas.json`:

| Profile | Command | Output | Use for |
|---------|---------|--------|---------|
| `preview` | `eas build --platform android --profile preview` | APK | Real-world testing, shareable |
| `production` | `eas build --platform android --profile production` | AAB | Play Store internal testing |

Make sure `eas.json` has both profiles:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## The Full Development Lifecycle

```
1. CODE at desk
   npx expo run:android
   JavaScript changes hot reload instantly to phone via USB

2. NATIVE CHANGE (app.json, new library)
   Stop Metro, run npx expo run:android again
   Takes 3-5 min, then back to hot reload

3. REAL-WORLD TEST
   eas build --platform android --profile preview
   Download APK, install on phone, walk around and test
   Good for: notifications, battery behavior, performance

4. STABLE ENOUGH TO USE DAILY
   eas build --platform android --profile production
   Upload to Play Store internal testing
   Install from Play Store — feels like a real app

5. ITERATE on stable version
   eas update --branch production --message "fix"
   2 minutes, app updates on next launch
   Only need a full build when native code changes
```

---

## Why Notifications Behave Differently in Each Mode

This caused confusion during development — worth noting explicitly.

| Mode | Notification Timing | Why |
|------|--------------------|----|
| USB debug build | 30-60 second delays | Android Doze mode treats debug apps differently |
| EAS preview APK | Much better, occasional delays | Close to production but not quite |
| Play Store build | Accurate, immediate | Proper production app treatment by Android |

**Always test notifications using an EAS build, not a USB debug build.**

If notifications are delayed even in production:
- Settings → Apps → Vela → Battery → Unrestricted

---

## Dev Tools

### Reset all app data (debug builds only)

A "Reset onboarding (dev only)" button is in the hamburger drawer → Settings gear → bottom of screen. Only visible in `__DEV__` mode. Clears all SQLite entries, alarms, and AsyncStorage then reloads.

### View console logs from any build

```bash
adb logcat | grep -E 'Vela|ReactNative'
```

Stream logs from your phone to terminal in real time.

### View console logs while developing

Press `j` in the Metro terminal to open the JavaScript debugger in your browser.

---

## Project Structure

```
app/                    Expo Router screens
  index.tsx             Home screen (calendar, all navigation)
  alarm-screen.tsx      Full screen notification/alarm display
  events.tsx            Events list screen
  tasks.tsx             Tasks list screen
  anchors.tsx           Anchors list screen
  alarms.tsx            Alarms management screen
  settings.tsx          User settings (appearance, anchors)
  onboarding.tsx        First launch screen

components/             Reusable UI components
  add-event-modal.tsx   Full add/edit entry form
  QuickAddBar.tsx       Natural language quick input bar
  EntryDetailSheet.tsx  View/edit/delete an entry
  QuickTimerSheet.tsx   Set a quick countdown timer
  TimerBadge.tsx        Active timer display in header
  AlarmEditSheet.tsx    Create/edit alarms
  monthly-grid.tsx      Custom monthly calendar grid

db/                     SQLite database layer
  index.ts              Database init and all CRUD functions
  reminderQueries.ts    Reminder-specific queries
  entryCompletion.ts    Task completion helpers

notifications/          Notification scheduling and handling
  registerReminderCategories.ts   Channel setup (run at startup)
  scheduleReminderSequence.ts     3-stage reminder scheduling
  reminderActionHandler.ts        DONE/SNOOZE action routing
  useReminderResponseListener.ts  Notification tap listener
  snoozeLogic.ts                  Anti-doom-loop snooze

utils/                  Utility functions
  dateUtils.ts          parseDateString, formatDateString, week helpers
  quickAddParser.ts     NLP parser orchestrator
  dateTimeExtractor.ts  Date/time extraction from text
  entryClassifier.ts    Entry type classification from text
  alarmScheduler.ts     Weekly repeating alarm notifications
  quickTimer.ts         Countdown timer scheduling
  sleepCollapse.ts      Sleep anchor hour collapse logic
  calendarSettings.ts   AsyncStorage preferences + hooks
  appearanceSettings.ts Light/dark/system mode preference

constants/
  theme.ts              getTheme(), ENTRY_COLORS, getEntryColors()
  categories.ts         Category definitions and colors
  recurrence.ts         Recurrence type options
  reminders.ts          Reminder timing options

hooks/
  useAppearance.ts      Light/dark/system mode hook
  use-color-scheme.ts   Respects user appearance preference
```

---

## Key Architecture Decisions

**Why parseDateString instead of new Date(string)?**
`new Date('2026-04-21')` is parsed as UTC midnight, which shifts the date by your timezone offset. `parseDateString` always creates local midnight. This was a major source of off-by-one date bugs.

**Why local SQLite instead of a backend?**
Vela is local-first. No account needed, no internet required, instant reads. All data lives on device in SQLite via expo-sqlite.

**Why EAS for builds instead of local Android builds?**
EAS handles signing, SDK versions, and build consistency in the cloud. Local Android builds require exact SDK/NDK/CMake/Java versions to match — EAS abstracts all of that.

**Why three entry types instead of just events?**
Tasks (completable, no fixed time) and Anchors (daily structure like sleep and meals) are fundamentally different from Events (scheduled commitments). ADHD users benefit from this distinction because the app can treat them differently — anchors collapse in the timeline, tasks have completion state, events have reminders.

---

## Common Issues

**`ANDROID_HOME is not set`**
Add export lines to `~/.zshrc` and run `source ~/.zshrc`

**`Could not find Ninja`**
```bash
sudo apt-get install ninja-build cmake
```

**`JAVA_HOME is not set`**
```bash
sudo apt-get install openjdk-17-jdk
```

**`No Android connected device found`**
- USB cable must be a data cable, not charge-only
- Run `adb devices` — check for `unauthorized` not `device`
- Unplug and replug, accept the Allow USB Debugging popup on phone

**`no permissions` on adb devices**
```bash
sudo usermod -a -G plugdev $USER
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="*", MODE="0666", GROUP="plugdev"' | sudo tee /etc/udev/rules.d/51-android.rules
sudo udevadm control --reload-rules
adb kill-server && adb start-server
```

**`INSTALL_FAILED_UPDATE_INCOMPATIBLE`**
Uninstall Vela from phone first (USB debug and EAS builds have different signing keys).

**Notifications fire 30-60 seconds late**
Normal in USB debug builds. Test notifications with an EAS build.
Also: Settings → Apps → Vela → Battery → Unrestricted.

**`shopt: command not found` when sourcing .bashrc**
You are using zsh not bash. Use `~/.zshrc` not `~/.bashrc`.