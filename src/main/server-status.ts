import * as net from 'net';
import * as dns from 'dns';
import config from './config';

async function resolveMinecraftSrv(host: string): Promise<{ host: string; port: number } | null> {
  return new Promise((resolve) => {
    dns.resolveSrv(`_minecraft._tcp.${host}`, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        resolve(null);
      } else {
        // On prend le premier enregistrement (généralement le plus prioritaire)
        const addr = addresses[0];
        resolve({ host: addr.name, port: addr.port });
      }
    });
  });
}

export async function getServerStatus(): Promise<boolean> {
  let targetHost = config.server.host;
  let targetPort = config.server.port;

  // Tentative de résolution SRV pour être plus robuste
  try {
    const srv = await resolveMinecraftSrv(targetHost);
    if (srv) {
      console.log(`SRV record found: ${srv.host}:${srv.port}`);
      targetHost = srv.host;
      targetPort = srv.port;
    }
  } catch (e) {
    console.log('SRV resolution failed, falling back to config');
  }

  console.log(`Checking status for ${targetHost}:${targetPort}...`);
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      console.log('Connected successfully');
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.log('Connection timeout');
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (err) => {
      console.log('Connection error:', err.message);
      socket.destroy();
      resolve(false);
    });

    try {
      socket.connect(targetPort, targetHost);
    } catch (err) {
      console.log('Immediate connection error:', err);
      resolve(false);
    }
  });
}
