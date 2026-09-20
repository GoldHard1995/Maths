import { cp, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const rootPath = decodeURIComponent(root.pathname);

function run(command, args, cwd = rootPath, env = {}) {
  execFileSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
}

await rm(new URL('../_site', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../_site', import.meta.url), { recursive: true });

run('npm', ['run', 'build:github'], rootPath, {
  SITE_BASE_PATH: '/directed-number/',
  SITE_HUB_URL: '/',
});

for (const [project, basePath] of [
  ['algebra-block-world', '/algebra/'],
  ['linear-equation-block-world', '/linear-equation/'],
  ['polynomial-block-world', '/polynomial/'],
  ['area-volume-block-world', '/area-volume/'],
]) {
  run('npm', ['run', 'build:github'], `${rootPath}${project}`, {
    SITE_BASE_PATH: basePath,
    SITE_HUB_URL: '/',
  });
}

const site = new URL('../_site/', import.meta.url);
await cp(new URL('../index.html', import.meta.url), new URL('index.html', site));
await cp(new URL('../github-hub.js', import.meta.url), new URL('github-hub.js', site));
await mkdir(new URL('maths-block-world-hub/app/', site), { recursive: true });
await mkdir(new URL('maths-block-world-hub/public/', site), { recursive: true });
await cp(new URL('../maths-block-world-hub/app/globals.css', import.meta.url), new URL('maths-block-world-hub/app/globals.css', site));
await cp(new URL('../maths-block-world-hub/public/', import.meta.url), new URL('maths-block-world-hub/public/', site), { recursive: true });

const games = [
  ['dist-github', 'directed-number'],
  ['algebra-block-world/dist-github', 'algebra'],
  ['linear-equation-block-world/dist-github', 'linear-equation'],
  ['polynomial-block-world/dist-github', 'polynomial'],
  ['area-volume-block-world/dist-github', 'area-volume'],
];

for (const [source, target] of games) {
  const destination = new URL(`${target}/`, site);
  await mkdir(destination, { recursive: true });
  await cp(new URL(`../${source}/`, import.meta.url), destination, { recursive: true });
  await cp(new URL('github-game.html', destination), new URL('index.html', destination));
  await rm(new URL('github-game.html', destination));
}
