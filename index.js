/*
 * Copyright (C) 2021 Vendicated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

const { Plugin } = require("powercord/entities");
const { get, post } = require("powercord/http");
const { clipboard } = require("electron");
const { promisify } = require("util");
const { promises: fs, existsSync, unlinkSync } = require("fs");
const path = require("path");

const execFile = promisify(require("child_process").execFile);

module.exports = class Brainfuck extends Plugin {
	binaryRepo = "https://github.com/Vendicated/BrainfuckInterpreter/releases/latest/download/";
	hastebin = "https://haste.powercord.dev/";

	extensions = {
		win32: ".exe",
		linux: "-linux"
	};

	async startPlugin() {
		const canRun = await this.downloadBinary();
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
			this.error(err);
			return `The result was too long, and I was unable to upload it to ${this.hastebin}. Sorry!`;
		}
	}

	async downloadBinary() {
		const { platform } = process;

		const ext = this.extensions[platform];

		if (!ext) {
			this.error(`Sorry! Unsupported platform ${platform}.`);
			return false;
		}

		const firstRun = this.settings.get("firstRun", true);
		this.settings.set("firstRun", false);

		this.brainfuckPath = path.join(__dirname, "brainfuck" + ext);
		if (existsSync(this.brainfuckPath)) {
			if (firstRun) {
				unlinkSync(this.brainfuckPath);
				const ascii2brainfuckPath = path.join(__dirname, "ascii2brainfuck" + ext);
				if (existsSync(ascii2brainfuckPath)) unlinkSync(ascii2brainfuckPath);
			} else return true;
		}

		const url = this.binaryRepo + "brainfuck" + ext;

		try {
			const data = await this.fetch(url);
			if (!data) throw void 0;
			await fs.writeFile(this.brainfuckPath, data, "binary");
			await fs.chmod(this.brainfuckPath, "755");
			return true;
		} catch (error) {
			this.error(`Something went wrong while downloading ${fileName} from ${url}`, error);
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

		const { stdout: result, stderr } = await execFile(this.brainfuckPath, ["decode", input]).catch(stderr => ({ stderr }));
		if (stderr) {
			if (stderr.message.toLowerCase().includes("invalid brainfuck"))
				return {
					send: false,
					result: "Invalid brainfuck."
				};

			this.error("[BRAINFUCK]", stderr);
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

		const { stdout: result, stderr } = await execFile(this.brainfuckPath, ["encode", input]).catch(stderr => ({ stderr }));
		if (stderr) {
			this.error("[BRAINFUCK]", stderr);
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
