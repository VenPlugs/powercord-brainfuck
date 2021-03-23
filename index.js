const { Plugin } = require("powercord/entities");
const { get, post } = require("powercord/http");
const { clipboard } = require("electron");
const { promisify } = require("util");
const { promises: fs, existsSync } = require("fs");
const path = require("path");

const execFile = promisify(require("child_process").execFile);

module.exports = class Brainfuck extends Plugin {
	binaryRepo = "https://github.com/Vendicated/BrainfuckInterpreter/releases/latest/download/";
	hastebin = "https://haste.powercord.dev/";

	async startPlugin() {
		const canRun = await this.downloadBinaries();
		if (canRun === false) return;

		powercord.api.commands.registerCommand({
			command: "brainfuck",
			description: "Interpret brainfuck code",
			usage: "{c} [--send] [TEXT | FILE_URL | --clipboard]",
			executor: this.brainfuck.bind(this)
		});

		powercord.api.commands.registerCommand({
			command: "tobrainfuck",
			description: "Convert text to brainfuck",
			usage: "{c} [--send] [TEXT | FILE_URL | --clipboard]",
			executor: this.toBrainfuck.bind(this)
		});
	}

	pluginWillUnload() {
		powercord.api.commands.unregisterCommand("brainfuck");
		powercord.api.commands.unregisterCommand("tobrainfuck");
	}

	toCodeblock(text, language) {
		return `\`\`\`${language || ""}\n${text}\`\`\``;
	}

	async fetch(url) {
		return get(url)
			.then(res => {
				// Follow redirects
				if (res.headers.location) return this.fetch(res.headers.location);
				return res.raw;
			})
			.catch(() => null);
	}

	async formatText(text, language) {
		if (text.length < 1900) return this.toCodeblock(text, language);

		try {
			const { body } = await post(`${this.hastebin}documents`).send(text);
			return `The result was too long, so I uploaded it to hastebin instead!\n\n${this.hastebin}${body.key}`;
		} catch (err) {
			console.error(err);
			return `The result was too long, and I was unable to upload it to ${this.hastebin}. Sorry!`;
		}
	}

	async downloadBinaries() {
		const { platform } = process;

		if (!["win32", "linux"].includes(platform)) {
			console.error(`Sorry! Unsupported platform ${platform}.`);
			return false;
		}

		const ext = platform === "win32" ? ".exe" : "-linux";
		this.brainfuckPath = path.join(__dirname, "brainfuck" + ext);
		this.ascii2brainfuckPath = path.join(__dirname, "ascii2brainfuck" + ext);

		const result = await Promise.all([this.downloadIfNotExist(this.brainfuckPath), this.downloadIfNotExist(this.ascii2brainfuckPath)]);

		return result.every(x => x === true);
	}

	async downloadIfNotExist(filePath) {
		if (existsSync(filePath)) return true;

		const fileName = path.basename(filePath);
		const url = this.binaryRepo + fileName;
		try {
			const data = await this.fetch(url);
			if (!data) throw void 0;
			await fs.writeFile(filePath, data, "binary");
			await fs.chmod(filePath, "755");
			return true;
		} catch (error) {
			console.error(`Something went wrong while downloading ${fileName} from ${url}`);
			console.error(error);
			return false;
		}
	}

	async parseArgs(args) {
		const sendIndex = args.indexOf("--send");
		const send = sendIndex === -1 ? false : !!args.splice(sendIndex, 1);

		let input = args.join(" ");
		if (input === "--clipboard") {
			input = clipboard.readText();
		} else if (input.startsWith("http")) {
			input = await this.fetch(input);
		}

		return {
			send,
			input
		};
	}

	async brainfuck(args) {
		const { send, input } = await this.parseArgs(args);
		if (!input)
			return {
				send: false,
				result: `Invalid arguments. Run \`${powercord.api.commands.prefix}help brainfuck\` for more information.`
			};

		const { stdout: result, stderr } = await execFile(this.brainfuckPath, [input]).catch(stderr => ({ stderr }));
		if (stderr) {
			if (stderr.message.toLowerCase().includes("invalid brainfuck"))
				return {
					send: false,
					result: "Invalid brainfuck."
				};

			console.error("[BRAINFUCK]", stderr);
			return {
				send: false,
				result: "I'm sorry, something went wrong. Check the console for more info."
			};
		}

		return {
			send,
			result: await this.formatText(result || "No output.")
		};
	}

	async toBrainfuck(args) {
		const { send, input } = await this.parseArgs(args);
		if (!input)
			return {
				send: false,
				result: `Invalid arguments. Run \`${powercord.api.commands.prefix}help tobrainfuck\` for more information.`
			};

		const { stdout: result, stderr } = await execFile(this.ascii2brainfuckPath, [input]).catch(stderr => ({ stderr }));
		if (stderr) {
			console.error("[BRAINFUCK]", stderr);
			return {
				send: false,
				result: "I'm sorry, something went wrong. Check the console for more info."
			};
		}

		return {
			send,
			result: await this.formatText(result, "bf")
		};
	}
};
