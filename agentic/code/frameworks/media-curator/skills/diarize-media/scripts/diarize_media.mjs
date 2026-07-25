#!/usr/bin/env node
import { main } from '../../transcribe-media/scripts/transcribe_media.mjs';

const code = await main(process.argv.slice(2), {
  defaultDiarize: true,
  activity: 'diarize-media',
});
process.exitCode = code;
