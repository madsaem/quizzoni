#!/bin/bash
# Lance Quizzoni en local sur Mac (double-clic).
cd "$(dirname "$0")"
PORT=8080
echo ""
echo "  Quizzoni tourne sur http://localhost:$PORT"
echo "  Ferme cette fenêtre pour l'arrêter."
echo ""
( sleep 1; open "http://localhost:$PORT" ) &
python3 -m http.server "$PORT" --bind 127.0.0.1
