import { run } from "../../src/cli/router.js";

run(process.argv.slice(2))
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
