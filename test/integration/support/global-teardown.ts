export default async function globalTeardown() {
  const container = (
    globalThis as { __PG_CONTAINER__?: { stop: () => Promise<unknown> } }
  ).__PG_CONTAINER__;
  await container?.stop();
}
