// Публикация: собранный dist/ → ветка gh-pages (её показывает GitHub Pages на bslamp.ru)
import { execSync } from 'node:child_process';
const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: 'dist' });
run('git init -q -b gh-pages');
run('git add -A');
run('git -c user.name=deploy -c user.email=deploy@bslamp.ru commit -q -m "deploy"');
run('git push -f https://github.com/Geronimo1984/bslamp-site.git gh-pages');
