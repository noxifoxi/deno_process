import { readAll } from 'https://deno.land/std/io/util.ts';

export interface Proc {
	command: string; // Command to run this process
	ppid: number; // The parent process ID of the process
	pid: number; // Process ID
	stat: string; // Process status
	children?: Proc[];
}

export interface KillOptions {
	force?: boolean;
	ignoreCase?: boolean;
	tree?: boolean;
}

export class Process {
	/**
	 * Get the single process information.
	 * Requires `--allow-run` flag
	 * @param pidOrName
	 */
	static async get(pidOrName: number | string): Promise<Proc | void> {
		if (typeof pidOrName === 'number')
			return (await Process.getAll()).find((v) => v.pid === pidOrName);
		return (await Process.getAll()).find((v) => v.command === pidOrName);
	}

	/**
	 * Get process list
	 * Requires `--allow-run` flag
	 */
	static async getAll(): Promise<Proc[]> {
		const commands = Deno.build.os == "windows"
			? ["wmic.exe", "PROCESS", "GET", "Name,ProcessId,ParentProcessId,Status"]
			: ["ps", "-A", "-o", "comm,ppid,pid,stat"];

		const ps = Deno.run({
			cmd: commands,
			stdout: "piped",
		});

		const output = new TextDecoder().decode(await readAll(ps.stdout!));

		const { success, code } = await ps.status();

		ps.stdout?.close();

		ps.close();

		if (!success || code !== 0) {
			throw new Error("Fail to get process.");
		}

		const lines = output.split("\n").filter((v: string): string => v.trim());
		lines.shift();

		const processList: Proc[] = lines.map(
			(line: string): Proc => {
				const columns = line.trim().split(/\s+/);
				return {
					command: columns[0],
					ppid: +columns[1],
					pid: +columns[2],
					stat: columns[3],
				};
			},
		);

		return processList;
	}

	/**
	 * Get process tree
	 * Requires `--allow-run` flag
	 */
	static async getTree(): Promise<Proc[]> {
		const items = await Process.getAll();
		const nest = (items: Proc[], pid = 0): Proc[] => {
			return items
				.filter((item) => item.ppid === pid)
				.map((item) => {
					const children = nest(items, item.pid);
					if (!children.length) {
						return item;
					} else {
						return { ...item, children };
					}
				}) as Proc[];
		};

		return nest(items);
	}

	static getKillCommand(
		pidOrName: number | string,
		options: KillOptions = {},
	): string[] {
		const killByName = typeof pidOrName === "string";
		if (Deno.build.os === "windows") {
			const commands = ["taskkill"];
	
			if (options.force) {
				commands.push("/f");
			}
	
			if (options.tree) {
				commands.push("/t");
			}
	
			commands.push(killByName ? "/im" : "/pid", pidOrName + "");
	
			return commands;
		} else if (Deno.build.os === "linux") {
			const commands = [killByName ? "killall" : "kill"];
	
			if (options.force) {
				commands.push("-9");
			}
	
			if (killByName && options.ignoreCase) {
				commands.push("-I");
			}
	
			commands.push(pidOrName + "");
	
			return commands;
		} else {
			const commands = [killByName ? "pkill" : "kill"];
	
			if (options.force) {
				commands.push("-9");
			}
	
			if (killByName && options.ignoreCase) {
				commands.push("-i");
			}
	
			commands.push(pidOrName + "");
	
			return commands;
		}
	}

	/**
	 * kill process
	 * Requires `--allow-run` flag
	 * @param pidOrName pid or process name
	 * @param options
	 */
	static async kill(
		pidOrName: number | string,
		options: KillOptions = {},
	): Promise<void> {
		const commands = Process.getKillCommand(pidOrName, options);

		const ps = Deno.run({
			cmd: commands,
			stderr: "piped",
		});

		const { success, code } = await ps.status();

		ps.stderr?.close();

		ps.close();

		if (!success || code !== 0) {
			const msg = new TextDecoder().decode(await readAll(ps.stderr!));
			throw new Error(msg || "exit with code: " + code);
		}
	}

}
