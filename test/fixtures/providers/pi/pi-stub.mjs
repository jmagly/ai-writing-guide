#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('--version')) {
  process.stdout.write('0.85.0\n');
} else if (args.includes('--list-models')) {
  process.stdout.write('provider    model                 context  max-out\nopenrouter  fixture/model:free    32K      4K\n');
} else if (args.includes('--mode') && args[args.indexOf('--mode') + 1] === 'rpc') {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    for (const line of input.split('\n').filter(Boolean)) {
      const command = JSON.parse(line);
      process.stdout.write(`${JSON.stringify({
        id: command.id,
        type: 'response',
        command: command.type,
        success: true,
        data: command.type === 'get_state' ? { isStreaming: false } : undefined,
      })}\n`);
    }
  });
} else if (args.includes('--mode') && args[args.indexOf('--mode') + 1] === 'json') {
  process.stdout.write('{"type":"session","version":3}\n');
  process.stdout.write('{"type":"agent_start"}\n');
  process.stdout.write('{"type":"agent_end","willRetry":false}\n');
  process.stdout.write('{"type":"agent_settled"}\n');
} else {
  process.stderr.write('unsupported fixture invocation\n');
  process.exitCode = 2;
}
