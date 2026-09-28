#!/bin/sh
# TrailGuard preview server launcher (used by the launchd submitted job).
PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
export PATH
cd /Users/ahsan/Documents/TrailGuard-main || exit 1
exec npm run dev
