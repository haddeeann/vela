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

## Option 1 — Run Locally via USB (Hot Reload)

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
   If it shows `unauthorized`, check your phone for the "Allow USB debugging?" popup and tap Allow.

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Build and install to phone** (first time or after native changes)
   ```bash
   cd ~/code/vela
   npx expo run:android
   ```
   Takes 3-5 minutes. Installs Vela directly to your phone.

### Coming back after a break

If the app is already installed on your phone from a previous session:

```bash
cd ~/code/vela
npx expo start --dev-client
```

This skips the full rebuild and just starts the JS bundler. Hot reload works immediately.

### When you need a full rebuild

Run `npx expo run:android` again (not just `start`) if you have:
- Changed `app.json`
- Added a new native library
- Uninstalled the app from your phone
- Seen build errors that a reload didn't fix

### Useful terminal shortcuts while running

| Key | Action |
|-----|--------|
| `r` | Force reload the app |
| `j` | Open JavaScript debugger (see console logs) |
| `m` | Toggle developer menu on phone |
| `a` | Reinstall APK to connected Android device |

---

## Option 2 — Cloud Build for Real-World Testing

Use this when you want to test away from your desk, share with someone, or test production-like behavior (notifications, battery optimization, splash screen).

### Build a preview APK

```bash
cd ~/code/vela
eas build --platform android --profile preview
```

- Takes 5-10 minutes
- Builds in Expo's cloud — no local Android SDK needed
- When done, EAS gives you a download link and QR code

### Install on your phone

1. Open the download link on your Android phone
   (or go to [expo.dev](https://expo.dev) → your project → Builds)
2. Tap the APK to install
3. Allow "Install from unknown sources" if prompted

### Update an existing build

Build a new APK and install it over the existing one. Android preserves your SQLite data during updates.

If you get `INSTALL_FAILED_UPDATE_INCOMPATIBLE` it means the signing key changed (e.g. switching between local debug and EAS builds). Uninstall the app first, then install the new APK.

---

## Build Profiles

Defined in `eas.json`:

| Profile | Command | Output | Use for |
|---------|---------|--------|---------|
| `preview` | `eas build --platform android --profile preview` | APK | Device testing |
| `production` | `eas build --platform android --profile production` | AAB | Play Store |

---

## Dev Tools

### Reset all app data (dev only)

A "Reset onboarding (dev only)" button is available in the hamburger drawer while running a debug build. This clears all SQLite entries and AsyncStorage and reloads the app.

### View console logs from a real build

```bash
adb logcat | grep -E 'Vela|ReactNative'
```

---

## Project Structure

```
app/                  Expo Router screens
  index.tsx           Home screen (calendar)
  alarm-screen.tsx    Full screen notification/alarm
  events.tsx          Events list
  tasks.tsx           Tasks list
  anchors.tsx         Anchors list
  alarms.tsx          Alarms management
  onboarding.tsx      First launch screen

components/           Reusable UI components
  add-event-modal.tsx Full add/edit entry form
  QuickAddBar.tsx     Natural language quick input
  EntryDetailSheet.tsx View/edit/delete an entry
  QuickTimerSheet.tsx Set a quick countdown timer
  TimerBadge.tsx      Active timer display in header
  AlarmEditSheet.tsx  Create/edit alarms

db/                   SQLite database layer
  index.ts            Database init and CRUD functions
  reminderQueries.ts  Reminder-specific queries
  entryCompletion.ts  Task completion functions

notifications/        Notification scheduling and handling
types/                TypeScript interfaces
utils/                Utility functions (date parsing, NLP parser, etc.)
constants/            Theme, categories, recurrence options
```

---

## Common Issues

**`ANDROID_HOME is not set`**
Add the export lines to `~/.zshrc` and run `source ~/.zshrc`

**`Could not find Ninja`**
```bash
sudo apt-get install ninja-build cmake
```

**`JAVA_HOME is not set`**
```bash
sudo apt-get install openjdk-17-jdk
```

**`No Android connected device found`**
- Check USB cable is a data cable not charge-only
- Run `adb devices` and check for `unauthorized`
- Unplug and replug, accept the debugging prompt on your phone

**`INSTALL_FAILED_UPDATE_INCOMPATIBLE`**
Uninstall Vela from your phone then reinstall.

**Notifications not firing in debug build**
Android delays notifications in debug mode due to battery optimization.
Test notifications using an EAS preview build instead.
Go to Settings → Apps → Vela → Battery → set to Unrestricted.