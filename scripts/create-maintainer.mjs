import { createInterface, emitKeypressEvents } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createMaintainer } from '../server/src/accounts.ts';

function askText(question) {
  const prompt = createInterface({ input: stdin, output: stdout });
  return new Promise(resolveAnswer => prompt.question(question, answer => {
    prompt.close();
    resolveAnswer(answer.trim());
  }));
}

function askSecret(question) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('请在本机交互式终端运行账号创建命令；不接受命令行参数、管道或明文回显密码。');
  }
  emitKeypressEvents(stdin);
  stdout.write(question);
  const wasRaw = Boolean(stdin.isRaw);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolveSecret, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.removeListener('keypress', onKey);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write('\n');
    };
    const onKey = (text, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('已取消，未创建账号。'));
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolveSecret(value);
      } else if (key.name === 'backspace') {
        if (value.length) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
      } else if (!key.ctrl && !key.meta && text && !['escape', 'up', 'down', 'left', 'right', 'tab'].includes(key.name)) {
        if (value.length + text.length <= 256) {
          value += text;
          stdout.write('*'.repeat([...text].length));
        }
      }
    };
    stdin.on('keypress', onKey);
  });
}

try {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error('请在本机交互式终端运行，账号密码不应写入命令参数或发送聊天。');
  stdout.write('创建本地作品馆维护者。你与作者分别运行一次，权限相同；已有同名账号不会被重置。\n');
  const username = await askText('维护者账号（仅用于本地登录）：');
  if (!username) throw new Error('已取消，未创建账号。');
  const password = await askSecret('密码（至少12个字符，不回显明文）：');
  const confirmation = await askSecret('再次输入密码：');
  if (password !== confirmation) throw new Error('两次密码不一致，未创建账号。');
  const root = fileURLToPath(new URL('../', import.meta.url));
  await createMaintainer(resolve(root, 'data'), username, password);
  stdout.write('本地维护者创建完成，未输出账号或密码。请在本地电脑后台登录。\n');
} catch (error) {
  // Account validation errors must not contain supplied credentials.
  process.stderr.write('创建未完成：' + error.message + '\n');
  process.exitCode = 1;
}
