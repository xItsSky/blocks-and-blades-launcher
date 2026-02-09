import * as msmc from 'msmc';
import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getGameRoot } from './game-path';

export interface MinecraftAuthData {
    access_token: string;
    client_token: string;
    uuid: string;
    name: string;
    user_properties?: any;
}

export async function loginMicrosoft(window: BrowserWindow): Promise<MinecraftAuthData> {
    try {
        const token = msmc.mojangAuthToken("select_account");
        const result = await msmc.launch("electron", token);
        
        if (result.type !== "Success") {
            throw new Error(`Login failed or was cancelled: ${result.type}`);
        }

        const profile = result.profile;
        if (!profile) throw new Error("No profile found");

        return {
            access_token: result.access_token || "",
            client_token: "", // msmc doesn't seem to provide a client_token directly in result
            uuid: profile.id,
            name: profile.name,
            user_properties: {}
        };
    } catch (err) {
        console.error("Microsoft login failed:", err);
        throw err;
    }
}

const TOKEN_FILE = 'auth_tokens.json';

export function saveTokens(data: MinecraftAuthData) {
    const rootDir = getGameRoot();
    const tokenPath = path.join(rootDir, TOKEN_FILE);
    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir, { recursive: true });
    }
    fs.writeFileSync(tokenPath, JSON.stringify(data));
}

export function loadTokens(): MinecraftAuthData | null {
    const rootDir = getGameRoot();
    const tokenPath = path.join(rootDir, TOKEN_FILE);
    if (fs.existsSync(tokenPath)) {
        try {
            return JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        } catch (e) {
            return null;
        }
    }
    return null;
}

export function clearTokens() {
    const rootDir = getGameRoot();
    const tokenPath = path.join(rootDir, TOKEN_FILE);
    if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
    }
}
