function getCommandPath(cmd) {
    const path = [];
    let currentCmd = cmd;
    while (currentCmd) {
        path.unshift(currentCmd.name());
        currentCmd = currentCmd.parent;
    }
    return path.join(' ');
}

function formatArguments(cmd) {
    return cmd.registeredArguments.map(arg => {
        return arg.required ? `<${arg.name()}>` : `[${arg.name()}]`;
    }).join(' ');
}

function formatCommandDescription(cmd) {
    let t = [cmd.name()];
    if (cmd.alias()) {
        t.push("|" + cmd.alias());
    }
    if (cmd.registeredArguments.length > 0) {
        t.push(formatArguments(cmd));
    }
    if (cmd.description()) {
        t.push('           ' + cmd.description());
    }
    return t.join("");
}

function formatFlags(option) {
    return option.flags
        .replace(/([[^<]+])/g, '<$1>')
        .replace(/^--([^,]+), -/, '-$1, --');
}

function formatOptionDescription(option) {
    let desc = option.description || '';
    if (option.defaultValue !== undefined) {
        desc += ` (默认值: ${option.defaultValue})`;
    }
    return desc;
}

export function formatHelp(cmd) {
    let output = '';
    output += 'Usage:' + ` ${getCommandPath(cmd)} [options] [command]\n`;
    if (cmd.description()) {
        output += `\n${cmd.description()} ${cmd.version() || ''}\n`;
    }
    if (!cmd.parent) {
        cmd.commands.forEach(subCmd => {
            output += `\n${formatCommandDescription(subCmd)}\n`;
            subCmd.commands.forEach(subCmd2 => {
                output += `  ${subCmd2.name().padEnd(15)} ${subCmd2.description()}\n`;
            });
        });
    } else {
        output += `\n${formatCommandDescription(cmd)}\n`;
        cmd.commands.forEach(subCmd => {
            output += `  ${subCmd.name().padEnd(15)} ${subCmd.description()}\n`;
        });
    }
    const visibleOptions = cmd.options.filter(o => !o.hidden);
    if (visibleOptions.length > 0) {
        output += `\nOptions:\n`;
        visibleOptions.forEach(opt => {
            const flags = formatFlags(opt);
            const description = formatOptionDescription(opt);
            output += `  ${flags.padEnd(30)} ${description}\n`;
        });
    }
    return output;
}