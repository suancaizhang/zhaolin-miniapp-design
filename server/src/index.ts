import { resolve } from 'node:path';
import { createApplication } from './app.ts';
import { projectRoot } from './database.ts';

const portText = process.env.PORT ?? '8788';
if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
  console.error('PORT must be an integer from 1 to 65535.');
  process.exitCode = 1;
} else {
  try {
    const port = Number(portText);
    const application = await createApplication({
      dataDir: resolve(projectRoot, process.env.DATA_DIR ?? 'data'),
      adminDir: resolve(projectRoot, 'admin/dist'),
    });
    application.server.on('error', () => {
      console.error('Local gallery could not listen. Check that the local port is available.');
      void application.close().finally(() => { process.exitCode = 1; });
    });
    application.server.listen(port, '127.0.0.1', () => {
      console.log(`Local gallery listening http://127.0.0.1:${port}`);
    });
    const stop = (): void => {
      void application.close().catch(() => {
        console.error('Local gallery could not close cleanly.');
        process.exitCode = 1;
      });
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch {
    console.error('Local gallery could not start. Check the data directory, source index, and local dependency installation.');
    process.exitCode = 1;
  }
}
