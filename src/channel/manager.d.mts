export function getPackageRoot(): string;
export function loadConfig(): Promise<any>;
export function saveConfig(config: any): Promise<void>;
export function getChannel(): Promise<string>;
export function getFrameworkRoot(): Promise<string>;
export function switchToEdge(): Promise<void>;
export function switchToStable(): Promise<void>;
export function getVersionInfo(): Promise<any>;
export function updateEdge(): Promise<void>;
