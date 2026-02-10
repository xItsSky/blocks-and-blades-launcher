# Blocks & Blades Launcher

![Build and Release](https://github.com/xItsSky/blocks-and-blades-launcher/actions/workflows/build.yml/badge.svg)

Le launcher officiel du serveur Minecraft **Blocks & Blades**. Une interface moderne, performante et sécurisée conçue pour offrir la meilleure expérience de jeu sur le serveur Valdoryn.

### ✨ Fonctionnalités

- **Authentification Microsoft & Mojang :** Connexion sécurisée via les services officiels.
- **Support NeoForge :** Installation et lancement automatiques de Minecraft 1.21.1 avec NeoForge.
- **Gestion du Pack de Base :** Synchronisation intelligente des mods, configurations et assets via un manifeste distant.
- **Multilingue :** Support complet du Français et de l'Anglais.
- **Réglages Personnalisables :** Allocation de la RAM, réduction automatique au lancement, et plus encore.
- **Statut du Serveur :** Affichage en temps réel de l'état du serveur directement sur l'interface.
- **Auto-connexion :** Rejoignez le serveur instantanément au lancement du jeu.

### 🚀 Installation

Vous pouvez télécharger la dernière version du launcher pour Windows ou macOS sur la page des [Releases](https://github.com/xItsSky/blocks-and-blades-launcher/releases).

### 🛠️ Développement

Si vous souhaitez contribuer au projet ou le compiler vous-même :

1. **Prérequis :**
   - Node.js (v20 ou supérieur recommandé)
   - npm

2. **Installation des dépendances :**
   ```bash
   npm install
   ```

3. **Lancer en mode développement :**
   ```bash
   npm start
   ```

4. **Compiler le projet :**
   ```bash
   npm run build
   ```

5. **Générer les exécutables :**
   ```bash
   npm run package
   ```

### ⚙️ Configuration

Le fichier central de configuration se trouve dans `src/main/config.ts`. Il permet de définir :
- La version du launcher.
- L'URL du pack de base et du manifeste.
- Les versions de Minecraft et NeoForge.
- L'hôte et le port du serveur.

### 👥 Contributeurs

- **Emo Quentin** (@xItsSky) - Développeur principal

---
Développé avec ❤️ pour la communauté Blocks & Blades.
