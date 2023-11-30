import AdmZip from "adm-zip";
import fs from "fs-extra";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch, { type RequestInit } from "node-fetch";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

import zlib from "zlib";
import { TAURI_APP_DIR, cwd } from "./utils/env";
import { colorize, consola } from "./utils/logger";

const TEMP_DIR = path.join(cwd, "node_modules/.verge");
const FORCE = process.argv.includes("--force");

const ARCH = process.argv.includes("--arch")
  ? process.argv[process.argv.indexOf("--arch") + 1]
  : undefined;

const SIDECAR_HOST: string | undefined = process.argv.includes("--sidecar-host")
  ? process.argv[process.argv.indexOf("--sidecar-host") + 1]
  : execSync("rustc -vV")
      .toString()
      ?.match(/(?<=host: ).+(?=\s*)/g)?.[0];

if (!SIDECAR_HOST) {
  consola.fatal(colorize`{red.bold SIDECAR_HOST} not found`);
}

/* ======= clash ======= */
const CLASH_STORAGE_PREFIX = "https://release.dreamacro.workers.dev/";
const CLASH_URL_PREFIX =
  "https://github.com/Dreamacro/clash/releases/download/premium/";
const CLASH_LATEST_DATE = "2023.08.17";

const CLASH_BACKUP_URL_PREFIX =
  "https://github.com/zhongfly/Clash-premium-backup/releases/download/";
const CLASH_BACKUP_LATEST_DATE = "2023-09-05-gdcc8d87";

//https://github.com/zhongfly/Clash-premium-backup/releases/download/2023-09-05-gdcc8d87/clash-windows-amd64-2023-09-05-gdcc8d87.zip
//https://github.com/zhongfly/Clash-premium-backup/releases/download/2023-09-05-gdcc8d87/clash-windows-amd64-n2023-09-05-gdcc8d87.zip

const CLASH_MAP = {
  "win32-x64": "clash-windows-amd64",
  "darwin-x64": "clash-darwin-amd64",
  "darwin-arm64": "clash-darwin-arm64",
  "linux-x64": "clash-linux-amd64",
  "linux-arm64": "clash-linux-arm64",
};

/* ======= clash-rs ======= */
const RS_URL_PREFIX = `https://github.com/Watfaq/clash-rs/releases/download/`;
const RS_VERSION = "v0.1.9";
const RS_MAP = {
  "win32-x64": "clash-x86_64-pc-windows-msvc",
  "darwin-x64": "clash-x86_64-apple-darwin",
  "darwin-arm64": "clash-aarch64-apple-darwin",
  "linux-x64": "clash-x86_64-unknown-linux-gnu-static-crt",
  "linux-arm64": "clash-aarch64-unknown-linux-gnu-static-crt",
};

/* ======= clash meta ======= */
const META_URL_PREFIX = `https://github.com/MetaCubeX/Clash.Meta/releases/download/`;
const META_VERSION = "v1.16.0";

const META_MAP = {
  "win32-x64": "clash.meta-windows-amd64-compatible",
  "darwin-x64": "clash.meta-darwin-amd64",
  "darwin-arm64": "clash.meta-darwin-arm64",
  "linux-x64": "clash.meta-linux-amd64-compatible",
  "linux-arm64": "clash.meta-linux-arm64",
};

/**
 * check available
 */

const platform = process.platform;
const arch = ARCH ? ARCH : process.arch;

consola.debug(colorize`platform {yellow ${platform}}`);
consola.debug(colorize`arch {yellow ${arch}}`);
consola.debug(colorize`sidecar-host {yellow ${SIDECAR_HOST}}`);

if (!CLASH_MAP[`${platform}-${arch}`]) {
  throw new Error(`clash unsupported platform "${platform}-${arch}"`);
}
if (!META_MAP[`${platform}-${arch}`]) {
  throw new Error(`clash meta unsupported platform "${platform}-${arch}"`);
}

interface BinInfo {
  name: string;
  targetFile: string;
  exeFile: string;
  tmpFile: string;
  downloadURL: string;
}

function clash(): BinInfo {
  const name = CLASH_MAP[`${platform}-${arch}`];

  const isWin = platform === "win32";
  const urlExt = isWin ? "zip" : "gz";
  const downloadURL = `${CLASH_URL_PREFIX}${name}-${CLASH_LATEST_DATE}.${urlExt}`;
  const exeFile = `${name}${isWin ? ".exe" : ""}`;
  const tmpFile = `${name}.${urlExt}`;

  return {
    name: "clash",
    targetFile: `clash-${SIDECAR_HOST}${isWin ? ".exe" : ""}`,
    exeFile,
    tmpFile,
    downloadURL,
  };
}

function clashBackup() {
  const name = CLASH_MAP[`${platform}-${arch}`];

  const isWin = platform === "win32";
  const urlExt = isWin ? "zip" : "gz";
  const downloadURL = `${CLASH_BACKUP_URL_PREFIX}${CLASH_BACKUP_LATEST_DATE}/${name}-n${CLASH_BACKUP_LATEST_DATE}.${urlExt}`;
  const exeFile = `${name}${isWin ? ".exe" : ""}`;
  const tmpFile = `${name}.${urlExt}`;

  return {
    name: "clash",
    targetFile: `clash-${SIDECAR_HOST}${isWin ? ".exe" : ""}`,
    exeFile,
    tmpFile,
    downloadURL,
  };
}

function clashS3(): BinInfo {
  const name = CLASH_MAP[`${platform}-${arch}`];

  const isWin = platform === "win32";
  const urlExt = isWin ? "zip" : "gz";
  const downloadURL = `${CLASH_STORAGE_PREFIX}${CLASH_LATEST_DATE}/${name}-${CLASH_LATEST_DATE}.${urlExt}`;
  const exeFile = `${name}${isWin ? ".exe" : ""}`;
  const tmpFile = `${name}.${urlExt}`;

  return {
    name: "clash",
    targetFile: `clash-${SIDECAR_HOST}${isWin ? ".exe" : ""}`,
    exeFile,
    tmpFile,
    downloadURL,
  };
}

function clashRs(): BinInfo {
  const name = RS_MAP[`${platform}-${arch}`];
  const isWin = platform === "win32";
  // const urlExt = isWin ? 'zip' : 'gz';
  const exeFile = `${name}${isWin ? ".exe" : ""}`;
  const downloadURL = `${RS_URL_PREFIX}${RS_VERSION}/${name}${
    isWin ? ".exe" : ""
  }`;
  const tmpFile = `${name}${isWin ? ".exe" : ""}`;
  return {
    name: "clash-rs",
    targetFile: `clash-rs-${SIDECAR_HOST}${isWin ? ".exe" : ""}`,
    exeFile,
    tmpFile,
    downloadURL,
  };
}

function clashMeta(): BinInfo {
  const name = META_MAP[`${platform}-${arch}`];
  const isWin = platform === "win32";
  const urlExt = isWin ? "zip" : "gz";
  const downloadURL = `${META_URL_PREFIX}${META_VERSION}/${name}-${META_VERSION}.${urlExt}`;
  const exeFile = `${name}${isWin ? ".exe" : ""}`;
  const tmpFile = `${name}-${META_VERSION}.${urlExt}`;

  return {
    name: "clash-meta",
    targetFile: `clash-meta-${SIDECAR_HOST}${isWin ? ".exe" : ""}`,
    exeFile,
    tmpFile,
    downloadURL,
  };
}

/**
 * download sidecar and rename
 */
async function resolveSidecar(binInfo: BinInfo) {
  const { name, targetFile, tmpFile, exeFile, downloadURL } = binInfo;
  consola.debug(colorize`resolve {cyan ${name}}...`);

  const sidecarDir = path.join(TAURI_APP_DIR, "sidecar");
  const sidecarPath = path.join(sidecarDir, targetFile);

  await fs.mkdirp(sidecarDir);
  if (!FORCE && (await fs.pathExists(sidecarPath))) return;

  const tempDir = path.join(TEMP_DIR, name);
  const tempFile = path.join(tempDir, tmpFile);
  const tempExe = path.join(tempDir, exeFile);

  await fs.mkdirp(tempDir);
  try {
    if (!(await fs.pathExists(tempFile))) {
      await downloadFile(downloadURL, tempFile);
    }
    if (tmpFile.endsWith(".zip")) {
      const zip = new AdmZip(tempFile);
      zip.getEntries().forEach((entry) => {
        consola.debug(
          colorize`"{green ${name}}" entry name ${entry.entryName}`
        );
      });
      zip.extractAllTo(tempDir, true);
      await fs.rename(tempExe, sidecarPath);
      consola.debug(colorize`{green "${name}"} unzip finished`);
    } else if (tmpFile.endsWith(".gz")) {
      // gz
      const readStream = fs.createReadStream(tempFile);
      const writeStream = fs.createWriteStream(sidecarPath);
      await new Promise<void>((resolve, reject) => {
        const onError = (error) => {
          consola.error(colorize`"${name}" gz failed:`, error.message);
          reject(error);
        };
        readStream
          .pipe(zlib.createGunzip().on("error", onError))
          .pipe(writeStream)
          .on("finish", () => {
            consola.debug(colorize`{green "${name}"} gunzip finished`);
            execSync(`chmod 755 ${sidecarPath}`);
            consola.debug(colorize`{green "${name}"}chmod binary finished`);
            resolve();
          })
          .on("error", onError);
      });
    } else {
      // Common Files
      await fs.rename(tempFile, sidecarPath);
      consola.info(colorize`{green "${name}"} rename finished`);
      if (platform !== "win32") {
        execSync(`chmod 755 ${sidecarPath}`);
        consola.info(colorize`{green "${name}"} chmod binary finished`);
      }
    }
    consola.success(colorize`resolve {green ${name}} finished`);
  } catch (err) {
    // 需要删除文件
    await fs.remove(sidecarPath);
    throw err;
  } finally {
    // delete temp dir
    await fs.remove(tempDir);
  }
}

/**
 * prepare clash core
 * if the core version is not updated in time, use S3 storage as a backup.
 */
async function resolveClash() {
  return await resolveSidecar(clashBackup());
  // try {
  //   return await resolveSidecar(clash());
  // } catch {
  //   console.log(`[WARN]: clash core needs to be updated`);
  //   return await resolveSidecar(clashS3());
  // }
}

/**
 * only Windows
 * get the wintun.dll (not required)
 */
async function resolveWintun() {
  const { platform } = process;

  if (platform !== "win32") return;

  const url = "https://www.wintun.net/builds/wintun-0.14.1.zip";

  const tempDir = path.join(TEMP_DIR, "wintun");
  const tempZip = path.join(tempDir, "wintun.zip");

  const wintunPath = path.join(tempDir, "wintun/bin/amd64/wintun.dll");
  const targetPath = path.join(TAURI_APP_DIR, "resources", "wintun.dll");

  if (!FORCE && (await fs.pathExists(targetPath))) return;

  await fs.mkdirp(tempDir);

  if (!(await fs.pathExists(tempZip))) {
    await downloadFile(url, tempZip);
  }

  // unzip
  const zip = new AdmZip(tempZip);
  zip.extractAllTo(tempDir, true);

  if (!(await fs.pathExists(wintunPath))) {
    throw new Error(`path not found "${wintunPath}"`);
  }

  await fs.rename(wintunPath, targetPath);
  await fs.remove(tempDir);

  consola.success(colorize`resolve {green wintun.dll} finished`);
}

/**
 * download the file to the resources dir
 */
async function resolveResource(binInfo) {
  const { file, downloadURL } = binInfo;

  const resDir = path.join(TAURI_APP_DIR, "resources");
  const targetPath = path.join(resDir, file);

  if (!FORCE && (await fs.pathExists(targetPath))) return;

  await fs.mkdirp(resDir);
  await downloadFile(downloadURL, targetPath);

  consola.success(colorize`resolve {green ${file}} finished`);
}

/**
 * download file and save to `path`
 */
async function downloadFile(url: string, path: string) {
  const options: Partial<RequestInit> = {};

  const httpProxy =
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy;

  if (httpProxy) {
    options.agent = new HttpsProxyAgent(httpProxy);
  }

  const response = await fetch(url, {
    ...options,
    method: "GET",
    headers: { "Content-Type": "application/octet-stream" },
  });
  const buffer = await response.arrayBuffer();
  await fs.writeFile(path, new Uint8Array(buffer));

  consola.debug(colorize`download finished {gray "${url}"}`);
}

/**
 * main
 */
const SERVICE_URL =
  "https://github.com/zzzgydi/clash-verge-service/releases/download/latest";

const resolveService = () =>
  resolveResource({
    file: "clash-verge-service.exe",
    downloadURL: `${SERVICE_URL}/clash-verge-service.exe`,
  });
const resolveInstall = () =>
  resolveResource({
    file: "install-service.exe",
    downloadURL: `${SERVICE_URL}/install-service.exe`,
  });
const resolveUninstall = () =>
  resolveResource({
    file: "uninstall-service.exe",
    downloadURL: `${SERVICE_URL}/uninstall-service.exe`,
  });
const resolveMmdb = () =>
  resolveResource({
    file: "Country.mmdb",
    downloadURL: `https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country.mmdb`,
  });
const resolveGeosite = () =>
  resolveResource({
    file: "geosite.dat",
    downloadURL: `https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat`,
  });
const resolveGeoIP = () =>
  resolveResource({
    file: "geoip.dat",
    downloadURL: `https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat`,
  });
const resolveEnableLoopback = () =>
  resolveResource({
    file: "enableLoopback.exe",
    downloadURL: `https://github.com/Kuingsmile/uwp-tool/releases/download/latest/enableLoopback.exe`,
  });

const tasks = [
  { name: "clash", func: () => resolveClash(), retry: 5 },
  { name: "clash-meta", func: () => resolveSidecar(clashMeta()), retry: 5 },
  { name: "clash-rs", func: () => resolveSidecar(clashRs()), retry: 5 },
  { name: "wintun", func: resolveWintun, retry: 5, winOnly: true },
  { name: "service", func: resolveService, retry: 5, winOnly: true },
  { name: "install", func: resolveInstall, retry: 5, winOnly: true },
  { name: "uninstall", func: resolveUninstall, retry: 5, winOnly: true },
  { name: "mmdb", func: resolveMmdb, retry: 5 },
  { name: "geosite", func: resolveGeosite, retry: 5 },
  { name: "geoip", func: resolveGeoIP, retry: 5 },
  {
    name: "enableLoopback",
    func: resolveEnableLoopback,
    retry: 5,
    winOnly: true,
  },
];

async function runTask() {
  const task = tasks.shift();
  if (!task) return;
  if (task.winOnly && process.platform !== "win32") return runTask();

  for (let i = 0; i < task.retry; i++) {
    try {
      await task.func();
      break;
    } catch (err) {
      consola.warn(`task::${task.name} try ${i} ==`, err.message);
      if (i === task.retry - 1) {
        consola.fatal(`task::${task.name} failed`, err.message);
      }
    }
  }
  return runTask();
}

consola.start("start check and download resources...");
const jobs = new Array(Math.ceil(os.cpus.length / 2) || 2)
  .fill(0)
  .map(() => runTask());
Promise.all(jobs).then(() => {
  consola.success("all resources download finished");
});
