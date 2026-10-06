export async function register() {
  // El arranque usa APIs de Node (process.on, process.exit): solo en ese runtime, en un archivo aparte
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
