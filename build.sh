#!/bin/sh
# 把 src/ 里的分段拼成单文件 index.html
set -e
cd "$(dirname "$0")"
cat src/c1_base.js src/c2_interview.js src/c3_events.js src/c4_scenes.js src/c5_engine.js > src/core.js
node --check src/core.js
node --check src/d_ui.js
node --check src/e_art.js
{ cat src/a_head.html src/b_body.html; echo '<script>'; cat src/core.js; echo '</script>'; echo '<script>'; cat src/e_art.js src/d_ui.js; echo '</script>'; echo '</body>'; echo '</html>'; } > index.html
echo "built index.html ($(wc -c < index.html | tr -d ' ') bytes)"
