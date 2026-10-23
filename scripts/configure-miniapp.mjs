import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const appIdPattern = /^wx[0-9a-f]{16}$/i;

export async function configureAppId(projectRoot, ask, report) {
  const file = resolve(projectRoot, 'project.private.config.json');
  let current = {};
  try {
    current = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error('无法读取现有私有配置，未覆盖文件。请检查 JSON 格式和文件权限。');
    }
  }
  if (current === null || Array.isArray(current) || typeof current !== 'object') {
    throw new Error('现有私有配置必须是 JSON 对象，未覆盖文件。');
  }
  if (typeof current.appid === 'string' && appIdPattern.test(current.appid)) {
    report('已有格式有效的本地 AppID，保持原值；不会回显 AppID。');
    return { changed: false };
  }
  const appid = String(await ask('请在本机输入小程序 AppID（wx 开头，不要输入 AppSecret；直接回车取消）：')).trim();
  if (!appid) {
    report('已取消，没有写入配置。');
    return { changed: false };
  }
  if (!appIdPattern.test(appid)) {
    throw new Error('AppID 格式不正确，未写入。请确认复制的是 wx 开头的小程序 AppID，不是 AppSecret。');
  }
  await writeFile(file, JSON.stringify({ ...current, appid }, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  report('已保存本机私有配置，未回显 AppID。此操作不验证账号归属，也不代表微信编译通过。');
  return { changed: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projectRoot = fileURLToPath(new URL('../', import.meta.url));
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    await configureAppId(projectRoot, question => prompt.question(question), message => stdout.write(message + '\n'));
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  } finally {
    prompt.close();
  }
}
