import type {Session} from "./session.ts";

export class Config {
    sess: Session

    constructor(sess: Session) {
        this.sess = sess
    }

    configExist(): boolean {
        return false
    }

    loadConfig(): void {
        return
    }
}