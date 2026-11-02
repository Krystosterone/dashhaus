/** The help text `fake-home-assistant --help` prints. */
export const USAGE: string;

/** Run the command; resolves with the process exit code. A started server keeps the process alive. */
export function main(argv?: string[]): Promise<number>;
