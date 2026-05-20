import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';
import path from 'path';

export async function startTestDb(): Promise<{
  url: string;
  stop: () => Promise<void>;
  container: StartedTestContainer;
}> {
  const container = await new GenericContainer('postgres:16')
    .withEnvironment({ POSTGRES_PASSWORD: 'postgres', POSTGRES_DB: 'test' })
    .withExposedPorts(5432)
    .start();
  const url = `postgresql://postgres:postgres@${container.getHost()}:${container.getMappedPort(5432)}/test`;
  process.env.DATABASE_URL = url;

  const apiDir = path.resolve(__dirname, '../..');
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: url },
  });

  return { url, container, stop: async () => { await container.stop(); } };
}
