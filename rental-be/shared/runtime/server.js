const DEFAULT_LISTEN_HOST = "0.0.0.0";

export const listen = async (
  server,
  port,
  host = DEFAULT_LISTEN_HOST,
) => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
};
