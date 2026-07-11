# App icons & splash screens

No binaries ship with the scaffold. To generate native assets:

1. Drop into this folder:
   - `icon.png` — 1024×1024
   - `splash.png` — 2732×2732
   - optional `icon-foreground.png` / `icon-background.png` for Android adaptive icons
2. Run `npm run cap:assets` — `@capacitor/assets` generates every required
   size for iOS and Android directly into the native projects.
3. Re-run after every `npx cap add <platform>`.
