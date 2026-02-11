export default {
  launcherVersion: "1.0.1",

  gameFolderName: ".blocks-and-blades",

  setup: {
    basePackageUrl: "https://pub-8cc4941d55dd48c48872461fb8913431.r2.dev/blocks-and-blades-1.0.0.zip",
    manifestUrl: "https://pub-8cc4941d55dd48c48872461fb8913431.r2.dev/manifest.json",
    minecraftVersion: "1.21.1",
    neoforgeVersion: "21.1.219"
  },

  server: {
    host: "blocks-and-blades.nitro.games",
    port: 26365,
    autoConnect: {
      enabled: true
    },
    statusRefreshInterval: 300000 // 5 minutes
  },

  settings: {
    java: {
      minRam: "2G",
      maxRam: "4G"
    },
    launcher: {
      minimizeOnLaunch: true,
      language: "fr"
    }
  }
}
