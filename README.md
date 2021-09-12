### process module for Deno

Features:

- [x] Cross platform support
- [x] kill
- [x] get
- [x] getAll
- [x] getTree

### Usage

all methods require `--allow-run` flags

```typescript
import { Process } from 'https://github.com/noxifoxi/deno_process/raw/master/mod.ts'

console.log(await Process.get(1)) // get process info with pid
console.log(await Process.get('explorer.exe')) // get process info with process name
console.log(await Process.getAll()) // get all process list
console.log(await Process.getTree()) // get process tree
await Process.kill(1024) // kill process by pid
await Process.kill('deno') // kill process by name
```

## License

The [MIT License](LICENSE)
