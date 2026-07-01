#!/bin/bash
# Lance le serveur Next.js avec Turbopack + redémarrage auto sur crash

pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
lsof -ti :3000 | xargs kill -9 2>/dev/null
sleep 1

# Nettoyage initial uniquement
rm -rf .next
echo "✓ Cache nettoyé, démarrage..."

FIRST=true
while true; do
  if [ "$FIRST" = false ]; then
    # Après un crash : supprimer seulement les manifests corrompus
    find .next/dev/server -name "build-manifest.json" -delete 2>/dev/null
    echo "↺  Redémarrage (manifests nettoyés)..."
    sleep 1
  fi
  FIRST=false
  NODE_OPTIONS="--max-old-space-size=4096" npm run dev
  EXIT=$?
  [ $EXIT -eq 0 ] && break  # Arrêt manuel (Ctrl+C) : on sort
  echo ""
  echo "⚠️  Crash détecté (code $EXIT). Redémarrage dans 2s..."
  sleep 2
done
