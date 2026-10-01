import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const jdkDir = path.join(projectRoot, '.jdk');
const javacBin = path.join(jdkDir, 'bin', 'javac');

async function setupJdk() {
  // Check if system already has javac
  try {
    const sysJavac = execSync('which javac 2>/dev/null', { encoding: 'utf8' }).trim();
    if (sysJavac) {
      console.log('System javac already available at:', sysJavac);
      return;
    }
  } catch (e) {
    // not in PATH
  }

  // Check if local .jdk/bin/javac already exists
  if (fs.existsSync(javacBin)) {
    console.log('Local portable JDK already exists at:', javacBin);
    return;
  }

  // Only download on Linux x86_64
  if (process.platform !== 'linux' || process.arch !== 'x64') {
    console.log(`Skipping JDK download: platform is ${process.platform} (${process.arch})`);
    return;
  }

  console.log('Setting up portable OpenJDK 17 in .jdk directory...');
  try {
    fs.mkdirSync(jdkDir, { recursive: true });
    const url = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz';
    execSync(`curl -sL "${url}" | tar -xz -C "${jdkDir}" --strip-components=1`, {
      stdio: 'inherit',
      timeout: 120000
    });

    if (fs.existsSync(javacBin)) {
      console.log('Portable OpenJDK 17 successfully installed at:', javacBin);
    } else {
      console.warn('JDK extraction completed but javac binary not found at expected path.');
    }
  } catch (err) {
    console.warn('Note: Could not complete automatic portable JDK download:', err.message);
  }
}

setupJdk().catch(console.error);
