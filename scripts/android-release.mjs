import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const expected = 'C:/Users/Tidu/StudioProjects/C-t-ng-p';
if (root.replaceAll('\\','/').toLowerCase() !== expected.toLowerCase()) {
  throw new Error(`Build Android chi duoc phep tai ${expected}. Ban nay la ban luu.`);
}
process.chdir(root);
const read = (file) => fs.readFileSync(path.join(root,file),'utf8');
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
function run(exe, args, options = {}) {
  const result = spawnSync(exe, args, {cwd:root,stdio:'inherit',...options});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const node = (file,args=[]) => run(process.execPath,[file,...args]);
function checkSource() {
  const icons = JSON.parse(read('scripts/android-icon-hashes.json'));
  if (hash('public/pwa-512x512.png') !== icons.source) throw new Error('Icon da doi. Chay npm run android:icons truoc khi build.');
  for (const [file,digest] of Object.entries(icons.outputs)) {
    if (hash(file) !== digest) throw new Error(`Icon Android khong dong bo: ${file}`);
  }
  for (const name of ['ic_launcher','ic_launcher_round']) {
    if (!read(`android/app/src/main/res/mipmap-anydpi-v26/${name}.xml`).includes('@mipmap/ic_launcher_foreground')) throw new Error('Adaptive icon sai nguon.');
  }
  if (read('android/app/src/main/res/values/styles.xml').includes('@drawable/splash')) throw new Error('Splash cu dang duoc dung lam nen.');
  if (!read('android/app/src/main/res/values/styles.xml').includes('postSplashScreenTheme')) throw new Error('Thieu theme sau splash.');
  if (read('src/components/GameControls.tsx').includes('PikaJieQi ch')) throw new Error('Ghi chu engine van con trong UI.');
}
function prepare() {
  checkSource();
  node('node_modules/tsx/dist/cli.mjs',['scripts/build-hosting.ts']);
  node('node_modules/@capacitor/cli/bin/capacitor',['sync','android']);
  const dir = 'android/app/src/main/assets/public';
  const assetDir = path.join(dir,'assets');
  for (const name of fs.readdirSync(path.join(root,assetDir))) {
    if (name.endsWith('.js') && fs.readFileSync(path.join(root,assetDir,name),'utf8').includes('PikaJieQi ch')) throw new Error('Ghi chu AI van con trong bundle.');
  }
  const files = [];
  function collect(folder) {
    for (const entry of fs.readdirSync(path.join(root,folder),{withFileTypes:true})) {
      const file = path.posix.join(folder,entry.name);
      if (entry.isDirectory()) collect(file); else files.push([file.slice(dir.length+1),hash(file)]);
    }
  }
  collect(dir);
  fs.mkdirSync('release',{recursive:true});
  fs.writeFileSync('release/web-assets.json',JSON.stringify(files,null,2));
  console.log('Web build moi da dong bo vao Android.');
}
const action = process.argv[2] || 'release';
if (action === 'prepare') prepare();
else if (action === 'check') { checkSource(); console.log('Release source checks passed.'); }
else if (action === 'open') node('node_modules/@capacitor/cli/bin/capacitor',['open','android']);
else if (action === 'release') {
  checkSource();
  node('node_modules/typescript/bin/tsc',['--noEmit']);
  const tests = fs.readdirSync('src/utils').filter(n=>n.endsWith('.test.ts')).map(n=>`src/utils/${n}`);
  node('node_modules/tsx/dist/cli.mjs',['--test',...tests]);
  // Android Studio and this command both hit prepareReleaseWeb before packaging.
  const properties = read('android/gradle.properties');
  const javaHome = process.env.JAVA_HOME || properties.match(/^org\.gradle\.java\.home=(.+)$/m)?.[1].trim();
  const env = {...process.env, ...(javaHome ? {JAVA_HOME:javaHome} : {})};
  run('cmd.exe',['/d','/c','gradlew.bat','--no-daemon','bundleRelease','assembleRelease'],{cwd:path.join(root,'android'),env});
  run('python',['scripts/audit-android-release.py']);
  const gradle = read('android/app/build.gradle');
  const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)[1]);
  const versionName = gradle.match(/versionName\s+"([^"]+)"/)[1];
  const files = {
    aab:'android/app/build/outputs/bundle/release/app-release.aab',
    apk:'android/app/build/outputs/apk/release/app-release.apk',
  };
  const outputs = {};
  for (const [type,source] of Object.entries(files)) {
    const target = `release/co-up-${versionName}-${versionCode}.${type}`;
    fs.copyFileSync(source,target); outputs[type]={path:path.resolve(target),sha256:hash(target)};
  }
  const git = spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
  fs.writeFileSync('release/latest.json',JSON.stringify({root,versionCode,versionName,createdAt:new Date().toISOString(),commit:git.stdout?.trim(),outputs},null,2));
  console.log('Release:',JSON.stringify(outputs,null,2));
} else throw new Error('Action khong hop le.');
