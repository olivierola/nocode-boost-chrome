# Extension Chrome - Générateur de Plans IA

## Installation

1. **Compiler l'extension** :
   ```bash
   npm run build
   ```

2. **Charger l'extension dans Chrome** :
   - Ouvrez Chrome et allez à `chrome://extensions/`
   - Activez le "Mode développeur" en haut à droite
   - Cliquez sur "Charger l'extension non empaquetée"
   - Sélectionnez le dossier `dist` généré après la compilation

## Structure de l'extension

### Fichiers principaux

- **`public/manifest.json`** : Configuration de l'extension Chrome
- **`src/background.ts`** : Script de background (service worker)
- **`src/content.ts`** : Script de contenu injecté dans les pages web
- **`src/types/chrome.d.ts`** : Définitions TypeScript pour l'API Chrome

### Fonctionnalités

1. **Popup** : Interface React complète accessible via l'icône de l'extension
2. **Background Script** : Gestion des données, storage et communication
3. **Content Script** : Analyse des pages web et interaction avec le DOM

## Développement

### Scripts disponibles

- `npm run dev` : Mode développement avec rechargement automatique
- `npm run build` : Compilation pour production
- `npm run build:extension` : Compilation + création d'un zip pour distribution

### Configuration

La configuration de l'extension est définie dans `vite.config.ts` avec le plugin `@crxjs/vite-plugin` qui gère automatiquement :

- La compilation du manifest
- Le bundling des scripts background et content
- Le rechargement automatique en développement
- L'optimisation pour la production

## Permissions

L'extension demande les permissions suivantes :

- `activeTab` : Accès à l'onglet actif
- `storage` : Stockage local des données
- `host_permissions` : Accès aux sites web pour l'analyse de contenu

## Architecture

```
src/
├── background.ts       # Service worker
├── content.ts         # Script de contenu
├── types/
│   └── chrome.d.ts    # Types Chrome
├── components/        # Composants React
├── pages/            # Pages de l'application
└── ...               # Autres fichiers React
```

## Communication

### Background ↔ Popup
```typescript
// Depuis le popup
chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
  console.log(response);
});
```

### Background ↔ Content Script
```typescript
// Depuis le content script
chrome.runtime.sendMessage({ action: 'savePageData', data: pageData });
```

## Débogage

1. **Background Script** : Console dans `chrome://extensions/` → Détails de l'extension → "Inspecter les vues"
2. **Content Script** : Console des outils développeur de la page
3. **Popup** : Clic droit sur le popup → "Inspecter"