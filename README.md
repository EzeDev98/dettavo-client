# Dettavo

Edit a recording by editing its words. Add the clips of an episode, put them in order on the timeline, and delete words or pauses from the transcript; Dettavo cuts the video to match and exports the result. Transcription and export run on this Mac, and nothing is uploaded.

This is dettavo-client, the app: a React PWA installed from `http://localhost:2061` in Chrome. It needs [dettavo-server](../dettavo-server), the local service on `http://localhost:2060`.

## From nothing to a working app

1. In dettavo-server, install the tools and start the service (see its README):
   ```bash
   ./scripts/install-tools.sh
   ./mvnw package
   java -Xmx512m -jar target/dettavo.jar
   ```
2. In this folder, set up and build the client:
   ```bash
   npm install
   cp .env.example .env
   npm run build
   npm run preview
   ```
3. Open http://localhost:2061 in Chrome and press Get started, then Install Dettavo.
4. Open Dettavo from the Dock or Launchpad. If a tool is missing, Setup lists it.

Home opens, and from then on Dettavo opens straight to it.

## Requirements

- Node 22 (see `engines` in package.json)
- Chrome on the Mac. Dettavo installs from Chrome; other browsers show manual steps only.
- dettavo-server running on the same Mac

## Environment

Copy `.env.example` to `.env`. Vite reads it at start, so restart after a change.

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | dettavo-server's address with its base path, no trailing slash: `http://localhost:2060/api/v1`. |
| `VITE_SKIP_INSTALL_GUARD` | Development only. `true` lets `npm run dev` run the whole app in a browser tab without installing it. A build ignores it. |

## Run while developing

```bash
npm run dev
```

The app is at http://localhost:2061. In development no service worker is registered, and any left by `npm run preview` is removed. The component gallery is at `/gallery`.

## Build

```bash
npm run build
npm run preview
```

`npm run build` writes `dist/`, including the service worker and `version.json`, and adds the Content-Security-Policy. `npm run preview` serves `dist/` on http://localhost:2061, the address the installed app opens. Keep it running while you use Dettavo.

## Install the app

1. Open http://localhost:2061 in Chrome. Onboarding shows; Get started opens Install.
2. Install Dettavo opens Chrome's install dialog. If you cancel it, the screen shows the steps to install from Chrome's menu instead.
3. Once installed, open Dettavo from the Dock or Launchpad. You can close the browser tab.

The installed app runs Setup the first time if a tool is missing, then opens on Home.

## Updates

Rebuild and restart the preview:

```bash
npm run build
npm run preview
```

The open app checks for a new build every 3 minutes and whenever it comes back to the front, then offers "Update available". Updating resets the app's own cached files and reloads. Projects and edits live in dettavo-server, so nothing is lost.

## Icons

The app icons in `public/icons/` are made from the Dettavo logo, `assets/icon-source.png`. After replacing it, run:

```bash
npm run icons
```
