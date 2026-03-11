export default {
  launcherVersion: "2.0.0",

  gameFolderName: ".blocks-and-blades",

  setup: {
    baseUrl: "https://pub-8cc4941d55dd48c48872461fb8913431.r2.dev",
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
