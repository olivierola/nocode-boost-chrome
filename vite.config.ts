import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { crx } from "@crxjs/vite-plugin";

// Configuration du manifest
const manifest = {
  manifest_version: 3,
  name: "Extension de Génération de Plans IA",
  version: "1.0.0",
  description: "Une extension Chrome pour générer et exécuter des plans de projets avec l'IA",
  permissions: [
    "activeTab",
    "storage"
  ],
  host_permissions: [
    "https://*/*"
  ],
  action: {
    default_popup: "index.html",
    default_title: "Générateur de Plans IA",
    default_icon: {
      "16": "favicon.ico",
      "32": "favicon.ico",
      "48": "favicon.ico",
      "128": "favicon.ico"
    }
  },
  background: {
    service_worker: "src/background.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content.ts"],
      run_at: "document_idle"
    }
  ],
  icons: {
    "16": "favicon.ico",
    "32": "favicon.ico",
    "48": "favicon.ico",
    "128": "favicon.ico"
  },
  web_accessible_resources: [
    {
      resources: ["assets/*"],
      matches: ["<all_urls>"]
    }
  ]
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    crx({ manifest }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        popup: "index.html"
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
}));
