import type {Session} from "./session.ts";
import path from "node:path";
import {existsSync} from "node:fs";

export class Config {
    private readonly configFileName: string = "config.json"
    private readonly configFolderName: string = ".vault-dweller"

    private sess: Session
    private configPath: string

    constructor(sess: Session) {
        this.sess = sess
        this.configPath = path.join(this.sess.harnessRoot, this.configFolderName, this.configFileName)
    }

    configExist(): boolean {
        return existsSync(this.configPath)
    }

    loadConfig(): void {
        return
    }
}