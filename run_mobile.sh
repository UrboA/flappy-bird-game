#!/bin/bash

# Get IP address (may need adjustment for different OS)
IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -n 1)

echo "====================================================="
echo "🎮 Flappy Bird Mobile Testing 📱"
echo "====================================================="
echo "Starting development server..."
echo ""
echo "To play on your mobile device:"
echo "1. Make sure your phone is on the same WiFi network"
echo "2. Open a web browser on your phone"
echo "3. Go to: http://$IP:9000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "====================================================="

# Run the webpack dev server
npm run dev 