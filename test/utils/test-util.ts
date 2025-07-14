import type {ExecException} from "node:child_process"
import {exec} from "node:child_process"
import {promisify} from "node:util"

const execAsync = promisify(exec)

export interface ExitedResult {
    readonly kind: "exited"
    readonly code: number
    readonly stdout: string
    readonly stderr: string
}

export interface KilledResult {
    readonly kind: "killed"
    readonly signal: string
    readonly stdout: string
    readonly stderr: string
}

export type CommandResult = ExitedResult | KilledResult

export async function runCommand(command: string): Promise<CommandResult> {
    try {
        const {stdout, stderr} = await execAsync(command)
        return {
            kind: "exited",
            code: 0,
            stdout,
            stderr,
        }
    } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        const err = error as ExecException
        if (err.code !== undefined) {
            return {
                kind: "exited",
                code: err.code,
                stdout: err.stdout ?? "",
                stderr: err.stderr ?? "",
            }
        } else if (err.signal === undefined) {
            throw err
        } else {
            return {
                kind: "killed",
                signal: err.signal,
                stdout: err.stdout ?? "",
                stderr: err.stderr ?? "",
            }
        }
    }
}
