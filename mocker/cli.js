function splitArgument(argument) {
  const separator = argument.indexOf("=");
  if (separator === -1) {
    return { flag: argument, inlineValue: undefined };
  }

  return {
    flag: argument.slice(0, separator),
    inlineValue: argument.slice(separator + 1),
  };
}

function parseFlags(args, { valueFlags, booleanFlags = [] }) {
  const values = new Map();
  const flags = new Set();

  for (let index = 0; index < args.length; index++) {
    const { flag, inlineValue } = splitArgument(args[index]);

    if (booleanFlags.includes(flag)) {
      if (inlineValue !== undefined) {
        throw new Error(`Option ${flag} takes no value`);
      }
      flags.add(flag);
      continue;
    }

    if (!valueFlags.includes(flag)) {
      throw new Error(`Unknown option: ${flag}`);
    }

    const value = inlineValue ?? args[++index];
    if (value === undefined || value === "") {
      throw new Error(`Missing value for ${flag}`);
    }
    values.set(flag, value);
  }

  return { values, flags };
}

module.exports = { parseFlags };
