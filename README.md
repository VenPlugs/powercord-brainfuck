# Powercord Brainfuck

This is a powercord module that allows you to convert between brainfuck and plain text straight from discord. In both directions!

On first launch it will download a platform specific binary to handle the converting, as it would be pretty inefficient to run brainfuck with javascript.

This binary is downloaded from [here](https://github.com/Vendicated/Brainfuck-Interpreter/releases/latest).

The code for the aformentioned binary is licensed under the GPL-3.0 license and can be found [here](https://github.com/Vendicated/Brainfuck-Interpreter)

## Commands

This plugin registers the following commands. If your prefix is something different than `.` simply replace it with whatever you use.

The output is automatically uploaded to hastebin if it is too long for discord.

___

```xml
.brainfuck [--send] [TEXT | FILE_URL | --clipboard]
```

Interpret any valid brainfuck code. Sent via clyde unless `--send` flag is specified

Input can either be a URL to a file, any text or `--clipboard` to use whatever is in your clipboard

Examples:

```xml
.brainfuck --send >+++++++++++[<+++++++++++>-]<---.>++++[<---->-]<-.+++++++++.>+++[<--->-]<-.+++++.------.--.>++++[<++++>-]<+++.>++++[<---->-]<+.-.
.brainfuck https://google.com/secret_brainfuck_code.bf
.brainfuck --send --clipboard
```

___

```xml
.tobrainfuck [--send] [TEXT | FILE_URL | --clipboard]
```

Convert text to brainfuck. Sent via clyde unless `--send` flag is specified

Input can either be a URL to a file, any text or `--clipboard` to use whatever is in your clipboard

Examples:

```xml
.tobrainfuck --send Hello World!
.tobrainfuck https://google.com
.tobrainfuck --send --clipboard
```
